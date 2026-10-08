import { logDebug } from "./logger";
import { WORKLET_SRC } from "./workletSource.js";

export async function startCapture({ onChunk, onMicLost }) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1
    }
  });
  const track = stream.getAudioTracks()[0];
  if (track) {
    track.onended = onMicLost;
  }
  const appliedSettings = track?.getSettings?.() || {};
  console.info("[NisaLive] applied mic settings", JSON.stringify({
    echoCancellation: appliedSettings.echoCancellation,
    noiseSuppression: appliedSettings.noiseSuppression,
    autoGainControl: appliedSettings.autoGainControl,
    sampleRate: appliedSettings.sampleRate,
    channelCount: appliedSettings.channelCount,
    deviceId: appliedSettings.deviceId,
    facingMode: appliedSettings.facingMode
  }));
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx({ sampleRate: 16000 });
  if (ctx.state === "suspended") await ctx.resume();
  const blobUrl = URL.createObjectURL(new Blob([WORKLET_SRC], { type: "application/javascript" }));
  await ctx.audioWorklet.addModule(blobUrl);
  const worklet = new AudioWorkletNode(ctx, "p", {
    processorOptions: { sampleRate: ctx.sampleRate }
  });
  ctx.createMediaStreamSource(stream).connect(worklet);
  const muteGain = ctx.createGain();
  muteGain.gain.value = 0;
  worklet.connect(muteGain);
  muteGain.connect(ctx.destination);

  let zeroWarnCount = 0;
  worklet.port.onmessage = (ev) => {
    const { pcm, peak } = ev.data;
    if (peak === 0) {
      zeroWarnCount++;
      if (zeroWarnCount === 50) {
        console.warn("[NisaLive] Mic connected, but peak amplitude is 0. Check hardware mute switch or mic permissions.");
      }
    } else {
      zeroWarnCount = 0;
    }
    onChunk(pcm, peak);
  };
  return {
    stop() {
      try { worklet.disconnect(); } catch(err) { console.error("Worklet disconnect error:", err); }
      stream.getTracks().forEach(t => t.stop());
      URL.revokeObjectURL(blobUrl);
      try { ctx.close(); } catch(err) { logDebug("AudioContext close error", err); }
    }
  };
}
