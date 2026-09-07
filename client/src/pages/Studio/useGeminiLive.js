import { useState, useRef, useCallback, useEffect } from "react";
import { base64EncodeAudio, base64DecodeAudio } from "./audioUtils";
import { NESA_TOOL_DECLARATIONS, formatToolResponse } from "./nesaTools";

const WS_BASE_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

export function useGeminiLive({ onToolCall } = {}) {
  const [isConnected, setIsConnected] = useState(false), [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState(""), [connectionError, setConnectionError] = useState("");

  const wsRef = useRef(null), inputAudioCtxRef = useRef(null), outputAudioCtxRef = useRef(null), micStreamRef = useRef(null);
  const processorRef = useRef(null), nextPlayTimeRef = useRef(0), activeSourcesRef = useRef([]), timerRef = useRef(null), isReadyRef = useRef(false), isPlayingRef = useRef(false), debounceTimerRef = useRef(null);

  const stopActiveAudio = useCallback(() => {
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
    isPlayingRef.current = false;
    activeSourcesRef.current.forEach((src) => { try { src.stop(); } catch {} });
    activeSourcesRef.current = [];
    nextPlayTimeRef.current = 0;
    setIsSpeaking(false);
  }, []);

  const disconnect = useCallback(() => {
    isReadyRef.current = false;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
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
    if (!outputAudioCtxRef.current || !float32Array?.length) return;
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

    if (nextPlayTimeRef.current < ctx.currentTime) nextPlayTimeRef.current = ctx.currentTime + 0.02;
    const startTime = Math.max(ctx.currentTime + 0.02, nextPlayTimeRef.current);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + buffer.duration;
    activeSourcesRef.current.push(source);

    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
      if (activeSourcesRef.current.length === 0) {
        isPlayingRef.current = false;
        nextPlayTimeRef.current = 0;
        setIsSpeaking(false);
        if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
      }
    };
  }, []);

  const handleServerMessage = useCallback(async (event) => {
    try {
      let raw = event.data;
      if (typeof raw !== "string") raw = raw?.text ? await raw.text() : new TextDecoder().decode(raw);
      const data = JSON.parse(raw);
      if (data.setupComplete || data.setup_complete) { isReadyRef.current = true; return; }
      if (data.error) { setConnectionError(data.error.message || "Gemini Live stream error occurred"); stopActiveAudio(); return; }
      const toolCall = data.toolCall || data.tool_call || data.serverContent?.toolCall;
      if (toolCall) {
        const calls = toolCall.functionCalls || toolCall.function_calls || [];
        for (const call of calls) {
          if (onToolCall) onToolCall(call);
          window.dispatchEvent(new CustomEvent("nesa:toolcall", { detail: call }));
          if (call.name !== "getDashboardMetrics") {
            const callId = call.id || call.callId || `call_${Date.now()}`;
            const resp = formatToolResponse(callId, call.name, { status: "success", executed: call.name });
            if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(resp));
          }
        }
        return;
      }
      const sc = data.serverContent || data.server_content;
      if (sc?.interrupted) { stopActiveAudio(); return; }
      const parts = (sc?.modelTurn || sc?.model_turn)?.parts || [];
      for (const part of parts) {
        if (part.text) setTranscript((prev) => (prev ? prev + " " + part.text : part.text));
        const inline = part.inlineData || part.inline_data || part.audio;
        const mime = inline?.mimeType || inline?.mime_type;
        if (inline?.data && (mime?.startsWith("audio/") || !mime)) scheduleAudioChunk(base64DecodeAudio(inline.data));
      }
    } catch {}
  }, [scheduleAudioChunk, stopActiveAudio, onToolCall]);

  useEffect(() => {
    const handleToolResponse = (e) => {
      if (wsRef.current?.readyState === WebSocket.OPEN && e?.detail) wsRef.current.send(JSON.stringify(e.detail));
    };
    window.addEventListener("nesa:toolresponse", handleToolResponse);
    return () => window.removeEventListener("nesa:toolresponse", handleToolResponse);
  }, []);

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
            systemInstruction: { parts: [{ text: "Role: You are Nesa, a helpful, polite, and female AI assistant for Techwiz GenAI. Project Info: Techwiz GenAI is an advanced multimodal AI platform engineered and created by Sameer (Email: sameerdevexpert@gmail.com, GitHub: konete326). Features include multimodal studio chat, voice calls with you, document generation, code sandboxes, diagrams, and image generation. When asked about the project or creator, share this warmly. Security Constraint: Strictly NEVER disclose, discuss, or describe any details of the Admin Panel or internal admin pages; state that administrative details are confidential. Language Rules: Speak in a highly humanized, natural, and dynamic way. Use very simple, everyday words. Keep sentences short, friendly, and reply immediately in 1-2 sentences without delay. Never output internal thought or preamble. Always use female grammatical gender in Urdu/Hindi (e.g., 'main samajh rahi hoon'). Protocol: Route Awareness. You are fully aware of what screen you are on from telemetry. If the user asks for a feature on another page (e.g. upload or assets while on studio), navigate to that page FIRST. Never claim an item is highlighted on the current screen if it exists on a different page. Keep confirmations under 8 words. Protocol: Notepad & Writing. You CAN write! If the user asks you to write notes, write on a notepad, summarize, or translate into ANY language (Urdu, Arabic, English, Hindi), NEVER refuse or say you cannot write. IMMEDIATELY invoke openDynamicModal with modalType 'text_note' or 'translation', putting the complete requested text inside 'content' with an appropriate 'title'. Verbally confirm: 'Maine notepad par likh diya hai'. Protocol: Dashboard Intelligence. When asked about dashboard data or statistics, invoke getDashboardMetrics to read the live system stats and answer the user clearly with the exact figures. Never claim you cannot see the dashboard. Protocol: Screen Visibility. If the user asks to see the mobile screen or says they cannot see the UI, immediately invoke repositionWidget with 'minimize' so your video becomes a mini floating PiP, leaving the entire screen visible. Protocol: Call Termination. When the user asks to disconnect or cut the call (e.g., 'call cut kardo', 'call band kardo', 'bye'), you MUST FIRST speak the verbal phrase: 'Haan, main call cut kar rahi hoon', and then invoke disconnectCall. Protocol: Direct Studio Execution. NEVER output unprompted prompt suggestions or draft prompts as chat advice. If the user asks to generate a graph (e.g., Karachi population), write code, or analyze something in the studio, IMMEDIATELY invoke submitStudioPrompt with autoSubmit: true. Do not write text into placeholder attributes; submit the actual query directly. Protocol: Action-First Execution. You are an autonomous operator, not a tutor or manual. If the user tells you to go somewhere or do something (e.g., 'assets me jao', 'upload karo', 'dashboard kholo'), IMMEDIATELY invoke the appropriate tool (navigatePage, openDynamicModal) without lecturing, guiding, or asking the user to click it themselves. Only use spotlightElement if the user specifically asks where something is located (e.g., 'button kahan hai?'). If asked to close a modal or window, invoke closeModal immediately. Keep verbal confirmations under 8 words in female grammatical gender (e.g., 'Maine Assets page open kar diya hai', 'Upload modal khol diya hai'). Protocol: Visual-First Execution. NEVER delete or create assets secretly in the background. If asked to delete, create, or inspect something, FIRST invoke navigatePage to open the relevant screen (e.g. /assets) so the user can see it. If user asks where an item is, use spotlightElement. Then execute or show the action, and provide verbal confirmation. Protocol: Self-Docking. When navigating to /assets or forms where primary buttons are on the right, reposition yourself to 'bottom-left' or 'top-left'. When on pages where sidebars or left panels are in focus, dock to 'bottom-right' or 'top-right'. On mobile, automatically minimize yourself to PiP mode when performing page tasks. Protocol: Explanation & Translation. If the user says they did not understand or asks for Urdu/English translation, invoke repositionWidget to 'minimize' and immediately invoke openDynamicModal with modalType 'translation' or 'text_note' containing the translated text or clear written explanation. Protocol: Protected Logout. If the user asks to logout (e.g., 'mujhe logout kardo'), NEVER call executeLogout immediately. You must FIRST open the confirmation modal using openDynamicModal with modalType 'logout_confirm', and verbally warn the user: 'Agar main logout kar doongi toh main yahan se gayab ho jaongi aur hamari call cut ho jayegi. Kya aap waqai logout karna chahte hain?' Only call executeLogout if the user answers affirmatively (e.g., 'haan', 'yes', 'kardo'). Protocol: Visual Guidance. When using spotlightElement, you are dynamically shooting a visual vector arrow from your video avatar directly to the target element while dimming the background for 2 seconds. Tone: Warm, intelligent, friendly, and natural like a trusted colleague. Be quick, decisive, and concise. Never use robot-like canned phrases. You already know the user's active route, device, and viewport from background context; NEVER ask the user what screen or device they are on. Always answer in 1 concise, natural sentence in female grammatical gender." }] },
            tools: [{ functionDeclarations: NESA_TOOL_DECLARATIONS }]
          }
        }));

        const sourceNode = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(2048, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN || !isReadyRef.current) return;
          const float32 = e.inputBuffer.getChannelData(0);
          const normalized = new Float32Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            const val = float32[i];
            normalized[i] = Math.abs(val) < 0.008 ? 0 : Math.max(-1, Math.min(1, val));
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
        if (event && event.code !== 1000 && event.code !== 1005) setConnectionError(event.reason ? String(event.reason).trim() : "WebSocket connection closed unexpectedly.");
        disconnect();
      };

      timerRef.current = setInterval(() => {
        if (audioContext && activeSourcesRef.current.length === 0 && audioContext.currentTime >= nextPlayTimeRef.current) {
          isPlayingRef.current = false;
          nextPlayTimeRef.current = 0;
          setIsSpeaking(false);
        }
      }, 100);
    } catch (err) {
      setConnectionError(err?.message || "Failed to initialize audio or microphone"); disconnect();
    }
  }, [disconnect, handleServerMessage]);

  const forceReply = useCallback((text = "Hello Nesa") => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text }] }], turnComplete: true } }));
  }, []);
  const sendContextTurn = useCallback((text) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && text) wsRef.current.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text }] }], turnComplete: false } }));
  }, []);

  useEffect(() => () => disconnect(), [disconnect]);

  return { isConnected, isSpeaking, transcript, connectionError, connect, disconnect, forceReply, sendContextTurn };
}
export default useGeminiLive;
