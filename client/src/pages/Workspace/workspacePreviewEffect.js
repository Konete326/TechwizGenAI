export const getPreviewConstructionScript = (activeBuild = false) => {
  if (!activeBuild) return '';

  return `
<style id="nisa-scoped-effect-styles">
  [data-nisa-new="true"] {
    opacity: 0 !important;
    transform: translateY(8px) !important;
    transition: opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1) !important;
  }
  [data-nisa-new="true"].nisa-revealed {
    opacity: 1 !important;
    transform: translateY(0) !important;
  }
  .nisa-scoped-cursor {
    position: fixed;
    pointer-events: none;
    z-index: 999999;
    display: flex;
    align-items: center;
    gap: 6px;
    transform: translate(-4px, -4px);
    transition: top 0.35s cubic-bezier(0.16, 1, 0.3, 1), left 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .nisa-cursor-badge {
    background: #09090b;
    color: #fbbf24;
    border: 1px solid rgba(251, 191, 36, 0.4);
    font-size: 11px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 9999px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    white-space: nowrap;
    animation: nisa-pulse 1.5s infinite alternate;
  }
  .nisa-scoped-box {
    position: fixed;
    pointer-events: none;
    z-index: 999998;
    border: 2px dashed #f59e0b;
    border-radius: 6px;
    box-shadow: 0 0 16px rgba(245, 158, 11, 0.25);
    transition: all 0.25s ease-out;
  }
  @keyframes nisa-pulse {
    0% { transform: scale(0.97); opacity: 0.9; }
    100% { transform: scale(1.03); opacity: 1; }
  }
</style>
<script id="nisa-scoped-effect-runner">
(function() {
  function runScopedConstruction() {
    var targets = document.querySelectorAll('[data-nisa-new="true"]');
    if (!targets || targets.length === 0) return;

    var cursorEl = document.createElement('div');
    cursorEl.className = 'nisa-scoped-cursor';
    cursorEl.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 4l7 17 2.5-6.5L20 12 4 4z" fill="#f59e0b" stroke="#000" stroke-width="1.5"/></svg><div class="nisa-cursor-badge">&#10022; Nisa Constructing</div>';
    document.body.appendChild(cursorEl);

    var boxEl = document.createElement('div');
    boxEl.className = 'nisa-scoped-box';
    document.body.appendChild(boxEl);

    var index = 0;
    function processNext() {
      if (index >= targets.length) {
        setTimeout(function() {
          if (cursorEl.parentNode) cursorEl.parentNode.removeChild(cursorEl);
          if (boxEl.parentNode) boxEl.parentNode.removeChild(boxEl);
          var styleEl = document.getElementById('nisa-scoped-effect-styles');
          if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
        }, 400);
        return;
      }

      var el = targets[index];
      var rect = el.getBoundingClientRect();

      boxEl.style.top = (rect.top - 2) + 'px';
      boxEl.style.left = (rect.left - 2) + 'px';
      boxEl.style.width = (rect.width + 4) + 'px';
      boxEl.style.height = (rect.height + 4) + 'px';
      boxEl.style.opacity = '1';

      cursorEl.style.top = (rect.top - 8) + 'px';
      cursorEl.style.left = (rect.left + rect.width / 2) + 'px';

      setTimeout(function() {
        el.classList.add('nisa-revealed');
        setTimeout(function() {
          index++;
          processNext();
        }, 380);
      }, 250);
    }

    setTimeout(processNext, 150);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runScopedConstruction);
  } else {
    runScopedConstruction();
  }
})();
</script>
`;
};

