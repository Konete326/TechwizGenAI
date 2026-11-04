import { useEffect } from "react";
import GeminiCharacterBridge from "../../services/character/GeminiCharacterBridge.js";
import FrameAwareCharacterController from "../../services/character/FrameAwareCharacterController.js";
import ScreenTargetManager from "../../services/character/ScreenTargetManager.js";
import EmotionEngine from "../../services/character/EmotionEngine.js";
import CharacterController from "../../services/character/CharacterController.js";

const CHARACTER_TOOLS = new Set([
  "executeCharacterAction",
  "learnCharacterAction",
  "exitFrameAndNavigate",
  "walkOnScreen",
  "returnToFrame",
  "inspectScreenComponent",
  "clickScreenComponent",
  "highlightScreenComponent",
  "expressEmotion",
]);

export function useCharacterActions() {
  useEffect(() => {
    const handler = async (event) => {
      if (typeof window !== "undefined" && window.__nesaDashboardActionsActive) return;

      const call = event?.detail;
      if (!call || !CHARACTER_TOOLS.has(call.name)) return;

      const callId = call.id || call.callId || ("call_" + Date.now());
      const args = call.args || call.arguments || {};
      let result;

      if (call.name === "executeCharacterAction") {
        result = await GeminiCharacterBridge.handleRequest({
          type: "character_action",
          action: args.actionId || args.action,
          parameters: args.parameters || args.params || {},
        });
      } else if (call.name === "learnCharacterAction") {
        result = await GeminiCharacterBridge.learnAction(args);
      } else if (call.name === "exitFrameAndNavigate") {
        result = await FrameAwareCharacterController.exitFrameAndNavigate(args);
      } else if (call.name === "walkOnScreen") {
        result = await FrameAwareCharacterController.walkAlongBottom(args.direction || "patrol", args);
      } else if (call.name === "returnToFrame") {
        result = await FrameAwareCharacterController.returnToFrame();
      } else if (call.name === "inspectScreenComponent") {
        const target = args.target || args.targetComponent || "this component";
        result = FrameAwareCharacterController.isOutsideFrame()
          ? await FrameAwareCharacterController.navigateToComponent(target, args)
          : await ScreenTargetManager.inspectAndExplain(target, args);
      } else if (call.name === "clickScreenComponent") {
        result = await FrameAwareCharacterController.clickComponent(args.target || args.targetComponent);
      } else if (call.name === "highlightScreenComponent") {
        const resolved = ScreenTargetManager.resolveTarget(args.target || args.targetComponent);
        if (resolved?.element) {
          FrameAwareCharacterController.highlightElement(resolved.element, args.duration || 4000);
        }
        result = { success: Boolean(resolved?.element), target: resolved?.label || args.target };
      } else if (call.name === "expressEmotion") {
        result = EmotionEngine.setEmotion(args.emotion, {
          intensity: args.intensity ?? 0.85,
          reason: args.reason || "",
          suggested_gesture: args.suggested_gesture,
          duration: args.duration,
        });
        if (args.suggested_gesture) {
          CharacterController.executeAction(args.suggested_gesture).catch(() => {});
        }
      }

      window.dispatchEvent(
        new CustomEvent("nesa:toolresponse", {
          detail: {
            id: callId,
            name: call.name,
            response: {
              output: result || { status: "success" },
            },
          },
        })
      );
    };

    window.addEventListener("nesa:toolcall", handler);
    return () => window.removeEventListener("nesa:toolcall", handler);
  }, []);
}
