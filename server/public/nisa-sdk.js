(function() {
  const scriptTag = document.currentScript || document.querySelector('script[src*="nisa-sdk.js"]');
  const clientId = scriptTag ? scriptTag.getAttribute('data-client-id') : null;
  
  if (!clientId) {
    console.error('Nisa SDK: Missing data-client-id on script tag');
    return;
  }

  const scriptUrl = scriptTag && scriptTag.src ? new URL(scriptTag.src) : new URL(window.location.origin);
  const protocol = scriptUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  // Use the API's port if running locally, otherwise fallback to the host
  const host = scriptUrl.host;
  const wsUrl = `${protocol}//${host}/tunnel?clientId=${clientId}`;
  const syncHttpUrl = `${scriptUrl.protocol}//${host}/api/client/sync`;
  
  let ws;
  let retryCount = 0;
  let observer;
  let debounceTimer;
  let indicator;

  function createIndicator() {
    if (indicator) return;
    indicator = document.createElement('div');
    indicator.style.position = 'fixed';
    indicator.style.bottom = '10px';
    indicator.style.right = '10px';
    indicator.style.padding = '6px 12px';
    indicator.style.background = '#fef2f2';
    indicator.style.color = '#ef4444';
    indicator.style.border = '1px solid #fca5a5';
    indicator.style.borderRadius = '20px';
    indicator.style.fontSize = '12px';
    indicator.style.fontWeight = 'bold';
    indicator.style.zIndex = '999999';
    indicator.style.fontFamily = 'sans-serif';
    indicator.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    indicator.style.transition = 'all 0.3s ease';
    indicator.innerHTML = '🔴 Nisa: Disconnected';
    document.body.appendChild(indicator);
  }

  function updateIndicator(status) {
    if (!indicator) createIndicator();
    if (status === 'connected') {
      indicator.style.background = '#f0fdf4';
      indicator.style.color = '#22c55e';
      indicator.style.border = '1px solid #86efac';
      indicator.innerHTML = '🟢 Nisa: Connected & Syncing';
    } else {
      indicator.style.background = '#fef2f2';
      indicator.style.color = '#ef4444';
      indicator.style.border = '1px solid #fca5a5';
      indicator.innerHTML = '🔴 Nisa: Disconnected';
    }
  }

  function connect() {
    createIndicator();
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('Nisa Semantic Engine: Voice WebSocket Connected.');
      retryCount = 0;
    };

    ws.onclose = () => {
      console.log('Nisa Semantic Engine: Voice WebSocket Disconnected. Reconnecting...');
      setTimeout(connect, Math.min(1000 * Math.pow(2, retryCount++), 10000));
    };

    ws.onerror = (err) => {
      console.error('Nisa SDK Voice WebSocket error:', err);
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.command === 'click' && msg.selector) {
          const el = document.querySelector(msg.selector);
          if (el) el.click();
        }
      } catch (e) {}
    };
  }

  function getXPath(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el.id) return `//*[@id="${el.id}"]`;
    const paths = [];
    for (; el && el.nodeType === 1; el = el.parentNode) {
      let index = 0;
      for (let sibling = el.previousSibling; sibling; sibling = sibling.previousSibling) {
        if (sibling.nodeType === document.ELEMENT_NODE && sibling.tagName === el.tagName) {
          index++;
        }
      }
      const tagName = el.tagName.toLowerCase();
      const pathIndex = index ? `[${index + 1}]` : '';
      paths.splice(0, 0, tagName + pathIndex);
    }
    return paths.length ? '/' + paths.join('/') : null;
  }

  function parseDOM() {
    const semanticMap = [];
    
    // Actionable Elements
    const actionables = document.querySelectorAll('button, a, input, select, textarea');
    actionables.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      
      const item = {
        element: el.tagName.toLowerCase(),
        type: el.type || undefined,
        text: el.innerText?.trim() || el.value || '',
        clickable: true,
        xpath: getXPath(el)
      };
      
      if (el.getAttribute('aria-label')) item.ariaLabel = el.getAttribute('aria-label');
      if (el.getAttribute('alt')) item.alt = el.getAttribute('alt');
      if (el.name) item.name = el.name;
      if (el.placeholder) item.placeholder = el.placeholder;
      if (el.href) item.href = el.href;
      
      semanticMap.push(item);
    });

    // Readable context
    const readables = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, label, td, th, li');
    readables.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      
      // Avoid duplicate texts if parent already grabbed it
      if (el.children.length > 2) return; 
      
      const text = el.innerText?.trim();
      if (!text) return;
      
      semanticMap.push({
        element: el.tagName.toLowerCase(),
        text: text,
        xpath: getXPath(el)
      });
    });

    return semanticMap;
  }

  async function syncDOM() {
    const map = parseDOM();
    try {
      const res = await fetch(syncHttpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, elementsCount: map.length, data: map })
      });
      if (res.ok) {
        updateIndicator('connected');
      } else {
        updateIndicator('disconnected');
      }
    } catch (e) {
      updateIndicator('disconnected');
    }
  }

  function setupObserver() {
    if (observer) observer.disconnect();
    
    observer = new MutationObserver((mutations) => {
      let shouldSync = false;
      for (const m of mutations) {
        if (m.type === 'childList' || m.type === 'characterData') {
          shouldSync = true;
          break;
        }
      }
      if (shouldSync) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(syncDOM, 200); // 200ms debounce
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  // Initial connection delay slightly to ensure DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupObserver();
      syncDOM();
      connect(); // Try websocket for voice (may fail on Vercel, but won't stop DOM sync)
    });
  } else {
    setupObserver();
    syncDOM();
    connect();
  }
})();
