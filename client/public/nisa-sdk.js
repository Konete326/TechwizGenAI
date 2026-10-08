(function(global) {
  'use strict';

  if (global.NisaAgent) return;

  const NisaSDK = {
    version: '1.7.0',
    initialized: false,
    clientId: null,
    apiBaseUrl: 'https://api.nisa.ai/v1',
    wsBaseUrl: 'wss://api.nisa.ai/tunnel',
    blockedPaths: [],
    ws: null,
    reconnectAttempts: 0,

    init: function(config = {}) {
      if (this.initialized) {
        console.warn('Nisa SDK is already initialized.');
        return;
      }
      
      if (!config.clientId || typeof config.clientId !== 'string') {
        console.error('Initialization failed: Missing or invalid clientId.');
        return; 
      }
      
      this.clientId = config.clientId;

      const boot = () => {
        this.initialized = true;
        this._fetchGuardrails().then(() => {
          this._analyzeDOM();
        });
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
      } else {
        boot();
      }
    },

    _fetchGuardrails: function() {
      return fetch(`${this.apiBaseUrl}/get-guardrails?clientId=${encodeURIComponent(this.clientId)}`)
        .then(res => {
          if (!res.ok) throw new Error('Guardrails fetch failed');
          return res.json();
        })
        .then(data => {
          this.blockedPaths = data.blockedPaths || [];
          console.log(`Nisa SDK Loaded ${this.blockedPaths.length} blocked paths.`);
        })
        .catch(err => {
          console.warn('Failed to load guardrails.', err);
          this.blockedPaths = [];
        });
    },

    _getCssPath: function(el) {
      const path = [];
      while (el && el.nodeType === Node.ELEMENT_NODE) {
        let selector = el.nodeName.toLowerCase();
        
        if (el.id) {
          selector += '#' + el.id;
          path.unshift(selector);
          break; 
        } else {
          let classList = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean);
          if (classList.length > 0) {
            selector += '.' + classList[0];
          }
          let sib = el, nth = 1;
          while ((sib = sib.previousElementSibling)) {
            if (sib.nodeName.toLowerCase() === el.nodeName.toLowerCase()) nth++;
          }
          if (nth > 1) selector += `:nth-of-type(${nth})`;
        }
        
        path.unshift(selector);
        el = el.parentNode;
      }
      return path.join(' > ');
    },

    _getType: function(el) {
      const tag = el.tagName.toLowerCase();
      if (tag === 'button' || el.getAttribute('role') === 'button') return 'button';
      if (tag === 'a') return 'link';
      if (['input', 'select', 'textarea'].includes(tag)) return 'input';
      if (['h1', 'h2', 'h3'].includes(tag)) return 'heading';
      if (el.hasAttribute('tabindex')) return 'interactive';
      return 'unknown';
    },

    _getText: function(el) {
      let text = el.innerText || el.value || el.getAttribute('placeholder') || el.getAttribute('aria-label') || el.getAttribute('alt') || '';
      return text.replace(/\s+/g, ' ').trim();
    },

    _analyzeDOM: function() {
      const allowedSelectors = 'button, a, input, select, textarea, h1, h2, h3, [role="button"], [tabindex]';
      const elements = document.querySelectorAll(allowedSelectors);
      const semanticMap = [];
      let i = 0;

      // Asynchronously process the NodeList in chunks to prevent blocking the host site's main thread
      const processChunk = (deadline) => {
        const timeLimit = 10;
        const startTime = performance && performance.now ? performance.now() : Date.now();
        
        while (i < elements.length) {
          if (deadline && typeof deadline.timeRemaining === 'function') {
            if (deadline.timeRemaining() <= 0) break;
          } else if ((performance && performance.now ? performance.now() : Date.now()) - startTime >= timeLimit) {
            break;
          }

          const el = elements[i];
          const type = this._getType(el);
          const text = this._getText(el);

          if (text || type === 'input') {
            const path = this._getCssPath(el);
            if (!this.blockedPaths.includes(path)) {
              semanticMap.push({
                type: type,
                text: text,
                id: el.id || undefined,
                path: path
              });
            }
          }
          i++;
        }

        if (i < elements.length) {
          if (typeof window !== 'undefined' && window.requestIdleCallback) {
            window.requestIdleCallback(processChunk);
          } else {
            setTimeout(processChunk, 0);
          }
        } else {
          console.log(`Nisa SDK Semantic Map generated (${semanticMap.length} elements).`);

          const payload = {
            clientId: this.clientId,
            url: window.location.href,
            semanticMap: semanticMap,
            timestamp: new Date().toISOString()
          };

          this._transmitData(payload);
        }
      };

      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        window.requestIdleCallback(processChunk);
      } else {
        setTimeout(processChunk, 0);
      }
    },

    _transmitData: function(payload) {
      fetch(`${this.apiBaseUrl}/sync-dom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      .then(response => {
        if (!response.ok) {
          console.warn(`Sync failed with status: ${response.status}`);
        } else {
          console.log('Semantic Map synchronized.');
        }
      })
      .catch(error => {
        console.warn('Network error during DOM sync.', error);
      })
      .finally(() => {
        this._connectTunnel();
      });
    },

    _connectTunnel: function() {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        return;
      }
      
      const wsUrl = `${this.wsBaseUrl}?clientId=${encodeURIComponent(this.clientId)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this._executeCommand(data);
        } catch (e) {}
      };

      this.ws.onerror = (error) => {};

      this.ws.onclose = () => {
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;
        setTimeout(() => this._connectTunnel(), delay);
      };
    },

    _fuzzyFind: function(targetPath, targetText) {
      if (!targetText) return null;
      
      let targetTag = null;
      if (targetPath) {
        const match = targetPath.match(/([a-zA-Z0-9\-]+)[^>]*$/);
        if (match) targetTag = match[1].toLowerCase();
      }

      const selector = targetTag || 'button, a, input, select, textarea, [role="button"], [tabindex]';
      const elements = document.querySelectorAll(selector);

      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (this._getText(el) === targetText.trim()) {
          return el;
        }
      }
      return null;
    },

    _reportMutation: function(oldPath, newPath, text) {
      const payload = {
        clientId: this.clientId,
        oldPath: oldPath,
        newPath: newPath,
        text: text
      };
      
      fetch(`${this.apiBaseUrl}/update-map-version`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }).catch(err => {
        console.warn('Network error during mutation report.', err);
      });
    },

    _executeCommand: function(payload) {
      if (!payload) return;

      try {
        let el = null;
        let strictFailed = false;
        
        if (payload.targetPath) {
          try {
            el = document.querySelector(payload.targetPath);
            if (!el) strictFailed = true;
          } catch (e) {
            strictFailed = true;
          }
        }

        if (!el) {
          el = this._fuzzyFind(payload.targetPath, payload.targetText);
          if (el) {
            const newPath = this._getCssPath(el);
            this._reportMutation(payload.targetPath, newPath, payload.targetText);
          }
        }

        if (!el) {
          console.warn('Execution halted: Target element not found.', payload);
          return;
        }

        if (payload.action === 'click') {
          el.click();
        } else if (payload.action === 'input_text') {
          el.focus();
          el.value = payload.value || '';
          el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
          el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        }
      } catch (err) {
        console.warn('Execution failed', err);
      }
    }
  };

  global.NisaAgent = NisaSDK;

})(typeof window !== 'undefined' ? window : this);
