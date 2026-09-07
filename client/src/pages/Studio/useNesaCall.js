import { useState, useRef, useEffect, useCallback } from "react";
import { useGeminiLive } from "./useGeminiLive";
import { checkMicrophonePermission } from "@/utils/checkMicPermission";

export function useNesaCall({ onSendMessage, onMicDenied, onToolCall } = {}) {
  const [callPhase, setCallPhase] = useState("ended");
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [debouncedSpeaking, setDebouncedSpeaking] = useState(false);
  const [lastExecutedTool, setLastExecutedTool] = useState(null);
  const isCallActiveRef = useRef(false);
  const ringTimerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const handleLiveToolCall = useCallback((call) => {
    setLastExecutedTool(call);
    console.log("Nesa tool dispatched:", call?.name, call?.args);
    if (onToolCall) onToolCall(call);
  }, [onToolCall]);

  const { isConnected, isSpeaking, transcript, connectionError, connect, disconnect, forceReply } = useGeminiLive({
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
    lastExecutedTool
  };
}

export default useNesaCall;
