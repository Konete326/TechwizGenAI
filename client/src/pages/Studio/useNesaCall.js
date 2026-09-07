import { useState, useRef, useEffect, useCallback } from "react";
import { useGeminiLive } from "./useGeminiLive";
import { checkMicrophonePermission } from "@/utils/checkMicPermission";

export function useNesaCall({ onSendMessage, onMicDenied, onToolCall } = {}) {
  const [callPhase, setCallPhase] = useState("ended");
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [debouncedSpeaking, setDebouncedSpeaking] = useState(false);
  const [lastExecutedTool, setLastExecutedTool] = useState(null);

  const getRightPosition = useCallback(() => {
    const w = typeof window !== "undefined" ? window.innerWidth : 1200;
    const h = typeof window !== "undefined" ? window.innerHeight : 800;
    return { x: Math.max(20, w - 360), y: Math.max(20, h - 540) };
  }, []);

  const [widgetPosition, setWidgetPosition] = useState(getRightPosition);
  const [widgetSide, setWidgetSide] = useState("bottom-right");
  const isCallActiveRef = useRef(false);
  const ringTimerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const reposition = useCallback((target) => {
    if (target === "minimize") { setIsMinimized(true); return; }
    if (target === "maximize") { setIsMinimized(false); return; }
    const w = typeof window !== "undefined" ? window.innerWidth : 1200;
    const h = typeof window !== "undefined" ? window.innerHeight : 800;
    if (target === "top-left") {
      setWidgetPosition({ x: 20, y: 80 }); setWidgetSide("top-left");
    } else if (target === "top-right") {
      setWidgetPosition({ x: Math.max(20, w - 360), y: 80 }); setWidgetSide("top-right");
    } else if (target === "bottom-left" || target === "left") {
      setWidgetPosition({ x: 20, y: Math.max(20, h - 540) }); setWidgetSide("bottom-left");
    } else {
      setWidgetPosition({ x: Math.max(20, w - 360), y: Math.max(20, h - 540) }); setWidgetSide("bottom-right");
    }
    setIsMinimized(false);
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

  const handleLiveToolCall = useCallback((call) => {
    setLastExecutedTool(call);
    console.log("Nesa tool dispatched:", call?.name, call?.args);
    if (onToolCall) onToolCall(call);
  }, [onToolCall]);

  const { isConnected, isSpeaking, transcript, connectionError, connect, disconnect, forceReply, sendContextTurn } = useGeminiLive({
    onToolCall: handleLiveToolCall
  });

  useEffect(() => {
    if (isSpeaking) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      setDebouncedSpeaking(true);
    } else {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        setDebouncedSpeaking(false);
      }, 450);
    }
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [isSpeaking]);

  const clearRingTimer = () => {
    if (ringTimerRef.current) {
      clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
    }
  };

  const endCall = useCallback(() => {
    clearRingTimer();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setDebouncedSpeaking(false);
    isCallActiveRef.current = false;
    disconnect();
    setCallPhase("ended");
    setIsCallActive(false);
    setIsMinimized(false);
  }, [disconnect]);

  const startCall = useCallback(async () => {
    const micCheck = await checkMicrophonePermission();
    if (!micCheck.granted) {
      if (onMicDenied) onMicDenied(micCheck.error);
      return false;
    }

    clearRingTimer();
    disconnect();
    setIsMinimized(false);
    setCallPhase("ringing");

    ringTimerRef.current = setTimeout(() => {
      setCallPhase("connected");
      isCallActiveRef.current = true;
      setIsCallActive(true);
      connect();
    }, 3000);
    return true;
  }, [connect, disconnect, onMicDenied]);

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  useEffect(() => {
    return () => {
      clearRingTimer();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      disconnect();
    };
  }, [disconnect]);

  useEffect(() => {
    const handleContextEvent = (e) => {
      const text = e?.detail?.text || e?.detail;
      if (text && sendContextTurn) sendContextTurn(text);
    };
    window.addEventListener("nesa:context", handleContextEvent);
    return () => window.removeEventListener("nesa:context", handleContextEvent);
  }, [sendContextTurn]);

  const activeSpeaking = debouncedSpeaking || isSpeaking;
  const nesaState = activeSpeaking ? "speaking" : "idle";

  return {
    isCallActive,
    callPhase,
    isMinimized,
    setIsMinimized,
    toggleMinimize,
    nesaState,
    isSpeaking: activeSpeaking,
    isListening: isConnected,
    transcript,
    connectionError,
    startCall,
    endCall,
    onStreamComplete: () => {},
    forceReply,
    sendContextTurn,
    lastExecutedTool,
    widgetPosition,
    setWidgetPosition,
    widgetSide,
    reposition
  };
}

export default useNesaCall;
