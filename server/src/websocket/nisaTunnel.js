const WebSocket = require('ws');

const activeTunnels = new Map();

function setupTunnel(server) {
  const wss = new WebSocket.Server({ server, path: '/tunnel' });

  wss.on('connection', (ws, req) => {
    try {
      const urlParams = new URLSearchParams(req.url.split('?')[1]);
      const clientId = urlParams.get('clientId');

      if (!clientId) {
        ws.close(1008, 'Missing clientId');
        return;
      }

      activeTunnels.set(clientId, ws);

      ws.on('close', () => {
        if (activeTunnels.get(clientId) === ws) {
          activeTunnels.delete(clientId);
        }
      });

      ws.on('error', () => {
        if (activeTunnels.get(clientId) === ws) {
          activeTunnels.delete(clientId);
        }
      });
    } catch (err) {
      ws.close(1011, 'Internal error');
    }
  });

  return wss;
}

function getActiveTunnel(clientId) {
  return activeTunnels.get(clientId);
}

module.exports = {
  setupTunnel,
  getActiveTunnel,
  activeTunnels
};
