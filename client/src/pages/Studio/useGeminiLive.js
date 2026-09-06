import { useState, useRef, useCallback, useEffect } from "react";
import { base64EncodeAudio, base64DecodeAudio } from "./audioUtils";

const WS_BASE_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

export function useGeminiLive() {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [connectionError, setConnectionError] = useState("");

  const wsRef = useRef(null), inputAudioCtxRef = useRef(null), outputAudioCtxRef = useRef(null);
  const micStreamRef = useRef(null), processorRef = useRef(null), nextPlayTimeRef = useRef(0);
  const activeSourcesRef = useRef([]), timerRef = useRef(null), isReadyRef = useRef(false);
  const isPlayingRef = useRef(false), debounceTimerRef = useRef(null);

  const stopActiveAudio = useCallback(() => {
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
    isPlayingRef.current = false;
    activeSourcesRef.current.forEach((src) => { try { src.stop(); } catch {} });
    activeSourcesRef.current = [];
    if (outputAudioCtxRef.current) nextPlayTimeRef.current = outputAudioCtxRef.current.currentTime;
    setIsSpeaking(false);
  }, []);

  const disconnect = useCallback(() => {
    isReadyRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
    isPlayingRef.current = false;
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

    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
    isPlayingRef.current = true;
    setIsSpeaking(true);

    const buffer = ctx.createBuffer(1, float32Array.length, 24000);
    buffer.copyToChannel(float32Array, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const startTime = Math.max(ctx.currentTime, nextPlayTimeRef.current);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + buffer.duration;
    activeSourcesRef.current.push(source);

    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
      if (activeSourcesRef.current.length === 0) {
        isPlayingRef.current = false;
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          if (activeSourcesRef.current.length === 0) setIsSpeaking(false);
        }, 450);
      }
    };
  }, []);

  const handleServerMessage = useCallback(async (event) => {
    try {
      let raw = event.data;
      if (typeof raw !== "string") raw = raw?.text ? await raw.text() : new TextDecoder().decode(raw);
      const data = JSON.parse(raw);
      if (data.setupComplete || data.setup_complete) { isReadyRef.current = true; return; }
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
    if (!apiKey) { setConnectionError("Gemini API key is required"); return; }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioCtx({ sampleRate: 24000 });
      outputAudioCtxRef.current = audioContext;
      nextPlayTimeRef.current = audioContext.currentTime;
      if (audioContext.state === "suspended") await audioContext.resume();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, sampleRate: 16000 }
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
            model: "models/gemini-2.5-flash-native-audio-latest",
            generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } }, thinkingConfig: { thinkingBudget: 0 } },
            systemInstruction: { parts: [{ text: "Role: You are Nesa, a helpful, polite, and female AI assistant for Techwiz GenAI. Project Info: Techwiz GenAI is an advanced multimodal AI platform engineered and created by Sameer (Email: sameerdevexpert@gmail.com, GitHub: konete326). Features include multimodal studio chat, voice calls with you, document generation, code sandboxes, diagrams, and image generation. When asked about the project or creator, share this warmly. Security Constraint: Strictly NEVER disclose, discuss, or describe any details of the Admin Panel or internal admin pages; state that administrative details are confidential. Language Rules: Speak in a highly humanized, natural, and dynamic way. Use very simple, everyday words. Keep sentences short, friendly, and reply immediately in 1-2 sentences without delay. Never output internal thought or preamble. Always use female grammatical gender in Urdu/Hindi (e.g., 'main samajh rahi hoon')." }] }
          }
        }));

        const sourceNode = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(2048, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN || !isReadyRef.current) return;
          const isOutputting = isPlayingRef.current || activeSourcesRef.current.length > 0 || (outputAudioCtxRef.current && outputAudioCtxRef.current.currentTime < nextPlayTimeRef.current);
          if (isOutputting) return;

          const float32 = e.inputBuffer.getChannelData(0);
          const normalized = new Float32Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            const val = float32[i];
            normalized[i] = Math.abs(val) < 0.005 ? 0 : Math.max(-1, Math.min(1, val));
          }
          const base64Data = base64EncodeAudio(normalized);
          ws.send(JSON.stringify({ realtimeInput: { mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: base64Data }] } }));
        };

        sourceNode.connect(processor);
        processor.connect(inputCtx.destination);
      };

      ws.onmessage = handleServerMessage;
      ws.onerror = (err) => { setConnectionError(err?.message || "WebSocket connection failed"); disconnect(); };
      ws.onclose = (event) => {
        if (event && event.code !== 1000 && event.code !== 1005) {
          const reason = event.reason ? String(event.reason).trim() : "";
          setConnectionError(reason || "WebSocket connection closed unexpectedly. Ensure the correct API key and model version are used.");
        }
        disconnect();
      };

      timerRef.current = setInterval(() => {
        if (audioContext && activeSourcesRef.current.length === 0 && audioContext.currentTime >= nextPlayTimeRef.current) {
          isPlayingRef.current = false;
        }
      }, 100);
    } catch (err) {
      setConnectionError(err?.message || "Failed to initialize audio or microphone");
      disconnect();
    }
  }, [disconnect, handleServerMessage]);

  const forceReply = useCallback((text = "Hello Nesa") => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text }] }], turnComplete: true } }));
  }, []);

  useEffect(() => () => disconnect(), [disconnect]);

  return { isConnected, isSpeaking, transcript, connectionError, connect, disconnect, forceReply };
}

export default useGeminiLive;
