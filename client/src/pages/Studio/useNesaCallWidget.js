import { useState, useCallback, useEffect } from "react";

export function useNesaCallWidget() {
  const getRightPosition = useCallback(() => {
    const w = typeof window !== "undefined" ? window.innerWidth : 1200;
    const h = typeof window !== "undefined" ? window.innerHeight : 800;
    return { x: Math.max(20, w - 360), y: Math.max(20, h - 540) };
  }, []);

  const [widgetPosition, setWidgetPosition] = useState(getRightPosition);
  const [widgetSide, setWidgetSide] = useState("bottom-right");
  const [dockCorner, setDockCorner] = useState("bottom-right");
  const [isMinimized, setIsMinimized] = useState(false);

  const reposition = useCallback((target) => {
    if (target === "minimize") { setIsMinimized(true); return; }
    if (target === "maximize") { setIsMinimized(false); return; }
    let corner = target;
    if (corner === "top") corner = "top-right";
    else if (corner === "bottom") corner = "bottom-right";
    else if (corner === "left") corner = "bottom-left";
    else if (corner === "right") corner = "bottom-right";

    const w = typeof window !== "undefined" ? window.innerWidth : 1200;
    const h = typeof window !== "undefined" ? window.innerHeight : 800;

    if (["top-left", "top-right", "bottom-left", "bottom-right"].includes(corner)) {
      setDockCorner(corner);
      setWidgetSide(corner);
      if (corner === "top-left") setWidgetPosition({ x: 20, y: 80 });
      else if (corner === "top-right") setWidgetPosition({ x: Math.max(20, w - 360), y: 80 });
      else if (corner === "bottom-left") setWidgetPosition({ x: 20, y: Math.max(20, h - 540) });
      else if (corner === "bottom-right") setWidgetPosition({ x: Math.max(20, w - 360), y: Math.max(20, h - 540) });
    }
    if (typeof window !== "undefined" && window.innerWidth >= 768) setIsMinimized(false);
  }, []);

  useEffect(() => {
    const handleToolCall = (e) => {
      const detail = e?.detail || {};
      if (detail.name === "repositionWidget") {
        const pos = detail.args?.position || detail.position;
        if (pos) reposition(pos);
      }
    };
    window.addEventListener("nesa:toolcall", handleToolCall);
    return () => window.removeEventListener("nesa:toolcall", handleToolCall);
  }, [reposition]);

  return {
    widgetPosition, setWidgetPosition,
    widgetSide, setWidgetSide,
    dockCorner, setDockCorner,
    isMinimized, setIsMinimized,
    reposition
  };
}
