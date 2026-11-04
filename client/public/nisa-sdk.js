(function() {
  const scriptTag = document.currentScript || document.querySelector('script[src*="nisa-sdk.js"]');
  let clientId = scriptTag ? scriptTag.getAttribute('data-client-id') : null;

  const scriptUrl = scriptTag && scriptTag.src ? new URL(scriptTag.src) : new URL(window.location.origin);
  const protocol = scriptUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = scriptUrl.host;
  let wsUrl = clientId ? `${protocol}//${host}/tunnel?clientId=${clientId}` : `${protocol}//${host}/tunnel`;
  let syncHttpUrl = `${scriptUrl.protocol}//${host}/api/client/sync`;
  
  let ws;
  let retryCount = 0;
  let observer;
  let debounceTimer;
  let serverFrontendUrl = (scriptUrl && scriptUrl.origin && scriptUrl.origin !== 'null') ? scriptUrl.origin : 'https://techwiz-gen-ai.vercel.app';
  let clientConfig = null;
  let sdkPaused = false;
  let customProjectAdapter = null;
  let activeModelUrl = '/models/nisa.vrm';

  let chatWidget;
  let chatPanel;
  let callButton;
  const learnedElements = new Map();
  const registeredXPaths = new Set();
  const registeredIds = new Set();

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
    if (customProjectAdapter && typeof customProjectAdapter.resolveElement === 'function') {
      try {
        const customEl = customProjectAdapter.resolveElement(targetKey);
        if (customEl) return customEl;
      } catch {
        void 0;
      }
    }

    if (targetKey.startsWith('/') || targetKey.startsWith('//')) {
      try {
        const result = document.evaluate(targetKey, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        if (result.singleNodeValue) return result.singleNodeValue;
      } catch {
        void 0;
      }
    }

    try {
      const el = document.querySelector(`[data-nesa-target="${targetKey}"], [data-nisa-id="${targetKey}"], [data-testid="${targetKey}"], [data-action="${targetKey}"], #${CSS.escape(targetKey)}, [name="${CSS.escape(targetKey)}"]`);
      if (el) return el;
    } catch {
      void 0;
    }

    try {
      const el = document.querySelector(targetKey);
      if (el) return el;
    } catch {
      void 0;
    }

    const lowerTarget = targetKey.toLowerCase().trim();
    const actionables = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="switch"], [role="checkbox"], .btn, .button, [onclick], [data-action]');
    for (const item of actionables) {
      const txt = (item.innerText || item.value || item.getAttribute('aria-label') || item.getAttribute('title') || item.getAttribute('placeholder') || '').toLowerCase().trim();
      if (txt === lowerTarget || (txt && lowerTarget.length > 2 && (txt.includes(lowerTarget) || lowerTarget.includes(txt)))) {
        return item;
      }
    }

    if (learnedElements.has(targetKey)) {
      const learned = learnedElements.get(targetKey);
      if (learned.xpath) {
        try {
          const res = document.evaluate(learned.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          if (res.singleNodeValue) return res.singleNodeValue;
        } catch {
          void 0;
        }
      }
    }

    for (const [xp, learned] of learnedElements.entries()) {
      const lText = (learned.text || '').toLowerCase().trim();
      if (lText && (lText === lowerTarget || lText.includes(lowerTarget))) {
        try {
          const res = document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          if (res.singleNodeValue) return res.singleNodeValue;
        } catch {
          void 0;
        }
      }
    }

    return null;
  }

  function showVisualSpotlight(el, label) {
    if (!el || typeof el.getBoundingClientRect !== 'function') return;
    const oldSpotlight = document.getElementById('nisa-spotlight-container');
    if (oldSpotlight) oldSpotlight.remove();

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const container = document.createElement('div');
    container.id = 'nisa-spotlight-container';
    container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999990;overflow:hidden;';

    const backdrop = document.createElement('div');
    backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.22);backdrop-filter:blur(2px);pointer-events:auto;transition:opacity 0.3s ease;';
    backdrop.onclick = () => container.remove();

    const ring = document.createElement('div');
    ring.id = 'nisa-spotlight-ring';
    ring.style.cssText = 'position:fixed;border:2px solid #3b82f6;border-radius:10px;box-shadow:0 0 0 4px rgba(59,130,246,0.5), 0 0 30px rgba(59,130,246,0.7);pointer-events:none;transition:all 0.2s ease;';

    const tooltip = document.createElement('div');
    tooltip.style.cssText = 'position:fixed;background:#09090b;border:1px solid rgba(59,130,246,0.6);color:#fff;padding:6px 14px;border-radius:8px;font-size:12px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-shadow:0 10px 25px rgba(0,0,0,0.5);pointer-events:none;white-space:nowrap;z-index:9999992;';
    tooltip.innerText = label || 'Highlighted Feature';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999991;';
    svg.innerHTML = `
      <defs>
        <marker id="nisa-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#60a5fa" />
        </marker>
      </defs>
      <path id="nisa-arrow-path" stroke="#60a5fa" stroke-width="2.5" fill="none" marker-end="url(#nisa-arrow)" stroke-dasharray="8 4">
        <animate attributeName="stroke-dashoffset" from="24" to="0" dur="0.8s" repeatCount="indefinite" />
      </path>
    `;

    container.appendChild(backdrop);
    container.appendChild(svg);
    container.appendChild(ring);
    container.appendChild(tooltip);
    document.body.appendChild(container);

    function updatePos() {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      ring.style.top = Math.max(0, rect.top - 6) + 'px';
      ring.style.left = Math.max(0, rect.left - 6) + 'px';
      ring.style.width = (rect.width + 12) + 'px';
      ring.style.height = (rect.height + 12) + 'px';

      const ttTop = rect.top > 60 ? (rect.top - 38) : (rect.bottom + 12);
      const ttLeft = Math.max(16, Math.min(window.innerWidth - 220, rect.left + rect.width / 2 - 60));
      tooltip.style.top = ttTop + 'px';
      tooltip.style.left = ttLeft + 'px';

      const wrapper = document.getElementById('nisa-iframe-wrapper');
      let sx = window.innerWidth - 60, sy = window.innerHeight - 60;
      if (wrapper) {
        const wr = wrapper.getBoundingClientRect();
        sx = wr.left + wr.width / 2;
        sy = wr.top + 30;
      }
      const tx = rect.left + rect.width / 2;
      const ty = rect.top + rect.height / 2;
      const dx = tx - sx, dy = ty - sy;
      const p1x = sx + dx * 0.35 + (dy > 0 ? -25 : 25);
      const p1y = sy + dy * 0.35 + (dx > 0 ? 25 : -25);
      const p2x = sx + dx * 0.65 + (dy > 0 ? 25 : -25);
      const p2y = sy + dy * 0.65 + (dx > 0 ? -25 : 25);
      const pathEl = document.getElementById('nisa-arrow-path');
      if (pathEl) {
        pathEl.setAttribute('d', `M ${sx} ${sy} C ${p1x} ${p1y}, ${p2x} ${p2y}, ${tx} ${ty}`);
      }
    }

    setTimeout(updatePos, 80);
    setTimeout(updatePos, 300);
    window.addEventListener('scroll', updatePos, { passive: true, capture: true });
    window.addEventListener('resize', updatePos, { passive: true });

    setTimeout(() => {
      window.removeEventListener('scroll', updatePos, { capture: true });
      window.removeEventListener('resize', updatePos);
      if (container.parentNode) container.remove();
    }, 5000);
  }

  function createChatWidget() {
    if (chatWidget) return;
    
    chatWidget = document.createElement('div');
    chatWidget.id = 'nisa-chat-widget';
    chatWidget.style.position = 'fixed';
    chatWidget.style.bottom = '24px';
    chatWidget.style.right = '24px';
    chatWidget.style.width = '56px';
    chatWidget.style.height = '56px';
    chatWidget.style.background = '#09090b';
    chatWidget.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    chatWidget.style.borderRadius = '50%';
    chatWidget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)';
    chatWidget.style.cursor = 'pointer';
    chatWidget.style.zIndex = '999999';
    chatWidget.style.display = 'flex';
    chatWidget.style.alignItems = 'center';
    chatWidget.style.justifyContent = 'center';
    chatWidget.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
    chatWidget.innerHTML = `
      <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
        <img src="${serverFrontendUrl}/logo.png" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="Nisa" />
        <span id="nisa-status-dot" style="position:absolute;bottom:0;right:0;width:10px;height:10px;background:#10b981;border:2px solid #09090b;border-radius:50%;"></span>
      </div>
    `;
    chatWidget.onmouseenter = () => {
      chatWidget.style.transform = 'scale(1.06)';
      chatWidget.style.boxShadow = '0 15px 30px -5px rgba(37, 99, 235, 0.4)';
    };
    chatWidget.onmouseleave = () => {
      chatWidget.style.transform = 'scale(1)';
      chatWidget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.4)';
    };
    
    chatPanel = document.createElement('div');
    chatPanel.id = 'nisa-chat-panel';
    chatPanel.style.position = 'fixed';
    chatPanel.style.bottom = '92px';
    chatPanel.style.right = '24px';
    chatPanel.style.width = '300px';
    chatPanel.style.background = '#09090b';
    chatPanel.style.border = '1px solid rgba(255, 255, 255, 0.12)';
    chatPanel.style.borderRadius = '16px';
    chatPanel.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.5)';
    chatPanel.style.zIndex = '999998';
    chatPanel.style.display = 'none';
    chatPanel.style.flexDirection = 'column';
    chatPanel.style.overflow = 'hidden';
    chatPanel.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    chatPanel.style.color = '#fff';
    
    const header = document.createElement('div');
    header.style.padding = '16px 18px 12px 18px';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.08)';
    header.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <img src="${serverFrontendUrl}/logo.png" style="width:28px;height:28px;border-radius:50%;object-fit:cover;" alt="Nisa" />
        <div>
          <div style="font-size:14px;font-weight:600;color:#f4f4f5;line-height:1.2;">Nisa Copilot</div>
          <div style="font-size:11px;color:#a1a1aa;">Autonomous AI Assistant</div>
        </div>
      </div>
      <span style="font-size:11px;color:#10b981;background:rgba(16,185,129,0.12);padding:2px 8px;border-radius:9999px;font-weight:500;">Ready</span>
    `;
    
    const body = document.createElement('div');
    body.style.padding = '16px 18px';

    const desc = document.createElement('div');
    desc.style.fontSize = '12.5px';
    desc.style.color = '#a1a1aa';
    desc.style.lineHeight = '1.45';
    desc.style.marginBottom = '14px';
    desc.innerText = 'Talk with Nisa to navigate screens, click controls, fill forms, and operate this system by voice.';
    
    callButton = document.createElement('button');
    callButton.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
      </svg>
      Start Voice Call
    `;
    callButton.style.background = '#2563eb';
    callButton.style.color = '#fff';
    callButton.style.border = 'none';
    callButton.style.padding = '11px 18px';
    callButton.style.borderRadius = '10px';
    callButton.style.fontWeight = '600';
    callButton.style.fontSize = '13.5px';
    callButton.style.cursor = 'pointer';
    callButton.style.width = '100%';
    callButton.style.display = 'flex';
    callButton.style.alignItems = 'center';
    callButton.style.justifyContent = 'center';
    callButton.style.transition = 'background 0.2s ease';
    callButton.onmouseenter = () => { callButton.style.background = '#1d4ed8'; };
    callButton.onmouseleave = () => { callButton.style.background = '#2563eb'; };
    
    callButton.onclick = () => {
      chatWidget.style.display = 'none';
      chatPanel.style.display = 'none';

      const existingWrapper = document.getElementById('nisa-iframe-wrapper');
      if (existingWrapper) {
        existingWrapper.remove();
      }

      const feUrl = serverFrontendUrl;
      
      const loadingOverlay = document.createElement('div');
      loadingOverlay.id = 'nisa-loading-overlay';
      loadingOverlay.style.position = 'fixed';
      loadingOverlay.style.bottom = window.innerWidth < 768 ? '0' : '20px';
      loadingOverlay.style.right = window.innerWidth < 768 ? '0' : '20px';
      loadingOverlay.style.width = window.innerWidth < 768 ? '100vw' : '370px';
      loadingOverlay.style.height = window.innerWidth < 768 ? '100vh' : '624px';
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
      
      const shimmerCircle = document.createElement('div');
      shimmerCircle.style.width = '70px';
      shimmerCircle.style.height = '70px';
      shimmerCircle.style.borderRadius = '50%';
      shimmerCircle.style.background = 'linear-gradient(90deg, rgba(59, 130, 246, 0.2) 25%, rgba(59, 130, 246, 0.5) 50%, rgba(59, 130, 246, 0.2) 75%)';
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
      wrapper.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      wrapper.style.opacity = '1';
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
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
      iframe.src = `${feUrl}/widget?clientId=${clientId}&parentOrigin=${encodeURIComponent(window.location.origin)}`;
      const allowPolicy = "microphone *; camera *; autoplay *; clipboard-write; display-capture *; screen-wake-lock *";
      iframe.allow = allowPolicy;
      iframe.setAttribute('allow', allowPolicy);
      iframe.setAttribute('allowusermedia', 'true');
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.flex = '1';
      iframe.style.border = 'none';
      iframe.style.background = 'transparent';
      iframe.style.colorScheme = 'normal';

      iframe.onload = () => {
        wrapper.style.opacity = '1';
        setTimeout(() => {
          if (loadingOverlay && loadingOverlay.parentNode) loadingOverlay.remove();
        }, 300);
      };
      
      wrapper.appendChild(dragHeader);
      wrapper.appendChild(iframe);

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
      
      const getIframeOrigin = () => {
        try {
          const origin = new URL(iframe.src, window.location.href).origin;
          if (origin && origin !== 'null' && origin !== '*') {
            const u = new URL(origin);
            if (u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'chrome-extension:') {
              return origin;
            }
          }
          return '';
        } catch {
          return '';
        }
      };

      const postToIframe = (msg) => {
        const targetOrigin = getIframeOrigin();
        if (!targetOrigin || !iframe || !iframe.contentWindow) return false;
        try {
          iframe.contentWindow.postMessage(msg, targetOrigin);
          return true;
        } catch {
          return false;
        }
      };

      const messageListener = (e) => {
        if (!e.data) return;
        if (e.source !== iframe.contentWindow) return;
        const expectedOrigin = getIframeOrigin();
        if (!expectedOrigin || e.origin !== expectedOrigin) return;
        if (e.data.type === 'NISA_IFRAME_READY') {
          wrapper.style.opacity = '1';
          if (loadingOverlay && loadingOverlay.parentNode) loadingOverlay.remove();
        } else if (e.data.type === 'NISA_END_CALL') {
          window.removeEventListener('message', messageListener);
          wrapper.remove();
          if (loadingOverlay && loadingOverlay.parentNode) loadingOverlay.remove();
          chatWidget.style.display = 'flex';
          const oldSpotlight = document.getElementById('nisa-spotlight-container');
          if (oldSpotlight) oldSpotlight.remove();
          const activeModal = document.getElementById('nisa-dynamic-modal');
          if (activeModal) {
            if (typeof activeModal._cleanupModal === 'function') {
              activeModal._cleanupModal(true);
            } else {
              activeModal.remove();
            }
          }
        } else if (e.data.type === 'NISA_MINIMIZE') {
          wrapper.style.width = window.innerWidth < 768 ? '100vw' : '300px';
          wrapper.style.height = '124px';
        } else if (e.data.type === 'NISA_EXPAND') {
          wrapper.style.width = window.innerWidth < 768 ? '100vw' : '370px';
          wrapper.style.height = window.innerWidth < 768 ? '100vh' : '624px';
        } else if (e.data.type === 'NISA_MODAL_RESULT') {
          const modal = document.getElementById('nisa-dynamic-modal');
          if (!modal || modal.dataset.requestId !== e.data.requestId) return;
          if (typeof modal._clearAcceptanceTimer === 'function') {
            modal._clearAcceptanceTimer();
          }
          const responseBox = document.getElementById('nisa-modal-text-content');
          const statusLabel = document.getElementById('nisa-modal-status');
          const input = document.getElementById('nisa-modal-input');
          const submitBtn = document.getElementById('nisa-modal-submit');
          const pasteBtn = document.getElementById('nisa-modal-paste-btn');
          if (e.data.status === 'accepted') {
            if (statusLabel) statusLabel.textContent = 'Nisa is working on your request...';
          } else if (e.data.status === 'stream') {
            if (responseBox) {
              if (!modal.dataset.hasResponse) responseBox.textContent = '';
              responseBox.textContent += e.data.text || '';
              modal.dataset.hasResponse = 'true';
              responseBox.scrollTop = responseBox.scrollHeight;
            }
            if (statusLabel) statusLabel.textContent = 'Working...';
          } else if (e.data.status === 'complete') {
            modal.dataset.completed = 'true';
            modal.dataset.requestId = '';
            if (!modal.dataset.hasResponse && responseBox) {
              responseBox.textContent = 'Nisa completed your request.';
            }
            if (statusLabel) statusLabel.textContent = 'Completed';
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = 'Close';
            }
            if (pasteBtn) pasteBtn.disabled = true;
          } else if (e.data.status === 'error' || e.data.status === 'interrupted' || e.data.status === 'timeout') {
            if (statusLabel) statusLabel.textContent = e.data.message || (e.data.status === 'interrupted' ? 'Nisa was interrupted. Please try again.' : 'Nisa could not process this request.');
            modal.dataset.requestId = '';
            modal.dataset.hasResponse = '';
            if (input) input.disabled = false;
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = 'Try Again';
            }
            if (pasteBtn) pasteBtn.disabled = false;
          }
        } else if (e.data.type === 'NISA_TOOL_CALL') {
          const { command, targetKey, value, route, args } = e.data;

          if (clientConfig && clientConfig.powers) {
            if (command === 'clickElement' && clientConfig.powers.elementClicking === false) return;
            if (command === 'fillFormField' && clientConfig.powers.formFilling === false) return;
            if (command === 'navigatePage' && clientConfig.powers.navigation === false) return;
            if (command === 'spotlightElement' && clientConfig.powers.spotlightGuidance === false) return;
            if (command === 'openDynamicModal' && clientConfig.powers.dynamicModals === false) return;
            if (command === 'resizeModal' && clientConfig.powers.dynamicModals === false) return;
            if (command === 'closeModal' && clientConfig.powers.dynamicModals === false) return;
          }
          
          if (command === 'repositionWidget') {
            const pos = (args?.position || value || targetKey || '').toLowerCase();
            if (pos === 'minimize') {
              wrapper.style.width = window.innerWidth < 768 ? '100vw' : '300px';
              wrapper.style.height = '124px';
            } else if (pos === 'maximize') {
              wrapper.style.width = window.innerWidth < 768 ? '100vw' : '370px';
              wrapper.style.height = window.innerWidth < 768 ? '100vh' : '624px';
            } else if (pos === 'top-left') {
              wrapper.style.top = '20px'; wrapper.style.left = '20px';
              wrapper.style.bottom = 'auto'; wrapper.style.right = 'auto';
            } else if (pos === 'top-right') {
              wrapper.style.top = '20px'; wrapper.style.right = '20px';
              wrapper.style.bottom = 'auto'; wrapper.style.left = 'auto';
            } else if (pos === 'bottom-left') {
              wrapper.style.bottom = '20px'; wrapper.style.left = '20px';
              wrapper.style.top = 'auto'; wrapper.style.right = 'auto';
            } else if (pos === 'bottom-right') {
              wrapper.style.bottom = '20px'; wrapper.style.right = '20px';
              wrapper.style.top = 'auto'; wrapper.style.right = 'auto';
            }
            return;
          }

          function resolveModalDims(w, h, p) {
            p = (p || '').toLowerCase().trim();
            if (p === 'fullscreen' || p === 'max' || p === 'maximize' || p === 'full') {
              w = 'calc(100vw - 32px)';
              h = 'calc(100vh - 32px)';
            } else if (p === 'large' || p === 'expanded' || p === 'bada') {
              w = w || '800px';
              h = h || '620px';
            } else if (p === 'compact' || p === 'small' || p === 'chota') {
              w = w || '360px';
              h = h || '280px';
            } else if (p === 'normal' || p === 'default') {
              w = w || '480px';
              h = h || 'auto';
            }
            if (w && typeof w === 'number') w = w + 'px';
            if (h && typeof h === 'number') h = h + 'px';
            if (w && /^\d+$/.test(w)) w = w + 'px';
            if (h && /^\d+$/.test(h)) h = h + 'px';
            return {
              width: w || '480px',
              maxWidth: p === 'fullscreen' ? 'calc(100vw - 32px)' : (w || '480px'),
              height: h || 'auto',
              maxHeight: 'calc(100vh - 32px)'
            };
          }

          if (command === 'openDynamicModal' && args) {
            const oldModal = document.getElementById('nisa-dynamic-modal');
            if (oldModal) {
              if (typeof oldModal._cleanupModal === 'function') {
                oldModal._cleanupModal(true);
              } else {
                if (oldModal.dataset.requestId && oldModal.dataset.completed !== 'true') {
                  postToIframe({ type: 'NISA_MODAL_CANCEL', requestId: oldModal.dataset.requestId });
                }
                oldModal.remove();
              }
            }

            const dims = resolveModalDims(args.width, args.height, args.preset);
            const overlay = document.createElement('div');
            overlay.id = 'nisa-dynamic-modal';
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity 0.25s ease;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;box-sizing:border-box;';

            const card = document.createElement('div');
            card.id = 'nisa-dynamic-modal-card';
            card.style.cssText = `background:#18181b;border:1px solid rgba(255,255,255,0.12);border-radius:16px;box-shadow:0 25px 60px -15px rgba(0,0,0,0.8),0 0 0 1px rgba(255,255,255,0.05);color:#f4f4f5;display:flex;flex-direction:column;overflow:hidden;transform:scale(0.95);transition:transform 0.25s cubic-bezier(0.16,1,0.3,1),width 0.3s cubic-bezier(0.16,1,0.3,1),height 0.3s cubic-bezier(0.16,1,0.3,1),max-width 0.3s cubic-bezier(0.16,1,0.3,1);box-sizing:border-box;width:${dims.width};max-width:${dims.maxWidth};height:${dims.height};max-height:${dims.maxHeight};`;

            const header = document.createElement('div');
            header.style.cssText = 'padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-shrink:0;box-sizing:border-box;';

            const headerLeft = document.createElement('div');
            headerLeft.style.cssText = 'display:flex;align-items:center;gap:12px;min-width:0;flex:1;';

            const iconBadge = document.createElement('div');
            iconBadge.style.cssText = 'width:34px;height:34px;border-radius:10px;background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);display:flex;align-items:center;justify-content:center;color:#3b82f6;flex-shrink:0;';
            iconBadge.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>';

            const titleBox = document.createElement('div');
            titleBox.style.cssText = 'min-width:0;flex:1;';
            const titleEl = document.createElement('div');
            titleEl.style.cssText = 'font-size:14px;font-weight:600;color:#f4f4f5;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
            titleEl.textContent = args.title || 'Dynamic Action';
            const subTitleEl = document.createElement('div');
            subTitleEl.style.cssText = 'font-size:11px;color:#a1a1aa;margin-top:2px;';
            subTitleEl.textContent = 'Nisa Dynamic Runtime Modal';
            titleBox.appendChild(titleEl);
            titleBox.appendChild(subTitleEl);

            headerLeft.appendChild(iconBadge);
            headerLeft.appendChild(titleBox);

            const closeBtn = document.createElement('button');
            closeBtn.setAttribute('data-nesa-target', 'modal_close_btn');
            closeBtn.setAttribute('aria-label', 'Close modal');
            closeBtn.style.cssText = 'background:transparent;border:none;color:#a1a1aa;cursor:pointer;padding:6px;border-radius:8px;display:flex;align-items:center;justify-content:center;transition:all 0.15s;outline:none;flex-shrink:0;';
            closeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            closeBtn.onmouseenter = () => { closeBtn.style.color = '#f4f4f5'; closeBtn.style.background = 'rgba(255,255,255,0.06)'; };
            closeBtn.onmouseleave = () => { closeBtn.style.color = '#a1a1aa'; closeBtn.style.background = 'transparent'; };

            header.appendChild(headerLeft);
            header.appendChild(closeBtn);

            const body = document.createElement('div');
            body.style.cssText = 'padding:20px;display:flex;flex-direction:column;gap:16px;flex:1;min-height:0;overflow:hidden;box-sizing:border-box;';

            const textBox = document.createElement('div');
            textBox.id = 'nisa-modal-text-content';
            textBox.style.cssText = 'padding:14px 16px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);font-size:13px;color:#f4f4f5;line-height:1.6;white-space:pre-wrap;flex:1;min-height:100px;overflow-y:auto;box-sizing:border-box;';
            textBox.textContent = args.content || 'No details provided.';

            const isInputPrompt = args.modalType === 'input_prompt';
            const input = isInputPrompt ? document.createElement('textarea') : null;
            if (input) {
              input.id = 'nisa-modal-input';
              input.setAttribute('aria-label', args.inputPlaceholder || 'Your request');
              input.placeholder = args.inputPlaceholder || 'Type your request...';
              input.rows = 3;
              input.style.cssText = 'width:100%;min-height:88px;max-height:220px;resize:vertical;padding:11px 12px;border-radius:10px;background:#09090b;border:1px solid rgba(255,255,255,0.12);color:#f4f4f5;font:inherit;font-size:13px;line-height:1.5;outline:none;box-sizing:border-box;';
            }

            const statusLabel = isInputPrompt ? document.createElement('div') : null;
            if (statusLabel) {
              statusLabel.id = 'nisa-modal-status';
              statusLabel.setAttribute('role', 'status');
              statusLabel.setAttribute('aria-live', 'polite');
              statusLabel.style.cssText = 'font-size:11px;color:#a1a1aa;min-height:16px;white-space:pre-wrap;';
            }

            const footer = document.createElement('div');
            footer.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:10px;padding-top:4px;flex-shrink:0;flex-wrap:wrap;';

            const copyBtn = document.createElement('button');
            copyBtn.textContent = 'Copy Text';
            copyBtn.style.cssText = 'padding:7px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:#a1a1aa;font-size:12px;font-weight:500;cursor:pointer;transition:all 0.15s;outline:none;';
            copyBtn.onmouseenter = () => { copyBtn.style.color = '#f4f4f5'; copyBtn.style.borderColor = 'rgba(255,255,255,0.3)'; };
            copyBtn.onmouseleave = () => { copyBtn.style.color = '#a1a1aa'; copyBtn.style.borderColor = 'rgba(255,255,255,0.15)'; };
            copyBtn.onclick = async () => {
              const textToCopy = textBox.textContent || args.content || '';
              let ok = false;
              try {
                if (navigator?.clipboard?.writeText) {
                  await navigator.clipboard.writeText(textToCopy);
                  ok = true;
                }
              } catch {
                void 0;
              }
              if (!ok) {
                try {
                  const ta = document.createElement('textarea');
                  ta.value = textToCopy;
                  ta.style.position = 'fixed';
                  ta.style.left = '-9999px';
                  document.body.appendChild(ta);
                  ta.select();
                  document.execCommand('copy');
                  document.body.removeChild(ta);
                } catch {
                  void 0;
                }
              }
              copyBtn.textContent = 'Copied!';
              copyBtn.style.color = '#34d399';
              copyBtn.style.borderColor = 'rgba(52,211,153,0.4)';
              setTimeout(() => {
                copyBtn.textContent = 'Copy Text';
                copyBtn.style.color = '#a1a1aa';
                copyBtn.style.borderColor = 'rgba(255,255,255,0.15)';
              }, 2000);
            };

            const pasteBtn = (isInputPrompt && input) ? document.createElement('button') : null;
            let isReadingClipboard = false;
            let pasteHintTimer = null;
            if (pasteBtn) {
              pasteBtn.setAttribute('data-nesa-target', 'modal_paste_btn');
              pasteBtn.id = 'nisa-modal-paste-btn';
              pasteBtn.setAttribute('aria-label', 'Clipboard se paste karein');
              pasteBtn.style.cssText = 'padding:7px 14px;border-radius:8px;border:1px solid rgba(59,130,246,0.35);background:rgba(59,130,246,0.1);color:#93c5fd;font-size:12px;font-weight:500;cursor:pointer;transition:all 0.15s ease;outline:none;display:flex;align-items:center;gap:6px;';
              pasteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg><span>Clipboard se paste karein</span>';
              pasteBtn.onmouseenter = () => { pasteBtn.style.color = '#ffffff'; pasteBtn.style.background = 'rgba(59,130,246,0.2)'; pasteBtn.style.borderColor = 'rgba(59,130,246,0.6)'; };
              pasteBtn.onmouseleave = () => { pasteBtn.style.color = '#93c5fd'; pasteBtn.style.background = 'rgba(59,130,246,0.1)'; pasteBtn.style.borderColor = 'rgba(59,130,246,0.35)'; };

              pasteBtn.onclick = () => {
                if (isReadingClipboard) return;
                if (overlay.dataset.requestId && overlay.dataset.completed !== 'true') return;

                const isSecure = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                if (!isSecure) {
                  if (statusLabel) statusLabel.textContent = 'Clipboard access requires HTTPS. Please paste directly with Ctrl+V (or Cmd+V). / Clipboard ke liye HTTPS zaroori hai. Kripya Ctrl+V se paste karein.';
                  if (input) input.focus();
                  return;
                }

                if (!navigator?.clipboard?.readText) {
                  if (statusLabel) statusLabel.textContent = 'Clipboard reading is not supported by your browser. Please use Ctrl+V (or Cmd+V) to paste. / Browser clipboard read support nahi karta. Kripya Ctrl+V se paste karein.';
                  if (input) input.focus();
                  return;
                }

                isReadingClipboard = true;
                pasteBtn.disabled = true;
                const originalHtml = pasteBtn.innerHTML;
                pasteBtn.textContent = 'Reading...';

                let readPromise;
                try {
                  readPromise = navigator.clipboard.readText();
                } catch {
                  isReadingClipboard = false;
                  pasteBtn.disabled = false;
                  pasteBtn.innerHTML = originalHtml;
                  if (statusLabel) statusLabel.textContent = 'Could not access clipboard. Please use Ctrl+V to paste manually. / Kripya Ctrl+V se paste karein.';
                  if (input) input.focus();
                  return;
                }

                readPromise
                  .then((clipboardText) => {
                    isReadingClipboard = false;
                    pasteBtn.disabled = false;
                    pasteBtn.innerHTML = originalHtml;

                    if (!clipboardText || !clipboardText.trim()) {
                      if (statusLabel) statusLabel.textContent = 'Clipboard is empty. Please copy some text first or type with Ctrl+V. / Clipboard khali hai. Pehle text copy karein ya Ctrl+V se paste karein.';
                      if (input) input.focus();
                      return;
                    }

                    if (input) {
                      const currentVal = input.value || '';
                      if (!currentVal) {
                        input.value = clipboardText;
                      } else {
                        const selStart = input.selectionStart;
                        const selEnd = input.selectionEnd;
                        if (typeof selStart === 'number' && typeof selEnd === 'number' && selStart !== selEnd) {
                          input.value = currentVal.slice(0, selStart) + clipboardText + currentVal.slice(selEnd);
                          input.selectionStart = input.selectionEnd = selStart + clipboardText.length;
                        } else if (typeof selStart === 'number') {
                          const needsNl = selStart > 0 && !currentVal[selStart - 1].endsWith?.('\n');
                          input.value = currentVal.slice(0, selStart) + (needsNl ? '\n' : '') + clipboardText + currentVal.slice(selStart);
                        } else {
                          input.value = currentVal + '\n' + clipboardText;
                        }
                      }
                      try {
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                      } catch {
                        void 0;
                      }
                      input.focus();
                    }

                    if (statusLabel) {
                      statusLabel.textContent = 'Pasted from clipboard! Review your request and click Submit. / Clipboard se paste ho gaya! Check karke Submit dabayein.';
                      if (pasteHintTimer) clearTimeout(pasteHintTimer);
                      pasteHintTimer = setTimeout(() => {
                        if (statusLabel && statusLabel.textContent.includes('Pasted from clipboard')) {
                          statusLabel.textContent = '';
                        }
                      }, 4000);
                    }
                  })
                  .catch((err) => {
                    isReadingClipboard = false;
                    pasteBtn.disabled = false;
                    pasteBtn.innerHTML = originalHtml;

                    const isPermissionDenied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError';
                    if (statusLabel) {
                      if (isPermissionDenied) {
                        statusLabel.textContent = 'Clipboard permission denied. Please allow clipboard access in browser settings, or use Ctrl+V. / Clipboard permission allow nahi hui. Kripya Ctrl+V se paste karein.';
                      } else {
                        statusLabel.textContent = 'Unable to read clipboard. Please use Ctrl+V to paste manually. / Kripya Ctrl+V se paste karein.';
                      }
                    }
                    if (input) input.focus();
                  });
              };
            }

            const confirmBtn = document.createElement('button');
            confirmBtn.setAttribute('data-nesa-target', 'modal_confirm_btn');
            confirmBtn.id = 'nisa-modal-submit';
            confirmBtn.textContent = isInputPrompt ? 'Submit' : 'Understood';
            confirmBtn.style.cssText = 'padding:7px 18px;border-radius:8px;border:none;background:#2563eb;color:#ffffff;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.3);transition:background 0.15s;outline:none;';
            confirmBtn.onmouseenter = () => { confirmBtn.style.background = '#1d4ed8'; };
            confirmBtn.onmouseleave = () => { confirmBtn.style.background = '#2563eb'; };

            footer.appendChild(copyBtn);
            if (pasteBtn) footer.appendChild(pasteBtn);
            footer.appendChild(confirmBtn);

            body.appendChild(textBox);
            if (input) body.appendChild(input);
            if (statusLabel) body.appendChild(statusLabel);
            body.appendChild(footer);

            card.appendChild(header);
            card.appendChild(body);
            overlay.appendChild(card);

            const prefersReducedMotion = Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

            let animFrameId = null;
            const animTimers = [];
            let constructionLayer = null;

            const cleanupConstruction = () => {
              if (animFrameId) {
                cancelAnimationFrame(animFrameId);
                animFrameId = null;
              }
              while (animTimers.length) {
                clearTimeout(animTimers.pop());
              }
              if (constructionLayer && constructionLayer.parentNode) {
                constructionLayer.remove();
                constructionLayer = null;
              }
              if (header) { header.style.opacity = '1'; header.style.transform = 'none'; }
              if (textBox) { textBox.style.opacity = '1'; textBox.style.transform = 'none'; }
              if (input) { input.style.opacity = '1'; input.style.transform = 'none'; }
              if (statusLabel) { statusLabel.style.opacity = '1'; }
              if (footer) { footer.style.opacity = '1'; footer.style.transform = 'none'; }
              if (pasteBtn) { pasteBtn.style.opacity = '1'; pasteBtn.style.transform = 'none'; }
            };

            overlay._constructionCleanup = cleanupConstruction;

            const handleEscape = (evt) => {
              if (evt.key === 'Escape') {
                closeModal();
              }
            };
            window.addEventListener('keydown', handleEscape);

            let acceptanceTimer = null;
            const clearAcceptanceTimer = () => {
              if (acceptanceTimer) {
                clearTimeout(acceptanceTimer);
                acceptanceTimer = null;
              }
            };
            overlay._clearAcceptanceTimer = clearAcceptanceTimer;

            const cancelRequest = () => {
              const requestId = overlay.dataset.requestId;
              if (!requestId || overlay.dataset.completed === 'true') return;
              postToIframe({ type: 'NISA_MODAL_CANCEL', requestId });
            };

            let isClosing = false;
            const closeModal = (immediate = false) => {
              if (isClosing) return;
              isClosing = true;
              window.removeEventListener('keydown', handleEscape);
              if (pasteHintTimer) {
                clearTimeout(pasteHintTimer);
                pasteHintTimer = null;
              }
              if (typeof overlay._constructionCleanup === 'function') {
                overlay._constructionCleanup();
              }
              clearAcceptanceTimer();
              cancelRequest();
              overlay.dataset.requestId = '';
              overlay.dataset.hasResponse = '';
              overlay.dataset.completed = '';
              overlay.removeAttribute('id');
              overlay.style.opacity = '0';
              overlay.style.pointerEvents = 'none';
              card.style.transform = 'scale(0.95)';
              if (immediate) {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
              } else {
                setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 220);
              }
            };

            overlay._cleanupModal = closeModal;

            if (isInputPrompt && input) {
              const submitPrompt = () => {
                if (overlay.dataset.completed === 'true') {
                  closeModal();
                  return;
                }
                if (overlay.dataset.requestId) return;
                const value = input.value.trim();
                if (!value) {
                  if (statusLabel) statusLabel.textContent = 'Please enter a request first.';
                  input.focus();
                  return;
                }
                const targetOrigin = getIframeOrigin();
                if (!targetOrigin) {
                  if (statusLabel) statusLabel.textContent = 'Cannot connect: invalid widget origin.';
                  return;
                }
                const requestId = window.crypto?.randomUUID ? window.crypto.randomUUID() : `nisa_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                overlay.dataset.requestId = requestId;
                overlay.dataset.hasResponse = '';
                input.disabled = true;
                confirmBtn.disabled = true;
                if (pasteBtn) pasteBtn.disabled = true;
                confirmBtn.textContent = 'Sending...';
                if (statusLabel) statusLabel.textContent = 'Sending your request to Nisa...';

                clearAcceptanceTimer();
                acceptanceTimer = setTimeout(() => {
                  if (overlay.dataset.requestId === requestId && overlay.dataset.completed !== 'true') {
                    overlay.dataset.requestId = '';
                    overlay.dataset.hasResponse = '';
                    input.disabled = false;
                    confirmBtn.disabled = false;
                    if (pasteBtn) pasteBtn.disabled = false;
                    confirmBtn.textContent = 'Try Again';
                    if (statusLabel) statusLabel.textContent = 'Nisa is taking longer than expected to accept the request. Please try again.';
                  }
                }, 8000);

                const posted = postToIframe({
                  type: 'NISA_MODAL_SUBMIT',
                  requestId,
                  value,
                  title: args?.title || '',
                  content: args?.content || '',
                  modalType: args?.modalType || 'input_prompt'
                });
                if (!posted) {
                  clearAcceptanceTimer();
                  overlay.dataset.requestId = '';
                  overlay.dataset.hasResponse = '';
                  input.disabled = false;
                  confirmBtn.disabled = false;
                  if (pasteBtn) pasteBtn.disabled = false;
                  confirmBtn.textContent = 'Try Again';
                  if (statusLabel) statusLabel.textContent = 'Unable to send request to Nisa. Please try again.';
                }
              };
              confirmBtn.onclick = submitPrompt;
              input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  submitPrompt();
                }
              });
            } else {
              confirmBtn.onclick = closeModal;
            }

            overlay.onclick = closeModal;
            card.onclick = (e) => e.stopPropagation();
            closeBtn.onclick = closeModal;

            document.body.appendChild(overlay);

            if (prefersReducedMotion) {
              requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                card.style.transform = 'scale(1)';
                if (input) input.focus();
              });
              return;
            }

            header.style.opacity = '0';
            header.style.transform = 'translateY(6px)';
            header.style.transition = 'opacity 0.22s ease-out, transform 0.22s ease-out';

            textBox.style.opacity = '0';
            textBox.style.transform = 'translateY(6px)';
            textBox.style.transition = 'opacity 0.22s ease-out, transform 0.22s ease-out';

            if (input) {
              input.style.opacity = '0';
              input.style.transform = 'translateY(6px)';
              input.style.transition = 'opacity 0.22s ease-out, transform 0.22s ease-out';
            }

            if (statusLabel) {
              statusLabel.style.opacity = '0';
              statusLabel.style.transition = 'opacity 0.22s ease-out';
            }

            footer.style.opacity = '0';
            footer.style.transform = 'translateY(6px)';
            footer.style.transition = 'opacity 0.22s ease-out, transform 0.22s ease-out';

            constructionLayer = document.createElement('div');
            constructionLayer.id = 'nisa-modal-construction-layer';
            constructionLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;overflow:hidden;';

            const cursorWrap = document.createElement('div');
            cursorWrap.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:10;transform:translate3d(-50px,-50px,0);transition:transform 0.18s cubic-bezier(0.2,0,0,1),opacity 0.2s ease;opacity:0;display:flex;align-items:center;gap:6px;';
            cursorWrap.innerHTML = `
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5));">
                <path d="M4 3l15 9.5-6.5 1.5-3 6.5L4 3z" fill="#2563eb" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>
              </svg>
              <div style="background:#2563eb;color:#ffffff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:6px;box-shadow:0 4px 12px rgba(37,99,235,0.4);border:1px solid rgba(255,255,255,0.3);letter-spacing:0.5px;text-transform:uppercase;white-space:nowrap;">Nisa</div>
            `;

            const svgCanvas = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
            const drawPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            drawPath.setAttribute('stroke', '#3b82f6');
            drawPath.setAttribute('stroke-width', '2');
            drawPath.setAttribute('fill', 'none');
            drawPath.setAttribute('stroke-linecap', 'round');
            drawPath.setAttribute('stroke-linejoin', 'round');
            drawPath.style.cssText = 'filter:drop-shadow(0 0 6px rgba(59,130,246,0.6));opacity:0.85;transition:opacity 0.25s ease;';
            svgCanvas.appendChild(drawPath);

            constructionLayer.appendChild(svgCanvas);
            constructionLayer.appendChild(cursorWrap);
            overlay.appendChild(constructionLayer);

            requestAnimationFrame(() => {
              overlay.style.opacity = '1';
              card.style.transform = 'scale(1)';

              const cardRect = card.getBoundingClientRect();
              const startX = Math.max(0, cardRect.left - 12);
              const startY = Math.max(0, cardRect.top - 12);
              cursorWrap.style.transform = `translate3d(${startX}px, ${startY}px, 0)`;
              cursorWrap.style.opacity = '1';

              const w = cardRect.width;
              const h = cardRect.height;
              const l = cardRect.left;
              const t = cardRect.top;
              const r = 16;
              const pathD = `M ${l + r} ${t} L ${l + w - r} ${t} Q ${l + w} ${t} ${l + w} ${t + r} L ${l + w} ${t + h - r} Q ${l + w} ${t + h} ${l + w - r} ${t + h} L ${l + r} ${t + h} Q ${l} ${t + h} ${l} ${t + h - r} L ${l} ${t + r} Q ${l} ${t} ${l + r} ${t}`;
              drawPath.setAttribute('d', pathD);

              try {
                const totalLen = drawPath.getTotalLength ? drawPath.getTotalLength() : 1000;
                drawPath.style.strokeDasharray = `${totalLen}`;
                drawPath.style.strokeDashoffset = `${totalLen}`;
                drawPath.style.transition = 'stroke-dashoffset 0.45s cubic-bezier(0.16, 1, 0.3, 1)';
                requestAnimationFrame(() => {
                  drawPath.style.strokeDashoffset = '0';
                });
              } catch {
                void 0;
              }

              animTimers.push(setTimeout(() => {
                header.style.opacity = '1';
                header.style.transform = 'none';
                const hRect = header.getBoundingClientRect();
                cursorWrap.style.transform = `translate3d(${hRect.left + 24}px, ${hRect.top + 8}px, 0)`;
              }, 90));

              animTimers.push(setTimeout(() => {
                textBox.style.opacity = '1';
                textBox.style.transform = 'none';
                const tbRect = textBox.getBoundingClientRect();
                cursorWrap.style.transform = `translate3d(${tbRect.left + 30}px, ${tbRect.top + 16}px, 0)`;
              }, 200));

              if (input) {
                animTimers.push(setTimeout(() => {
                  input.style.opacity = '1';
                  input.style.transform = 'none';
                  if (statusLabel) statusLabel.style.opacity = '1';
                  const inRect = input.getBoundingClientRect();
                  cursorWrap.style.transform = `translate3d(${inRect.left + 24}px, ${inRect.top + 12}px, 0)`;
                  input.focus();
                }, 320));
              }

              animTimers.push(setTimeout(() => {
                footer.style.opacity = '1';
                footer.style.transform = 'none';
                const fRect = footer.getBoundingClientRect();
                cursorWrap.style.transform = `translate3d(${fRect.right - 80}px, ${fRect.top + 6}px, 0)`;
              }, 440));

              animTimers.push(setTimeout(() => {
                cursorWrap.style.opacity = '0';
                drawPath.style.opacity = '0';
              }, 640));

              animTimers.push(setTimeout(() => {
                cleanupConstruction();
              }, 880));
            });
            return;
          }

          if (command === 'resizeModal') {
            const card = document.getElementById('nisa-dynamic-modal-card');
            if (card) {
              const dims = resolveModalDims(args?.width, args?.height, args?.preset);
              card.style.width = dims.width;
              card.style.maxWidth = dims.maxWidth;
              card.style.height = dims.height;
              card.style.maxHeight = dims.maxHeight;
            }
            return;
          }

          if (command === 'closeModal') {
            const m = document.getElementById('nisa-dynamic-modal');
            if (m) {
              if (typeof m._cleanupModal === 'function') {
                m._cleanupModal();
              } else {
                const c = document.getElementById('nisa-dynamic-modal-card');
                if (m.dataset.requestId && m.dataset.completed !== 'true') {
                  postToIframe({ type: 'NISA_MODAL_CANCEL', requestId: m.dataset.requestId });
                }
                m.style.opacity = '0';
                if (c) c.style.transform = 'scale(0.95)';
                setTimeout(() => { if (m.parentNode) m.parentNode.removeChild(m); }, 220);
              }
            }
            return;
          }
          
          if (command === 'navigatePage' && route) {
            const link = document.querySelector(`a[href="${route}"], a[href="${route}/"], a[href="#${route}"]`);
            if (link) {
              link.click();
            } else if (window.history && window.history.pushState) {
              window.history.pushState({}, '', route);
              window.dispatchEvent(new PopStateEvent('popstate'));
            } else {
              window.location.href = route;
            }
            return;
          }

          if (command === 'scrollPage') {
            window.scrollBy({ top: value || 400, behavior: 'smooth' });
            return;
          }

          if (command === 'controlSidebar') {
            const sbToggle = document.querySelector('[data-sidebar-toggle], .sidebar-toggle, #sidebar-toggle, [aria-label*="sidebar" i], [aria-label*="menu" i], button.menu-btn');
            if (sbToggle) sbToggle.click();
            return;
          }

          if (command === 'toggleWorkspaceControl') {
            const ctrl = (args?.control || value || '').toLowerCase();
            if (ctrl.includes('theme')) {
              document.documentElement.classList.toggle('dark');
            }
            return;
          }

          if (command === 'spotlightElement' && targetKey) {
            const el = findElement(targetKey);
            if (el) {
              showVisualSpotlight(el, args?.label);
            }
            return;
          }

          if (command === 'clickElement' && targetKey) {
            const el = findElement(targetKey);
            if (el) {
              const interactive = el.closest('button, a, [role="button"], [onclick], input[type="submit"]') || el;
              interactive.scrollIntoView({ behavior: 'smooth', block: 'center' });
              
              const oldTransition = interactive.style.transition;
              const oldBoxShadow = interactive.style.boxShadow;
              interactive.style.transition = 'box-shadow 0.2s ease';
              interactive.style.boxShadow = '0 0 0 4px #3b82f6, 0 0 20px rgba(59, 130, 246, 0.7)';
              setTimeout(() => {
                interactive.style.boxShadow = oldBoxShadow;
                setTimeout(() => { interactive.style.transition = oldTransition; }, 200);
              }, 350);

              interactive.focus?.();
              interactive.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
              interactive.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
              interactive.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
              interactive.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
              interactive.click();
            }
            return;
          }

          if (command === 'fillFormField' && targetKey) {
            const el = findElement(targetKey);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.focus?.();
              const proto = (window.HTMLTextAreaElement && el instanceof window.HTMLTextAreaElement) ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
              const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
              if (setter) {
                setter.call(el, value || '');
              } else {
                el.value = value || '';
              }
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));

              const oldBoxShadow = el.style.boxShadow;
              el.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.5)';
              setTimeout(() => { el.style.boxShadow = oldBoxShadow; }, 400);
            }
            return;
          }
        }
      };

      window.addEventListener('message', messageListener);
      document.body.appendChild(wrapper);

      setTimeout(() => {
        if (loadingOverlay && loadingOverlay.parentNode) loadingOverlay.remove();
        wrapper.style.opacity = '1';
      }, 1500);
    };
    
    body.appendChild(desc);
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

      const isKnown = registeredXPaths.has(xpath) || (interactiveEl.id && registeredIds.has(interactiveEl.id)) || learnedElements.has(xpath);
      if (isKnown) return;

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
      registeredXPaths.add(xpath);
      if (interactiveEl.id) registeredIds.add(interactiveEl.id);

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
        } catch {
          void 0;
        }
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

      const isKnown = registeredXPaths.has(xpath) || (target.id && registeredIds.has(target.id)) || learnedElements.has(xpath);
      if (isKnown) return;

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
      registeredXPaths.add(xpath);
      if (target.id) registeredIds.add(target.id);

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
    if (!clientId || host.includes('vercel.app') || host.includes('now.sh')) {
      return;
    }
    if (retryCount >= 2) {
      return;
    }
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      return;
    }
    
    ws.onopen = () => {
      retryCount = 0;
    };

    ws.onclose = () => {
      if (retryCount < 2) {
        retryCount++;
        setTimeout(connect, Math.min(1000 * Math.pow(2, retryCount), 5000));
      }
    };

    ws.onerror = () => {};

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
      } catch {
        void 0;
      }
    };
  }

  function parseDOM() {
    const semanticMap = [];
    const seenXPaths = new Set();

    if (document.title) {
      semanticMap.push({
        element: 'title',
        text: document.title,
        xpath: '/html/head/title'
      });
    }
    
    const actionableSelector = 'button, a, input, select, textarea, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="switch"], [role="checkbox"], [onclick], [data-action], [data-nisa-id], [data-clickable], [contenteditable="true"], .btn, .button';
    const actionables = document.querySelectorAll(actionableSelector);
    
    actionables.forEach(el => {
      if (el.closest && (el.closest('#nisa-iframe-wrapper') || el.closest('#nisa-chat-widget') || el.closest('#nisa-chat-panel') || el.closest('#nisa-dynamic-modal'))) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      
      const xpath = getXPath(el);
      if (!xpath || seenXPaths.has(xpath)) return;
      seenXPaths.add(xpath);
      registeredXPaths.add(xpath);
      if (el.id) registeredIds.add(el.id);

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
            registeredXPaths.add(xpath);
            if (el.id) registeredIds.add(el.id);
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
    } catch {
      void 0;
    }

    const readableSelector = 'h1, h2, h3, h4, h5, h6, p, label, td, th, li, .badge, .status, .card-title';
    const readables = document.querySelectorAll(readableSelector);
    readables.forEach(el => {
      if (el.closest && (el.closest('#nisa-iframe-wrapper') || el.closest('#nisa-chat-widget') || el.closest('#nisa-chat-panel'))) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      if (el.children.length > 2) return; 
      
      const xpath = getXPath(el);
      if (!xpath || seenXPaths.has(xpath)) return;
      seenXPaths.add(xpath);
      registeredXPaths.add(xpath);
      if (el.id) registeredIds.add(el.id);
      
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
    if (sdkPaused || !clientId) return;
    if (clientConfig && clientConfig.powers && clientConfig.powers.autoCapture === false) return;
    const map = parseDOM();
    const mapString = JSON.stringify(map);
    const hash = getHash(mapString);
    
    if (!force && hash === lastSentMapHash) return;

    if (ws && ws.readyState === 1) {
      try {
        ws.send(JSON.stringify({ type: 'dom_sync', elementsCount: map.length, data: map }));
      } catch {
        void 0;
      }
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
    } catch {
      updateIndicator('disconnected');
    }
  }

  function setupObserver() {
    if (observer) observer.disconnect();
    if (!document.body) return;
    
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

  async function initSDK(options = {}) {
    if (options && typeof options === 'object') {
      if (options.clientId) {
        clientId = options.clientId;
        wsUrl = `${protocol}//${host}/tunnel?clientId=${clientId}`;
      }
      if (options.backendUrl) {
        serverFrontendUrl = options.backendUrl;
        syncHttpUrl = `${options.backendUrl.replace(/\/+$/, '')}/api/client/sync`;
      }
      if (options.modelUrl) {
        activeModelUrl = options.modelUrl;
      }
      if (options.projectAdapter) {
        customProjectAdapter = options.projectAdapter;
      }
    }

    if (!clientId) {
      return { success: true, initialized: true, mode: 'standalone_sdk' };
    }

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
    } catch {
      console.warn("Nisa SDK: Could not fetch remote config, using fallback.");
    }
    
    syncDOM();
    setupInteractionLearner();
    setupObserver();
    connect();
    return { success: true, initialized: true, clientId };
  }

  const cdnApi = {
    init(config = {}) {
      return initSDK(config);
    },
    configure(config = {}) {
      clientConfig = { ...(clientConfig || {}), ...(config || {}) };
      if (config.clientId) clientId = config.clientId;
      if (config.frontendUrl || config.backendUrl) {
        serverFrontendUrl = config.frontendUrl || config.backendUrl;
      }
      return { success: true, config: clientConfig };
    },
    connectBackend(config = {}) {
      if (typeof config === 'string') {
        serverFrontendUrl = config;
      } else if (config && typeof config === 'object') {
        if (config.clientId) clientId = config.clientId;
        if (config.url || config.backendUrl) serverFrontendUrl = config.url || config.backendUrl;
      }
      wsUrl = clientId ? `${protocol}//${host}/tunnel?clientId=${clientId}` : wsUrl;
      connect();
      return { success: true, backendUrl: serverFrontendUrl, clientId };
    },
    loadModel(modelUrl, metadata = {}) {
      if (!modelUrl) return { success: false, error: 'Missing modelUrl' };
      activeModelUrl = modelUrl;
      window.dispatchEvent(new CustomEvent('nisa:sdk_load_model', { detail: { modelUrl, metadata } }));
      return { success: true, modelUrl: activeModelUrl, metadata };
    },
    setProjectAdapter(adapter = {}) {
      customProjectAdapter = adapter;
      return { success: true };
    },
    discoverComponents() {
      const elements = parseDOM();
      return { components: elements, count: elements.length };
    },
    getCapabilities() {
      return {
        modelUrl: activeModelUrl,
        powers: clientConfig?.powers || {
          elementClicking: true,
          formFilling: true,
          navigation: true,
          spotlightGuidance: true,
          dynamicModals: true,
          selfLearning: true,
        },
        learnedElementsCount: learnedElements.size,
      };
    },
    executeAction(actionOrPlan, parameters = {}) {
      if (sdkPaused) return { success: false, error: 'runtime_paused' };
      const detail = typeof actionOrPlan === 'string'
        ? { name: 'executeCharacterAction', args: { action: actionOrPlan, parameters } }
        : { name: 'executeCharacterAction', args: actionOrPlan };
      window.dispatchEvent(new CustomEvent('nesa:toolcall', { detail }));
      return { success: true, dispatched: detail };
    },
    navigateToElement(targetKey, options = {}) {
      if (sdkPaused) return { success: false, error: 'runtime_paused' };
      const el = findElement(targetKey);
      if (el) {
        showVisualSpotlight(el, options.label || targetKey);
        return { success: true, target: targetKey };
      }
      return { success: false, error: 'element_not_found' };
    },
    highlightElement(targetKey, label = '') {
      const el = findElement(targetKey);
      if (el) {
        showVisualSpotlight(el, label || targetKey);
        return { success: true, target: targetKey };
      }
      return { success: false, error: 'element_not_found' };
    },
    clickElement(targetKey) {
      if (sdkPaused) return { success: false, error: 'runtime_paused' };
      const el = findElement(targetKey);
      if (!el) return { success: false, error: 'element_not_found' };
      showVisualSpotlight(el, targetKey);
      el.click();
      return { success: true, clicked: targetKey };
    },
    exitFrame(options = {}) {
      if (sdkPaused) return { success: false, error: 'runtime_paused' };
      window.dispatchEvent(new CustomEvent('nesa:toolcall', { detail: { name: 'exitFrameAndNavigate', args: options } }));
      return { success: true };
    },
    returnToFrame() {
      window.dispatchEvent(new CustomEvent('nesa:toolcall', { detail: { name: 'returnToFrame', args: {} } }));
      return { success: true };
    },
    pause() {
      sdkPaused = true;
      return { paused: true };
    },
    resume() {
      sdkPaused = false;
      return { paused: false };
    },
    dispose() {
      sdkPaused = true;
      if (observer) observer.disconnect();
      if (ws) {
        try { ws.close(); } catch { void 0; }
      }
      if (chatWidget && chatWidget.parentNode) chatWidget.remove();
      if (chatPanel && chatPanel.parentNode) chatPanel.remove();
      chatWidget = null;
      chatPanel = null;
      return { disposed: true };
    }
  };

  if (typeof window !== 'undefined') {
    if (!window.NishaSDK) window.NishaSDK = cdnApi;
    window.NisaSDK = cdnApi;
  }

  if (clientId) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => initSDK());
    } else {
      initSDK();
    }
  }
})();
