/**
 * Character services barrel export.
 * Universal Multi-Character Avatar System for Nisha.
 */
export { default as ActionRegistry } from "./ActionRegistry.js";
export { default as CharacterStateManager, CHARACTER_STATES } from "./CharacterStateManager.js";
export { default as AnimationManager } from "./AnimationManager.js";
export { default as ExpressionManager } from "./ExpressionManager.js";
export { default as VoiceSyncManager } from "./VoiceSyncManager.js";
export { default as CharacterController } from "./CharacterController.js";
export { default as GeminiCharacterBridge } from "./GeminiCharacterBridge.js";
export { default as AudioAnalysisBus } from "./AudioAnalysisBus.js";
export { default as CameraFramingManager, FRAMING_MODES } from "./CameraFramingManager.js";
export { default as CharacterRegistry } from "./CharacterRegistry.js";
export { default as HardwareDiagnostics, GPU_TIERS } from "./HardwareDiagnostics.js";
export { default as EmotionEngine, EMOTIONS } from "./EmotionEngine.js";
export { default as IdleBehaviorManager, IDLE_STATES } from "./IdleBehaviorManager.js";
export { default as ScreenTargetManager, KNOWN_UI_COMPONENTS } from "./ScreenTargetManager.js";
export { ICharacterAdapter } from "./adapters/ICharacterAdapter.js";
export { VRMCharacterAdapter } from "./adapters/VRMCharacterAdapter.js";
export { GLTFHumanoidAdapter } from "./adapters/GLTFHumanoidAdapter.js";
export { createCharacterAdapter } from "./adapters/adapterFactory.js";
