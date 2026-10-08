export const DEBUG = false;

export const metrics = {
  lastSpeech: 0,
  firstAudioRecv: 0,
  firstAudioPlay: 0,
  turnActive: false
};

export function logDebug(...args) {
  if (DEBUG) {
    console.log("[NisaLive]", ...args);
  }
}

export function logServerMessage(type) {
  if (DEBUG) {
    console.log(`[NisaLive] [Message] ${type}`);
  }
}

export function logConnectionQuality(quality) {
  if (DEBUG) {
    console.log(`[NisaLive] [Quality] ${quality}`);
  }
}

export function logClose(code, reason) {
  if (DEBUG) {
    console.log(`[NisaLive] [Close] Code: ${code}, Reason: ${reason}`);
  }
}

export function markLastSpeech() {
  metrics.lastSpeech = performance.now();
  metrics.turnActive = true;
  metrics.firstAudioRecv = 0;
  metrics.firstAudioPlay = 0;
}

export function markFirstAudioRecv() {
  if (metrics.turnActive && !metrics.firstAudioRecv) {
    metrics.firstAudioRecv = performance.now();
    if (DEBUG && metrics.lastSpeech) {
      logDebug(`[Latency] LAST_SPEECH to FIRST_AUDIO_RECV: ${(metrics.firstAudioRecv - metrics.lastSpeech).toFixed(2)}ms`);
    }
  }
}

export function markFirstAudioPlay() {
  if (metrics.turnActive && !metrics.firstAudioPlay) {
    metrics.firstAudioPlay = performance.now();
    if (DEBUG && metrics.firstAudioRecv) {
      logDebug(`[Latency] FIRST_AUDIO_RECV to FIRST_AUDIO_PLAY: ${(metrics.firstAudioPlay - metrics.firstAudioRecv).toFixed(2)}ms`);
      if (metrics.lastSpeech) {
        logDebug(`[Latency] LAST_SPEECH to FIRST_AUDIO_PLAY (Total): ${(metrics.firstAudioPlay - metrics.lastSpeech).toFixed(2)}ms`);
      }
    }
    metrics.turnActive = false;
  }
}
