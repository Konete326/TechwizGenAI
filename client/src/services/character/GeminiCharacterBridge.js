/**
 * GeminiCharacterBridge — Validates and routes Gemini AI action requests
 * through ActionRegistry to CharacterController.
 *
 * Never executes arbitrary JavaScript. All actions must be pre-registered.
 * Standalone service — no React dependencies.
 */

import ActionRegistry from "./ActionRegistry.js";
import CharacterController from "./CharacterController.js";

/** Expected schema for a Gemini character action request */
const REQUIRED_FIELDS = ["type", "action"];

class GeminiCharacterBridgeClass {
  /**
   * Process an incoming action request from Gemini.
   * @param {object} request — e.g. { type: "character_action", action: "wave", parameters: {} }
   * @returns {Promise<{ success: boolean, error?: string, response?: string }>}
   */
  async handleRequest(request) {
    // 1. Basic structure validation
    if (!request || typeof request !== "object") {
      return { success: false, error: "Request must be a non-null object" };
    }
    for (const field of REQUIRED_FIELDS) {
      if (!request[field]) {
        return { success: false, error: `Missing required field: '${field}'` };
      }
    }
    if (request.type !== "character_action") {
      return {
        success: false,
        error: `Unknown request type: '${request.type}'. Expected 'character_action'.`,
      };
    }

    const actionId = String(request.action).trim().toLowerCase();
    const params = request.parameters && typeof request.parameters === "object"
      ? request.parameters
      : {};

    // 2. Check ActionRegistry
    if (!ActionRegistry.has(actionId)) {
      return {
        success: false,
        error: `unavailable_action`,
        response: `Action '${actionId}' is not registered in the ActionRegistry.`,
      };
    }

    const action = ActionRegistry.get(actionId);
    if (!action.enabled) {
      return {
        success: false,
        error: "action_disabled",
        response: `Action '${actionId}' is currently disabled.`,
      };
    }
    if (action.status === "pending" && !ActionRegistry.hasExecutor(actionId)) {
      return {
        success: false,
        error: "action_pending",
        response: `Action '${actionId}' has no animation asset or executor yet (status: pending).`,
      };
    }

    // 3. Execute via CharacterController (which awaits actual animation completion)
    const result = await CharacterController.executeAction(actionId, params);
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        response: `Action '${actionId}' could not be completed: ${result.reason || result.error}`,
      };
    }

    return {
      success: true,
      action: actionId,
      durationMs: result.durationMs,
      response: `Action '${actionId}' completed successfully (${result.durationMs}ms).`
    };
  }

  /**
   * Register a new action dynamically (called when Gemini introduces a new action).
   * Will validate and check for duplicates.
   * If animation asset is not provided, marks status as "pending".
   * @returns {{ success: boolean, error?: string, action?: object }}
   */
  registerNewAction(actionDef) {
    if (!actionDef?.id) {
      return { success: false, error: "Action definition must have an 'id'" };
    }

    if (ActionRegistry.has(actionDef.id)) {
      return {
        success: false,
        error: `Action '${actionDef.id}' already exists. Use forceUpdate to overwrite.`,
      };
    }

    return ActionRegistry.register(actionDef);
  }
}

const GeminiCharacterBridge = new GeminiCharacterBridgeClass();
export default GeminiCharacterBridge;
