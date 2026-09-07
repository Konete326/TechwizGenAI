import { useState, useEffect, useRef, useCallback } from "react";

export function VisualSpotlight() {
  const [spotlight, setSpotlight] = useState(null);
  const targetRef = useRef(null);
  const timerRef = useRef(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    targetRef.current = null;
    setSpotlight(null);
  }, []);

  const updatePosition = useCallback(() => {
    if (!targetRef.current) return;
    const r = targetRef.current.getBoundingClientRect();
    if (r.width > 0 || r.height > 0) {
      setSpotlight((prev) => (prev ? { ...prev, rect: r } : null));
    }
  }, []);

  useEffect(() => {
    const handleToolCall = (event) => {
      const detail = event?.detail || {};
      if (detail.name !== "spotlightElement") return;
      const args = detail.args || detail;
      const targetKey = args.targetKey || args.target;
      const label = args.label || "Highlighted Feature";
      if (!targetKey) return;

      const candidates = Array.from(
        document.querySelectorAll(`[data-nesa-target="${targetKey}"], #${targetKey}, [name="${targetKey}"]`)
      );
      const target = candidates.find((el) => el.offsetParent !== null || el.getBoundingClientRect().width > 0) || candidates[0];
      if (!target) return;

      targetRef.current = target;
      target.scrollIntoView({ behavior: "smooth", block: "center" });

      const initialRect = target.getBoundingClientRect();
      setSpotlight({ rect: initialRect, label, targetKey });

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(dismiss, 8000);

      setTimeout(updatePosition, 350);
    };

    window.addEventListener("nesa:toolcall", handleToolCall);
    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition, { passive: true });

    return () => {
      window.removeEventListener("nesa:toolcall", handleToolCall);
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dismiss, updatePosition]);

  useEffect(() => {
    if (!spotlight) return;
    const handleGlobalClick = () => dismiss();
    const clickTimer = setTimeout(() => {
      window.addEventListener("click", handleGlobalClick, { once: true });
    }, 150);

    return () => {
      clearTimeout(clickTimer);
      window.removeEventListener("click", handleGlobalClick);
    };
  }, [spotlight, dismiss]);

  if (!spotlight || !spotlight.rect) return null;

  const { rect, label } = spotlight;
  const isAbove = rect.top > 120;
  const pillLeft = Math.max(16, Math.min(window.innerWidth - 280, rect.left + rect.width / 2 - 130));

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden animate-in fade-in duration-200">
      <div
        className="absolute rounded-lg ring-4 ring-accent/80 border-2 border-accent/40 shadow-[0_0_25px_rgba(37,99,235,0.45)] animate-pulse pointer-events-none transition-all duration-200"
        style={{
          top: `${Math.max(0, rect.top - 6)}px`,
          left: `${Math.max(0, rect.left - 6)}px`,
          width: `${rect.width + 12}px`,
          height: `${rect.height + 12}px`
        }}
      />
      <div
        className="absolute flex flex-col items-center gap-1.5 transition-all duration-200 z-50 pointer-events-auto"
        style={{
          top: isAbove ? `${rect.top - 14}px` : `${rect.bottom + 14}px`,
          left: `${pillLeft}px`,
          transform: isAbove ? "translateY(-100%)" : "none"
        }}
      >
        {isAbove && (
          <div className="bg-surface-card/95 backdrop-blur-md border border-accent/40 text-text-primary px-3.5 py-2 rounded-xl shadow-xl max-w-xs text-center text-xs font-medium tracking-tight">
            {label}
          </div>
        )}
        <svg
          className={`w-6 h-6 text-accent drop-shadow-md animate-bounce ${isAbove ? "" : "rotate-180"}`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 20.5l-7.5-7.5h5v-9h5v9h5z" />
        </svg>
        {!isAbove && (
          <div className="bg-surface-card/95 backdrop-blur-md border border-accent/40 text-text-primary px-3.5 py-2 rounded-xl shadow-xl max-w-xs text-center text-xs font-medium tracking-tight">
            {label}
          </div>
        )}
      </div>
    </div>
  );
}

export default VisualSpotlight;
