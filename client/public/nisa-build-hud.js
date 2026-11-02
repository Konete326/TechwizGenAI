(function () {
  if (typeof window === 'undefined') return;

  if (window.__nisaBuildHudPendingInit) {
    document.removeEventListener('DOMContentLoaded', window.__nisaBuildHudPendingInit);
    window.__nisaBuildHudPendingInit = null;
  }

  if (window.NisaBuildHUD && typeof window.NisaBuildHUD.dispose === 'function') {
    window.NisaBuildHUD.dispose();
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PROPS = ['opacity', 'transform', 'transition', 'filter', 'will-change'];

  let canvas = null, ctx = null, dpr = 1, rafId = null, observer = null;
  let pill = null, progressTextEl = null, progressBarEl = null, wireframeBtn = null;
  let targets = [], currentIndex = 0, activeTarget = null, targetStartTime = 0;
  const targetDuration = prefersReducedMotion ? 0 : 280;

  const revealedSet = new Set(), touchedElements = new Set(), originalStyles = new Map(), particles = [];
  const cursor = { x: 0, y: 0, targetX: 0, targetY: 0, visible: false };
  let isWireframeActive = false, isCompleted = false, isDisposed = false;

  const THEME = {
    gold: '#c1a162', goldGlow: 'rgba(193, 161, 98, 0.35)',
    goldMuted: 'rgba(193, 161, 98, 0.15)', textMuted: '#a1a1aa'
  };

  function isElementVisible(el) {
    if (!el || !el.isConnected || el === canvas || el === pill || pill?.contains(el)) return false;
    if (el.id === 'nisa-build-hud-canvas' || el.id === 'nisa-build-hud-pill') return false;
    const s = window.getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    if (s.opacity === '0' && !originalStyles.has(el)) return false;
    const r = el.getBoundingClientRect();
    return r.width >= 8 && r.height >= 8;
  }

  function isInViewport(el) {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
  }

  function saveOriginalStyle(el) {
    if (originalStyles.has(el)) return;
    const map = {};
    for (const p of PROPS) {
      map[p] = {
        value: el.style.getPropertyValue(p),
        priority: el.style.getPropertyPriority(p)
      };
    }
    originalStyles.set(el, map);
    touchedElements.add(el);
  }

  function restoreOriginalStyle(el) {
    const orig = originalStyles.get(el);
    if (!orig) return;
    for (const p of PROPS) {
      if (orig[p].value) {
        el.style.setProperty(p, orig[p].value, orig[p].priority);
      } else {
        el.style.removeProperty(p);
      }
    }
    originalStyles.delete(el);
    touchedElements.delete(el);
  }

  function restoreAllTouched() {
    const list = Array.from(touchedElements);
    for (const el of list) {
      if (el && el.isConnected) restoreOriginalStyle(el);
    }
    originalStyles.clear();
    touchedElements.clear();
  }

  function applyHiddenStyle(el) {
    saveOriginalStyle(el);
    el.style.setProperty('will-change', 'opacity, transform, filter');
    el.style.setProperty('opacity', '0');
    el.style.setProperty('transform', 'translateY(8px) scale(0.99)');
    el.style.setProperty('filter', 'blur(3px)');
  }

  function applyRevealedStyle(el) {
    el.style.setProperty('transition', prefersReducedMotion
      ? 'none'
      : 'opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1), transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), filter 0.28s ease-out');
    el.style.setProperty('opacity', '1');
    el.style.setProperty('transform', 'none');
    el.style.setProperty('filter', 'none');
    setTimeout(() => {
      if (revealedSet.has(el)) restoreOriginalStyle(el);
    }, prefersReducedMotion ? 0 : 320);
  }

  function discoverTargets() {
    const explicit = Array.from(document.querySelectorAll('[data-hud="target"]')).filter(isElementVisible);
    if (explicit.length > 0) return sortTargets(explicit);

    const selector = 'h1, h2, h3, h4, h5, h6, p, button, a, input, select, textarea, img, table, form, nav, section, article, header, footer, [role="button"], [role="link"], [role="heading"], .card';
    const rawNodes = Array.from(document.querySelectorAll(selector)).filter(isElementVisible);
    const filtered = rawNodes.filter((el) => {
      const children = Array.from(el.querySelectorAll(selector));
      const hasVisibleChildren = children.some((c) => isElementVisible(c) && c !== el);
      return !hasVisibleChildren || ['BUTTON', 'A', 'NAV', 'HEADER'].includes(el.tagName);
    });
    return sortTargets(filtered);
  }

  function sortTargets(list) {
    return list.sort((a, b) => {
      const aInView = isInViewport(a), bInView = isInViewport(b);
      if (aInView && !bInView) return -1;
      if (!aInView && bInView) return 1;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return Math.abs(ra.top - rb.top) > 20 ? ra.top - rb.top : ra.left - rb.left;
    });
  }

  function initCanvas() {
    if (canvas?.parentNode) canvas.parentNode.removeChild(canvas);
    canvas = document.createElement('canvas');
    canvas.id = 'nisa-build-hud-canvas';
    canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483640;';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.removeEventListener('resize', resizeCanvas);
    window.addEventListener('resize', resizeCanvas, { passive: true });
  }

  function resizeCanvas() {
    if (!canvas || !ctx) return;
    dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    if (activeTarget && activeTarget.isConnected) {
      const r = activeTarget.getBoundingClientRect();
      cursor.targetX = r.left + r.width / 2;
      cursor.targetY = r.top + r.height / 2;
      cursor.x = cursor.targetX;
      cursor.y = cursor.targetY;
    }
  }

  function createControlPill() {
    if (pill?.parentNode) pill.parentNode.removeChild(pill);
    pill = document.createElement('div');
    pill.id = 'nisa-build-hud-pill';
    pill.setAttribute('role', 'region');
    pill.setAttribute('aria-label', 'Nisa Build HUD Controller');
    pill.tabIndex = -1;
    pill.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:2147483647;pointer-events:auto;background:rgba(9,9,11,0.94);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(193,161,98,0.28);border-radius:9999px;padding:6px 14px 6px 18px;display:flex;align-items:center;gap:14px;box-shadow:0 12px 36px rgba(0,0,0,0.6);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:12px;color:#fff;user-select:none;';

    const statusGroup = document.createElement('div');
    statusGroup.style.cssText = 'display:flex;align-items:center;gap:10px;';
    const liveDot = document.createElement('span');
    liveDot.style.cssText = `width:7px;height:7px;border-radius:50%;background-color:${THEME.gold};box-shadow:0 0 8px ${THEME.gold};`;
    const titleEl = document.createElement('span');
    titleEl.textContent = 'NISA HUD';
    titleEl.style.cssText = `font-weight:700;letter-spacing:0.08em;color:${THEME.gold};`;
    progressTextEl = document.createElement('span');
    progressTextEl.style.cssText = `color:${THEME.textMuted};font-variant-numeric:tabular-nums;`;
    progressTextEl.textContent = '0 / 0';
    const progressTrack = document.createElement('div');
    progressTrack.style.cssText = 'width:60px;height:4px;border-radius:9999px;background-color:rgba(255,255,255,0.12);overflow:hidden;';
    progressBarEl = document.createElement('div');
    progressBarEl.style.cssText = `width:0%;height:100%;background-color:${THEME.gold};transition:width 0.2s ease-out;`;
    progressTrack.appendChild(progressBarEl);
    statusGroup.append(liveDot, titleEl, progressTextEl, progressTrack);

    const actionsGroup = document.createElement('div');
    actionsGroup.style.cssText = 'display:flex;align-items:center;gap:6px;border-left:1px solid rgba(255,255,255,0.1);padding-left:10px;';
    wireframeBtn = makePillButton('Wireframe', () => toggleWireframe());
    const replayBtn = makePillButton('Replay', () => replay());
    const skipBtn = makePillButton('Skip', () => skip());
    const closeBtn = makePillButton('✕', () => dispose());
    closeBtn.style.padding = '4px 8px';
    actionsGroup.append(wireframeBtn, replayBtn, skipBtn, closeBtn);

    pill.append(statusGroup, actionsGroup);
    document.body.appendChild(pill);
  }

  function makePillButton(text, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = text;
    btn.style.cssText = 'background:transparent;border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:6px;padding:4px 9px;font-size:11px;font-weight:500;cursor:pointer;outline:none;transition:background 0.15s, border-color 0.15s, color 0.15s;';
    btn.onmouseenter = () => { btn.style.background = 'rgba(255,255,255,0.08)'; btn.style.borderColor = THEME.gold; btn.style.color = THEME.gold; };
    btn.onmouseleave = () => { btn.style.background = 'transparent'; btn.style.borderColor = 'rgba(255,255,255,0.1)'; btn.style.color = '#fff'; };
    btn.onclick = onClick;
    return btn;
  }

  function updateProgress() {
    if (!progressTextEl || !progressBarEl) return;
    const total = targets.length, current = revealedSet.size;
    progressTextEl.textContent = `${current} / ${total}`;
    const pct = total === 0 ? 100 : Math.min(100, Math.round((current / total) * 100));
    progressBarEl.style.width = `${pct}%`;
  }

  function spawnSparks(x, y, count = 5) {
    if (prefersReducedMotion) return;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2, speed = 1.2 + Math.random() * 2.8;
      particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1, decay: 0.035 + Math.random() * 0.035, size: 1.5 + Math.random() * 1.5
      });
    }
  }

  function drawCornerTicks(r, progress) {
    if (!ctx) return;
    const len = Math.max(6, Math.min(16, Math.min(r.width, r.height) * 0.25)) * progress;
    ctx.strokeStyle = THEME.gold; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(r.left, r.top + len); ctx.lineTo(r.left, r.top); ctx.lineTo(r.left + len, r.top);
    ctx.moveTo(r.right - len, r.top); ctx.lineTo(r.right, r.top); ctx.lineTo(r.right, r.top + len);
    ctx.moveTo(r.left, r.bottom - len); ctx.lineTo(r.left, r.bottom); ctx.lineTo(r.left + len, r.bottom);
    ctx.moveTo(r.right - len, r.bottom); ctx.lineTo(r.right, r.bottom); ctx.lineTo(r.right, r.bottom - len);
    ctx.stroke();
  }

  function drawPerimeterTrace(r, progress) {
    if (!ctx || progress <= 0) return;
    const perim = (r.width + r.height) * 2;
    ctx.save();
    ctx.strokeStyle = THEME.gold; ctx.lineWidth = 1;
    ctx.setLineDash([perim * progress, perim]);
    ctx.strokeRect(r.left, r.top, r.width, r.height);
    ctx.restore();
  }

  function drawDimensionLabel(r, el) {
    if (!ctx) return;
    const tag = el.tagName ? el.tagName.toLowerCase() : 'node';
    const label = `${tag} · ${Math.round(r.width)}×${Math.round(r.height)}`;
    ctx.save();
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    const tw = ctx.measureText(label).width, bw = tw + 10, bh = 16;
    const bx = Math.max(8, Math.min(window.innerWidth - bw - 8, r.left));
    const by = r.top > 22 ? r.top - bh - 3 : r.bottom + 4;
    ctx.fillStyle = 'rgba(9, 9, 11, 0.9)'; ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = THEME.goldMuted; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = THEME.gold; ctx.fillText(label, bx + 5, by + 11);
    ctx.restore();
  }

  function drawWireframeOverlay() {
    if (!ctx || !isWireframeActive) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(193, 161, 98, 0.22)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    for (const el of targets) {
      if (!el.isConnected) continue;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) ctx.strokeRect(r.left, r.top, r.width, r.height);
    }
    ctx.restore();
  }

  function drawCursorAgent() {
    if (!ctx || !cursor.visible) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cursor.x, cursor.y, 14, 0, Math.PI * 2);
    ctx.strokeStyle = THEME.goldGlow; ctx.lineWidth = 2; ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cursor.x, cursor.y); ctx.lineTo(cursor.x + 12, cursor.y + 12);
    ctx.lineTo(cursor.x + 4, cursor.y + 13); ctx.lineTo(cursor.x, cursor.y + 18);
    ctx.closePath(); ctx.fillStyle = THEME.gold; ctx.fill();
    ctx.strokeStyle = '#09090b'; ctx.lineWidth = 1; ctx.stroke();

    ctx.font = '9px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#09090b'; ctx.fillRect(cursor.x + 16, cursor.y + 2, 48, 14);
    ctx.strokeStyle = THEME.gold; ctx.strokeRect(cursor.x + 16, cursor.y + 2, 48, 14);
    ctx.fillStyle = THEME.gold; ctx.fillText('BUILDER', cursor.x + 20, cursor.y + 12);
    ctx.restore();
  }

  function drawParticles() {
    if (!ctx || particles.length === 0) return;
    ctx.save();
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(193, 161, 98, ${p.life})`; ctx.fill();
    }
    ctx.restore();
  }

  function advanceQueue() {
    if (currentIndex >= targets.length) {
      activeTarget = null; cursor.visible = false; isCompleted = true; updateProgress(); return;
    }
    const nextEl = targets[currentIndex];
    if (!nextEl || !nextEl.isConnected || !isElementVisible(nextEl)) {
      currentIndex++; advanceQueue(); return;
    }
    activeTarget = nextEl;
    targetStartTime = performance.now();
    const r = nextEl.getBoundingClientRect();
    cursor.targetX = r.left + r.width / 2; cursor.targetY = r.top + r.height / 2;
    cursor.visible = true;
    if (!cursor.x && !cursor.y) { cursor.x = cursor.targetX; cursor.y = cursor.targetY; }
    if (prefersReducedMotion) {
      revealedSet.add(nextEl); applyRevealedStyle(nextEl);
      currentIndex++; updateProgress(); advanceQueue();
    }
  }

  function render(time) {
    if (isDisposed) return;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    cursor.x += (cursor.targetX - cursor.x) * 0.22;
    cursor.y += (cursor.targetY - cursor.y) * 0.22;
    drawWireframeOverlay();
    if (activeTarget && activeTarget.isConnected) {
      const r = activeTarget.getBoundingClientRect();
      const elapsed = time - targetStartTime;
      const progress = targetDuration === 0 ? 1 : Math.min(1, elapsed / targetDuration);
      drawPerimeterTrace(r, progress);
      drawCornerTicks(r, progress);
      drawDimensionLabel(r, activeTarget);
      if (progress >= 1) {
        spawnSparks(r.left, r.top, 3); spawnSparks(r.right, r.bottom, 3);
        revealedSet.add(activeTarget); applyRevealedStyle(activeTarget);
        updateProgress(); currentIndex++; advanceQueue();
      }
    }
    drawParticles();
    drawCursorAgent();
    rafId = requestAnimationFrame(render);
  }

  function setupMutationObserver() {
    if (observer) { observer.disconnect(); observer = null; }
    observer = new MutationObserver((mutations) => {
      let needsRescan = false;
      for (const m of mutations) {
        for (let i = 0; i < m.addedNodes.length; i++) {
          const n = m.addedNodes[i];
          if (n !== canvas && n !== pill && !pill?.contains(n) && n.nodeType === 1 && n.id !== 'nisa-build-hud-canvas' && n.id !== 'nisa-build-hud-pill') {
            needsRescan = true; break;
          }
        }
        if (needsRescan) break;
      }
      if (needsRescan && !isDisposed) {
        const fresh = discoverTargets(), targetsSet = new Set(targets);
        let addedCount = 0;
        for (const el of fresh) {
          if (!targetsSet.has(el)) {
            targets.push(el); targetsSet.add(el); addedCount++;
            if (!revealedSet.has(el)) applyHiddenStyle(el);
          }
        }
        if (addedCount > 0) {
          updateProgress();
          if (isCompleted && currentIndex < targets.length) {
            isCompleted = false; advanceQueue();
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function start() {
    restoreAllTouched();
    targets = discoverTargets();
    currentIndex = 0; activeTarget = null; isCompleted = false;
    for (const el of targets) applyHiddenStyle(el);
    updateProgress();
    advanceQueue();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(render);
    setupMutationObserver();
  }

  function replay() {
    if (isDisposed) return;
    restoreAllTouched();
    revealedSet.clear(); particles.length = 0; activeTarget = null; cursor.visible = false;
    targets = discoverTargets();
    currentIndex = 0; isCompleted = false;
    for (const el of targets) applyHiddenStyle(el);
    updateProgress();
    advanceQueue();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(render);
  }

  function skip() {
    if (isDisposed) return;
    restoreAllTouched();
    for (const el of targets) {
      if (el && el.isConnected) {
        revealedSet.add(el);
      }
    }
    currentIndex = targets.length;
    activeTarget = null; cursor.visible = false; isCompleted = true;
    updateProgress();
  }

  function toggleWireframe() {
    isWireframeActive = !isWireframeActive;
    if (wireframeBtn) {
      wireframeBtn.style.color = isWireframeActive ? THEME.gold : '#fff';
      wireframeBtn.style.borderColor = isWireframeActive ? THEME.gold : 'rgba(255, 255, 255, 0.1)';
    }
  }

  function dispose() {
    isDisposed = true;
    if (window.__nisaBuildHudPendingInit) {
      document.removeEventListener('DOMContentLoaded', window.__nisaBuildHudPendingInit);
      window.__nisaBuildHudPendingInit = null;
    }
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (observer) { observer.disconnect(); observer = null; }
    window.removeEventListener('resize', resizeCanvas);
    restoreAllTouched();
    if (canvas?.parentNode) canvas.parentNode.removeChild(canvas);
    if (pill?.parentNode) pill.parentNode.removeChild(pill);
    canvas = null; ctx = null; pill = null; targets = [];
    revealedSet.clear(); particles.length = 0;
    activeTarget = null; cursor.visible = false; isCompleted = true;
  }

  function init() {
    isDisposed = false;
    initCanvas();
    createControlPill();
    start();
  }

  window.NisaBuildHUD = {
    replay, skip,
    toggle: toggleWireframe,
    toggleWireframe,
    dispose,
    getState: () => ({
      totalTargets: targets.length,
      revealedCount: revealedSet.size,
      isCompleted,
      isWireframeActive,
      isDisposed
    }),
    discoverTargets: () => discoverTargets()
  };

  function onReady() {
    window.__nisaBuildHudPendingInit = null;
    init();
  }

  if (document.readyState === 'loading') {
    window.__nisaBuildHudPendingInit = onReady;
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    init();
  }
})();
