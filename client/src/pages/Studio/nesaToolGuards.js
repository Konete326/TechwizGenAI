import { CRITICAL_REQUEST_PHRASES, textMentionsAny } from "./nesaActionPhrases";
import { resetUserFrames } from "./userFrameWatch";

const USER_ACTIVITY_WINDOW_MS = 60000;
const DISPATCH_MIN_GAP_MS = 1500;
const REPEAT_WINDOW_MS = 5000;
const SEEN_LIMIT = 80;

export const ALLOWED_ROUTES = [
  "/", "/dashboard", "/studio", "/assets", "/analytics", "/users",
  "/admin", "/admin/users", "/notifications", "/profile", "/settings"
];

const FORBIDDEN_ROUTES = ["/login", "/register", "/auth"];

let lastUserText = "";
let lastUserActivityAt = 0;
let lastDispatchAt = 0;
let lastSignature = "";
let lastSignatureAt = 0;
const seenIds = [];
const claimedIds = [];

function pushBounded(list, value) {
  list.push(value);
  if (list.length > SEEN_LIMIT) list.shift();
}

function toolArgs(call) {
  return call?.args || call?.arguments || {};
}

function signatureOf(call) {
  return `${call?.name}:${JSON.stringify(toolArgs(call))}`;
}

function claim(list, id) {
  if (!id) return true;
  if (list.includes(id)) return false;
  pushBounded(list, id);
  return true;
}

export function resetToolGuards() {
  lastUserText = "";
  lastUserActivityAt = 0;
  lastDispatchAt = 0;
  lastSignature = "";
  lastSignatureAt = 0;
  seenIds.length = 0;
  claimedIds.length = 0;
  resetUserFrames();
}

export function noteUserActivity(text = "", now = Date.now()) {
  lastUserActivityAt = now;
  const clean = String(text || "").trim();
  if (clean) lastUserText = clean;
}

export function hasUserActivity(windowMs = USER_ACTIVITY_WINDOW_MS, now = Date.now()) {
  return lastUserActivityAt > 0 && now - lastUserActivityAt <= windowMs;
}

export function recentUserText(windowMs = USER_ACTIVITY_WINDOW_MS, now = Date.now()) {
  return hasUserActivity(windowMs, now) ? lastUserText : "";
}

export function claimResponseSlot(id) {
  return claim(claimedIds, id);
}

export function userAskedFor(toolName, windowMs = USER_ACTIVITY_WINDOW_MS, now = Date.now()) {
  const phrases = CRITICAL_REQUEST_PHRASES[toolName] || [];
  const text = recentUserText(windowMs, now);
  if (text) return textMentionsAny(text, phrases);
  return hasUserActivity(windowMs, now);
}

export function isAllowedRoute(route) {
  if (typeof route !== "string" || !route.trim()) return false;
  const clean = route.trim().replace(/\/+$/, "") || "/";
  if (FORBIDDEN_ROUTES.some((blocked) => clean === blocked || clean.startsWith(`${blocked}/`))) return false;
  return ALLOWED_ROUTES.includes(clean) || ALLOWED_ROUTES.some((allowed) => allowed !== "/" && clean.startsWith(`${allowed}/`));
}

export function evaluateToolCall(call, now = Date.now()) {
  const id = call?.id || call?.callId;
  if (id && seenIds.includes(id)) return { run: false, respond: false, reason: "duplicate_call_id" };
  if (!hasUserActivity(USER_ACTIVITY_WINDOW_MS, now)) {
    return { run: false, respond: true, reason: "no_user_request_recently" };
  }
  if (now - lastDispatchAt < DISPATCH_MIN_GAP_MS) return { run: false, respond: true, reason: "tool_rate_limited_1500ms" };
  const sig = signatureOf(call);
  if (sig === lastSignature && now - lastSignatureAt < REPEAT_WINDOW_MS) {
    return { run: false, respond: true, reason: "identical_call_within_5_seconds" };
  }
  if (id) pushBounded(seenIds, id);
  lastDispatchAt = now;
  lastSignature = sig;
  lastSignatureAt = now;
  return { run: true };
}
