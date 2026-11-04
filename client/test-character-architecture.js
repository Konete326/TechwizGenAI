import assert from "node:assert";
import * as THREE from "three";

const storageMock = new Map();
globalThis.localStorage = {
  getItem: (k) => storageMock.get(k) || null,
  setItem: (k, v) => storageMock.set(k, String(v)),
  removeItem: (k) => storageMock.delete(k),
  clear: () => storageMock.clear(),
};

class MockEventTarget {
  constructor() {
    this.listeners = new Map();
  }
  addEventListener(type, cb) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(cb);
  }
  removeEventListener(type, cb) {
    if (!this.listeners.has(type)) return;
    this.listeners.set(type, this.listeners.get(type).filter((l) => l !== cb));
  }
  dispatchEvent(evt) {
    const list = this.listeners.get(evt.type) || [];
    for (const cb of list) cb(evt);
    return true;
  }
}
globalThis.window = new MockEventTarget();
globalThis.window.devicePixelRatio = 2.0;
globalThis.window.innerWidth = 1280;
globalThis.window.innerHeight = 800;
globalThis.window.getComputedStyle = () => ({ display: "block", visibility: "visible", opacity: "1" });
globalThis.document = {
  createElement: () => ({
    getContext: () => null,
  }),
  getElementById: (id) => {
    if (id === "nesa-call-widget") {
      return {
        id: "nesa-call-widget",
        getBoundingClientRect: () => ({
          left: 880,
          right: 1220,
          top: 140,
          bottom: 760,
          width: 340,
          height: 620,
        }),
      };
    }
    return null;
  },
  querySelectorAll: () => [],
  querySelector: () => null,
};
globalThis.CustomEvent = class {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
};

async function runTests() {
  console.log("=================================================");
  console.log("RUNNING CHARACTER ARCHITECTURE VERIFICATION TESTS");
  console.log("=================================================");

  const {
    CharacterRegistry,
    CharacterController,
    AudioAnalysisBus,
    CameraFramingManager,
    GeminiCharacterBridge,
    ActionRegistry,
    VRMCharacterAdapter,
    HardwareDiagnostics,
    FRAMING_MODES,
    EmotionEngine,
    IdleBehaviorManager,
    ScreenTargetManager,
    CharacterPhysicsEngine,
    NishaSDK,
  } = await import("./src/services/character/index.js");

  ActionRegistry.initialize();
  CharacterRegistry.initialize();

  console.log("\n[1] Testing CharacterRegistry Initialization & Defaults...");
  const nisa = CharacterRegistry.getActiveCharacter();
  assert.ok(nisa, "Active character should exist by default");
  assert.strictEqual(nisa.id, "nisa", "Default character ID should be 'nisa'");
  assert.strictEqual(nisa.type, "VRM", "Default character type should be 'VRM'");
  assert.strictEqual(CharacterRegistry.isCharacterLoaded("nisa"), false, "Character shouldn't be marked loaded initially");
  CharacterRegistry.markCharacterLoaded("nisa");
  assert.strictEqual(CharacterRegistry.isCharacterLoaded("nisa"), true, "Character should be marked loaded");
  CharacterRegistry.markCharacterUnloaded("nisa");
  assert.strictEqual(CharacterRegistry.isCharacterLoaded("nisa"), false, "Character should be marked unloaded");
  console.log("✓ Default character seeded and active: " + nisa.name);

  console.log("\n[2] Testing Multi-Character Registration & Switching...");
  const newChar = {
    id: "alex",
    name: "Alex Realistic",
    type: "GLTF_HUMANOID",
    modelUrl: "/models/alex.glb",
    framingMode: "BUST",
  };
  const regResult = CharacterRegistry.registerCharacter(newChar);
  assert.strictEqual(regResult.success, true, "Registration should succeed");

  let switchFired = false;
  const unsub = CharacterRegistry.onCharacterSwitch((newId, prevId) => {
    switchFired = true;
    assert.strictEqual(newId, "alex");
    assert.strictEqual(prevId, "nisa");
  });

  CharacterRegistry.setActiveCharacter("alex");
  assert.strictEqual(switchFired, true, "Switch listener should receive event");
  assert.strictEqual(CharacterRegistry.getActiveCharacter().id, "alex");
  unsub();

  CharacterRegistry.setActiveCharacter("nisa");
  assert.strictEqual(CharacterRegistry.getActiveCharacter().id, "nisa");
  console.log("✓ Multi-character registration and switching verified.");

  console.log("\n[3] Testing ICharacterAdapter Mock & Capability Profiling...");
  const headBone = new THREE.Object3D();
  headBone.position.set(0, 1.45, 0);
  const neckBone = new THREE.Object3D();
  neckBone.position.set(0, 1.34, 0);
  const chestBone = new THREE.Object3D();
  chestBone.position.set(0, 1.18, 0);
  const hipsBone = new THREE.Object3D();
  hipsBone.position.set(0, 0.90, 0);

  const rightUpperArm = new THREE.Object3D();
  const rightLowerArm = new THREE.Object3D();
  const rightHand = new THREE.Object3D();
  const leftUpperArm = new THREE.Object3D();
  const leftLowerArm = new THREE.Object3D();
  const leftHand = new THREE.Object3D();

  const mockVRM = {
    scene: new THREE.Group(),
    humanoid: {
      getNormalizedBoneNode: (name) => {
        if (name === "head") return headBone;
        if (name === "neck") return neckBone;
        if (name === "chest") return chestBone;
        if (name === "hips") return hipsBone;
        if (name === "rightUpperArm") return rightUpperArm;
        if (name === "rightLowerArm") return rightLowerArm;
        if (name === "rightHand") return rightHand;
        if (name === "leftUpperArm") return leftUpperArm;
        if (name === "leftLowerArm") return leftLowerArm;
        if (name === "leftHand") return leftHand;
        return null;
      },
    },
    expressionManager: {
      expressions: [
        { expressionName: "aa" },
        { expressionName: "ih" },
        { expressionName: "ou" },
        { expressionName: "ee" },
        { expressionName: "oh" },
        { expressionName: "happy" },
        { expressionName: "blink" },
        { expressionName: "relaxed" },
        { expressionName: "sad" },
        { expressionName: "angry" },
        { expressionName: "surprised" },
      ],
      setValue: () => {},
      getValue: () => 0,
      reset: () => {},
      update: () => {},
    },
    update: () => {},
  };

  const vrmAdapter = new VRMCharacterAdapter("nisa_test");
  vrmAdapter.vrm = mockVRM;
  vrmAdapter.root = mockVRM.scene;

  const profile = vrmAdapter.inspectCapabilities();
  assert.ok(profile.bones.includes("head"), "Should detect head bone");
  assert.ok(profile.bones.includes("chest"), "Should detect chest bone");
  assert.ok(profile.bones.includes("rightUpperArm"), "Should detect rightUpperArm bone");
  assert.ok(profile.bones.includes("rightHand"), "Should detect rightHand bone");
  assert.ok(profile.expressions.includes("aa"), "Should detect 'aa' mouth shape");
  assert.ok(profile.expressions.includes("happy"), "Should detect 'happy' expression");
  assert.ok(profile.expressions.includes("show_teeth"), "Should detect 'show_teeth' composite support");
  assert.strictEqual(profile.capabilities.teethVisible, true, "Teeth visibility should be supported");
  console.log("✓ VRM rig inspection & profile generated successfully. Expressions found:", profile.expressions.length);

  console.log("\n[4] Testing CameraFramingManager & Safe Headroom Calculation...");
  CameraFramingManager.setMode(FRAMING_MODES.HEAD_AND_SHOULDERS);
  const mockCamera = new THREE.PerspectiveCamera(28, 1.0, 0.1, 20);
  CameraFramingManager.applyFraming(vrmAdapter, mockCamera, 1.0, true);

  const framing = vrmAdapter.getCameraFraming("HEAD_AND_SHOULDERS", 1.0);
  assert.ok(framing.cameraPosition[1] >= 1.35, "Camera Y should frame upper body with headroom");
  assert.ok(framing.cameraPosition[2] >= 1.35, "Camera distance should be >= 1.35m to prevent hair cropping");
  assert.strictEqual(framing.fov, 28, "FOV should match video call default");
  console.log("✓ Video-call camera framing with safe headroom:", {
    camPos: framing.cameraPosition,
    target: framing.target,
    fov: framing.fov,
  });

  console.log("\n[5] Testing Real-Time Audio Telemetry & Viseme Detection...");
  AudioAnalysisBus.setActive(true);
  const metrics = AudioAnalysisBus.sample();
  assert.strictEqual(typeof metrics.volume, "number");
  assert.strictEqual(typeof metrics.dominantPhoneme, "string");
  console.log("✓ AudioAnalysisBus metric sampling verified (dominant phoneme fallback: " + metrics.dominantPhoneme + ")");

  console.log("\n[6] Testing CharacterController Real Skeletal Kinematics...");
  CharacterController.setAdapter(vrmAdapter);

  CharacterController.update(0.016);
  assert.strictEqual(CharacterController.isInitialized(), true, "Controller should be initialized");
  assert.ok(rightUpperArm.rotation.z !== 0, "Right upper arm should be lowered in resting posture, not in T-pose");

  const wavePromise = CharacterController.executeAction("wave", { duration: 0.05 });
  for (let i = 0; i < 8; i++) {
    CharacterController.update(0.016);
  }
  const waveRes = await wavePromise;
  assert.strictEqual(waveRes.success, true, "Wave action should complete successfully");
  assert.ok(waveRes.durationMs >= 0, "Wave should report true elapsed duration");

  const teethRes = await CharacterController.executeAction("show_teeth", { duration: 50 });
  assert.strictEqual(teethRes.success, true, "Show teeth action should execute successfully");

  const raiseRes = await CharacterController.executeAction("raise_both_hands");
  assert.strictEqual(raiseRes.success, true, "Raise both hands should succeed");
  const lowerRes = await CharacterController.executeAction("lower_hands");
  assert.strictEqual(lowerRes.success, true, "Lower hands should succeed");

  const clapPromise = CharacterController.executeAction("clap", { duration: 0.05 });
  for (let i = 0; i < 8; i++) {
    CharacterController.update(0.016);
  }
  const clapRes = await clapPromise;
  assert.strictEqual(clapRes.success, true, "Clap action should execute successfully");

  const hairPromise = CharacterController.executeAction("adjust_hair", { duration: 0.05 });
  for (let i = 0; i < 8; i++) {
    CharacterController.update(0.016);
  }
  const hairRes = await hairPromise;
  assert.strictEqual(hairRes.success, true, "Adjust hair action should execute successfully");

  const waveBothPromise = CharacterController.executeAction("wave_both", { duration: 0.05 });
  for (let i = 0; i < 8; i++) {
    CharacterController.update(0.016);
  }
  const waveBothRes = await waveBothPromise;
  assert.strictEqual(waveBothRes.success, true, "Wave both hands should execute successfully");

  const moveRes = await CharacterController.executeAction("move_left");
  assert.strictEqual(moveRes.success, true, "Move left should execute");
  const leanRes = await CharacterController.executeAction("lean_right");
  assert.strictEqual(leanRes.success, true, "Lean right should execute");
  const centerRes = await CharacterController.executeAction("center");
  assert.strictEqual(centerRes.success, true, "Center should execute");

  EmotionEngine.setEmotion("excited", { intensity: 0.9, duration: 1000 });
  assert.strictEqual(EmotionEngine.getCurrentEmotion().emotion, "excited");
  EmotionEngine.resetToNeutral();
  assert.strictEqual(EmotionEngine.getCurrentEmotion().emotion, "neutral");
  const autoEmotion = EmotionEngine.analyzeConversationContext("Mubarak ho! Bohat shandar kaam kiya!");
  assert.strictEqual(autoEmotion, "excited", "Contextual sentiment analyzer should detect excitement");

  IdleBehaviorManager.update(0.016, { adapter: vrmAdapter, isSpeaking: false, hasActiveAction: false, characterController: CharacterController });
  const idleHead = IdleBehaviorManager.getHeadOffset();
  assert.strictEqual(typeof idleHead.pitch, "number");

  console.log("✓ Real skeletal kinematics (Clap, Wave, Both Waves, Hair Adjust, Move/Lean/Center, Emotion & Idle Engine) executed cleanly.");

  console.log("\n[7] Testing GeminiCharacterBridge Tool Execution & Safe Guardrails...");
  const bridgeRes1 = await GeminiCharacterBridge.handleRequest({
    type: "character_action",
    action: "nod",
    parameters: {},
  });
  assert.strictEqual(bridgeRes1.success, true, "Valid action 'nod' should succeed via bridge");

  const bridgeRes2 = await GeminiCharacterBridge.handleRequest({
    type: "arbitrary_eval",
    action: "alert(1)",
  });
  assert.strictEqual(bridgeRes2.success, false, "Unknown request type must be rejected");

  const bridgeRes3 = await GeminiCharacterBridge.handleRequest({
    type: "character_action",
    action: "do_backflip_and_explode",
  });
  assert.strictEqual(bridgeRes3.success, false, "Unregistered action must report error");
  console.log("✓ GeminiCharacterBridge guardrails & action routing verified.");

  console.log("\n[8] Testing HardwareDiagnostics...");
  const diagReport = HardwareDiagnostics.checkCapabilities();
  assert.ok(diagReport, "Diagnostics report should be generated");
  console.log("✓ HardwareDiagnostics generated report. Recommended pixel ratio:", diagReport.recommendedPixelRatio);

  console.log("\n[9] Testing ScreenTargetManager & Directional Pointing Coordinates...");
  const topTarget = ScreenTargetManager.resolveTarget("top");
  assert.strictEqual(topTarget.direction, "top", "Top target should resolve to direction 'top'");
  assert.ok(topTarget.coords.y > 0, "Top target normalized Y must be positive (+Y is UP)");
  const bottomTarget = ScreenTargetManager.resolveTarget("chat_input");
  assert.strictEqual(bottomTarget.direction, "bottom", "Chat input should resolve to direction 'bottom'");
  assert.ok(bottomTarget.coords.y < 0, "Bottom target normalized Y must be negative (-Y is DOWN)");
  const ptLeftRes = await CharacterController._execPoint({ direction: "left", duration: 0.1 });
  assert.strictEqual(ptLeftRes.success, true, "Point left should complete");
  console.log("✓ ScreenTargetManager vertical coordinates (+Y up, -Y down) and directional pointing verified.");

  console.log("\n[10] Testing CharacterPhysicsEngine Obstacle Pathing & Gravity Drop...");
  const pathAcrossObstacle = CharacterPhysicsEngine.computeSafePath({ x: 600, y: 394 }, { x: 1050, y: 394 }, 240, 400);
  assert.strictEqual(pathAcrossObstacle.hasObstacle, true, "Path crossing #nesa-call-widget must detect obstacle");
  const midSample = pathAcrossObstacle.sampleAt(0.5);
  assert.ok(midSample.y < 394, "Path crossing obstacle must arc above ground Y");

  const dropPath = CharacterPhysicsEngine.computeSafePath({ x: 300, y: 180 }, { x: 380, y: 394 }, 240, 400);
  assert.strictEqual(dropPath.isGravityDrop, true, "Moving from elevated surface to ground must trigger gravity drop");
  console.log("✓ Obstacle avoidance trajectory and gravity drop verified.");

  console.log("\n[11] Testing NishaSDK Universal Runtime Lifecycle...");
  const sdkInit = NishaSDK.init({ characterId: "nisa" });
  assert.strictEqual(sdkInit.success, true);
  NishaSDK.pause();
  const pausedRes = await NishaSDK.executeAction("wave");
  assert.strictEqual(pausedRes.success, false);
  assert.strictEqual(pausedRes.error, "runtime_paused");
  NishaSDK.resume();
  const resumedRes = await NishaSDK.executeAction("nod");
  assert.strictEqual(resumedRes.success, true);
  console.log("✓ NishaSDK init, pause, resume, and action execution verified.");

  CharacterController.dispose();

  console.log("\n=================================================");
  console.log("ALL 11 VERIFICATION TEST SUITES PASSED PERFECTLY!");
  console.log("=================================================\n");
}

runTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  globalThis.process?.exit?.(1);
});

