import { NESA_TOOL_DECLARATIONS, NESA_TARGET_KEYS } from "./nesaToolDeclarations1";
import { NESA_TOOL_DECLARATIONS_2 } from "./nesaToolDeclarations2";

export const FULL_NESA_TOOL_DECLARATIONS = [...NESA_TOOL_DECLARATIONS, ...NESA_TOOL_DECLARATIONS_2];

export { NESA_TARGET_KEYS };

const SLOW_TOOLS = new Set([
  "getDashboardMetrics", "submitStudioPrompt", "deleteAsset", "deleteSession",
  "generateImage", "queryDocument", "exportCallSummary"
]);

export function formatToolResponse(id, name, result) {
  const resp = { response: { output: result }, id, name };
  if (SLOW_TOOLS.has(name)) resp.scheduling = "WHEN_IDLE";
  return { toolResponse: { functionResponses: [resp] } };
}

export function respondToTool(id, name, result) {
  window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(id, name, result) }));
}
