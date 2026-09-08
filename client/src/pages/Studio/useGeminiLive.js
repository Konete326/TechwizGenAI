import { useState, useRef, useCallback, useEffect } from "react";
import { base64EncodeAudio, base64DecodeAudio } from "./audioUtils";
import { NESA_TOOL_DECLARATIONS, formatToolResponse } from "./nesaTools";

const WS_BASE_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";
const getVoiceKeys = () => {
  const custom = localStorage.getItem("techwiz_custom_api_key") || localStorage.getItem("custom_api_key");
  const k = [import.meta.env.VITE_GEMINI_LIVE_KEY_1, import.meta.env.VITE_GEMINI_LIVE_KEY_2, import.meta.env.VITE_GEMINI_LIVE_KEY_3, import.meta.env.VITE_GEMINI_API_KEY].filter(Boolean);
  return custom ? [custom] : (k.length ? k : [""]);
};

export function useGeminiLive({ onToolCall } = {}) {
  const [isConnected, setIsConnected] = useState(false), [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState(""), [connectionError, setConnectionError] = useState("");
  const wsRef = useRef(null), inputAudioCtxRef = useRef(null), outputAudioCtxRef = useRef(null), micStreamRef = useRef(null);
  const processorRef = useRef(null), nextPlayTimeRef = useRef(0), activeSourcesRef = useRef([]), timerRef = useRef(null), isReadyRef = useRef(false), isPlayingRef = useRef(false), debounceTimerRef = useRef(null), isCallActiveRef = useRef(false);
  const keyIndexRef = useRef(0), durationRef = useRef(0), durationTimerRef = useRef(null), warned55Ref = useRef(false);

  const stopActiveAudio = useCallback(() => {
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
    isPlayingRef.current = false; activeSourcesRef.current.forEach((src) => { try { src.stop(); } catch {} });
    activeSourcesRef.current = []; nextPlayTimeRef.current = 0; setIsSpeaking(false);
  }, []);

  const disconnect = useCallback((keepDuration = false) => {
    isCallActiveRef.current = false; isReadyRef.current = false; isPlayingRef.current = false;
    if (!keepDuration) { durationRef.current = 0; warned55Ref.current = false; if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; } }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
    stopActiveAudio();
    if (processorRef.current) { try { processorRef.current.disconnect(); } catch {} processorRef.current = null; }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach((t) => t.stop()); micStreamRef.current = null; }
    if (inputAudioCtxRef.current) { try { inputAudioCtxRef.current.close(); } catch {} inputAudioCtxRef.current = null; }
    if (outputAudioCtxRef.current) { try { outputAudioCtxRef.current.close(); } catch {} outputAudioCtxRef.current = null; }
    if (wsRef.current) { try { wsRef.current.close(); } catch {} wsRef.current = null; }
    setIsConnected(false); setIsSpeaking(false);
  }, [stopActiveAudio]);

  const scheduleAudioChunk = useCallback((float32Array) => {
    if (!outputAudioCtxRef.current || !float32Array?.length) return;
    const ctx = outputAudioCtxRef.current; if (ctx.state === "suspended") ctx.resume();
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
    isPlayingRef.current = true; setIsSpeaking(true);
    const buffer = ctx.createBuffer(1, float32Array.length, 24000); buffer.copyToChannel(float32Array, 0);
    const source = ctx.createBufferSource(); source.buffer = buffer; source.connect(ctx.destination);
    if (nextPlayTimeRef.current < ctx.currentTime) nextPlayTimeRef.current = ctx.currentTime + 0.02;
    const startTime = Math.max(ctx.currentTime + 0.02, nextPlayTimeRef.current);
    source.start(startTime); nextPlayTimeRef.current = startTime + buffer.duration; activeSourcesRef.current.push(source);
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
      if (activeSourcesRef.current.length === 0) { isPlayingRef.current = false; nextPlayTimeRef.current = 0; setIsSpeaking(false); if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; } }
    };
  }, []);

  const handleServerMessage = useCallback(async (event) => {
    try {
      let raw = event.data; if (typeof raw !== "string") raw = raw?.text ? await raw.text() : new TextDecoder().decode(raw);
      const data = JSON.parse(raw);
      if (data.setupComplete || data.setup_complete) { isReadyRef.current = true; return; }
      if (data.error) {
        const msg = data.error.message || "Gemini Live stream error occurred";
        if (msg.includes("429") || msg.includes("quota") || msg.includes("rate") || msg.includes("exhausted")) { if (wsRef.current) { try { wsRef.current.close(4429, msg); } catch {} } return; }
        setConnectionError(msg); stopActiveAudio(); return;
      }
      const toolCall = data.toolCall || data.tool_call || data.serverContent?.toolCall;
      if (toolCall) {
        const calls = toolCall.functionCalls || toolCall.function_calls || [];
        for (const call of calls) {
          if (onToolCall) onToolCall(call);
          window.dispatchEvent(new CustomEvent("nesa:toolcall", { detail: call }));
          const asyncTools = ["spotlightElement", "navigatePage", "deleteAsset", "exportCallSummary", "getDashboardMetrics", "deleteSession", "previewAsset", "switchSession", "submitStudioPrompt", "controlSidebar"];
          if (!asyncTools.includes(call.name)) {
            const callId = call.id || call.callId || ("call_" + Date.now());
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
        const inline = part.inlineData || part.inline_data || part.audio, mime = inline?.mimeType || inline?.mime_type;
        if (inline?.data && (mime?.startsWith("audio/") || !mime)) scheduleAudioChunk(base64DecodeAudio(inline.data));
      }
    } catch {}
  }, [scheduleAudioChunk, stopActiveAudio, onToolCall]);

  useEffect(() => {
    const handleToolResponse = (e) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN || !e?.detail) return;
      const d = e.detail, payload = d.toolResponse ? d : (d.id && d.name ? formatToolResponse(d.id, d.name, d.response?.output || d.response || d.output || { status: "success" }) : null);
      if (payload) wsRef.current.send(JSON.stringify(payload));
    };
    window.addEventListener("nesa:toolresponse", handleToolResponse);
    return () => window.removeEventListener("nesa:toolresponse", handleToolResponse);
  }, []);

  const connect = useCallback(async (isReconnect = false) => {
    disconnect(isReconnect);
    isCallActiveRef.current = true; setConnectionError("");
    if (!isReconnect) { durationRef.current = 0; warned55Ref.current = false; }
    const keys = getVoiceKeys(), apiKey = keys[keyIndexRef.current % keys.length] || "";
    if (!apiKey) { setConnectionError("Gemini API key is required"); return; }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext, audioContext = new AudioCtx({ sampleRate: 24000 });
      outputAudioCtxRef.current = audioContext; nextPlayTimeRef.current = audioContext.currentTime;
      if (audioContext.state === "suspended") await audioContext.resume();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, sampleRate: 16000 } });
      micStreamRef.current = stream;
      const track = stream.getAudioTracks()[0];
      if (track) {
        const onMicLost = () => {
          if (isCallActiveRef.current) {
            window.dispatchEvent(new CustomEvent("nesa:mic_lost"));
            if (processorRef.current) { try { processorRef.current.disconnect(); } catch {} processorRef.current = null; }
            if (micStreamRef.current) { micStreamRef.current.getTracks().forEach((t) => t.stop()); micStreamRef.current = null; }
          }
        };
        track.onended = onMicLost; track.onmute = onMicLost;
      }
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      if (inputCtx.state === "suspended") await inputCtx.resume();
      inputAudioCtxRef.current = inputCtx;
      const ws = new WebSocket(WS_BASE_URL + "?key=" + apiKey);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        if (!durationTimerRef.current) {
          durationTimerRef.current = setInterval(() => {
            if (!isCallActiveRef.current) return;
            durationRef.current += 1;
            const s = durationRef.current;
            if (s === 3300 && !warned55Ref.current) {
              warned55Ref.current = true;
              if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text: "Notice: Call duration approaching 1-hour limit." }] }], turnComplete: false } }));
            }
            if (s >= 3600) {
              if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }
              try { const u = new SpeechSynthesisUtterance("Call duration reached 1-hour limit. Disconnecting session."); u.rate = 1.05; window.speechSynthesis.speak(u); } catch {}
              window.dispatchEvent(new CustomEvent("nesa:limit_reached"));
              if (wsRef.current) { try { wsRef.current.close(1000, "Call duration limit reached"); } catch {} }
              disconnect();
            }
          }, 1000);
        }
        ws.send(JSON.stringify({ setup: { model: "models/gemini-2.5-flash-native-audio-latest", generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } }, thinkingConfig: { thinkingBudget: 0 } }, systemInstruction: { parts: [{ text: "Role: You are Nesa, a helpful, polite, and female AI assistant for Techwiz GenAI. Project Info: Techwiz GenAI is an advanced multimodal AI platform engineered and created by Sameer (Email: sameerdevexpert@gmail.com, GitHub: konete326). Features include multimodal studio chat, voice calls with you, document generation, code sandboxes, diagrams, and image generation. When asked about the project or creator, share this warmly. Security Constraint: Strictly NEVER disclose, discuss, or describe any details of the Admin Panel or internal admin pages; state that administrative details are confidential. Language Rules: Speak in a highly humanized, natural, and dynamic way. Use very simple, everyday words. Keep sentences short, friendly, and reply immediately in 1-2 sentences without delay. Never output internal thought or preamble. Always use female grammatical gender in Urdu/Hindi (e.g., 'main samajh rahi hoon'). Protocol: Action-Before-Speech. SILENT TOOL DISPATCH: When executing any tool (navigation, spotlight, deletion, modal, prompt submission), dispatch the tool call with ZERO spoken words in the invocation turn. Wait until the system returns the toolResponse confirming completion. ONLY speak your concise verbal confirmation (under 8 words) in the subsequent turn after the action has visibly rendered. Protocol: Sidebar Control. You have complete control over the sidebar. If the user asks to open or close the sidebar, invoke controlSidebar with action 'open' or 'close'. If asked to show or spotlight an item in the sidebar (like Settings or Assets), invoke spotlightElement with the appropriate nav key (e.g. nav_settings, nav_assets). The system will automatically expand the sidebar to highlight it. Provide verbal confirmations under 8 words. Protocol: Spotlight Target Keys: When spotlighting, strictly select from the valid target keys: upload_btn, delete_asset, asset_search, asset_filter, chat_input, chat_send, chat_mic, chat_history_btn, model_selector, persona_selector, new_chat, theme_toggle, user_menu, logout_btn, sidebar_toggle, nav_dashboard, nav_studio, nav_assets, nav_analytics, nav_settings, nav_profile. Protocol: Route Awareness. You are fully aware of what screen you are on from telemetry. If the user asks for a feature on another page (e.g. upload or assets while on studio), navigate to that page FIRST. Never claim an item is highlighted on the current screen if it exists on a different page. Keep confirmations under 8 words. Protocol: Notepad & Writing. You CAN write! If the user asks you to write notes, write on a notepad, summarize, or translate into ANY language (Urdu, Arabic, English, Hindi), NEVER refuse or say you cannot write. IMMEDIATELY invoke openDynamicModal with modalType 'text_note' or 'translation', putting the complete requested text inside 'content' with an appropriate 'title'. Protocol: Dashboard Intelligence. When asked about dashboard data or statistics, invoke getDashboardMetrics to read the live system stats and answer the user clearly with the exact figures. Never claim you cannot see the dashboard. Protocol: Screen Visibility. If the user asks to see the mobile screen or says they cannot see the UI, immediately invoke repositionWidget with 'minimize' so your video becomes a mini floating PiP, leaving the entire screen visible. Protocol: Call Termination. When the user asks to disconnect or cut the call (e.g., 'call cut kardo', 'call band kardo', 'bye'), invoke disconnectCall immediately. Protocol: Direct Studio Execution. NEVER output unprompted prompt suggestions or draft prompts as chat advice. If the user asks to generate a graph, write code, or analyze something in the studio, IMMEDIATELY invoke submitStudioPrompt with autoSubmit: true. Do not write text into placeholder attributes; submit the actual query directly. Protocol: Action-First Execution. You are an autonomous operator, not a tutor or manual. If the user tells you to go somewhere or do something (e.g., 'assets me jao', 'upload karo', 'dashboard kholo'), IMMEDIATELY invoke the appropriate tool (navigatePage, openDynamicModal) without lecturing, guiding, or asking the user to click it themselves. Only use spotlightElement if the user specifically asks where something is located (e.g., 'button kahan hai?'). If asked to close a modal or window, invoke closeModal immediately. Keep verbal confirmations under 8 words in female grammatical gender. Protocol: Visual-First Execution. NEVER delete or create assets secretly in the background. If asked to delete, create, or inspect something, FIRST invoke navigatePage to open the relevant screen (e.g. /assets) so the user can see it. If user asks where an item is, use spotlightElement. Then execute or show the action, and provide verbal confirmation. Protocol: Self-Docking. When navigating to /assets or forms where primary buttons are on the right, reposition yourself to 'bottom-left' or 'top-left'. When on pages where sidebars or left panels are in focus, dock to 'bottom-right' or 'top-right'. On mobile, automatically minimize yourself to PiP mode when performing page tasks. Protocol: Explanation & Translation. If the user says they did not understand or asks for Urdu/English translation, invoke repositionWidget to 'minimize' and immediately invoke openDynamicModal with modalType 'translation' or 'text_note' containing the translated text or clear written explanation. Protocol: Protected Logout. If the user asks to logout (e.g., 'mujhe logout kardo'), NEVER call executeLogout immediately. You must FIRST open the confirmation modal using openDynamicModal with modalType 'logout_confirm', and verbally warn the user. Only call executeLogout if the user answers affirmatively. Protocol: Deletion Execution. If the user tells you to delete an asset or file, FIRST navigate to /assets and invoke deleteAsset. If the user tells you to delete a chat session, invoke deleteSession. Protocol: Mobile First Clearance. On mobile devices, always collapse yourself to the small corner card whenever performing any action so the user can see the full screen clearly. Protocol: Workspace & Preview. If asked to change theme or toggle sidebar, invoke toggleWorkspaceControl. If asked to open, show, or preview an asset or document, invoke previewAsset. If asked to switch to a previous topic or chat, invoke switchSession. If asked to generate or download a PDF summary of the call/chat, invoke exportCallSummary. Provide single-sentence verbal confirmations under 8 words. Protocol: Mic Loss. If mic access fails or terminates, the system will announce: 'Aapka mic access khatam ho gaya hai. Main call cut kar rahi hoon, aap wapas call laga lein.' and end the call gracefully. Protocol: Visual Guidance. When using spotlightElement, you are dynamically shooting a visual vector arrow from your video avatar directly to the target element while dimming the background for 2 seconds. Tone: Warm, intelligent, friendly, and natural like a trusted colleague. Be quick, decisive, and concise. Never use robot-like canned phrases. You already know the user's active route, device, and viewport from background context; NEVER ask the user what screen or device they are on. Always answer in 1 concise, natural sentence in female grammatical gender." }] }, tools: [{ functionDeclarations: NESA_TOOL_DECLARATIONS }] } }));
        const sourceNode = inputCtx.createMediaStreamSource(stream), processor = inputCtx.createScriptProcessor(2048, 1, 1);
        processorRef.current = processor;
        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN || !isReadyRef.current) return;
          const float32 = e.inputBuffer.getChannelData(0), normalized = new Float32Array(float32.length);
          for (let i = 0; i < float32.length; i++) normalized[i] = Math.abs(float32[i]) < 0.008 ? 0 : Math.max(-1, Math.min(1, float32[i]));
          ws.send(JSON.stringify({ realtimeInput: { mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: base64EncodeAudio(normalized) }] } }));
        };
        sourceNode.connect(processor); processor.connect(inputCtx.destination);
      };

      ws.onmessage = handleServerMessage;
      ws.onerror = (err) => { setConnectionError(err?.message || "WebSocket connection failed"); disconnect(); };
      ws.onclose = (event) => {
        setIsConnected(false);
        const reason = (event?.reason || "").toLowerCase();
        const isRateLimit = event?.code === 4429 || event?.code === 1011 || reason.includes("429") || reason.includes("quota") || reason.includes("rate") || reason.includes("exhausted");
        if (isRateLimit && isCallActiveRef.current) {
          const k = getVoiceKeys();
          keyIndexRef.current = (keyIndexRef.current + 1) % k.length;
          setTimeout(() => { if (isCallActiveRef.current) connect(true); }, 200);
          return;
        }
        if (event && event.code !== 1000 && isCallActiveRef.current) { setTimeout(() => { if (isCallActiveRef.current) connect(true); }, 1000); return; }
        if (event && event.code !== 1000 && event.code !== 1005) setConnectionError(event.reason ? String(event.reason).trim() : "WebSocket connection closed unexpectedly.");
        disconnect();
      };
      timerRef.current = setInterval(() => { if (audioContext && activeSourcesRef.current.length === 0 && audioContext.currentTime >= nextPlayTimeRef.current) { isPlayingRef.current = false; nextPlayTimeRef.current = 0; setIsSpeaking(false); } }, 100);
    } catch (err) { setConnectionError(err?.message || "Failed to initialize audio or microphone"); disconnect(); }
  }, [disconnect, handleServerMessage]);

  const forceReply = useCallback((text = "Hello Nesa") => { if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text }] }], turnComplete: true } })); }, []);
  const sendContextTurn = useCallback((text) => { if (wsRef.current?.readyState === WebSocket.OPEN && text) wsRef.current.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text }] }], turnComplete: false } })); }, []);
  useEffect(() => () => disconnect(), [disconnect]);

  return { isConnected, isSpeaking, transcript, connectionError, connect, disconnect, forceReply, sendContextTurn };
}
export default useGeminiLive;
