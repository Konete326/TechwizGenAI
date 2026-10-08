import { formatToolResponse } from "./nesaTools";
import { claimResponseSlot, evaluateToolCall } from "./nesaToolGuards";

const ASYNC_TOOLS = new Set([
  "spotlightElement", "clickElement", "navigatePage", "fillFormField",
  "deleteAsset", "exportCallSummary", "getDashboardMetrics", "deleteSession",
  "previewAsset", "switchSession", "submitStudioPrompt", "controlSidebar",
  "toggleWorkspaceControl", "generateImage", "queryDocument"
]);

const TOOL_TIMEOUT_MS = 12000;

function sendResponse(wsRef, payload) {
  if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return false;
  wsRef.current.send(JSON.stringify(payload));
  return true;
}

function respondOnce(wsRef, callId, name, result) {
  if (!claimResponseSlot(callId)) return false;
  return sendResponse(wsRef, formatToolResponse(callId, name, result));
}

export function dispatchToolCall(call, wsRef, pendingRef, onToolCall) {
  const callId = call.id || call.callId || ("call_" + Date.now());
  const verdict = evaluateToolCall(call);
  if (!verdict.run) {
    if (import.meta.env.VITE_DEBUG === "true") {
      console.log(`[DEBUG] ${performance.now().toFixed(1)} tool blocked before dispatch: ${call.name} reason=${verdict.reason}`);
    }
    if (verdict.respond) {
      respondOnce(wsRef, callId, call.name, {
        status: "blocked",
        reason: verdict.reason,
        message: "Tool was not run because the user did not ask for this action."
      });
    }
    return;
  }
  if (onToolCall) onToolCall(call);
  window.dispatchEvent(new CustomEvent("nesa:toolcall", { detail: call }));
  if (!ASYNC_TOOLS.has(call.name)) {
    respondOnce(wsRef, callId, call.name, { status: "success", executed: call.name });
    return;
  }
  if (pendingRef.current.has(callId)) clearTimeout(pendingRef.current.get(callId).timer);
  const timer = setTimeout(() => {
    pendingRef.current.delete(callId);
    respondOnce(wsRef, callId, call.name, {
      status: "timeout",
      error: `Tool ${call.name} did not report completion within ${TOOL_TIMEOUT_MS}ms`
    });
  }, TOOL_TIMEOUT_MS);
  pendingRef.current.set(callId, { name: call.name, timer });
}

export function setupToolResponseListener(wsRef, pendingRef) {
  const handler = (e) => {
    const d = e?.detail;
    if (!d) return;
    const pending = pendingRef.current;
    const callId = d.id || d.callId || d.toolResponse?.functionResponses?.[0]?.id;
    if (callId && pending.has(callId)) {
      clearTimeout(pending.get(callId).timer);
      pending.delete(callId);
    }
    const payload = d.toolResponse
      ? d
      : (d.id && d.name
        ? formatToolResponse(d.id, d.name, d.response?.output || d.response || d.output || { status: "success" })
        : null);
    if (payload && claimResponseSlot(callId)) sendResponse(wsRef, payload);
  };
  window.addEventListener("nesa:toolresponse", handler);
  return () => window.removeEventListener("nesa:toolresponse", handler);
}
