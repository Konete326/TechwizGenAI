import { WebSocketServer } from 'ws';
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
