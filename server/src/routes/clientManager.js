import express from 'express';
import crypto from 'crypto';
import { tunnelEvents, activeTunnels, domStore } from '../websocket/nisaTunnel.js';
import { ClientApp } from '../models/ClientApp.js';

const router = express.Router();

router.get('/apps', async (req, res) => {
  try {
    const apps = await ClientApp.find().sort({ createdAt: -1 });
    const enrichedApps = apps.map(app => {
      const obj = app.toObject();
      if (domStore.has(app.clientId)) {
        obj.status = 'Active';
        obj.elementsCount = domStore.get(app.clientId).elementsCount;
      }
      return obj;
    });
    res.json({ success: true, data: enrichedApps });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const { type, baseUrl, frontendUrl } = req.body;
    let clientId;
    let isUnique = false;
    
    // Ensure random string is completely unique
    while (!isUnique) {
      clientId = 'nisa_' + crypto.randomBytes(8).toString('hex');
      const existing = await ClientApp.findOne({ clientId });
      if (!existing) isUnique = true;
    }
    
    let code = '';
    const scriptBase = baseUrl || 'https://cdn.nisa.ai';
    
    if (type === 'CDN') {
      const feAttr = frontendUrl ? ` data-frontend-url="${frontendUrl}"` : '';
      code = `<script src="${scriptBase}/nisa-sdk.js" data-client-id="${clientId}"${feAttr}></script>`;
    } else {
      code = `npm install @nisa/sdk\n\nimport { Nisa } from '@nisa/sdk';\nNisa.init({ clientId: '${clientId}' });`;
    }

    const newApp = new ClientApp({ clientId, type, code, status: 'Inactive' });
    await newApp.save();
    
    res.status(201).json({ success: true, data: newApp });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/apps/:id', async (req, res) => {
  try {
    await ClientApp.findOneAndDelete({ clientId: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/sync', async (req, res) => {
  try {
    const { clientId, elementsCount, data } = req.body;
    
    // Validate
    const appDoc = await ClientApp.findOne({ clientId });
    if (!appDoc) return res.status(401).json({ error: 'Invalid API Key' });

    // Store the DOM data
    domStore.set(clientId, { elementsCount, data });
    
    // Tell the Admin panel that we are active
    tunnelEvents.emit('status', { clientId, status: 'Active', elementsCount });
    
    // Log for debugging
    console.log(`\n=== [DOM SYNC HTTP (Vercel Jugaad)] ===`);
    console.log(`Client ID: ${clientId} | Elements: ${elementsCount}`);
    console.log(`=======================================\n`);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/dom/:clientId', (req, res) => {
  const data = domStore.get(req.params.clientId);
  if (!data) {
    return res.status(404).json({ success: false, error: 'DOM data not found' });
  }
  res.json({ success: true, data: data.data });
});

router.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  const activeIds = Array.from(activeTunnels.keys());
  res.write(`data: ${JSON.stringify({ type: 'init', activeIds })}\n\n`);

  const onStatusChange = (data) => {
    res.write(`data: ${JSON.stringify({ type: 'status', ...data })}\n\n`);
  };
  
  tunnelEvents.on('status', onStatusChange);

  req.on('close', () => {
    tunnelEvents.off('status', onStatusChange);
  });
});

export default router;
