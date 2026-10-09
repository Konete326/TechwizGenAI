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
      // Hide chat widget temporarily
      chatWidget.style.display = 'none';
      chatPanel.style.display = 'none';
      
      const feUrl = scriptTag.getAttribute('data-frontend-url') || 'https://techwiz-gen-ai.vercel.app';
      
      // Create Loading Shimmer Overlay
      const loadingOverlay = document.createElement('div');
      loadingOverlay.style.position = 'fixed';
      loadingOverlay.style.bottom = window.innerWidth < 768 ? '0' : '20px';
      loadingOverlay.style.right = window.innerWidth < 768 ? '0' : '20px';
      loadingOverlay.style.width = window.innerWidth < 768 ? '100vw' : '370px';
      loadingOverlay.style.height = window.innerWidth < 768 ? '100vh' : '600px';
      loadingOverlay.style.background = 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)';
      loadingOverlay.style.borderRadius = window.innerWidth < 768 ? '0' : '24px';
      loadingOverlay.style.zIndex = '9999998';
      loadingOverlay.style.display = 'flex';
      loadingOverlay.style.flexDirection = 'column';
      loadingOverlay.style.alignItems = 'center';
      loadingOverlay.style.justifyContent = 'center';
      loadingOverlay.style.color = '#fff';
      loadingOverlay.style.fontFamily = 'sans-serif';
      loadingOverlay.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.5)';
      
      if (!document.getElementById('nisa-shimmer-style')) {
        const style = document.createElement('style');
        style.id = 'nisa-shimmer-style';
        style.innerHTML = `@keyframes nisaShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } } @keyframes nisaPulse { 0%, 100% { opacity: 0.8; } 50% { opacity: 0.4; } }`;
        document.head.appendChild(style);
      }
      
      const shimmerCircle = document.createElement('div');
      shimmerCircle.style.width = '70px';
      shimmerCircle.style.height = '70px';
      shimmerCircle.style.borderRadius = '50%';
      shimmerCircle.style.background = 'linear-gradient(90deg, rgba(59, 130, 246, 0.2) 25%, rgba(59, 130, 246, 0.5) 50%, rgba(59, 130, 246, 0.2) 75%)';
      shimmerCircle.style.backgroundSize = '200% 100%';
      shimmerCircle.style.animation = 'nisaShimmer 2s infinite linear';
      shimmerCircle.style.marginBottom = '24px';
      shimmerCircle.style.display = 'flex';
      shimmerCircle.style.alignItems = 'center';
      shimmerCircle.style.justifyContent = 'center';
      shimmerCircle.style.fontSize = '32px';
      shimmerCircle.innerHTML = '🤖';
      
      const shimmerText = document.createElement('div');
      shimmerText.innerText = 'Connecting to Nisa AI...';
      shimmerText.style.fontSize = '16px';
      shimmerText.style.fontWeight = '500';
      shimmerText.style.animation = 'nisaPulse 2s infinite ease-in-out';
      
      loadingOverlay.appendChild(shimmerCircle);
      loadingOverlay.appendChild(shimmerText);
      document.body.appendChild(loadingOverlay);

      const iframe = document.createElement('iframe');
      iframe.src = `${feUrl}/widget?clientId=${clientId}`;
      iframe.allow = "microphone; camera";
      iframe.style.position = 'fixed';
      iframe.style.bottom = window.innerWidth < 768 ? '0' : '20px';
      iframe.style.right = window.innerWidth < 768 ? '0' : '20px';
      iframe.style.width = window.innerWidth < 768 ? '100vw' : '370px';
      iframe.style.height = window.innerWidth < 768 ? '100vh' : '600px';
      iframe.style.border = 'none';
      iframe.style.zIndex = '9999999';
      iframe.style.background = 'transparent';
      iframe.style.colorScheme = 'normal';
      iframe.style.opacity = '0'; // Hidden initially
      iframe.style.transition = 'opacity 0.5s ease-in-out';
      
      document.body.appendChild(iframe);
      
      // Listen for messages from iframe
      const messageListener = (e) => {
         if (!e.data) return;
         if (e.data.type === 'NISA_IFRAME_READY') {
             iframe.style.opacity = '1';
             setTimeout(() => {
                 if(loadingOverlay) loadingOverlay.remove();
             }, 500);
         } else if (e.data.type === 'NISA_END_CALL') {
             iframe.remove();
             if(loadingOverlay) loadingOverlay.remove();
             chatWidget.style.display = 'flex';
             window.removeEventListener('message', messageListener);
         } else if (e.data.type === 'NISA_MINIMIZE') {
             if (window.innerWidth >= 768) {
                 iframe.style.width = '300px';
                 iframe.style.height = '100px';
             }
         } else if (e.data.type === 'NISA_EXPAND') {
             if (window.innerWidth >= 768) {
                 iframe.style.width = '370px';
                 iframe.style.height = '600px';
             }
         } else if (e.data.type === 'NISA_TOOL_CALL') {
             const { command, targetKey, value, route } = e.data;
             
             if (command === 'navigatePage' && route) {
                 window.location.href = route;
                 return;
             }
             
             if ((command === 'clickElement' || command === 'spotlightElement' || command === 'fillFormField') && targetKey) {
                 let el = null;
                 if (targetKey.startsWith('/') || targetKey.startsWith('//')) {
                     try {
                         const result = document.evaluate(targetKey, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                         el = result.singleNodeValue;
                     } catch(err) {}
                 } else {
                     el = document.querySelector(`[data-nisa-id="${targetKey}"], #${targetKey}, .${targetKey}, [name="${targetKey}"]`);
                 }
                 
                 if (el) {
                     if (command === 'clickElement') {
                         el.click();
                         // Flash element to show click
                         const oldBg = el.style.backgroundColor;
                         const oldTransition = el.style.transition;
                         el.style.transition = 'background-color 0.2s ease';
                         el.style.backgroundColor = 'rgba(59, 130, 246, 0.5)'; // blue-500 transparent
                         setTimeout(() => {
                             el.style.backgroundColor = oldBg;
                             setTimeout(() => el.style.transition = oldTransition, 200);
                         }, 300);
                     } else if (command === 'fillFormField') {
                         el.value = value || '';
                         el.dispatchEvent(new Event('input', { bubbles: true }));
                         el.dispatchEvent(new Event('change', { bubbles: true }));
                         el.focus();
                     } else if (command === 'spotlightElement') {
                         el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                         const oldBoxShadow = el.style.boxShadow;
                         const oldTransition = el.style.transition;
                         el.style.transition = 'box-shadow 0.3s ease';
                         el.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.8)';
                         setTimeout(() => {
                             el.style.boxShadow = oldBoxShadow;
                             setTimeout(() => el.style.transition = oldTransition, 300);
                         }, 2000);
                     }
                 }
             }
         }
      };
      window.addEventListener('message', messageListener);
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

  let lastSentMapHash = '';

  function getHash(str) {
    let hash = 0;
    for (let i = 0, len = str.length; i < len; i++) {
        let chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0;
    }
    return hash.toString();
  }

  async function syncDOM() {
    const map = parseDOM();
    const mapString = JSON.stringify(map);
    const hash = getHash(mapString);
    
    // Only send to API if the extracted semantic DOM actually changed
    if (hash === lastSentMapHash) return;
    
    try {
      const res = await fetch(syncHttpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, elementsCount: map.length, data: map })
      });
      if (res.ok) {
        lastSentMapHash = hash;
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
