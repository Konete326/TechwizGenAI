const SILENCE_HOLD_MS = 400;

const HEADSET_PATTERN = /(head[\s_-]?phone|headset|ear[\s_-]?phone|ear[\s_-]?bud|airpods?\b|buds\b|hands[\s_-]?free)/i;
const SPEAKER_PATTERN = /(speaker|speakers|realtek|conexant|maxx[\s_-]?audio|smart[a-z]*audio|laptop|internal|built[\s_-]?in|ida\d|da\d\d|pnpa|high[\s_-]?definition|hdmi|displayport|monitor|tv|projector)/i;

let halfDuplex = true;
let userOverride = false;
let speaking = false;
let lastSpeakingEndAt = 0;
const modeListeners = new Set();

function notifyMode() {
  modeListeners.forEach((listener) => listener());
}

export function subscribeMicMode(listener) {
  modeListeners.add(listener);
  return () => modeListeners.delete(listener);
}

export function isHalfDuplex() {
  return halfDuplex;
}

export function setMicMode(mode, override = true) {
  if (override) userOverride = true;
  const next = mode !== "full";
  if (next === halfDuplex) return halfDuplex;
  halfDuplex = next;
  if (!halfDuplex) {
    speaking = false;
    lastSpeakingEndAt = 0;
  }
  notifyMode();
  return halfDuplex;
}

export function applyAutoMicMode(headphonesDetected) {
  if (userOverride) return halfDuplex;
  const next = !headphonesDetected;
  if (next !== halfDuplex) {
    halfDuplex = next;
    notifyMode();
  }
  return halfDuplex;
}

export function markSpeaking(active, now = Date.now()) {
  if (active) {
    speaking = true;
    return;
  }
  if (speaking) {
    speaking = false;
    lastSpeakingEndAt = now;
  }
}

export function micBlocked(now = Date.now()) {
  if (!halfDuplex) return false;
  return speaking || now - lastSpeakingEndAt < SILENCE_HOLD_MS;
}

export function looksLikeHeadphone(label = "") {
  const text = String(label || "");
  if (!text) return false;
  return HEADSET_PATTERN.test(text) && !SPEAKER_PATTERN.test(text);
}

export function hasHeadphoneOutput(devices = []) {
  return devices.some((d) => d.kind === "audiooutput" && looksLikeHeadphone(d.label));
}
