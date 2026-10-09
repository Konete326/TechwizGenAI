import { logDebug } from "./logger";
import { fetchVoiceToken } from './geminiUtils';
import { useState, useRef, useCallback, useEffect } from "react";
import { setupToolResponseListener } from "./toolDispatch";
import { createServerMessageHandler } from "./serverMessage";
import { handleWsClose } from "./wsManager";
import { createLiveAudio } from "./liveAudio";
import { sendSetupAndReconnectContext, startInputStream, ensureCallTimer } from "./liveOpen";
import { resetToolGuards } from "./nesaToolGuards";
import { useConnectionQuality } from "./useConnectionQuality";
import { useNetworkEvents } from "./useNetworkEvents";
import { useGeminiLiveSenders } from "./useGeminiLiveSenders";
import { useMicMode } from "./useMicMode";

const WS_EPHEMERAL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained";
const WS_DIRECT = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

function getLiveWsUrl(tokenOrKey) {
  if (tokenOrKey.startsWith("auth_tokens/")) {
    return `${WS_EPHEMERAL}?access_token=${encodeURIComponent(tokenOrKey)}`;
  }
  return `${WS_DIRECT}?key=${encodeURIComponent(tokenOrKey)}`;
}

export function useGeminiLive({ onToolCall, clientId } = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [connectionQuality, setConnectionQuality] = useState("offline");
  const wsRef = useRef(null), isReadyRef = useRef(false), isCallActiveRef = useRef(false);
  const retryCountRef = useRef(0), retryTimerRef = useRef(null);
  const durationRef = useRef(0), warned55Ref = useRef(false), durationStopRef = useRef(null);
  const pendingToolCallsRef = useRef(new Map()), onToolCallRef = useRef(onToolCall);
  const connectRef = useRef(null);
  const lastMessageTimeRef = useRef(null), resumeHandleRef = useRef(null);
  const userSpeakingTimerRef = useRef(null);
  const [audio] = useState(() => createLiveAudio(setIsSpeaking));
  const { micMode, toggleMicMode } = useMicMode({ sessionActive: isConnected });
  useEffect(() => { onToolCallRef.current = onToolCall; }, [onToolCall]);

  const stopAudio = useCallback(() => {
    if (import.meta.env.VITE_DEBUG === "true") {
      const e = new Error();
      console.log(`[DEBUG] ${performance.now().toFixed(1)} stopAudio called. Caller stack:`, e.stack);
    }
    audio.stopAll();
  }, [audio]);

  const resumeAudio = useCallback(() => {
    audio.resume();
  }, [audio]);

  const disconnect = useCallback((keepDuration = false) => {
    isCallActiveRef.current = false;
    isReadyRef.current = false;
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    pendingToolCallsRef.current.forEach(({ timer }) => clearTimeout(timer));
    pendingToolCallsRef.current.clear();
    if (!keepDuration) {
      durationRef.current = 0; warned55Ref.current = false;
      durationStopRef.current?.(); durationStopRef.current = null;
      resumeHandleRef.current = null;
    }
    if (userSpeakingTimerRef.current) { clearTimeout(userSpeakingTimerRef.current); userSpeakingTimerRef.current = null; }
    setIsUserSpeaking(false);
    audio.close();
    if (wsRef.current) { try { wsRef.current.close(); } catch(err) { logDebug("WS close error", err); } wsRef.current = null; }
    setIsConnected(false);
    resetToolGuards();
  }, [audio]);

  const connect = useCallback(async (isReconnect = false) => {
    disconnect(isReconnect);
    isCallActiveRef.current = true;
    setConnectionError("");
    if (!isReconnect) { retryCountRef.current = 0; durationRef.current = 0; warned55Ref.current = false; resumeHandleRef.current = null; }
    const apiKey = await fetchVoiceToken(clientId);
    if (!apiKey) { setConnectionError("Gemini API key is required"); return; }
    try {
      audio.open();
      const ws = new WebSocket(getLiveWsUrl(apiKey));
      wsRef.current = ws;
      ws.onopen = async () => {
        sendSetupAndReconnectContext(ws, { resumeHandleRef, transcript, isReconnect });
        try {
          await startInputStream(ws, { audio, isReadyRef, isCallActiveRef, setIsUserSpeaking, userSpeakingTimerRef });
          setIsConnected(true);
          ensureCallTimer({ durationStopRef, durationRef, warned55Ref, wsRef, onDisconnect: () => disconnect() });
        } catch (err) {
          setConnectionError(err?.message || "Microphone initialization failed");
          disconnect();
        }
      };
      ws.onmessage = createServerMessageHandler({
        isReadyRef, audio, setTranscript,
        wsRef, pendingRef: pendingToolCallsRef, stopAudio, onToolCallRef, lastMessageTimeRef, resumeHandleRef
      });
      ws.onerror = () => setConnectionError("WebSocket connection failed");
      ws.onclose = (event) => handleWsClose(event, {
        isCallActiveRef, retryCountRef, retryTimerRef,
        setIsConnected, setConnectionError, connectFn: () => connectRef.current?.(true), disconnectFn: disconnect
      });
    } catch (err) {
      setConnectionError(err?.message || "Failed to initialize");
      disconnect();
    }
  }, [audio, disconnect, stopAudio, transcript]);
  useEffect(() => { connectRef.current = connect; }, [connect]);

  const { forceReply, sendContextTurn } = useGeminiLiveSenders(wsRef);
  useEffect(() => setupToolResponseListener(wsRef, pendingToolCallsRef), []);
  useEffect(() => () => disconnect(), [disconnect]);

  useConnectionQuality({ isConnected, wsRef, lastMessageTimeRef, setConnectionQuality });
  useNetworkEvents({ isConnected, connect, isCallActiveRef, setConnectionQuality });

  return {
    isConnected, isSpeaking, isUserSpeaking, transcript, connectionError, connectionQuality, micMode, toggleMicMode,
    connect, disconnect, forceReply, sendContextTurn, resumeAudio
  };
}

export default useGeminiLive;
