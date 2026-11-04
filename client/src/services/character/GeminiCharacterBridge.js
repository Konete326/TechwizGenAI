import ActionRegistry from "./ActionRegistry.js";
import CharacterController from "./CharacterController.js";
import CharacterActionLearner from "./CharacterActionLearner.js";
import CharacterRegistry from "./CharacterRegistry.js";
import BoneControlSystem from "./BoneControlSystem.js";

const REQUIRED_FIELDS = ["type", "action"];

class GeminiCharacterBridgeClass {
  inspectRigCapabilities() {
    const adapter = CharacterController._adapter || CharacterRegistry.getActiveAdapter();
    const profile = adapter?.profile || adapter?.inspectCapabilities?.() || null;
    const rigState = BoneControlSystem.inspectRigState(adapter);
    return {
      success: true,
      characterLoaded: Boolean(adapter),
      profile,
      rigState,
      boneConstraints: BoneControlSystem.getAllBoneConstraints(),
      availableActions: ActionRegistry.getAll().map((a) => a.id),
      learnedActions: CharacterActionLearner.getLearnedActions(),
    };
  }

  async handleRequest(request) {
    if (!request || typeof request !== "object") {
      return { success: false, error: "Request must be a non-null object" };
    }
    if (request.type === "inspect_rig") {
      return this.inspectRigCapabilities();
    }
    if (request.type === "motion_plan" || request.type === "compose_action") {
      return this.executeMotionPlan(request);
    }
    for (const field of REQUIRED_FIELDS) {
      if (!request[field]) {
        return { success: false, error: `Missing required field: '${field}'` };
      }
    }
    if (request.type === "learn_action") {
      return this.learnAction(request);
    }
    if (request.type !== "character_action") {
      return {
        success: false,
        error: `Unknown request type: '${request.type}'. Expected 'character_action'.`,
      };
    }

    const actionId = String(request.action).trim().toLowerCase().replace(/[\s-]+/g, "_");
    const params =
      request.parameters && typeof request.parameters === "object"
        ? request.parameters
        : {};

    if (ActionRegistry.has(actionId)) {
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
    }

    const result = await CharacterController.executeAction(actionId, params);
    if (!result.success) {
      return {
        success: false,
        error: result.error || "unavailable_action",
        response: `Action '${actionId}' could not be completed: ${result.reason || result.error}`,
      };
    }

    return {
      success: true,
      action: actionId,
      learned: Boolean(result.learned),
      durationMs: result.durationMs,
      response: `Action '${actionId}' completed successfully (${result.durationMs}ms).`,
    };
  }

  async executeMotionPlan(plan = {}) {
    const id = String(plan.actionId || plan.action || plan.name || "composed_motion_plan")
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, "_");
    const steps = Array.isArray(plan.steps) ? plan.steps : [];

    if (steps.length > 0 && !plan.pose) {
      for (const step of steps) {
        const stepAction = typeof step === "string" ? step : step.action;
        const stepParams = typeof step === "object" ? step.params || step : {};
        if (stepAction) {
          await CharacterController.executeAction(stepAction, stepParams);
        }
      }
      return {
        success: true,
        action: id,
        stepsExecuted: steps.length,
        response: `Executed composite motion plan '${id}' (${steps.length} steps).`,
      };
    }

    return this.learnAction({ ...plan, actionId: id });
  }

  async learnAction(actionDef = {}) {
    const id = actionDef.actionId || actionDef.action || actionDef.id || actionDef.name;
    if (!id) {
      return { success: false, error: "Missing action identifier to learn" };
    }
    const res = await CharacterActionLearner.learnAndExecute(CharacterController, id, {
      ...actionDef,
      allowSynthesis: true,
    });
    return {
      success: Boolean(res?.success),
      action: res?.actionId || id,
      learned: Boolean(res?.learned),
      confidence: res?.confidence,
      response: res?.success
        ? `Learned and executed new action '${res.actionId}' (confidence: ${res.confidence}).`
        : `Could not learn action '${id}'.`,
    };
  }

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
