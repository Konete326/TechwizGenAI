import { useState, useRef, useCallback, useEffect } from "react";
import { pcmToB64 } from "./audioUtils";
import { startCapture } from "./audioCapture";
import { createPlayback } from "./audioPlayback";
import { setupToolResponseListener } from "./toolDispatch";
import { startCallTimer } from "./callTimer";
import { createServerMessageHandler } from "./serverMessage";
import { buildSetupMessage } from "./nesaSetup";
import { handleWsClose } from "./wsManager";

const WS_BASE = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

function getVoiceKeys() {
  const c = localStorage.getItem("techwiz_custom_api_key") || localStorage.getItem("custom_api_key");
  const k = [import.meta.env.VITE_GEMINI_LIVE_KEY_1, import.meta.env.VITE_GEMINI_LIVE_KEY_2, import.meta.env.VITE_GEMINI_LIVE_KEY_3, import.meta.env.VITE_GEMINI_API_KEY].filter(Boolean);
  return c ? [c] : (k.length ? k : [""]);
}

export function useGeminiLive({ onToolCall } = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const wsRef = useRef(null), captureRef = useRef(null), playbackRef = useRef(null);
  const isReadyRef = useRef(false), isCallActiveRef = useRef(false);
  const keyIndexRef = useRef(0), retryCountRef = useRef(0), retryTimerRef = useRef(null);
  const durationRef = useRef(0), warned55Ref = useRef(false), durationStopRef = useRef(null);
  const pendingToolCallsRef = useRef(new Map()), onToolCallRef = useRef(onToolCall);
  onToolCallRef.current = onToolCall;

  const stopAudio = useCallback(() => {
    playbackRef.current?.stopAll();
    setIsSpeaking(false);
  }, []);

  const disconnect = useCallback((keepDuration = false) => {
    isCallActiveRef.current = false;
    isReadyRef.current = false;
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    pendingToolCallsRef.current.forEach(t => clearTimeout(t));
    pendingToolCallsRef.current.clear();
    if (!keepDuration) {
      durationRef.current = 0; warned55Ref.current = false;
      durationStopRef.current?.(); durationStopRef.current = null;
    }
    captureRef.current?.stop(); captureRef.current = null;
    playbackRef.current?.close(); playbackRef.current = null;
    if (wsRef.current) { try { wsRef.current.close(); } catch {} wsRef.current = null; }
    setIsConnected(false); setIsSpeaking(false);
  }, []);

  const connect = useCallback(async (isReconnect = false) => {
    disconnect(isReconnect);
    isCallActiveRef.current = true;
    setConnectionError("");
    if (!isReconnect) { retryCountRef.current = 0; durationRef.current = 0; warned55Ref.current = false; }
    const keys = getVoiceKeys();
    const apiKey = keys[keyIndexRef.current % keys.length] || "";
    if (!apiKey) { setConnectionError("Gemini API key is required"); return; }
    try {
      playbackRef.current = createPlayback();
      const ws = new WebSocket(WS_BASE + "?key=" + apiKey);
      wsRef.current = ws;
      ws.onopen = async () => {
        ws.send(JSON.stringify(buildSetupMessage()));
        try {
          captureRef.current = await startCapture({
            onChunk: (pcmBuf) => {
              if (ws.readyState !== WebSocket.OPEN || !isReadyRef.current) return;
              ws.send(JSON.stringify({ realtimeInput: { mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: pcmToB64(pcmBuf) }] } }));
            },
            onMicLost: () => {
              if (isCallActiveRef.current) { window.dispatchEvent(new CustomEvent("nesa:mic_lost")); captureRef.current = null; }
            }
          });
          setIsConnected(true);
          if (!durationStopRef.current) {
            durationStopRef.current = startCallTimer({ durationRef, warned55Ref, wsRef, onDisconnect: () => disconnect() });
          }
        } catch (err) {
          setConnectionError(err?.message || "Microphone initialization failed");
          disconnect();
        }
      };
      ws.onmessage = createServerMessageHandler({
        isReadyRef, playbackRef, setIsSpeaking, setTranscript,
        wsRef, pendingRef: pendingToolCallsRef, stopAudio, onToolCallRef
      });
      ws.onerror = () => setConnectionError("WebSocket connection failed");
      ws.onclose = (event) => handleWsClose(event, {
        isCallActiveRef, keyIndexRef, retryCountRef, retryTimerRef,
        setIsConnected, setConnectionError, keys, connectFn: connect, disconnectFn: disconnect
      });
    } catch (err) {
      setConnectionError(err?.message || "Failed to initialize");
      disconnect();
    }
  }, [disconnect, stopAudio]);

  const forceReply = useCallback((text = "Hello Nisa") => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text }] }], turnComplete: true } }));
  }, []);

  const sendContextTurn = useCallback((text) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && text) wsRef.current.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text }] }], turnComplete: true } }));
  }, []);

  useEffect(() => setupToolResponseListener(wsRef, pendingToolCallsRef), []);
  useEffect(() => () => disconnect(), [disconnect]);

  return { isConnected, isSpeaking, transcript, connectionError, connect, disconnect, forceReply, sendContextTurn };
}

export default useGeminiLive;
