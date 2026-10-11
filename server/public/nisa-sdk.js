(function() {
  const scriptTag = document.currentScript || document.querySelector('script[src*="nisa-sdk.js"]');
  const clientId = scriptTag ? scriptTag.getAttribute('data-client-id') : null;
  
  if (!clientId) {
    console.error('Nisa SDK: Missing data-client-id on script tag');
    return;
  }

  const scriptUrl = scriptTag && scriptTag.src ? new URL(scriptTag.src) : new URL(window.location.origin);
  const protocol = scriptUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = scriptUrl.host;
  const wsUrl = `${protocol}//${host}/tunnel?clientId=${clientId}`;
  const syncHttpUrl = `${scriptUrl.protocol}//${host}/api/client/sync`;
  
  let ws;
  let retryCount = 0;
  let observer;
  let debounceTimer;
  let serverFrontendUrl = 'https://techwiz-gen-ai.vercel.app';
  let clientConfig = null;

  let chatWidget;
  let chatPanel;
  let callButton;
  const learnedElements = new Map();

  function showLearnedPulse(el) {
    if (!el || typeof el.getBoundingClientRect !== 'function') return;
    const oldTransition = el.style.transition;
    const oldBoxShadow = el.style.boxShadow;
    el.style.transition = 'box-shadow 0.3s ease-in-out';
    el.style.boxShadow = '0 0 0 4px #10b981, 0 0 16px rgba(16, 185, 129, 0.6)';
    setTimeout(() => {
      el.style.boxShadow = oldBoxShadow;
      setTimeout(() => {
        el.style.transition = oldTransition;
      }, 300);
    }, 1200);
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

  function findElement(targetKey) {
    if (!targetKey) return null;
    let el = null;

    if (targetKey.startsWith('/') || targetKey.startsWith('//')) {
      try {
        const result = document.evaluate(targetKey, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        el = result.singleNodeValue;
        if (el) return el;
      } catch (err) {}
    }

    try {
      el = document.querySelector(`[data-nisa-id="${targetKey}"], #${CSS.escape(targetKey)}, [name="${CSS.escape(targetKey)}"]`);
      if (el) return el;
    } catch (err) {}

    try {
      el = document.querySelector(targetKey);
      if (el) return el;
    } catch (err) {}

    const lowerTarget = targetKey.toLowerCase().trim();
    const actionables = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="link"], [role="tab"], [role="menuitem"], .btn, .button, [onclick], [data-action]');
    for (const item of actionables) {
      const txt = (item.innerText || item.value || item.getAttribute('aria-label') || item.getAttribute('title') || '').toLowerCase().trim();
      if (txt === lowerTarget || (txt && lowerTarget.length > 2 && txt.includes(lowerTarget))) {
        return item;
      }
    }

    if (learnedElements.has(targetKey)) {
      const learned = learnedElements.get(targetKey);
      if (learned.xpath) {
        try {
          const res = document.evaluate(learned.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          if (res.singleNodeValue) return res.singleNodeValue;
        } catch (e) {}
      }
    }

    return null;
  }

  function createChatWidget() {
    if (chatWidget) return;
    
    chatWidget = document.createElement('div');
    chatWidget.id = 'nisa-chat-widget';
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
    chatWidget.innerHTML = `<img src="${serverFrontendUrl}/logo.png" style="width:100%;height:100%;object-fit:cover;border-radius:50%;animation: nisaRing 2s infinite;" alt="Nisa" />`;
    
    if (!document.getElementById('nisa-ring-style')) {
      const style = document.createElement('style');
      style.id = 'nisa-ring-style';
      style.innerHTML = `
      @keyframes nisaRing {
        0% { transform: rotate(0) scale(1); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7); }
        10% { transform: rotate(15deg) scale(1.1); }
        20% { transform: rotate(-15deg) scale(1.1); }
        30% { transform: rotate(15deg) scale(1.1); }
        40% { transform: rotate(-15deg) scale(1.1); }
        50% { transform: rotate(0) scale(1); box-shadow: 0 0 0 20px rgba(37, 99, 235, 0); }
        100% { transform: rotate(0) scale(1); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
      }`;
      document.head.appendChild(style);
    }
    
    chatPanel = document.createElement('div');
    chatPanel.id = 'nisa-chat-panel';
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
    
    callButton.onclick = async () => {
      chatWidget.style.display = 'none';
      chatPanel.style.display = 'none';

      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          if (navigator.permissions && navigator.permissions.query) {
            try {
              const status = await navigator.permissions.query({ name: 'microphone' });
              if (status.state !== 'granted') {
                const s = await navigator.mediaDevices.getUserMedia({ audio: true });
                s.getTracks().forEach((t) => t.stop());
              }
            } catch (e) {
              const s = await navigator.mediaDevices.getUserMedia({ audio: true });
              s.getTracks().forEach((t) => t.stop());
            }
          } else {
            const s = await navigator.mediaDevices.getUserMedia({ audio: true });
            s.getTracks().forEach((t) => t.stop());
          }
        } catch (err) {}
      }

      const existingWrapper = document.getElementById('nisa-iframe-wrapper');
      if (existingWrapper) {
        existingWrapper.style.display = 'flex';
        existingWrapper.style.opacity = '1';
        const existingIframe = existingWrapper.querySelector('iframe');
        if (existingIframe?.contentWindow) {
          existingIframe.contentWindow.postMessage({ type: 'NISA_START_CALL' }, '*');
        }
        return;
      }

      const feUrl = serverFrontendUrl;
      
      const loadingOverlay = document.createElement('div');
      loadingOverlay.id = 'nisa-loading-overlay';
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
      shimmerCircle.animation = 'nisaShimmer 2s infinite linear';
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

      const wrapper = document.createElement('div');
      wrapper.id = 'nisa-iframe-wrapper';
      wrapper.style.position = 'fixed';
      wrapper.style.bottom = window.innerWidth < 768 ? '0' : '20px';
      wrapper.style.right = window.innerWidth < 768 ? '0' : '20px';
      wrapper.style.width = window.innerWidth < 768 ? '100vw' : '370px';
      wrapper.style.height = window.innerWidth < 768 ? '100vh' : '624px';
      wrapper.style.zIndex = '9999999';
      wrapper.style.transition = 'opacity 0.5s ease-in-out';
      wrapper.style.opacity = '0';
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
      wrapper.style.borderRadius = '12px';
      
      const dragHeader = document.createElement('div');
      dragHeader.style.height = '24px';
      dragHeader.style.background = '#09090b';
      dragHeader.style.color = '#fff';
      dragHeader.style.fontSize = '12px';
      dragHeader.style.textAlign = 'center';
      dragHeader.style.cursor = 'move';
      dragHeader.style.borderRadius = '12px 12px 0 0';
      dragHeader.style.display = window.innerWidth < 768 ? 'none' : 'flex';
      dragHeader.style.alignItems = 'center';
      dragHeader.style.justifyContent = 'center';
      dragHeader.style.userSelect = 'none';
      dragHeader.innerHTML = '<span style="opacity:0.7">▤</span>';
      
      const iframe = document.createElement('iframe');
      iframe.src = `${feUrl}/widget?clientId=${clientId}`;
      const allowPolicy = "microphone *; camera *; autoplay *; clipboard-read; clipboard-write; display-capture *";
      iframe.allow = allowPolicy;
      iframe.setAttribute('allow', allowPolicy);
      iframe.setAttribute('allowusermedia', 'true');
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.flex = '1';
      iframe.style.border = 'none';
      iframe.style.background = 'transparent';
      iframe.style.colorScheme = 'normal';
      
      wrapper.appendChild(dragHeader);
      wrapper.appendChild(iframe);
      document.body.appendChild(wrapper);

      let isDragging = false, startX, startY, startRight, startBottom;
      dragHeader.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX; startY = e.clientY;
        const rect = wrapper.getBoundingClientRect();
        startRight = window.innerWidth - rect.right;
        startBottom = window.innerHeight - rect.bottom;
        iframe.style.pointerEvents = 'none';
      });
      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        wrapper.style.right = (startRight - (e.clientX - startX)) + 'px';
        wrapper.style.bottom = (startBottom - (e.clientY - startY)) + 'px';
      });
      window.addEventListener('mouseup', () => {
        isDragging = false;
        iframe.style.pointerEvents = 'auto';
      });
      
      const messageListener = (e) => {
        if (!e.data) return;
        if (e.data.type === 'NISA_IFRAME_READY') {
          wrapper.style.opacity = '1';
          setTimeout(() => {
            if (loadingOverlay) loadingOverlay.remove();
          }, 500);
        } else if (e.data.type === 'NISA_END_CALL') {
          wrapper.style.display = 'none';
          if (loadingOverlay) loadingOverlay.remove();
          chatWidget.style.display = 'flex';
        } else if (e.data.type === 'NISA_MINIMIZE') {
          if (window.innerWidth >= 768) {
            wrapper.style.width = '300px';
            wrapper.style.height = '124px';
          }
        } else if (e.data.type === 'NISA_EXPAND') {
          if (window.innerWidth >= 768) {
            wrapper.style.width = '370px';
            wrapper.style.height = '624px';
          }
        } else if (e.data.type === 'NISA_TOOL_CALL') {
          const { command, targetKey, value, route, args } = e.data;
          
          if (command === 'openDynamicModal' && args) {
            const m = document.createElement('div');
            m.id = 'nisa-dynamic-modal';
            m.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:24px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.2);z-index:9999999;max-width:90%;width:400px;font-family:sans-serif;color:#000;';
            m.innerHTML = `<h3 style="margin-top:0;font-size:18px;">${args.title||''}</h3><p style="white-space:pre-wrap;font-size:14px;color:#333;margin-bottom:0;">${args.content||''}</p><div style="text-align:right;margin-top:16px;"><button onclick="this.parentElement.parentElement.remove()" style="background:#09090b;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;">Close</button></div>`;
            document.body.appendChild(m);
            return;
          }
          if (command === 'closeModal') {
            const m = document.getElementById('nisa-dynamic-modal');
            if (m) m.remove();
            return;
          }
          
          if (command === 'navigatePage' && route) {
            window.location.href = route;
            return;
          }

          if (command === 'scrollPage') {
            window.scrollBy({ top: value || 400, behavior: 'smooth' });
            return;
          }
          
          if ((command === 'clickElement' || command === 'spotlightElement' || command === 'fillFormField' || command === 'selectOption' || command === 'submitForm') && targetKey) {
            const el = findElement(targetKey);
            
            if (el) {
              if (command === 'clickElement') {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
                el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
                el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                el.click();

                const oldBg = el.style.backgroundColor;
                const oldTransition = el.style.transition;
                el.style.transition = 'background-color 0.2s ease';
                el.style.backgroundColor = 'rgba(59, 130, 246, 0.5)';
                setTimeout(() => {
                  el.style.backgroundColor = oldBg;
                  setTimeout(() => { el.style.transition = oldTransition; }, 200);
                }, 300);
              } else if (command === 'fillFormField') {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.focus();
                el.value = value || '';
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
              } else if (command === 'selectOption') {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.value = value;
                el.dispatchEvent(new Event('change', { bubbles: true }));
              } else if (command === 'submitForm') {
                const form = el.tagName === 'FORM' ? el : el.closest('form');
                if (form) {
                  if (form.requestSubmit) form.requestSubmit();
                  else form.submit();
                }
              } else if (command === 'spotlightElement') {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const oldBoxShadow = el.style.boxShadow;
                const oldTransition = el.style.transition;
                el.style.transition = 'box-shadow 0.3s ease';
                el.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.8), 0 0 16px rgba(59, 130, 246, 0.5)';
                setTimeout(() => {
                  el.style.boxShadow = oldBoxShadow;
                  setTimeout(() => { el.style.transition = oldTransition; }, 300);
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

  function setupInteractionLearner() {
    document.addEventListener('click', (e) => {
      if (clientConfig && clientConfig.powers && clientConfig.powers.selfLearning === false) return;
      const target = e.target;
      if (!target || target === document.body || target === document.documentElement) return;
      if (target.closest && (target.closest('#nisa-iframe-wrapper') || target.closest('#nisa-chat-widget') || target.closest('#nisa-chat-panel') || target.closest('#nisa-dynamic-modal'))) {
        return;
      }

      const interactiveEl = target.closest('button, a, input, select, textarea, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="switch"], [role="checkbox"], [onclick], [data-action], .btn, .button') || target;
      
      const xpath = getXPath(interactiveEl);
      if (!xpath) return;

      const text = (interactiveEl.innerText || interactiveEl.value || interactiveEl.getAttribute('aria-label') || interactiveEl.getAttribute('title') || '').trim();
      const item = {
        element: interactiveEl.tagName.toLowerCase(),
        type: interactiveEl.type || undefined,
        text: text.substring(0, 100),
        clickable: true,
        xpath: xpath,
        learned: true,
        source: 'demonstrated',
        learnedAt: Date.now()
      };

      if (interactiveEl.id) item.id = interactiveEl.id;
      if (interactiveEl.name) item.name = interactiveEl.name;
      if (interactiveEl.placeholder) item.placeholder = interactiveEl.placeholder;
      if (interactiveEl.getAttribute('role')) item.role = interactiveEl.getAttribute('role');

      learnedElements.set(xpath, item);

      const wrapper = document.getElementById('nisa-iframe-wrapper');
      if (wrapper) {
        const ifr = wrapper.querySelector('iframe');
        if (ifr && ifr.contentWindow) {
          ifr.contentWindow.postMessage({
            type: 'NISA_ELEMENT_DEMONSTRATED',
            action: 'click',
            element: item
          }, '*');
        }
      }

      if (ws && ws.readyState === 1) {
        try {
          ws.send(JSON.stringify({
            type: 'element_demonstrated',
            action: 'click',
            element: item
          }));
        } catch (err) {}
      }

      showLearnedPulse(interactiveEl);
      syncDOM(true);
    }, true);

    document.addEventListener('change', (e) => {
      if (clientConfig && clientConfig.powers && clientConfig.powers.selfLearning === false) return;
      const target = e.target;
      if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'SELECT' && target.tagName !== 'TEXTAREA')) return;
      if (target.closest && (target.closest('#nisa-iframe-wrapper') || target.closest('#nisa-chat-widget') || target.closest('#nisa-chat-panel'))) {
        return;
      }

      const xpath = getXPath(target);
      if (!xpath) return;

      const item = {
        element: target.tagName.toLowerCase(),
        type: target.type || undefined,
        text: (target.value || target.placeholder || '').trim(),
        clickable: false,
        editable: true,
        xpath: xpath,
        learned: true,
        source: 'demonstrated',
        learnedAt: Date.now()
      };

      if (target.id) item.id = target.id;
      if (target.name) item.name = target.name;
      if (target.placeholder) item.placeholder = target.placeholder;

      learnedElements.set(xpath, item);

      const wrapper = document.getElementById('nisa-iframe-wrapper');
      if (wrapper) {
        const ifr = wrapper.querySelector('iframe');
        if (ifr && ifr.contentWindow) {
          ifr.contentWindow.postMessage({
            type: 'NISA_ELEMENT_DEMONSTRATED',
            action: 'input',
            element: item
          }, '*');
        }
      }

      syncDOM(true);
    }, true);
  }

  function connect() {
    createChatWidget();
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      retryCount = 0;
      if (callButton) callButton.innerHTML = '🔴 End Call';
    };

    ws.onclose = () => {
      setTimeout(connect, Math.min(1000 * Math.pow(2, retryCount++), 10000));
    };

    ws.onerror = (err) => {
      console.error('Nisa SDK Voice WebSocket error:', err);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'config_updated') {
          clientConfig = clientConfig || {};
          if (msg.powers) clientConfig.powers = msg.powers;
          if (msg.appCategory) clientConfig.appCategory = msg.appCategory;
          if (msg.customInstructions) clientConfig.customInstructions = msg.customInstructions;
          return;
        }
        if (msg.type === 'request_dom_sync' || msg.command === 'rescan_dom') {
          syncDOM(true);
        }
        if (msg.command === 'click' && (msg.selector || msg.xpath || msg.targetKey)) {
          const el = findElement(msg.selector || msg.xpath || msg.targetKey);
          if (el) el.click();
        }
      } catch (e) {}
    };
  }

  function parseDOM() {
    const semanticMap = [];
    const seenXPaths = new Set();
    
    const actionableSelector = 'button, a, input, select, textarea, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="switch"], [role="checkbox"], [onclick], [data-action], [data-nisa-id], [data-clickable], [contenteditable="true"], .btn, .button';
    const actionables = document.querySelectorAll(actionableSelector);
    
    actionables.forEach(el => {
      if (el.closest && (el.closest('#nisa-iframe-wrapper') || el.closest('#nisa-chat-widget') || el.closest('#nisa-chat-panel') || el.closest('#nisa-dynamic-modal'))) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      
      const xpath = getXPath(el);
      if (!xpath || seenXPaths.has(xpath)) return;
      seenXPaths.add(xpath);

      const item = {
        element: el.tagName.toLowerCase(),
        type: el.type || undefined,
        text: (el.innerText?.trim() || el.value || el.getAttribute('aria-label') || el.getAttribute('title') || '').substring(0, 100),
        clickable: true,
        xpath: xpath
      };
      
      if (el.getAttribute('aria-label')) item.ariaLabel = el.getAttribute('aria-label');
      if (el.getAttribute('alt')) item.alt = el.getAttribute('alt');
      if (el.name) item.name = el.name;
      if (el.placeholder) item.placeholder = el.placeholder;
      if (el.href) item.href = el.href;
      if (el.getAttribute('role')) item.role = el.getAttribute('role');
      if (el.id) item.id = el.id;
      
      semanticMap.push(item);
    });

    try {
      const candidates = document.querySelectorAll('div, span, i, svg, li');
      candidates.forEach(el => {
        if (seenXPaths.has(getXPath(el))) return;
        if (el.closest && (el.closest('#nisa-iframe-wrapper') || el.closest('#nisa-chat-widget') || el.closest('#nisa-chat-panel'))) return;
        if (el.children.length > 2) return;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const style = window.getComputedStyle(el);
        if (style.cursor === 'pointer') {
          const xpath = getXPath(el);
          if (xpath && !seenXPaths.has(xpath)) {
            seenXPaths.add(xpath);
            const txt = (el.innerText?.trim() || el.getAttribute('aria-label') || el.getAttribute('title') || '').substring(0, 100);
            if (txt) {
              semanticMap.push({
                element: el.tagName.toLowerCase(),
                text: txt,
                clickable: true,
                xpath: xpath
              });
            }
          }
        }
      });
    } catch (e) {}

    const readableSelector = 'h1, h2, h3, h4, h5, h6, p, label, td, th, li, .badge, .status, .card-title';
    const readables = document.querySelectorAll(readableSelector);
    readables.forEach(el => {
      if (el.closest && (el.closest('#nisa-iframe-wrapper') || el.closest('#nisa-chat-widget') || el.closest('#nisa-chat-panel'))) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      if (el.children.length > 2) return; 
      
      const xpath = getXPath(el);
      if (!xpath || seenXPaths.has(xpath)) return;
      
      const text = el.innerText?.trim();
      if (!text) return;
      seenXPaths.add(xpath);
      
      semanticMap.push({
        element: el.tagName.toLowerCase(),
        text: text.substring(0, 150),
        xpath: xpath
      });
    });

    learnedElements.forEach((learnedItem, xpathKey) => {
      if (!seenXPaths.has(xpathKey)) {
        seenXPaths.add(xpathKey);
        semanticMap.unshift(learnedItem);
      } else {
        const found = semanticMap.find(m => m.xpath === xpathKey);
        if (found) {
          found.learned = true;
          found.source = 'demonstrated';
        }
      }
    });

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

  async function syncDOM(force = false) {
    if (clientConfig && clientConfig.powers && clientConfig.powers.autoCapture === false) return;
    const map = parseDOM();
    const mapString = JSON.stringify(map);
    const hash = getHash(mapString);
    
    if (!force && hash === lastSentMapHash) return;

    if (ws && ws.readyState === 1) {
      try {
        ws.send(JSON.stringify({ type: 'dom_sync', elementsCount: map.length, data: map }));
      } catch (err) {}
    }
    
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
        debounceTimer = setTimeout(syncDOM, 250);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  async function initSDK() {
    if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      console.warn('Nisa SDK: Host page is running in an insecure context (HTTP). Browsers require HTTPS to remember microphone permissions permanently.');
    }

    try {
      const configRes = await fetch(`${scriptUrl.protocol}//${host}/api/client/config/${clientId}`);
      if (configRes.ok) {
        const config = await configRes.json();
        if (config.success && config.data) {
          clientConfig = config.data;
          if (config.data.frontendUrl) {
            serverFrontendUrl = config.data.frontendUrl;
          }
        }
      }
    } catch (e) {
      console.warn("Nisa SDK: Could not fetch remote config, using fallback.");
    }
    
    setupInteractionLearner();
    setupObserver();
    syncDOM();
    connect();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSDK);
  } else {
    initSDK();
  }
})();
