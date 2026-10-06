const express = require('express');
const router = express.Router();

const domStore = {};
const guardrailsStore = {};

router.post('/sync-dom', (req, res) => {
  const { clientId, url, semanticMap, timestamp } = req.body;
  if (!clientId || !semanticMap) return res.status(400).json({ error: 'Missing clientId or semanticMap' });

  if (!domStore[clientId]) domStore[clientId] = {};
  domStore[clientId][url] = { semanticMap, timestamp };

  res.status(200).json({ success: true, message: 'DOM synced successfully' });
});

router.get('/sync-dom', (req, res) => {
  const { clientId, url } = req.query;
  if (!clientId || !url) return res.status(400).json({ error: 'Missing clientId or url' });

  const data = domStore[clientId]?.[url];
  if (!data) return res.status(404).json({ error: 'No data found for this client and URL' });

  res.status(200).json(data);
});

router.post('/update-guardrails', (req, res) => {
  const { clientId, blockedPaths } = req.body;
  if (!clientId || !Array.isArray(blockedPaths)) {
    return res.status(400).json({ error: 'Missing clientId or blockedPaths array' });
  }

  guardrailsStore[clientId] = blockedPaths;
  res.status(200).json({ success: true, message: 'Guardrails updated successfully' });
});

router.get('/get-guardrails', (req, res) => {
  const { clientId } = req.query;
  if (!clientId) return res.status(400).json({ error: 'Missing clientId' });

  const blockedPaths = guardrailsStore[clientId] || [];
  res.status(200).json({ blockedPaths });
});

router.post('/update-map-version', (req, res) => {
  const { clientId, oldPath, newPath, text } = req.body;
  if (!clientId || !oldPath || !newPath) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (domStore[clientId]) {
    const urls = Object.keys(domStore[clientId]);
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const semanticMap = domStore[clientId][url].semanticMap;
      if (semanticMap) {
        for (let j = 0; j < semanticMap.length; j++) {
          if (semanticMap[j].path === oldPath) {
            semanticMap[j].path = newPath;
            console.log(`[Nisa Versioning] Updated UI mutation for client ${clientId}: ${text || 'element'} from ${oldPath} to ${newPath}`);
          }
        }
      }
    }
  }

  res.status(200).json({ success: true, message: 'Map version updated' });
});

module.exports = router;
module.exports.domStore = domStore;
