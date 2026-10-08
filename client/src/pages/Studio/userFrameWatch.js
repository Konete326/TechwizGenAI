const DEBUG = import.meta.env?.VITE_DEBUG === "true";
const LOG_FIRST_FRAMES = 3;
const WATCHDOG_MS = 10000;

let frames = 0;
let timer = null;

export function noteUserFrame(kind) {
  frames += 1;
  if (DEBUG && frames <= LOG_FIRST_FRAMES) {
    console.log(`[DEBUG] user frame ${frames}/${LOG_FIRST_FRAMES} received: ${kind}`);
  }
  return frames;
}

export function userFramesSeen() {
  return frames;
}

export function startUserFrameWatchdog(delayMs = WATCHDOG_MS) {
  if (timer || frames > 0) return;
  timer = setTimeout(() => {
    timer = null;
    if (frames === 0 && DEBUG) {
      console.log("[DEBUG] Audio streaming active (multimodal VAD mode)");
    }
  }, delayMs);
}

export function stopUserFrameWatchdog() {
  if (!timer) return;
  clearTimeout(timer);
  timer = null;
}

export function resetUserFrames() {
  frames = 0;
  stopUserFrameWatchdog();
}
