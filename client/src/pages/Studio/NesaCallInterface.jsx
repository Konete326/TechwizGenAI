import { useState, useEffect, useRef } from "react";
import Draggable from "react-draggable";

import { NesaCallWidgetDesktop } from "./NesaCallWidgetDesktop";
import { NesaCallWidgetMobile } from "./NesaCallWidgetMobile";
import { playRingingTone } from "./audioUtils";
const cornerClasses = { "top-left": "top-4 left-4", "top-right": "top-4 right-4", "bottom-left": "bottom-4 left-4", "bottom-right": "bottom-4 right-4" };

export function NesaCallInterface({
  isActive = false, callPhase = "ended", isMinimized = false,
  onToggleMinimize, onEndCall, nesaState = "idle",
  isListening = false, isUserSpeaking = false, connectionError = null, connectionQuality = "good", onRetry,
  forceReply, position, onPositionChange, widgetSide = "right", dockCorner = "bottom-right", onReposition
}) {
  const [duration, setDuration] = useState(0), [showRinging, setShowRinging] = useState(callPhase === "ringing");
  const [isFadingRinging, setIsFadingRinging] = useState(false), nodeRef = useRef(null);

  const [prevCallPhase, setPrevCallPhase] = useState(callPhase);
  if (callPhase !== prevCallPhase) {
    setPrevCallPhase(callPhase);
    if (callPhase === "ringing") {
      setShowRinging(true);
      setIsFadingRinging(false);
    } else if (callPhase === "connected") {
      setIsFadingRinging(true);
    } else {
      setShowRinging(false);
      setIsFadingRinging(false);
      setDuration(0);
    }
  }



  useEffect(() => {
    if (callPhase === "ringing") {
      const stopTone = playRingingTone();
      const hasVib = typeof navigator !== "undefined" && Boolean(navigator.vibrate);
      const doVib = () => { try { navigator.vibrate([400, 200, 400, 1000]); } catch(err) { console.error("Vibrate failed:", err); } };
      if (hasVib) doVib();
      const vibId = hasVib ? setInterval(doVib, 2000) : null;
      return () => { stopTone(); if (vibId) clearInterval(vibId); if (hasVib) { try { navigator.vibrate(0); } catch(err) { console.error("Vibrate stop failed:", err); } } };
    }
    if (callPhase === "connected") {
      const fadeTimer = setTimeout(() => { setShowRinging(false); setIsFadingRinging(false); }, 700);
      const timer = setInterval(() => setDuration((p) => p + 1), 1000);
      return () => { clearTimeout(fadeTimer); clearInterval(timer); };
    }
  }, [callPhase]);

  useEffect(() => {
    const handleCollision = (e) => {
      const detail = e?.detail || {};
      if (detail.name !== "spotlightElement") return;
      const targetKey = detail.args?.targetKey || detail.targetKey;
      if (!targetKey) return;

      const targetEl = document.querySelector(`[data-nesa-target="${targetKey}"], #${targetKey}`);
      if (!targetEl || !nodeRef.current) return;

      const t = targetEl.getBoundingClientRect();
      const w = nodeRef.current.getBoundingClientRect();

      if (window.innerWidth < 768) {
        if (onToggleMinimize && !isMinimized) onToggleMinimize();
        return;
      }

        const isColliding = !(t.right < w.left || t.left > w.right || t.bottom < w.top || t.top > w.bottom);
        if (isColliding && onReposition) {
          onReposition(widgetSide === "right" ? "left" : "right");
        }
    };

    window.addEventListener("nesa:toolcall", handleCollision);
    return () => window.removeEventListener("nesa:toolcall", handleCollision);
  }, [widgetSide, onReposition, onToggleMinimize, isMinimized]);

  if (!isActive && callPhase === "ended") return null;

  const formatDuration = (sec) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  const isSpeaking = nesaState === "speaking", isRinging = callPhase === "ringing", durationText = formatDuration(duration);
  const currentPos = position || { x: typeof window !== "undefined" ? Math.max(20, window.innerWidth - 370) : 800, y: typeof window !== "undefined" ? Math.max(20, window.innerHeight - 560) : 200 };




  return (
    <>
      <NesaCallWidgetMobile isMinimized={isMinimized} durationText={durationText} isSpeaking={isSpeaking} isListening={isListening} isUserSpeaking={isUserSpeaking} onToggleMinimize={onToggleMinimize} onEndCall={onEndCall} connectionQuality={connectionQuality} showRinging={showRinging} isFadingRinging={isFadingRinging} connectionError={connectionError} onRetry={onRetry} isRinging={isRinging} callPhase={callPhase} forceReply={forceReply} cornerClasses={cornerClasses} dockCorner={dockCorner} />

      <Draggable
        nodeRef={nodeRef}
        handle=".call-drag-handle"
        bounds="body"
        position={currentPos}
        onDrag={(e, d) => onPositionChange && onPositionChange({ x: d.x, y: d.y })}
      >
        <div id="nesa-call-widget" ref={nodeRef} className="fixed top-0 left-0 z-50 hidden md:block">
          <NesaCallWidgetDesktop isMinimized={isMinimized} durationText={durationText} isSpeaking={isSpeaking} isListening={isListening} isUserSpeaking={isUserSpeaking} onToggleMinimize={onToggleMinimize} onEndCall={onEndCall} connectionQuality={connectionQuality} showRinging={showRinging} isFadingRinging={isFadingRinging} connectionError={connectionError} onRetry={onRetry} isRinging={isRinging} callPhase={callPhase} forceReply={forceReply} />
        </div>
      </Draggable>
    </>
  );
}

export default NesaCallInterface;
