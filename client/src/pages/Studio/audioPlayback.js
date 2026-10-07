export function createPlayback() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx({ sampleRate: 24000, latencyHint: "interactive" });
  const srcs = [];
  let nextTime = 0;

  function scheduleChunk(f32, onSpeakingChange) {
    if (!f32?.length) return;
    if (ctx.state === "suspended") ctx.resume();
    const buf = ctx.createBuffer(1, f32.length, 24000);
    buf.copyToChannel(f32, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    const t = srcs.length === 0
      ? Math.max(ctx.currentTime + 0.04, nextTime)
      : Math.max(ctx.currentTime, nextTime);
    src.start(t);
    nextTime = t + buf.duration;
    srcs.push(src);
    onSpeakingChange?.(true);
    src.onended = () => {
      const i = srcs.indexOf(src);
      if (i > -1) srcs.splice(i, 1);
      try { src.disconnect(); } catch {}
      if (srcs.length === 0) { nextTime = 0; onSpeakingChange?.(false); }
    };
  }

  function stopAll() {
    srcs.forEach(s => { try { s.stop(); } catch {} try { s.disconnect(); } catch {} });
    srcs.length = 0;
    nextTime = 0;
  }

  function close() {
    stopAll();
    try { ctx.close(); } catch {}
  }

  return { scheduleChunk, stopAll, close };
}
