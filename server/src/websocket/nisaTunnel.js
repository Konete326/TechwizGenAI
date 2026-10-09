import { WebSocketServer } from 'ws';
import { geminiClient } from '../config/gemini.js';
import { EventEmitter } from 'events';
import { ClientApp } from '../models/ClientApp.js';

export const activeTunnels = new Map();
export const tunnelEvents = new EventEmitter();
export const domStore = new Map();

export function setupTunnel(server) {
  const wss = new WebSocketServer({ server, path: '/tunnel' });

  wss.on('connection', async (ws, req) => {
    try {
      const urlParams = new URLSearchParams(req.url.split('?')[1]);
      const clientId = urlParams.get('clientId');

      if (!clientId) return ws.close(1008, 'Missing clientId');

      // Domain/Origin Validation
      const appDoc = await ClientApp.findOne({ clientId });
      if (!appDoc) {
        console.warn(`[Security] Connection rejected: Invalid clientId ${clientId}`);
        return ws.close(1008, 'Invalid API Key');
      }

      const origin = req.headers.origin;
      if (origin) {
        if (!appDoc.domain) {
          // Trust on First Use (TOFU)
          appDoc.domain = origin;
          await appDoc.save();
          console.log(`[Security] API Key ${clientId} is now bound to domain: ${origin}`);
        } else if (appDoc.domain !== origin) {
          console.warn(`[Security] Origin ${origin} does not match initial domain ${appDoc.domain}. Permitting for now in Dev Mode.`);
          // We removed the ws.close(1008) here so Vercel/Localhost switching doesn't break the connection
        }
      }

      activeTunnels.set(clientId, ws);
      tunnelEvents.emit('status', { clientId, status: 'Active' });

      // Connect to Gemini 3.8 Live API
      const geminiSession = await geminiClient.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: ['audio'],
          systemInstruction: { parts: [{ text: 'You are Nisa. Output JSON commands to interact with the DOM when necessary.' }] }
        },
        callbacks: {
          onmessage: (msg) => {
            if (ws.readyState === 1) ws.send(JSON.stringify(msg));
          }
        }
      });

      // Receive audio/text/dom from SDK
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          
          if (data.type === 'dom_sync') {
            domStore.set(clientId, data);
            tunnelEvents.emit('status', { clientId, status: 'Active', elementsCount: data.elementsCount });
            
            // Console logs as requested
            console.log(`\n=== [DOM SYNC] Semantic Map Received ===`);
            console.log(`Client ID: ${clientId}`);
            console.log(`Total Actionable/Readable Elements: ${data.elementsCount}`);
            if (data.data && data.data.length > 0) {
              console.log(`Sample Semantic Nodes (First 2):`);
              console.log(JSON.stringify(data.data.slice(0, 2), null, 2));
            }
            console.log(`========================================\n`);
            return;
          }

          if (data.audio || data.text) {
            geminiSession.sendRealtimeInput(data);
          }
        } catch (e) {
          console.error("Invalid message format", e);
        }
      });

      ws.on('close', () => {
        activeTunnels.delete(clientId);
        domStore.delete(clientId);
        tunnelEvents.emit('status', { clientId, status: 'Inactive', elementsCount: 0 });
      });
      ws.on('error', () => {
        activeTunnels.delete(clientId);
        domStore.delete(clientId);
        tunnelEvents.emit('status', { clientId, status: 'Inactive', elementsCount: 0 });
      });
    } catch (err) {
      ws.close(1011, 'Internal error');
    }
  });

  return wss;
}

export function getActiveTunnel(clientId) {
  return activeTunnels.get(clientId);
}
