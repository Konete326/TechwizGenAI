import { useState, useRef, useCallback, useEffect } from "react";
import { pcmToB64 } from "./audioUtils.js";
import { WORKLET_SRC } from "./workletSource.js";
import { getSetupPayload } from "./setupPayload.js";
import { createMessageHandler } from "./handleServerMessage.js";

export function useGeminiLive(userToken) {
  const [status, setStatus] = useState("idle");
  const [err, setErr] = useState(null);
  const [isExec, setIsExec] = useState(false);
  const [assets, setAssets] = useState([]);
  const refs = useRef({
    ws: null, ctx: null, playCtx: null, stream: null, worklet: null,
    srcs: [], nextTime: 0, blobUrl: null, timer: null,
    intentClose: false, lastPeakTime: 0, turnActive: false, firstRecvTime: 0
  });

  const startSession = useCallback(async (retry = 0) => {
    try {
      refs.current.intentClose = false;
      setStatus(retry > 0 ? "reconnecting" : "connecting");
      setErr(null);
      const res = await fetch("/api/live/token", { method: "POST", headers: { Authorization: `Bearer ${userToken}` } });
      const { token } = await res.json();
      const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?bearer_token=${token}`);
      refs.current.ws = ws;

      ws.onopen = async () => {
        ws.send(JSON.stringify({ setup: getSetupPayload() }));
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        const ctx = new window.AudioContext({ sampleRate: 16000 });
        const playCtx = new window.AudioContext({ sampleRate: 24000 });
        const blobUrl = URL.createObjectURL(new Blob([WORKLET_SRC], { type: "application/javascript" }));
        await ctx.audioWorklet.addModule(blobUrl);
        const worklet = new AudioWorkletNode(ctx, "p");
        Object.assign(refs.current, { stream, ctx, playCtx, worklet, blobUrl, lastPeakTime: 0, turnActive: false, firstRecvTime: 0 });
        ctx.createMediaStreamSource(stream).connect(worklet);
        worklet.connect(ctx.destination);
        worklet.port.onmessage = (ev) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          if (ev.data.peak > 0.01) refs.current.lastPeakTime = performance.now();
          ws.send(JSON.stringify({ realtimeInput: { mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: pcmToB64(ev.data.pcm) }] } }));
        };
        setStatus("connected");
      };

      ws.onmessage = createMessageHandler(refs, setAssets, setIsExec, userToken);

      ws.onerror = (e) => {
        console.log("WebSocket error:", e);
        setStatus("error");
        setErr("WebSocket error");
      };

      ws.onclose = (e) => {
        console.log("WebSocket close code:", e.code, "reason:", e.reason);
        if (!refs.current.intentClose && e.code !== 1000) {
          setStatus("reconnecting");
          refs.current.timer = setTimeout(() => startSession(retry + 1), Math.min(1000 * Math.pow(1.5, retry), 15000));
        } else {
          setStatus("idle");
        }
      };
    } catch (err) {
      setStatus("error");
      setErr(err.message);
    }
  }, [userToken]);

  const stopSession = useCallback(() => {
    const r = refs.current;
    r.intentClose = true;
    if (r.timer) clearTimeout(r.timer);
    if (r.worklet) r.worklet.disconnect();
    if (r.stream) r.stream.getTracks().forEach(t => t.stop());
    if (r.ctx) r.ctx.close();
    if (r.playCtx) r.playCtx.close();
    if (r.blobUrl) URL.revokeObjectURL(r.blobUrl);
    if (r.ws) r.ws.close();
    Object.assign(r, { worklet: null, stream: null, ctx: null, playCtx: null, ws: null, srcs: [], nextTime: 0, blobUrl: null, timer: null });
    setIsExec(false);
    setAssets([]);
    setStatus("idle");
  }, []);

  useEffect(() => stopSession, [stopSession]);
  return { status, errorMsg: err, isExecutingTool: isExec, assets, startSession, stopSession };
}
