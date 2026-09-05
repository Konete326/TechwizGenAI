import { useState, useRef, useCallback, useEffect } from "react";
import { base64EncodeAudio, base64DecodeAudio } from "./audioUtils";

const LIVE_MODEL = "models/gemini-2.0-flash-exp";
const WS_BASE_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";

export function useGeminiLive() {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");

  const wsRef = useRef(null);
  const inputAudioCtxRef = useRef(null);
  const outputAudioCtxRef = useRef(null);
  const micStreamRef = useRef(null);
  const processorRef = useRef(null);
  const nextPlayTimeRef = useRef(0);
  const activeSourcesRef = useRef([]);
  const timerRef = useRef(null);

  const stopActiveAudio = useCallback(() => {
    activeSourcesRef.current.forEach((src) => { try { src.stop(); } catch {} });
    activeSourcesRef.current = [];
    if (outputAudioCtxRef.current) nextPlayTimeRef.current = outputAudioCtxRef.current.currentTime;
    setIsSpeaking(false);
  }, []);

  const disconnect = useCallback(() => {
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
      if (activeSourcesRef.current.length === 0 && ctx.currentTime >= nextPlayTimeRef.current - 0.05) {
        setIsSpeaking(false);
      }
    };
  }, []);

  const handleServerMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.serverContent?.interrupted) {
        stopActiveAudio();
        return;
      }
      const parts = data.serverContent?.modelTurn?.parts || [];
      for (const part of parts) {
        if (part.text) {
          setTranscript((prev) => (prev ? prev + " " + part.text : part.text));
        }
        if (part.inlineData && part.inlineData.mimeType?.startsWith("audio/")) {
          const float32 = base64DecodeAudio(part.inlineData.data);
          scheduleAudioChunk(float32);
        }
      }
    } catch {}
  }, [scheduleAudioChunk, stopActiveAudio]);

  const connect = useCallback(async () => {
    disconnect();
    const apiKey = localStorage.getItem("custom_api_key") || import.meta.env.VITE_GEMINI_API_KEY || "";
    if (!apiKey) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      const outputCtx = new AudioCtx({ sampleRate: 24000 });
      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;
      nextPlayTimeRef.current = outputCtx.currentTime;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true }
      });
      micStreamRef.current = stream;

      const ws = new WebSocket(`${WS_BASE_URL}?key=${apiKey}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        ws.send(JSON.stringify({
          setup: {
            model: LIVE_MODEL,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } }
            },
            systemInstruction: {
              parts: [{ text: "You are Nesa, a helpful conversational voice assistant. Keep responses natural and concise." }]
            }
          }
        }));

        const sourceNode = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const float32 = e.inputBuffer.getChannelData(0);
          const base64Audio = base64EncodeAudio(float32);
          ws.send(JSON.stringify({
            realtimeInput: { mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: base64Audio }] }
          }));
        };

        sourceNode.connect(processor);
        processor.connect(inputCtx.destination);
      };

      ws.onmessage = handleServerMessage;
      ws.onerror = () => disconnect();
      ws.onclose = () => disconnect();

      timerRef.current = setInterval(() => {
        if (outputCtx && activeSourcesRef.current.length === 0 && outputCtx.currentTime >= nextPlayTimeRef.current - 0.05) {
          setIsSpeaking(false);
        }
      }, 200);
    } catch {
      disconnect();
    }
  }, [disconnect, handleServerMessage]);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return { isConnected, isSpeaking, transcript, connect, disconnect };
}

export default useGeminiLive;
