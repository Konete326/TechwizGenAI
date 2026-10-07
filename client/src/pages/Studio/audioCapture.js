import { WORKLET_SRC } from "./workletSource.js";

export async function startCapture({ onChunk, onMicLost }) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
      sampleRate: 16000
    }
  });
  const track = stream.getAudioTracks()[0];
  if (track) {
    track.onended = onMicLost;
    track.onmute = onMicLost;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx({ sampleRate: 16000 });
  if (ctx.state === "suspended") await ctx.resume();
  const blobUrl = URL.createObjectURL(new Blob([WORKLET_SRC], { type: "application/javascript" }));
  await ctx.audioWorklet.addModule(blobUrl);
  const worklet = new AudioWorkletNode(ctx, "p");
  ctx.createMediaStreamSource(stream).connect(worklet);
  worklet.connect(ctx.destination);
  worklet.port.onmessage = (ev) => onChunk(ev.data.pcm, ev.data.peak);
  return {
    stop() {
      try { worklet.disconnect(); } catch {}
      stream.getTracks().forEach(t => t.stop());
      URL.revokeObjectURL(blobUrl);
      try { ctx.close(); } catch {}
    }
  };
}
