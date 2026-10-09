import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_URL = 'http://localhost:5000/api/client';

async function runTest() {
  try {
    const keyRes = await fetch(`${API_URL}/generate-key`, { method: 'POST' });
    const { clientId } = await keyRes.json();
    
    if (!clientId) throw new Error('Failed to generate key');
    console.log(`Generated key: ${clientId}`);

    const htmlPath = path.resolve(__dirname, '../client/public/test-client.html');
    let htmlContent = await fs.readFile(htmlPath, 'utf8');
    htmlContent = htmlContent.replace('REPLACE_ME_CLIENT_ID', clientId);

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url() === 'http://test-store.local/test-client.html') {
        request.respond({
          status: 200,
          contentType: 'text/html',
          body: htmlContent
        });
      } else {
        request.continue();
      }
    });

    await page.goto('http://test-store.local/test-client.html', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    await browser.close();

    const connRes = await fetch(`${API_URL}/active-connections`);
    const connections = await connRes.json();
    
    const active = connections.find(c => c.clientId === clientId && c.status === 'Active');
    
    if (active) {
      console.log('SUCCESS: Connection successfully registered and active.');
    } else {
      console.error('FAILURE: Connection not found in active list.');
      process.exit(1);
    }
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

runTest();
