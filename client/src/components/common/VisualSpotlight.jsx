import { useState, useEffect, useRef, useCallback } from "react";

export function VisualSpotlight() {
  const [targetRect, setTargetRect] = useState(null);
  const [sourceRect, setSourceRect] = useState(null);
  const [isBlurActive, setIsBlurActive] = useState(false);
  const [label, setLabel] = useState("");
  const targetRef = useRef(null);
  const dismissTimerRef = useRef(null);
  const blurTimerRef = useRef(null);

  const dismiss = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    targetRef.current = null;
    setTargetRect(null);
    setSourceRect(null);
    setIsBlurActive(false);
    setLabel("");
  }, []);

  const updatePositions = useCallback(() => {
    if (!targetRef.current) return;
    const t = targetRef.current.getBoundingClientRect();
    if (t.width > 0 || t.height > 0) setTargetRect(t);
    const widget = document.getElementById("nesa-call-widget");
    if (widget) setSourceRect(widget.getBoundingClientRect());
  }, []);

  useEffect(() => {
    const handleToolCall = (event) => {
      const detail = event?.detail || {};
      if (detail.name !== "spotlightElement") return;
      const args = detail.args || detail;
      const targetKey = args.targetKey || args.target;
      const textLabel = args.label || "Highlighted Feature";
      if (!targetKey) return;

      const candidates = Array.from(
        document.querySelectorAll(`[data-nesa-target="${targetKey}"], #${targetKey}, [name="${targetKey}"]`)
      );
      const target = candidates.find((el) => el.offsetParent !== null || el.getBoundingClientRect().width > 0) || candidates[0];
      if (!target) return;

      targetRef.current = target;
      target.scrollIntoView({ behavior: "smooth", block: "center" });

      const tRect = target.getBoundingClientRect();
      const widget = document.getElementById("nesa-call-widget");
      const sRect = widget ? widget.getBoundingClientRect() : null;

      setTargetRect(tRect);
      setSourceRect(sRect);
      setLabel(textLabel);
      setIsBlurActive(true);

      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      blurTimerRef.current = setTimeout(() => setIsBlurActive(false), 2000);

      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(dismiss, 8000);

      setTimeout(updatePositions, 350);
    };

    window.addEventListener("nesa:toolcall", handleToolCall);
    window.addEventListener("scroll", updatePositions, { passive: true });
    window.addEventListener("resize", updatePositions, { passive: true });

    return () => {
      window.removeEventListener("nesa:toolcall", handleToolCall);
      window.removeEventListener("scroll", updatePositions);
      window.removeEventListener("resize", updatePositions);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, [dismiss, updatePositions]);

  useEffect(() => {
    if (!targetRect) return;
    const handleGlobalClick = () => dismiss();
    const clickTimer = setTimeout(() => {
      window.addEventListener("click", handleGlobalClick, { once: true });
    }, 200);

    return () => {
      clearTimeout(clickTimer);
      window.removeEventListener("click", handleGlobalClick);
    };
  }, [targetRect, dismiss]);

  if (!targetRect && !isBlurActive) return null;

  const sx = sourceRect ? sourceRect.left + sourceRect.width / 2 : window.innerWidth - 80;
  const sy = sourceRect ? sourceRect.top + sourceRect.height / 2 : window.innerHeight - 80;
  const tx = targetRect ? targetRect.left + targetRect.width / 2 : 0;
  const ty = targetRect ? targetRect.top + targetRect.height / 2 : 0;

  const sourceX = sourceRect && targetRect ? (tx > sourceRect.right ? sourceRect.right : tx < sourceRect.left ? sourceRect.left : sx) : sx;
  const sourceY = sourceRect && targetRect ? (ty > sourceRect.bottom ? sourceRect.bottom : ty < sourceRect.top ? sourceRect.top : sy) : sy;
  const targetX = targetRect ? (sourceX > targetRect.right ? targetRect.right : sourceX < targetRect.left ? targetRect.left : tx) : 0;
  const targetY = targetRect ? (sourceY > targetRect.bottom ? targetRect.bottom : sourceY < targetRect.top ? targetRect.top : ty) : 0;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const p1x = sourceX + dx * 0.35 + (dy > 0 ? -25 : 25);
  const p1y = sourceY + dy * 0.35 + (dx > 0 ? 25 : -25);
  const p2x = sourceX + dx * 0.65 + (dy > 0 ? 25 : -25);
  const p2y = sourceY + dy * 0.65 + (dx > 0 ? -25 : 25);
  const pathD = `M ${sourceX} ${sourceY} C ${p1x} ${p1y}, ${p2x} ${p2y}, ${targetX} ${targetY}`;

  return (
    <>
      {isBlurActive && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-md transition-opacity duration-500 pointer-events-none" />
      )}

      {targetRect && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
          <svg className="fixed inset-0 w-full h-full pointer-events-none z-50">
            <defs>
              <marker id="spotlight-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#60a5fa" />
              </marker>
            </defs>
            <path
              d={pathD}
              className="stroke-blue-400 stroke-2 fill-none"
              markerEnd="url(#spotlight-arrow)"
              strokeDasharray="8 4"
            >
              <animate attributeName="stroke-dashoffset" from="24" to="0" dur="0.8s" repeatCount="indefinite" />
            </path>
          </svg>

          <div
            className="absolute rounded-lg ring-4 ring-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.8)] pointer-events-none transition-all duration-200"
            style={{
              top: `${Math.max(0, targetRect.top - 6)}px`,
              left: `${Math.max(0, targetRect.left - 6)}px`,
              width: `${targetRect.width + 12}px`,
              height: `${targetRect.height + 12}px`
            }}
          />

          {label && (
            <div
              className="absolute z-50 pointer-events-auto"
              style={{
                top: targetRect.top > 120 ? `${targetRect.top - 42}px` : `${targetRect.bottom + 14}px`,
                left: `${Math.max(16, Math.min(window.innerWidth - 240, targetRect.left + targetRect.width / 2 - 110))}px`
              }}
            >
              <div className="bg-zinc-900/95 backdrop-blur-md border border-blue-500/50 text-zinc-100 px-3.5 py-1.5 rounded-lg shadow-xl text-xs font-medium tracking-tight">
                {label}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default VisualSpotlight;
