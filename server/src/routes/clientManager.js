import express from 'express';
import crypto from 'crypto';
import { tunnelEvents, activeTunnels, domStore } from '../websocket/nisaTunnel.js';
import { ClientApp } from '../models/ClientApp.js';
import { detectAppProfileFromDom } from '../utils/domClassifier.js';

const router = express.Router();

router.get('/apps', async (req, res) => {
  try {
    const apps = await ClientApp.find().sort({ createdAt: -1 });
    const enrichedApps = apps.map(app => {
      const obj = app.toObject();
      if (obj.elementsCount > 0) {
        obj.status = 'Active';
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
    const { type, baseUrl, frontendUrl, appName, appCategory, customInstructions } = req.body;
    let clientId;
    let isUnique = false;
    
    while (!isUnique) {
      clientId = 'nisa_' + crypto.randomBytes(8).toString('hex');
      const existing = await ClientApp.findOne({ clientId });
      if (!existing) isUnique = true;
    }
    
    let code = '';
    const scriptBase = baseUrl || 'https://cdn.nisa.ai';
    
    if (type === 'CDN') {
      code = `<script src="${scriptBase}/nisa-sdk.js" data-client-id="${clientId}"></script>`;
    } else {
      code = `npm install @nisa/sdk\n\nimport { Nisa } from '@nisa/sdk';\nNisa.init({ clientId: '${clientId}' });`;
    }

    const newApp = new ClientApp({ 
      clientId, 
      type, 
      code, 
      status: 'Inactive',
      appName: appName || 'My Web Application',
      appCategory: appCategory || 'POS',
      customInstructions: customInstructions || '',
      frontendUrl: frontendUrl || 'https://techwiz-gen-ai.vercel.app' 
    });
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
    
    const existing = await ClientApp.findOne({ clientId });
    if (!existing) return res.status(401).json({ error: 'Invalid API Key' });

    const update = { domData: data, elementsCount: elementsCount, status: 'Active' };
    const detected = detectAppProfileFromDom(data, existing.domain || '');
    if (detected.appName && (!existing.appName || existing.appName === 'My Web Application')) {
      update.appName = detected.appName;
    }
    if (detected.appCategory && (!existing.appCategory || existing.appCategory === 'POS')) {
      update.appCategory = detected.appCategory;
    }

    const appDoc = await ClientApp.findOneAndUpdate(
      { clientId },
      { $set: update },
      { new: true }
    );

    tunnelEvents.emit('status', { clientId, status: 'Active', elementsCount });
    
    console.log(`\n=== [DOM SYNC HTTP (MongoDB Persistent)] ===`);
    console.log(`Client ID: ${clientId} | Elements: ${elementsCount}`);
    console.log(`=======================================\n`);
    
    res.json({ success: true, detected });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/profile/detect/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const mem = domStore.get(clientId);
    const appDoc = await ClientApp.findOne({ clientId });
    if (!appDoc && !mem) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }
    const currentData = (mem?.data && Array.isArray(mem.data) && mem.data.length > 0)
      ? mem.data
      : (appDoc?.domData || []);
    const domain = appDoc?.domain || '';
    const detected = detectAppProfileFromDom(currentData, domain);
    res.json({ success: true, data: detected });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/request-sync/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const ws = activeTunnels.get(clientId);
    let isLiveConnected = false;
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'request_dom_sync', command: 'rescan_dom' }));
      isLiveConnected = true;
    }
    const mem = domStore.get(clientId);
    const appDoc = await ClientApp.findOne({ clientId });
    const currentData = (mem?.data && Array.isArray(mem.data) && mem.data.length > 0)
      ? mem.data
      : (appDoc?.domData || []);
    res.json({
      success: true,
      liveConnected: isLiveConnected,
      elementsCount: currentData.length,
      data: currentData
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/dom/:clientId', async (req, res) => {
  try {
    const mem = domStore.get(req.params.clientId);
    if (mem?.data && Array.isArray(mem.data) && mem.data.length > 0) {
      return res.json({ success: true, data: mem.data });
    }
    const appDoc = await ClientApp.findOne({ clientId: req.params.clientId });
    if (!appDoc) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }
    if (!appDoc.domData) {
      return res.json({ success: true, data: [] });
    }
    res.json({ success: true, data: appDoc.domData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/config/:clientId', async (req, res) => {
  try {
    const appDoc = await ClientApp.findOne({ clientId: req.params.clientId });
    if (!appDoc) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }
    res.json({ 
      success: true, 
      data: { 
        frontendUrl: appDoc.frontendUrl || 'https://techwiz-gen-ai.vercel.app',
        appName: appDoc.appName || 'My Web Application',
        appCategory: appDoc.appCategory || 'POS',
        powers: appDoc.powers || {
          autoCapture: true,
          selfLearning: true,
          formFilling: true,
          navigation: true,
          dynamicModals: true,
          spotlightGuidance: true
        },
        customInstructions: appDoc.customInstructions || '',
        voiceName: appDoc.voiceName || 'Aoede'
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/config/:clientId', async (req, res) => {
  try {
    const { appName, appCategory, powers, customInstructions, voiceName, frontendUrl } = req.body;
    const update = { updatedAt: new Date() };
    if (appName !== undefined) update.appName = appName;
    if (appCategory !== undefined) update.appCategory = appCategory;
    if (powers !== undefined) update.powers = powers;
    if (customInstructions !== undefined) update.customInstructions = customInstructions;
    if (voiceName !== undefined) update.voiceName = voiceName;
    if (frontendUrl !== undefined) update.frontendUrl = frontendUrl;

    const updated = await ClientApp.findOneAndUpdate(
      { clientId: req.params.clientId },
      { $set: update },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const ws = activeTunnels.get(req.params.clientId);
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ 
        type: 'config_updated', 
        powers: updated.powers, 
        appCategory: updated.appCategory,
        customInstructions: updated.customInstructions
      }));
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/config/:clientId', async (req, res) => {
  try {
    const { appName, appCategory, powers, customInstructions, voiceName, frontendUrl } = req.body;
    const update = { updatedAt: new Date() };
    if (appName !== undefined) update.appName = appName;
    if (appCategory !== undefined) update.appCategory = appCategory;
    if (powers !== undefined) update.powers = powers;
    if (customInstructions !== undefined) update.customInstructions = customInstructions;
    if (voiceName !== undefined) update.voiceName = voiceName;
    if (frontendUrl !== undefined) update.frontendUrl = frontendUrl;

    const updated = await ClientApp.findOneAndUpdate(
      { clientId: req.params.clientId },
      { $set: update },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const ws = activeTunnels.get(req.params.clientId);
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ 
        type: 'config_updated', 
        powers: updated.powers, 
        appCategory: updated.appCategory,
        customInstructions: updated.customInstructions
      }));
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
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
