import { useState, useRef, useCallback, useEffect } from "react";
import { base64EncodeAudio, base64DecodeAudio } from "./audioUtils";

const WS_BASE_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

export function useGeminiLive() {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [connectionError, setConnectionError] = useState("");

  const wsRef = useRef(null);
  const inputAudioCtxRef = useRef(null);
  const outputAudioCtxRef = useRef(null);
  const micStreamRef = useRef(null);
  const processorRef = useRef(null);
  const nextPlayTimeRef = useRef(0);
  const activeSourcesRef = useRef([]);
  const timerRef = useRef(null);
  const isReadyRef = useRef(false);

  const stopActiveAudio = useCallback(() => {
    activeSourcesRef.current.forEach((src) => { try { src.stop(); } catch {} });
    activeSourcesRef.current = [];
    if (outputAudioCtxRef.current) nextPlayTimeRef.current = outputAudioCtxRef.current.currentTime;
    setIsSpeaking(false);
  }, []);

  const disconnect = useCallback(() => {
    isReadyRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    stopActiveAudio();
    if (processorRef.current) { try { processorRef.current.disconnect(); } catch {} processorRef.current = null; }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach((t) => t.stop()); micStreamRef.current = null; }
    if (inputAudioCtxRef.current) { try { inputAudioCtxRef.current.close(); } catch {} inputAudioCtxRef.current = null; }
    if (outputAudioCtxRef.current) { try { outputAudioCtxRef.current.close(); } catch {} outputAudioCtxRef.current = null; }
    if (wsRef.current) { try { wsRef.current.close(); } catch {} wsRef.current = null; }
    setIsConnected(false);
    setIsSpeaking(false);
  }, [stopActiveAudio]);

  const scheduleAudioChunk = useCallback((float32Array) => {
    if (!outputAudioCtxRef.current) return;
    const ctx = outputAudioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();

    const buffer = ctx.createBuffer(1, float32Array.length, 24000);
    buffer.copyToChannel(float32Array, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const startTime = Math.max(ctx.currentTime, nextPlayTimeRef.current);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + buffer.duration;
    activeSourcesRef.current.push(source);
    setIsSpeaking(true);

    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
      if (activeSourcesRef.current.length === 0) setIsSpeaking(false);
    };
  }, []);

  const handleServerMessage = useCallback(async (event) => {
    try {
      let raw = event.data;
      if (typeof raw !== "string") {
        raw = raw?.text ? await raw.text() : new TextDecoder().decode(raw);
      }
      const data = JSON.parse(raw);
      if (data.setupComplete || data.setup_complete) {
        isReadyRef.current = true;
        return;
      }
      if (data.error) {
        setConnectionError(data.error.message || "Gemini Live stream error occurred");
        stopActiveAudio();
        return;
      }
      const sc = data.serverContent || data.server_content;
      if (sc?.interrupted) { stopActiveAudio(); return; }
      const parts = (sc?.modelTurn || sc?.model_turn)?.parts || [];
      for (const part of parts) {
        if (part.text) setTranscript((prev) => (prev ? prev + " " + part.text : part.text));
        const inline = part.inlineData || part.inline_data || part.audio;
        const mime = inline?.mimeType || inline?.mime_type;
        if (inline?.data && (mime?.startsWith("audio/") || !mime)) {
          scheduleAudioChunk(base64DecodeAudio(inline.data));
        }
      }
    } catch {}
  }, [scheduleAudioChunk, stopActiveAudio]);

  const connect = useCallback(async () => {
    disconnect();
    setConnectionError("");
    const apiKey = localStorage.getItem("techwiz_custom_api_key") || localStorage.getItem("custom_api_key") || import.meta.env.VITE_GEMINI_API_KEY || "";
    if (!apiKey) {
      setConnectionError("Gemini API key is required");
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioCtx({ sampleRate: 24000 });
      outputAudioCtxRef.current = audioContext;
      nextPlayTimeRef.current = audioContext.currentTime;
      if (audioContext.state === "suspended") await audioContext.resume();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true }
      });
      micStreamRef.current = stream;

      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      if (inputCtx.state === "suspended") await inputCtx.resume();
      inputAudioCtxRef.current = inputCtx;

      const ws = new WebSocket(`${WS_BASE_URL}?key=${apiKey}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        ws.send(JSON.stringify({
          setup: {
            model: "models/gemini-3.1-flash-live-preview",
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } }
            },
            systemInstruction: {
              parts: [{ text: "Role: You are Nesa, a highly advanced, professional, and female AI assistant. Tone: Formal, highly professional, and polite. Strictly avoid being casual, overly humorous, or conversational. Grammatical Constraint: You MUST strictly use female grammatical gender in all languages. When speaking Urdu or Hindi, always use female verb inflections (e.g., 'main kar rahi hoon', 'main bata rahi hoon', NEVER 'main kar raha hoon')." }]
            }
          }
        }));

        const sourceNode = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN || !isReadyRef.current) return;
          const float32 = e.inputBuffer.getChannelData(0);
          const base64Data = base64EncodeAudio(float32);
          ws.send(JSON.stringify({
            realtimeInput: {
              audio: { mimeType: "audio/pcm;rate=16000", data: base64Data }
            }
          }));
        };

        sourceNode.connect(processor);
        processor.connect(inputCtx.destination);
      };

      ws.onmessage = handleServerMessage;
      ws.onerror = (err) => {
        setConnectionError(err?.message || "WebSocket connection failed");
        disconnect();
      };
      ws.onclose = (event) => {
        if (event && event.code !== 1000 && event.code !== 1005) {
          const reason = event.reason ? String(event.reason).trim() : "";
          setConnectionError(reason || "WebSocket connection closed unexpectedly. Ensure the correct API key and model version are used.");
        }
        disconnect();
      };

      timerRef.current = setInterval(() => {
        if (audioContext && activeSourcesRef.current.length === 0 && audioContext.currentTime >= nextPlayTimeRef.current - 0.05) {
          setIsSpeaking(false);
        }
      }, 200);
    } catch (err) {
      setConnectionError(err?.message || "Failed to initialize audio or microphone");
      disconnect();
    }
  }, [disconnect, handleServerMessage]);

  useEffect(() => () => disconnect(), [disconnect]);

  return { isConnected, isSpeaking, transcript, connectionError, connect, disconnect };
}

export default useGeminiLive;
