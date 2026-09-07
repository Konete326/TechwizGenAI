import { useState, useRef, useEffect, useCallback } from "react";
import { useGeminiLive } from "./useGeminiLive";
import { checkMicrophonePermission } from "@/utils/checkMicPermission";

export function useNesaCall({ onSendMessage, onMicDenied, onToolCall } = {}) {
  const [callPhase, setCallPhase] = useState("ended");
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [debouncedSpeaking, setDebouncedSpeaking] = useState(false);
  const [lastExecutedTool, setLastExecutedTool] = useState(null);

  const getRightPosition = useCallback(() => ({
    x: typeof window !== "undefined" ? Math.max(20, window.innerWidth - 370) : 800,
    y: typeof window !== "undefined" ? Math.max(20, window.innerHeight - 560) : 200
  }), []);

  const [widgetPosition, setWidgetPosition] = useState(getRightPosition);
  const [widgetSide, setWidgetSide] = useState("right");
  const isCallActiveRef = useRef(false);
  const ringTimerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const reposition = useCallback((targetSide) => {
    if (targetSide === "minimize") {
      setIsMinimized(true);
      return;
    }
    if (targetSide === "left") {
      setWidgetPosition({ x: 30, y: 120 });
      setWidgetSide("left");
    } else {
      setWidgetPosition(getRightPosition());
      setWidgetSide("right");
    }
  }, [getRightPosition]);

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
