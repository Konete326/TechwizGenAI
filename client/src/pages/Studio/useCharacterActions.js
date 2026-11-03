/**
 * useCharacterActions — Hook that listens for executeCharacterAction tool calls
 * dispatched on window by toolDispatch.js, routes them through GeminiCharacterBridge,
 * and sends the result back via nesa:toolresponse.
 *
 * Mount this hook in a component that is active during calls (NesaCallInterface).
 */

import { useEffect } from "react";
import GeminiCharacterBridge from "../../services/character/GeminiCharacterBridge.js";

export function useCharacterActions() {
  useEffect(() => {
    const handler = async (event) => {
      const call = event?.detail;
      if (!call || call.name !== "executeCharacterAction") return;

      const callId = call.id || call.callId || ("call_" + Date.now());
      const args = call.args || call.arguments || {};
      const actionId = args.actionId;
      const params = args.parameters || {};

      const result = await GeminiCharacterBridge.handleRequest({
        type: "character_action",
        action: actionId,
        parameters: params,
      });

      // Respond via the existing nesa:toolresponse event system
      window.dispatchEvent(
        new CustomEvent("nesa:toolresponse", {
          detail: {
            id: callId,
            name: "executeCharacterAction",
            response: {
              output: {
                status: result.success ? "success" : "error",
                message: result.response || result.error,
              },
            },
          },
        })
      );
    };

    window.addEventListener("nesa:toolcall", handler);
    return () => window.removeEventListener("nesa:toolcall", handler);
  }, []);
}
