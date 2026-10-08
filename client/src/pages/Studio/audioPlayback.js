import { logDebug } from "./logger";
import { markFirstAudioPlay } from "./logger";

export function createPlayback() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx({ sampleRate: 24000, latencyHint: "interactive" });
  const srcs = [];
  let nextTime = 0;
  let cushion = 0.06;
  const MAX_CUSHION = 0.5;

  let speakingInterval = null;
  const MAX_LOOKAHEAD_SEC = 2;

  function checkSpeaking(onSpeakingChange) {
    const active = srcs.length > 0 || nextTime > ctx.currentTime;
    onSpeakingChange?.(active);
  }


  function scheduleChunk(f32, onSpeakingChange) {
    if (!f32?.length) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => logDebug("Playback resume rejected by browser"));
    if (nextTime > ctx.currentTime + MAX_LOOKAHEAD_SEC) {
      logDebug("dropped audio chunk, playback queue ahead by", (nextTime - ctx.currentTime).toFixed(2), "s");
      return;
    }
    const buf = ctx.createBuffer(1, f32.length, 24000);
    buf.copyToChannel(f32, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    
    let isUnderrun = false;
    if (srcs.length === 0 && nextTime > 0) {
       const gap = ctx.currentTime - nextTime;
       if (gap > 0 && gap < 1.0) {
         cushion = Math.min(MAX_CUSHION, cushion + 0.04);
         isUnderrun = true;
       }
    }

    if (!isUnderrun && cushion > 0.06) {
       cushion = Math.max(0.06, cushion - 0.001); 
    }

    const t = srcs.length === 0
      ? Math.max(ctx.currentTime + cushion, nextTime)
      : Math.max(ctx.currentTime, nextTime);
      
    src.start(t);
    nextTime = t + buf.duration;
    srcs.push(src);
    
    checkSpeaking(onSpeakingChange);
    if (!speakingInterval) {
      speakingInterval = setInterval(() => checkSpeaking(onSpeakingChange), 100);
    }
    
    markFirstAudioPlay();
    src.onended = () => {
      const i = srcs.indexOf(src);
      if (i > -1) srcs.splice(i, 1);
      try { src.disconnect(); } catch(err) { logDebug("Audio playback error", err); }
      if (srcs.length > 0) {
        checkSpeaking(onSpeakingChange);
        return;
      }
      nextTime = 0;
      onSpeakingChange?.(false);
      if (speakingInterval) { clearInterval(speakingInterval); speakingInterval = null; }
      cushion = 0.06;
    };
  }

  function stopAll() {
    srcs.forEach(s => { try { s.stop(); } catch(err) { logDebug("Audio playback error", err); } try { s.disconnect(); } catch(err) { logDebug("Audio playback error", err); } });
    srcs.length = 0;
    nextTime = 0;
    if (speakingInterval) { clearInterval(speakingInterval); speakingInterval = null; }
  }

  function resume() {
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
  }

  function close() {
    stopAll();
    try { ctx.close(); } catch(err) { logDebug("Audio playback error", err); }
  }

  return { scheduleChunk, stopAll, close, resume };
}
