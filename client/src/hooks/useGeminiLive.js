import { useState, useRef, useCallback, useEffect } from "react";

const WORKLET_SRC = `class P extends AudioWorkletProcessor{constructor(){super();this.b=new Float32Array(1024);this.i=0}process(inputs){const d=inputs[0]?.[0];if(!d)return true;this.b.set(d,this.i);this.i+=d.length;if(this.i>=1024){let m=0;const p=new Int16Array(1024);for(let i=0;i<1024;i++){m=Math.max(m,Math.abs(this.b[i]));const v=Math.max(-1,Math.min(1,this.b[i]));p[i]=v<0?v*32768:v*32767}this.port.postMessage({pcm:p.buffer,peak:m},[p.buffer]);this.b=new Float32Array(1024);this.i=0}return true}}registerProcessor('p',P)`;

const pcmToB64 = (ab) => { const b = new Uint8Array(ab); let s = ""; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); };

const b64ToF32 = (b64) => {
  const s = atob(b64), b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  const p = new Int16Array(b.buffer), f = new Float32Array(p.length);
  for (let i = 0; i < p.length; i++) f[i] = p[i] / 32768;
  return f;
};

export function useGeminiLive(userToken) {
  const [status, setStatus] = useState("idle");
  const [err, setErr] = useState(null);
  const [isExec, setIsExec] = useState(false);
  const [assets, setAssets] = useState([]);
  const refs = useRef({ ws: null, ctx: null, stream: null, worklet: null, srcs: [], nextTime: 0, blobUrl: null, timer: null, intentClose: false });

  const startSession = useCallback(async (retry = 0) => {
    try {
      refs.current.intentClose = false;
      setStatus(retry > 0 ? "reconnecting" : "connecting"); setErr(null);
      const res = await fetch("/api/live/token", { method: "POST", headers: { Authorization: `Bearer ${userToken}` } });
      const { token } = await res.json();
      const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?bearer_token=${token}`);
      refs.current.ws = ws;

      ws.onopen = async () => {
        ws.send(JSON.stringify({
          setup: {
            model: "models/gemini-3.8-live",
            systemInstruction: { parts: [{ text: "You are Nisa, a warm and concise voice assistant. Respond in 1-2 short sentences max. Use natural fillers like 'Hmm', 'Got it', 'Sure thing'. Never use long paragraphs. Sound human. Be instant." }] },
            generationConfig: { responseModalities: ["AUDIO"] },
            tools: [{ functionDeclarations: [{ name: "generateDocument", description: "Generates PDF.", parameters: { type: "OBJECT", required: ["title", "content"], properties: { title: { type: "STRING" }, content: { type: "STRING" }, format: { type: "STRING", enum: ["pdf", "docx"] } } } }] }],
            realtimeInputConfig: {
              automaticActivityDetection: { startOfSpeechSensitivity: "START_SENSITIVITY_HIGH", endOfSpeechSensitivity: "END_SENSITIVITY_HIGH", prefixPaddingMs: 150, silenceDurationMs: 400 }
            }
          }
        }));
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        const ctx = new window.AudioContext({ sampleRate: 16000 });
        const blobUrl = URL.createObjectURL(new Blob([WORKLET_SRC], { type: "application/javascript" }));
        await ctx.audioWorklet.addModule(blobUrl);
        const worklet = new AudioWorkletNode(ctx, "p");
        Object.assign(refs.current, { stream, ctx, worklet, blobUrl });
        ctx.createMediaStreamSource(stream).connect(worklet);
        worklet.connect(ctx.destination);
        worklet.port.onmessage = (ev) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          console.log("Mic peak:", ev.data.peak);
          ws.send(JSON.stringify({ realtimeInput: { mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: pcmToB64(ev.data.pcm) }] } }));
        };
        setStatus("connected");
      };

      ws.onmessage = async (e) => {
        const msg = JSON.parse(e.data);
        console.log("Server msg:", Object.keys(msg)[0], msg);
        if (msg.serverContent?.interrupted) {
          refs.current.srcs.forEach(s => { try { s.stop(); } catch(err){} });
          refs.current.srcs = []; refs.current.nextTime = 0;
        }
        if (msg.serverContent?.modelTurn) {
          msg.serverContent.modelTurn.parts.forEach(p => {
            if (p.inlineData?.mimeType.startsWith("audio/")) {
              const f = b64ToF32(p.inlineData.data); const ctx = refs.current.ctx; if (!ctx) return;
              const buf = ctx.createBuffer(1, f.length, 24000); buf.getChannelData(0).set(f);
              const src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination);
              src.onended = () => { const i = refs.current.srcs.indexOf(src); if (i > -1) refs.current.srcs.splice(i, 1); };
              const t = Math.max(ctx.currentTime, refs.current.nextTime || 0);
              src.start(t); refs.current.nextTime = t + buf.duration; refs.current.srcs.push(src);
            }
          });
        }
        if (msg.toolCall?.functionCalls) {
          setIsExec(true);
          const iRes = msg.toolCall.functionCalls.map(fc => {
            if (fc.name === "generateDocument" && (!fc.args.title?.trim() || !fc.args.content?.trim())) return { id: fc.id, name: fc.name, response: { error: "Incomplete" } };
            return { id: fc.id, name: fc.name, response: { status: "Async" } };
          });
          ws.send(JSON.stringify({ toolResponse: { functionResponses: iRes } }));
          msg.toolCall.functionCalls.forEach(fc => {
            if (fc.name === "generateDocument" && (!fc.args.title?.trim() || !fc.args.content?.trim())) return setIsExec(false);
            fetch(`/api/tools/${fc.name}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` }, body: JSON.stringify(fc.args) })
              .then(r => r.json()).then(d => {
                if (d.assetUrl) setAssets(p => [{ id: d.assetId || Date.now(), url: d.assetUrl, title: fc.args.title || "Doc", type: fc.args.format || "pdf" }, ...p]);
                if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text: `System: ${fc.name} complete. ${JSON.stringify(d)}` }] }], turnComplete: true } }));
              }).catch(err => {
                if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text: `System: ${fc.name} fail. ${err.message}` }] }], turnComplete: true } }));
              }).finally(() => setIsExec(false));
          });
        }
      };
      ws.onerror = () => { setStatus("error"); setErr("WebSocket error"); };
      ws.onclose = (e) => {
        if (!refs.current.intentClose && e.code !== 1000) { setStatus("reconnecting"); refs.current.timer = setTimeout(() => startSession(retry + 1), Math.min(1000 * Math.pow(1.5, retry), 15000)); }
        else setStatus("idle");
      };
    } catch (err) { setStatus("error"); setErr(err.message); }
  }, [userToken]);

  const stopSession = useCallback(() => {
    const r = refs.current; r.intentClose = true;
    if (r.timer) clearTimeout(r.timer);
    if (r.worklet) r.worklet.disconnect();
    if (r.stream) r.stream.getTracks().forEach(t => t.stop());
    if (r.ctx) r.ctx.close();
    if (r.blobUrl) URL.revokeObjectURL(r.blobUrl);
    if (r.ws) r.ws.close();
    Object.assign(r, { worklet: null, stream: null, ctx: null, ws: null, srcs: [], nextTime: 0, blobUrl: null, timer: null });
    setIsExec(false); setAssets([]); setStatus("idle");
  }, []);

  useEffect(() => stopSession, [stopSession]);
  return { status, errorMsg: err, isExecutingTool: isExec, assets, startSession, stopSession };
}
