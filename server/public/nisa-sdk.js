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

  let chatWidget;
  let chatPanel;
  let callButton;
  
  function createChatWidget() {
    if (chatWidget) return;
    
    // Floating Button
    chatWidget = document.createElement('div');
    chatWidget.style.position = 'fixed';
    chatWidget.style.bottom = '20px';
    chatWidget.style.right = '20px';
    chatWidget.style.width = '60px';
    chatWidget.style.height = '60px';
    chatWidget.style.background = '#2563eb';
    chatWidget.style.borderRadius = '50%';
    chatWidget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
    chatWidget.style.cursor = 'pointer';
    chatWidget.style.zIndex = '999999';
    chatWidget.style.display = 'flex';
    chatWidget.style.alignItems = 'center';
    chatWidget.style.justifyContent = 'center';
    chatWidget.style.color = '#fff';
    chatWidget.style.fontSize = '24px';
    chatWidget.innerHTML = '🤖';
    
    // Chat Panel
    chatPanel = document.createElement('div');
    chatPanel.style.position = 'fixed';
    chatPanel.style.bottom = '90px';
    chatPanel.style.right = '20px';
    chatPanel.style.width = '300px';
    chatPanel.style.background = '#fff';
    chatPanel.style.borderRadius = '12px';
    chatPanel.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.2)';
    chatPanel.style.zIndex = '999998';
    chatPanel.style.display = 'none';
    chatPanel.style.flexDirection = 'column';
    chatPanel.style.overflow = 'hidden';
    chatPanel.style.fontFamily = 'sans-serif';
    
    const header = document.createElement('div');
    header.style.background = '#2563eb';
    header.style.color = '#fff';
    header.style.padding = '15px';
    header.style.fontWeight = 'bold';
    header.innerHTML = 'Nisa Assistant <span id="nisa-status-dot" style="display:inline-block;width:8px;height:8px;background:#ef4444;border-radius:50%;margin-left:8px;"></span>';
    
    const body = document.createElement('div');
    body.style.padding = '20px';
    body.style.textAlign = 'center';
    
    callButton = document.createElement('button');
    callButton.innerHTML = '📞 Call Nisa';
    callButton.style.background = '#10b981';
    callButton.style.color = '#fff';
    callButton.style.border = 'none';
    callButton.style.padding = '12px 24px';
    callButton.style.borderRadius = '24px';
    callButton.style.fontWeight = 'bold';
    callButton.style.cursor = 'pointer';
    callButton.style.width = '100%';
    callButton.style.fontSize = '16px';
    
    callButton.onclick = () => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        callButton.innerHTML = 'Calling...';
        connect();
      } else {
        alert('Voice call is active! (Audio streaming requires microphone permissions)');
      }
    };
    
    body.appendChild(callButton);
    chatPanel.appendChild(header);
    chatPanel.appendChild(body);
    
    document.body.appendChild(chatWidget);
    document.body.appendChild(chatPanel);
    
    chatWidget.onclick = () => {
      chatPanel.style.display = chatPanel.style.display === 'none' ? 'flex' : 'none';
    };
  }

  function updateIndicator(status) {
    if (!chatWidget) createChatWidget();
    const dot = document.getElementById('nisa-status-dot');
    if (!dot) return;
    
    if (status === 'connected') {
      dot.style.background = '#4ade80';
    } else {
      dot.style.background = '#ef4444';
    }
  }

  function connect() {
    createChatWidget();
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('Nisa Semantic Engine: Voice WebSocket Connected.');
      retryCount = 0;
      if (callButton) callButton.innerHTML = '🔴 End Call';
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

    // Fallback: If page is completely empty but has body text
    if (semanticMap.length === 0 && document.body.innerText.trim()) {
       semanticMap.push({
         element: 'body',
         text: document.body.innerText.trim().substring(0, 500),
         xpath: '/html/body'
       });
    }

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
