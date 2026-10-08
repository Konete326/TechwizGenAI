import { useState, useRef, useEffect, useCallback } from "react";
import { useGeminiLive } from "./useGeminiLive";
import { checkMicrophonePermission } from "@/utils/checkMicPermission";
import { useNesaCallWidget } from "./useNesaCallWidget";
import { useWakeLock } from "./useWakeLock";
import { useNesaContextEvent } from "./useNesaContextEvent";

export function useNesaCall({ onMicDenied, onToolCall } = {}) {
  const [callPhase, setCallPhase] = useState("ended");
  const [isCallActive, setIsCallActive] = useState(false);
  const [debouncedSpeaking, setDebouncedSpeaking] = useState(false);
  const [lastExecutedTool, setLastExecutedTool] = useState(null);



  const {
    widgetPosition, setWidgetPosition,
    widgetSide,
    dockCorner,
    isMinimized, setIsMinimized,
    reposition
  } = useNesaCallWidget();

  const isCallActiveRef = useRef(false);
  const ringTimerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const handleLiveToolCall = useCallback((call) => {
    setLastExecutedTool(call);
    if (onToolCall) onToolCall(call);
  }, [onToolCall]);

  const { isConnected, isSpeaking, isUserSpeaking, transcript, connectionError, connectionQuality, micMode, toggleMicMode, connect, disconnect, forceReply, sendContextTurn, resumeAudio } = useGeminiLive({
    onToolCall: handleLiveToolCall
  });

  useEffect(() => {
    const handleAction = () => resumeAudio?.();
    window.addEventListener("click", handleAction);
    window.addEventListener("nesa:toolcall", handleAction);
    return () => {
      window.removeEventListener("click", handleAction);
      window.removeEventListener("nesa:toolcall", handleAction);
    };
  }, [resumeAudio]);

  useEffect(() => {
    if (isSpeaking) {
      if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
      setTimeout(() => setDebouncedSpeaking(true), 0);
    } else {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => setDebouncedSpeaking(false), 450);
    }
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, [isSpeaking]);

  const clearRingTimer = () => {
    if (ringTimerRef.current) { clearTimeout(ringTimerRef.current); ringTimerRef.current = null; }
  };

  const endCall = useCallback(() => {
    clearRingTimer();
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
    setDebouncedSpeaking(false);
    isCallActiveRef.current = false;
    disconnect();
    setCallPhase("ended");
    setIsCallActive(false);
    setIsMinimized(false);
  }, [disconnect, setIsMinimized]);

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
  }, [connect, disconnect, onMicDenied, setIsMinimized]);

  const toggleMinimize = useCallback(() => setIsMinimized((prev) => !prev), [setIsMinimized]);

  useEffect(() => {
    return () => {
      clearRingTimer();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      disconnect();
    };
  }, [disconnect]);

  useWakeLock(isCallActive);
  useNesaContextEvent(sendContextTurn);

  const activeSpeaking = debouncedSpeaking || isSpeaking;
  const nesaState = activeSpeaking ? "speaking" : "idle";

  return {
    isCallActive, callPhase, isMinimized, setIsMinimized, toggleMinimize, nesaState,
    isSpeaking: activeSpeaking, isListening: isConnected, isUserSpeaking, transcript, connectionError, connectionQuality,
    micMode, toggleMicMode,
    startCall, endCall, onStreamComplete: () => {}, forceReply, sendContextTurn, lastExecutedTool,
    widgetPosition, setWidgetPosition, widgetSide, dockCorner, reposition
  };
}
