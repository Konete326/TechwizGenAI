import { useState, useRef, useEffect, useCallback } from "react";
import { useSpeechToText } from "./useSpeechToText";
import { useTextToSpeech } from "./useTextToSpeech";

export function useNesaCall({ onSendMessage, isStreaming }) {
  const [callPhase, setCallPhase] = useState("ended");
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [nesaState, setNesaState] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const isCallActiveRef = useRef(false);
  const ringTimerRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const pendingTranscriptRef = useRef("");

  const { speak, stop: stopTts } = useTextToSpeech();

  const handleTranscript = useCallback((updater) => {
    if (!isCallActiveRef.current) return;
    setTranscript((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      pendingTranscriptRef.current = next;
      return next;
    });
  }, []);

  const { isListening, startListening, stopListening } = useSpeechToText(handleTranscript);

  const clearTimers = () => {
    if (ringTimerRef.current) {
      clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const endCall = useCallback(() => {
    clearTimers();
    isCallActiveRef.current = false;
    setCallPhase("ended");
    setIsCallActive(false);
    setIsMinimized(false);
    setNesaState("idle");
    setTranscript("");
    pendingTranscriptRef.current = "";
    stopListening();
    stopTts();
  }, [stopListening, stopTts]);

  const startCall = useCallback(() => {
    clearTimers();
    stopTts();
    setTranscript("");
    pendingTranscriptRef.current = "";
    setIsMinimized(false);
    setCallPhase("ringing");

    ringTimerRef.current = setTimeout(() => {
      setCallPhase("connected");
      isCallActiveRef.current = true;
      setIsCallActive(true);
      setNesaState("idle");
      startListening();
    }, 2000);
  }, [startListening, stopTts]);

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  const onStreamComplete = useCallback((accumulatedText) => {
    if (!isCallActiveRef.current) return;
    const textToSpeak = (accumulatedText || "").trim();
    if (!textToSpeak) {
      setNesaState("idle");
      if (isCallActiveRef.current) startListening();
      return;
    }
    setNesaState("speaking");
    stopListening();
    speak("nesa-call-" + Date.now(), textToSpeak, () => {
      if (!isCallActiveRef.current) return;
      setNesaState("idle");
      startListening();
    });
  }, [speak, startListening, stopListening]);

  useEffect(() => {
    if (!isCallActive || nesaState !== "idle" || isStreaming) return;
    const trimmed = pendingTranscriptRef.current.trim();
    if (!trimmed) return;

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      if (!isCallActiveRef.current || nesaState !== "idle") return;
      const textToSubmit = pendingTranscriptRef.current.trim();
      if (textToSubmit) {
        stopListening();
        setTranscript("");
        pendingTranscriptRef.current = "";
        onSendMessage(textToSubmit);
      }
    }, 1400);

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [transcript, isCallActive, nesaState, isStreaming, onSendMessage, stopListening]);

  useEffect(() => {
    return () => {
      clearTimers();
      stopTts();
    };
  }, [stopTts]);

  return {
    isCallActive,
    callPhase,
    isMinimized,
    setIsMinimized,
    toggleMinimize,
    nesaState,
    isListening,
    transcript,
    startCall,
    endCall,
    onStreamComplete
  };
}

export default useNesaCall;
