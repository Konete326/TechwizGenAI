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

      const appDoc = await ClientApp.findOne({ clientId });
      if (!appDoc) {
        console.warn(`[Security] Connection rejected: Invalid clientId ${clientId}`);
        return ws.close(1008, 'Invalid API Key');
      }

      const origin = req.headers.origin;
      if (origin) {
        if (!appDoc.domain) {
          appDoc.domain = origin;
          await appDoc.save();
          console.log(`[Security] API Key ${clientId} is now bound to domain: ${origin}`);
        } else if (appDoc.domain !== origin) {
          console.warn(`[Security] Origin ${origin} does not match initial domain ${appDoc.domain}. Permitting for now in Dev Mode.`);
        }
      }

      activeTunnels.set(clientId, ws);
      tunnelEvents.emit('status', { clientId, status: 'Active' });

      const category = appDoc.appCategory || 'POS';
      const customRules = appDoc.customInstructions ? ` Custom Rules: ${appDoc.customInstructions}` : '';
      const dynamicInstruction = `Role: You are Nisa, an autonomous voice AI operating inside a ${category} application (${appDoc.appName || 'Client Application'}). Output JSON tool commands to click buttons, fill forms, or navigate when requested.${customRules}`;

      const tools = [
        {
          functionDeclarations: [
            {
              name: "clickElement",
              description: "Clicks any button or clickable element on the host screen. Accepts targetKey, selector, or XPath.",
              parameters: { type: "OBJECT", properties: { targetKey: { type: "STRING" } }, required: ["targetKey"] }
            },
            {
              name: "fillFormField",
              description: "Fills a form field or input on the host screen.",
              parameters: { type: "OBJECT", properties: { targetKey: { type: "STRING" }, value: { type: "STRING" } }, required: ["targetKey", "value"] }
            },
            {
              name: "spotlightElement",
              description: "Highlights a UI element with a pulse ring.",
              parameters: { type: "OBJECT", properties: { targetKey: { type: "STRING" } }, required: ["targetKey"] }
            },
            {
              name: "navigatePage",
              description: "Navigates to a specific route or URL.",
              parameters: { type: "OBJECT", properties: { route: { type: "STRING" } }, required: ["route"] }
            }
          ]
        }
      ];

      const geminiSession = await geminiClient.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: ['audio'],
          systemInstruction: { parts: [{ text: dynamicInstruction }] },
          tools
        },
        callbacks: {
          onmessage: (msg) => {
            if (ws.readyState === 1) ws.send(JSON.stringify(msg));
          }
        }
      });

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          
          if (data.type === 'dom_sync') {
            domStore.set(clientId, data);
            tunnelEvents.emit('status', { clientId, status: 'Active', elementsCount: data.elementsCount });
            ClientApp.findOneAndUpdate(
              { clientId },
              { domData: data.data, elementsCount: data.elementsCount, status: 'Active' }
            ).catch(() => {});
            
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

          if (data.type === 'element_demonstrated') {
            console.log(`\n=== [SELF-LEARNING] User Demonstrated Element ===`);
            console.log(`Client ID: ${clientId}`);
            console.log(`Action: ${data.action || 'click'}`);
            console.log(`Element:`, JSON.stringify(data.element, null, 2));
            console.log(`=================================================\n`);
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
