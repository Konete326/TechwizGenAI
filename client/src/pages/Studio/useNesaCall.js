import { useState, useRef, useEffect, useCallback } from "react";
import { useSpeechToText } from "./useSpeechToText";
import { useTextToSpeech } from "./useTextToSpeech";

export function useNesaCall({ onSendMessage, isStreaming }) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [nesaState, setNesaState] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const isCallActiveRef = useRef(false);
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

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const endCall = useCallback(() => {
    isCallActiveRef.current = false;
    setIsCallActive(false);
    setNesaState("idle");
    setTranscript("");
    pendingTranscriptRef.current = "";
    clearSilenceTimer();
    stopListening();
    stopTts();
  }, [stopListening, stopTts]);

  const startCall = useCallback(() => {
    isCallActiveRef.current = true;
    setIsCallActive(true);
    setNesaState("idle");
    setTranscript("");
    pendingTranscriptRef.current = "";
    clearSilenceTimer();
    stopTts();
    startListening();
  }, [startListening, stopTts]);

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

    clearSilenceTimer();
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

    return () => clearSilenceTimer();
  }, [transcript, isCallActive, nesaState, isStreaming, onSendMessage, stopListening]);

  useEffect(() => {
    return () => {
      clearSilenceTimer();
      stopTts();
    };
  }, [stopTts]);

  return {
    isCallActive,
    nesaState,
    isListening,
    transcript,
    startCall,
    endCall,
    onStreamComplete
  };
}

export default useNesaCall;
