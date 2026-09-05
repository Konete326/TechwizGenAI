import { useState, useRef, useEffect, useCallback } from "react";
import { useGeminiLive } from "./useGeminiLive";

export function useNesaCall({ onSendMessage } = {}) {
  const [callPhase, setCallPhase] = useState("ended");
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const isCallActiveRef = useRef(false);
  const ringTimerRef = useRef(null);

  const { isConnected, isSpeaking, transcript, connect, disconnect } = useGeminiLive();

  const clearRingTimer = () => {
    if (ringTimerRef.current) {
      clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
    }
  };

  const endCall = useCallback(() => {
    clearRingTimer();
    isCallActiveRef.current = false;
    disconnect();
    setCallPhase("ended");
    setIsCallActive(false);
    setIsMinimized(false);
  }, [disconnect]);

  const startCall = useCallback(() => {
    clearRingTimer();
    disconnect();
    setIsMinimized(false);
    setCallPhase("ringing");

    ringTimerRef.current = setTimeout(() => {
      setCallPhase("connected");
      isCallActiveRef.current = true;
      setIsCallActive(true);
      connect();
    }, 2000);
  }, [connect, disconnect]);

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  useEffect(() => {
    return () => {
      clearRingTimer();
      disconnect();
    };
  }, [disconnect]);

  const nesaState = isSpeaking ? "speaking" : "idle";

  return {
    isCallActive,
    callPhase,
    isMinimized,
    setIsMinimized,
    toggleMinimize,
    nesaState,
    isListening: isConnected,
    transcript,
    startCall,
    endCall,
    onStreamComplete: () => {}
  };
}

export default useNesaCall;
