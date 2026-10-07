import { formatToolResponse } from "./nesaTools";

const ASYNC_TOOLS = new Set([
  "spotlightElement", "clickElement", "navigatePage", "fillFormField",
  "deleteAsset", "exportCallSummary", "getDashboardMetrics", "deleteSession",
  "previewAsset", "switchSession", "submitStudioPrompt", "controlSidebar",
  "toggleWorkspaceControl", "generateImage", "queryDocument"
]);

export function dispatchToolCall(call, wsRef, pendingRef, onToolCall) {
  if (onToolCall) onToolCall(call);
  window.dispatchEvent(new CustomEvent("nesa:toolcall", { detail: call }));
  const callId = call.id || call.callId || ("call_" + Date.now());
  if (!ASYNC_TOOLS.has(call.name)) {
    const resp = formatToolResponse(callId, call.name, { status: "success", executed: call.name });
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(resp));
    return;
  }
  if (pendingRef.current.has(callId)) clearTimeout(pendingRef.current.get(callId));
  const timer = setTimeout(() => {
    pendingRef.current.delete(callId);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(formatToolResponse(callId, call.name, { status: "completed", tool: call.name })));
    }
  }, 1500);
  pendingRef.current.set(callId, timer);
}

export function setupToolResponseListener(wsRef, pendingRef) {
  const handler = (e) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN || !e?.detail) return;
    const d = e.detail;
    const callId = d.id || d.callId || d.toolResponse?.functionResponses?.[0]?.id;
    if (callId && pendingRef.current.has(callId)) {
      clearTimeout(pendingRef.current.get(callId));
      pendingRef.current.delete(callId);
    }
    const payload = d.toolResponse
      ? d
      : (d.id && d.name
        ? formatToolResponse(d.id, d.name, d.response?.output || d.response || d.output || { status: "success" })
        : null);
    if (payload) wsRef.current.send(JSON.stringify(payload));
  };
  window.addEventListener("nesa:toolresponse", handler);
  return () => window.removeEventListener("nesa:toolresponse", handler);
}
