import ActionRegistry from "./ActionRegistry.js";
import CharacterRegistry from "./CharacterRegistry.js";
import CharacterController from "./CharacterController.js";
import GeminiCharacterBridge from "./GeminiCharacterBridge.js";
import ScreenTargetManager from "./ScreenTargetManager.js";
import FrameAwareCharacterController from "./FrameAwareCharacterController.js";
import CharacterPhysicsEngine from "./CharacterPhysicsEngine.js";

class NishaSDKRuntimeClass {
  constructor() {
    this._config = {
      characterId: "nisa",
      modelUrl: "/models/nisa.vrm",
      backendUrl: null,
      paused: false,
    };
    this._initialized = false;
  }

  init(config = {}) {
    ActionRegistry.initialize();
    CharacterRegistry.initialize();
    this.configure(config);
    if (config.projectAdapter) {
      this.setProjectAdapter(config.projectAdapter);
    }
    this._initialized = true;
    if (typeof window !== "undefined") {
      window.NishaSDK = this;
    }
    return {
      success: true,
      initialized: true,
      config: { ...this._config },
    };
  }

  configure(options = {}) {
    if (!options || typeof options !== "object") return { ...this._config };
    this._config = { ...this._config, ...options };
    return { ...this._config };
  }

  connectBackend(config = {}) {
    if (typeof config === "string") {
      this._config.backendUrl = config;
    } else if (config && typeof config === "object") {
      this._config.backendUrl = config.url || config.backendUrl || this._config.backendUrl;
      this._config.clientId = config.clientId || this._config.clientId;
    }
    return {
      success: Boolean(this._config.backendUrl),
      backendUrl: this._config.backendUrl,
    };
  }

  async loadModel(modelUrl, metadata = {}) {
    if (!modelUrl) return { success: false, error: "Missing modelUrl" };
    const id = metadata.id || metadata.characterId || `custom_${Date.now()}`;
    CharacterRegistry.register({
      id,
      name: metadata.name || "Custom Avatar",
      format: metadata.format || "vrm",
      modelUrl,
      framingMode: metadata.framingMode || "HEAD_AND_SHOULDERS",
    });
    const switchRes = CharacterRegistry.setActiveCharacter(id);
    this._config.characterId = id;
    this._config.modelUrl = modelUrl;
    return {
      success: Boolean(switchRes?.success),
      characterId: id,
      modelUrl,
    };
  }

  setProjectAdapter(adapter = {}) {
    ScreenTargetManager.setProjectAdapter(adapter);
    return { success: true };
  }

  discoverComponents() {
    const components = ScreenTargetManager.discoverComponents();
    const env = CharacterPhysicsEngine.scanScreenEnvironment(true);
    return {
      components,
      surfaces: env.surfaces.length,
      obstacles: env.obstacles.length,
    };
  }

  getCapabilities() {
    return GeminiCharacterBridge.inspectRigCapabilities();
  }

  async executeAction(actionOrPlan, params = {}) {
    if (this._config.paused) {
      return { success: false, error: "runtime_paused" };
    }
    if (typeof actionOrPlan === "string") {
      return GeminiCharacterBridge.handleRequest({
        type: "character_action",
        action: actionOrPlan,
        parameters: params,
      });
    }
    if (actionOrPlan && typeof actionOrPlan === "object") {
      if (actionOrPlan.steps || actionOrPlan.pose) {
        return GeminiCharacterBridge.executeMotionPlan(actionOrPlan);
      }
      return GeminiCharacterBridge.handleRequest({
        type: actionOrPlan.type || "character_action",
        action: actionOrPlan.action || actionOrPlan.actionId,
        parameters: actionOrPlan.parameters || params,
      });
    }
    return { success: false, error: "invalid_action_input" };
  }

  async navigateToElement(selectorOrId, options = {}) {
    if (this._config.paused) return { success: false, error: "runtime_paused" };
    return FrameAwareCharacterController.navigateToComponent(selectorOrId, options);
  }

  highlightElement(selectorOrId, durationMs = 5000) {
    const resolved = ScreenTargetManager.resolveTarget(selectorOrId);
    if (resolved?.element) {
      FrameAwareCharacterController.highlightElement(resolved.element, durationMs);
      return { success: true, target: resolved.label };
    }
    return { success: false, error: "element_not_found" };
  }

  async clickElement(selectorOrId) {
    if (this._config.paused) return { success: false, error: "runtime_paused" };
    return FrameAwareCharacterController.clickComponent(selectorOrId);
  }

  async exitFrame(options = {}) {
    if (this._config.paused) return { success: false, error: "runtime_paused" };
    return FrameAwareCharacterController.exitFrameAndNavigate(options);
  }

  async returnToFrame() {
    return FrameAwareCharacterController.returnToFrame();
  }

  pause() {
    this._config.paused = true;
    return { paused: true };
  }

  resume() {
    this._config.paused = false;
    return { paused: false };
  }

  dispose() {
    FrameAwareCharacterController.resetImmediate();
    CharacterController.dispose();
    this._initialized = false;
    return { disposed: true };
  }
}

const NishaSDK = new NishaSDKRuntimeClass();
if (typeof window !== "undefined") {
  window.NishaSDK = NishaSDK;
}
export default NishaSDK;
