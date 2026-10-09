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
  
  let ws;
  let retryCount = 0;
  let observer;
  let debounceTimer;

  function connect() {
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('Nisa Semantic Engine: Connected and reading DOM.');
      retryCount = 0;
      syncDOM();
      setupObserver();
    };

    ws.onclose = () => {
      console.log('Nisa Semantic Engine: Disconnected. Reconnecting...');
      if (observer) observer.disconnect();
      setTimeout(connect, Math.min(1000 * Math.pow(2, retryCount++), 10000));
    };

    ws.onerror = (err) => {
      console.error('Nisa SDK WebSocket error:', err);
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

  function syncDOM() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const map = parseDOM();
    ws.send(JSON.stringify({ type: 'dom_sync', elementsCount: map.length, data: map }));
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
    document.addEventListener('DOMContentLoaded', connect);
  } else {
    connect();
  }
})();
