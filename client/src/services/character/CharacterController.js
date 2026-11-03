/**
 * CharacterController — Universal Character Animation & Skeletal Kinematics Controller.
 *
 * Implements:
 * - Real skeletal kinematics:
 *   - Clapping: genuine dual-arm flexion, palms meeting at midline, multi-cycle rhythmic clapping beats, smooth release.
 *   - Waving: Right hand, Left hand, and Both hands waving visibly beside head.
 *   - Hair adjustment: hand touches temple/hair, head tilts into hand.
 *   - Physical translations & leans: Move Left/Right, Lean Left/Right, Return to Center.
 *   - Laughing: radiant smile + rhythmic chuckle body bounce.
 *   - Multi-beat nodding and head shaking.
 * - Integration with EmotionEngine (13 emotional states, compound blendshapes).
 * - Integration with IdleBehaviorManager (natural autonomous blinking, breathing, gaze shifts).
 * - Multi-layer non-destructive kinematics:
 *   - Layer 0: Idle breathing & micro-attitudes
 *   - Layer 1: Emotional posture & blendshapes
 *   - Layer 2: Speech cadence nods driven by audio energy
 *   - Layer 3: Explicit skeletal gestures (Wave, Clap, Lean, Hair Adjust)
 * - True execution pipeline: Promises resolve only when animations actually complete.
 */

import * as THREE from "three";
import ActionRegistry from "./ActionRegistry.js";
import CharacterStateManager, { CHARACTER_STATES } from "./CharacterStateManager.js";
import CharacterRegistry from "./CharacterRegistry.js";
import VoiceSyncManager from "./VoiceSyncManager.js";
import EmotionEngine, { EMOTIONS } from "./EmotionEngine.js";
import IdleBehaviorManager from "./IdleBehaviorManager.js";
import CameraFramingManager, { FRAMING_MODES } from "./CameraFramingManager.js";
import ScreenTargetManager from "./ScreenTargetManager.js";

// Natural resting pose for humanoid arms (arms hanging naturally alongside torso in VRM normalized coordinates)
export const REST_ARM_POSE = {
  leftUpperArm:  new THREE.Euler(0.0, 0.0, -1.25),
  leftLowerArm:  new THREE.Euler(0.0, 0.0, 0.0),
  leftHand:      new THREE.Euler(0.0, 0.0, 0.0),
  rightUpperArm: new THREE.Euler(0.0, 0.0, 1.25),
  rightLowerArm: new THREE.Euler(0.0, 0.0, 0.0),
  rightHand:     new THREE.Euler(0.0, 0.0, 0.0),
};

export const REST_LEG_POSE = {
  leftUpperLeg:  new THREE.Euler(0.0, 0.0, 0.0),
  leftLowerLeg:  new THREE.Euler(0.0, 0.0, 0.0),
  rightUpperLeg: new THREE.Euler(0.0, 0.0, 0.0),
  rightLowerLeg: new THREE.Euler(0.0, 0.0, 0.0),
};

class CharacterControllerClass {
  constructor() {
    /** @type {import("./adapters/ICharacterAdapter.js").ICharacterAdapter | null} */
    this._adapter = null;

    // Head kinematics
    this._headTarget = new THREE.Euler(0, 0, 0);
    this._headCurrent = new THREE.Euler(0, 0, 0);
    this._speechCadenceOffset = { pitch: 0, yaw: 0 };
    this._gestureOffset = { pitch: 0, yaw: 0, roll: 0 };

    // Root spatial transform (Genuine full body 3D position & orientation)
    this._rootPositionTarget = new THREE.Vector3(0, 0, 0);
    this._rootPositionCurrent = new THREE.Vector3(0, 0, 0);
    this._rootRotationTarget = new THREE.Euler(0, 0, 0);
    this._rootRotationCurrent = new THREE.Euler(0, 0, 0);

    // Body translation & lean kinematics (Move/Lean left & right)
    this._bodyTarget = { x: 0, y: 0, roll: 0 };
    this._bodyCurrent = { x: 0, y: 0, roll: 0 };

    // Leg kinematics
    this._currentLegs = {
      leftUpperLeg:  REST_LEG_POSE.leftUpperLeg.clone(),
      leftLowerLeg:  REST_LEG_POSE.leftLowerLeg.clone(),
      rightUpperLeg: REST_LEG_POSE.rightUpperLeg.clone(),
      rightLowerLeg: REST_LEG_POSE.rightLowerLeg.clone(),
    };
    this._targetLegs = {
      leftUpperLeg:  REST_LEG_POSE.leftUpperLeg.clone(),
      leftLowerLeg:  REST_LEG_POSE.leftLowerLeg.clone(),
      rightUpperLeg: REST_LEG_POSE.rightUpperLeg.clone(),
      rightLowerLeg: REST_LEG_POSE.rightLowerLeg.clone(),
    };

    // Arm kinematics (current vs target rotations)
    this._currentArms = {
      leftUpperArm:  REST_ARM_POSE.leftUpperArm.clone(),
      leftLowerArm:  REST_ARM_POSE.leftLowerArm.clone(),
      leftHand:      REST_ARM_POSE.leftHand.clone(),
      rightUpperArm: REST_ARM_POSE.rightUpperArm.clone(),
      rightLowerArm: REST_ARM_POSE.rightLowerArm.clone(),
      rightHand:     REST_ARM_POSE.rightHand.clone(),
    };

    this._targetArms = {
      leftUpperArm:  REST_ARM_POSE.leftUpperArm.clone(),
      leftLowerArm:  REST_ARM_POSE.leftLowerArm.clone(),
      leftHand:      REST_ARM_POSE.leftHand.clone(),
      rightUpperArm: REST_ARM_POSE.rightUpperArm.clone(),
      rightLowerArm: REST_ARM_POSE.rightLowerArm.clone(),
      rightHand:     REST_ARM_POSE.rightHand.clone(),
    };

    this._speakingTime = 0;
    this._isSpeaking = false;
    this._activeGesture = null;
    this._initialized = false;
  }

  /**
   * Set the active character adapter and initialize bone tracking.
   * @param {import("./adapters/ICharacterAdapter.js").ICharacterAdapter} adapter
   */
  setAdapter(adapter) {
    this._adapter = adapter;
    this._initialized = true;
    this._resetArmsToRest();
    this._resetLegsToRest();
    this._rootPositionTarget.set(0, 0, 0);
    this._rootPositionCurrent.set(0, 0, 0);
    this._rootRotationTarget.set(0, 0, 0);
    this._rootRotationCurrent.set(0, 0, 0);
    this._bodyTarget = { x: 0, y: 0, roll: 0 };
    this._bodyCurrent = { x: 0, y: 0, roll: 0 };
    this._registerExecutors();
  }

  setVRM(vrm) {
    const active = CharacterRegistry.getActiveAdapter();
    if (active) {
      this.setAdapter(active);
    } else {
      this._initialized = true;
      this._registerExecutors();
    }
  }

  isInitialized() {
    return this._initialized;
  }

  hasActiveGesture() {
    return Boolean(this._activeGesture);
  }

  setIsSpeaking(val) {
    this._isSpeaking = Boolean(val);
  }

  // ─── Action Executors Registration ───────────────────────────────────────────

  _registerExecutors() {
    // Basic states
    ActionRegistry.registerExecutor("idle",               () => this._execIdle());
    ActionRegistry.registerExecutor("listening",          () => this._execListening());
    ActionRegistry.registerExecutor("speaking",           () => this._execSpeaking());
    ActionRegistry.registerExecutor("thinking",           () => this._execThinking());

    // Head gestures
    ActionRegistry.registerExecutor("nod",                () => this._execNod());
    ActionRegistry.registerExecutor("shake_head",         () => this._execShakeHead());
    ActionRegistry.registerExecutor("turn_left",          () => this._execTurn(-0.32));
    ActionRegistry.registerExecutor("turn_right",         () => this._execTurn(0.32));
    ActionRegistry.registerExecutor("look_left",          () => this._execTurn(-0.32));
    ActionRegistry.registerExecutor("look_right",         () => this._execTurn(0.32));
    ActionRegistry.registerExecutor("look_up",            () => this._execLookVertical(-0.24));
    ActionRegistry.registerExecutor("look_down",          () => this._execLookVertical(0.24));
    ActionRegistry.registerExecutor("look_at",            (p) => this._execLookAt(p));

    // Real skeletal arm/hand gestures
    ActionRegistry.registerExecutor("clap",               (p) => this._execClap(p));
    ActionRegistry.registerExecutor("clap_hands",         (p) => this._execClap(p));
    ActionRegistry.registerExecutor("clapping",           (p) => this._execClap(p));
    ActionRegistry.registerExecutor("wave",               (p) => this._execWaveRight(p));
    ActionRegistry.registerExecutor("wave_right",         (p) => this._execWaveRight(p));
    ActionRegistry.registerExecutor("wave_left",          (p) => this._execWaveLeft(p));
    ActionRegistry.registerExecutor("wave_both",          (p) => this._execWaveBoth(p));
    ActionRegistry.registerExecutor("both_hands_waving",  (p) => this._execWaveBoth(p));
    ActionRegistry.registerExecutor("raise_both_hands",   () => this._execRaiseBothHands());
    ActionRegistry.registerExecutor("both_hands_raised",  () => this._execRaiseBothHands());
    ActionRegistry.registerExecutor("lower_hands",        () => this._execLowerHands());
    ActionRegistry.registerExecutor("hands_lowered",      () => this._execLowerHands());
    ActionRegistry.registerExecutor("greeting",           () => this._execGreeting());
    ActionRegistry.registerExecutor("adjust_hair",        (p) => this._execHairAdjust(p));
    ActionRegistry.registerExecutor("hair_adjust",        (p) => this._execHairAdjust(p));

    // Physical translations & leans (Move left, Move right, Lean, Center)
    ActionRegistry.registerExecutor("move_left",          () => this._execMove(-0.25));
    ActionRegistry.registerExecutor("move_right",         () => this._execMove(0.25));
    ActionRegistry.registerExecutor("lean_left",          () => this._execLean(-0.08));
    ActionRegistry.registerExecutor("lean_right",         () => this._execLean(0.08));
    ActionRegistry.registerExecutor("center",             () => this._execResetAll());
    ActionRegistry.registerExecutor("return_to_center",   () => this._execResetAll());
    ActionRegistry.registerExecutor("return_to_original_position", () => this._execResetAll());
    ActionRegistry.registerExecutor("stand_straight",     () => this._execResetAll());
    ActionRegistry.registerExecutor("reset_pose",         () => this._execResetAll());

    // Full body spatial movement
    ActionRegistry.registerExecutor("move_forward",       (p) => this._execMoveSpatial({ z: -0.40, ...p }));
    ActionRegistry.registerExecutor("come_closer",        (p) => this._execMoveSpatial({ z: -0.40, ...p }));
    ActionRegistry.registerExecutor("come_forward",       (p) => this._execMoveSpatial({ z: -0.40, ...p }));
    ActionRegistry.registerExecutor("move_backward",      (p) => this._execMoveSpatial({ z: 0.70, cameraMode: "FULL_BODY", ...p }));
    ActionRegistry.registerExecutor("step_back",          (p) => this._execMoveSpatial({ z: 0.70, cameraMode: "FULL_BODY", ...p }));
    ActionRegistry.registerExecutor("move_away",          (p) => this._execMoveSpatial({ z: 0.70, cameraMode: "FULL_BODY", ...p }));
    ActionRegistry.registerExecutor("turn_body_left",     () => this._execTurnBody(-Math.PI / 4));
    ActionRegistry.registerExecutor("turn_body_right",    () => this._execTurnBody(Math.PI / 4));
    ActionRegistry.registerExecutor("turn_around",        () => this._execTurnAround());
    ActionRegistry.registerExecutor("show_back",          () => this._execTurnAround());
    ActionRegistry.registerExecutor("face_camera",        () => this._execFaceCamera());
    ActionRegistry.registerExecutor("turn_front",         () => this._execFaceCamera());
    ActionRegistry.registerExecutor("walk",               (p) => this._execWalk(p));
    ActionRegistry.registerExecutor("walk_to",            (p) => this._execWalk(p));
    ActionRegistry.registerExecutor("walk_forward",       (p) => this._execWalk(p));

    // Handshake & Hand interactions
    ActionRegistry.registerExecutor("handshake",          (p) => this._execHandshake(p));
    ActionRegistry.registerExecutor("handshake_greeting", (p) => this._execHandshake(p));
    ActionRegistry.registerExecutor("extend_hand",        (p) => this._execExtendHand(p));
    ActionRegistry.registerExecutor("reach_out",          (p) => this._execExtendHand(p));
    ActionRegistry.registerExecutor("raise_hand",         (p) => this._execRaiseHand(p));
    ActionRegistry.registerExecutor("raise_right_hand",   () => this._execRaiseHand({ hand: "right" }));
    ActionRegistry.registerExecutor("raise_left_hand",    () => this._execRaiseHand({ hand: "left" }));

    // Pointing gestures
    ActionRegistry.registerExecutor("point",              (p) => this._execPoint(p));
    ActionRegistry.registerExecutor("point_left",         (p) => this._execPoint({ direction: "left", ...p }));
    ActionRegistry.registerExecutor("point_right",        (p) => this._execPoint({ direction: "right", ...p }));
    ActionRegistry.registerExecutor("point_up",           (p) => this._execPoint({ direction: "up", ...p }));
    ActionRegistry.registerExecutor("point_down",         (p) => this._execPoint({ direction: "down", ...p }));
    ActionRegistry.registerExecutor("point_at",           (p) => this._execPoint(p));

    // Screen component inspection (Spatial UI Awareness)
    ActionRegistry.registerExecutor("inspect_screen_component", (p) => this._execInspectScreenComponent(p));
    ActionRegistry.registerExecutor("look_at_component",  (p) => this._execInspectScreenComponent(p));

    // Facial expressions & emotional states
    ActionRegistry.registerExecutor("blink",              () => this._execBlink());
    ActionRegistry.registerExecutor("smile",              (p) => this._execEmotion(EMOTIONS.HAPPY, p));
    ActionRegistry.registerExecutor("natural_smile",      (p) => this._execEmotion(EMOTIONS.HAPPY, p));
    ActionRegistry.registerExecutor("wide_smile",         (p) => this._execWideSmile(p));
    ActionRegistry.registerExecutor("laugh",              (p) => this._execLaugh(p));
    ActionRegistry.registerExecutor("show_teeth",         (p) => this._execShowTeeth(p));
    ActionRegistry.registerExecutor("teeth",              (p) => this._execShowTeeth(p));
    ActionRegistry.registerExecutor("sad",                (p) => this._execEmotion(EMOTIONS.SAD, p));
    ActionRegistry.registerExecutor("excited",            (p) => this._execEmotion(EMOTIONS.EXCITED, p));
    ActionRegistry.registerExecutor("disappointed",       (p) => this._execEmotion(EMOTIONS.DISAPPOINTED, p));
    ActionRegistry.registerExecutor("angry",              (p) => this._execEmotion(EMOTIONS.ANGRY, p));
    ActionRegistry.registerExecutor("surprised",          (p) => this._execEmotion(EMOTIONS.SURPRISED, p));
    ActionRegistry.registerExecutor("curious",            (p) => this._execEmotion(EMOTIONS.CURIOUS, p));
    ActionRegistry.registerExecutor("confused",           (p) => this._execEmotion(EMOTIONS.CONFUSED, p));
    ActionRegistry.registerExecutor("shy",                (p) => this._execEmotion(EMOTIONS.SHY, p));
    ActionRegistry.registerExecutor("playful",            (p) => this._execEmotion(EMOTIONS.PLAYFUL, p));
    ActionRegistry.registerExecutor("empathetic",         (p) => this._execEmotion(EMOTIONS.EMPATHETIC, p));
    ActionRegistry.registerExecutor("neutral",            () => this._execNeutralFace());
    ActionRegistry.registerExecutor("mouth_open",         (p) => this._execExpression("aa", p));
  }

  // ─── Public Action Execution Pipeline ────────────────────────────────────────

  async executeAction(actionId, params = {}) {
    const id = String(actionId).toLowerCase().trim();

    // Check if action can be synthesized procedurally if not registered yet
    if (!ActionRegistry.hasExecutor(id)) {
      const synthesized = this._synthesizeProceduralAction(id, params);
      if (!synthesized) {
        return {
          success: false,
          error: "action_unavailable",
          reason: `Action '${id}' is not supported by character rig and cannot be procedurally synthesized.`,
        };
      }
    }

    const adapter = this._adapter || CharacterRegistry.getActiveAdapter();
    if (!adapter) {
      return {
        success: false,
        error: "adapter_unavailable",
        reason: "No active character adapter is currently attached to the controller.",
      };
    }

    // Verify bone availability for arm/hand gestures
    if (id.includes("clap") || id.includes("wave") || id.includes("hand") || id.includes("hair")) {
      const hasRight = !!adapter.getHumanoidBone("rightUpperArm");
      const hasLeft = !!adapter.getHumanoidBone("leftUpperArm");
      if (!hasRight && !hasLeft) {
        return {
          success: false,
          error: "rig_unsupported",
          reason: "Active character rig lacks humanoid arm bones required for this gesture.",
        };
      }
    }

    // Execute through ActionRegistry and await true animation completion
    try {
      const startTime = performance.now();
      await ActionRegistry.execute(id, params);
      const elapsed = Math.round(performance.now() - startTime);

      return {
        success: true,
        action: id,
        durationMs: elapsed,
      };
    } catch (err) {
      return {
        success: false,
        error: "execution_error",
        reason: err?.message || "Animation execution encountered an error.",
      };
    }
  }

  /**
   * Procedurally synthesize and register missing gestures on demand
   * when requested by Gemini or user (e.g. shrug, bow, cover_eyes).
   */
  _synthesizeProceduralAction(id, params) {
    if (id === "shrug") {
      ActionRegistry.registerExecutor("shrug", () => this._execShrug());
      ActionRegistry.registerAction({
        id: "shrug",
        name: "Shrug",
        category: "gesture",
        duration: 2000,
        status: "ready"
      });
      return true;
    }
    if (id === "bow") {
      ActionRegistry.registerExecutor("bow", () => this._execBow());
      ActionRegistry.registerAction({
        id: "bow",
        name: "Bow",
        category: "gesture",
        duration: 2400,
        status: "ready"
      });
      return true;
    }
    return false;
  }

  setLookTarget(x, y) {
    this._headTarget.set(
      THREE.MathUtils.clamp(-y * 0.35, -0.42, 0.42),
      THREE.MathUtils.clamp(x * 0.45, -0.52, 0.52),
      0
    );
  }

  // ─── Render Update Loop ──────────────────────────────────────────────────────

  update(delta) {
    const adapter = this._adapter || CharacterRegistry.getActiveAdapter();
    if (!adapter) return;

    // 1. Advance Active Gesture
    if (this._activeGesture) {
      this._activeGesture.elapsed += delta;
      const progress = Math.min(1.0, this._activeGesture.elapsed / this._activeGesture.duration);
      this._activeGesture.tick(delta, progress);

      if (progress >= 1.0) {
        const resolve = this._activeGesture.resolve;
        this._activeGesture = null;
        resolve?.();
      }
    }

    // 2. Autonomous Idle Behavior Subsystem (Breathing, Blinks, Autonomous activities)
    IdleBehaviorManager.update(delta, {
      adapter,
      isSpeaking: this._isSpeaking,
      hasActiveAction: Boolean(this._activeGesture),
      characterController: this
    });

    // 3. Emotional Intelligence Subsystem (Compound blendshapes + posture)
    EmotionEngine.update(delta, adapter);

    // 4. Speech Cadence Layer (Nods driven by assistant voice energy)
    this._updateSpeechCadenceLayer(delta);

    // 5. Apply Head Kinematics (Combines Target + Idle + Emotion + Speech + Gestures)
    this._applyHeadTransform(adapter, delta);

    // 6. Apply Body Lean & Spatial Translation
    this._applyBodyTransform(adapter, delta);

    // 7. Apply Arm Kinematics (Lerp toward target pose)
    this._applyArmTransforms(adapter, delta);

    // 8. Apply Leg Kinematics (Walking, Strides, Rest)
    this._applyLegTransforms(adapter, delta);

    // 9. Adapter Kinematics & Spring Bones (Hair & Cloth Physics)
    adapter.update(delta);
  }

  // ─── Kinematics Layers ───────────────────────────────────────────────────────

  _updateSpeechCadenceLayer(delta) {
    const energy = VoiceSyncManager.getSpeechEnergy();
    if (energy > 0.03) {
      this._speakingTime += delta * (1.8 + energy * 2.2);
      this._speechCadenceOffset.pitch = Math.sin(this._speakingTime * 4.2) * (0.025 + energy * 0.045);
      this._speechCadenceOffset.yaw   = Math.cos(this._speakingTime * 2.4) * (0.012 + energy * 0.025);
    } else {
      this._speechCadenceOffset.pitch *= Math.max(0, 1 - delta * 6);
      this._speechCadenceOffset.yaw   *= Math.max(0, 1 - delta * 6);
    }
  }

  _applyHeadTransform(adapter, delta) {
    const headNode = adapter.getHumanoidBone("head");
    if (!headNode) return;

    const idleHead = IdleBehaviorManager.getHeadOffset();
    const emotionHead = EmotionEngine.getHeadOffset();

    const targetPitch = this._headTarget.x + idleHead.pitch + emotionHead.pitch + this._speechCadenceOffset.pitch + this._gestureOffset.pitch;
    const targetYaw   = this._headTarget.y + idleHead.yaw   + emotionHead.yaw   + this._speechCadenceOffset.yaw   + this._gestureOffset.yaw;
    const targetRoll  = this._headTarget.z + idleHead.roll  + emotionHead.roll  + this._gestureOffset.roll;

    const lerpFactor = Math.min(1.0, delta * 9.0);
    this._headCurrent.x += (targetPitch - this._headCurrent.x) * lerpFactor;
    this._headCurrent.y += (targetYaw   - this._headCurrent.y) * lerpFactor;
    this._headCurrent.z += (targetRoll  - this._headCurrent.z) * lerpFactor;

    headNode.rotation.set(this._headCurrent.x, this._headCurrent.y, this._headCurrent.z);
  }

  _applyBodyTransform(adapter, delta) {
    const lerpPos = Math.min(1.0, delta * 6.5);
    const lerpRot = Math.min(1.0, delta * 7.0);

    // Combine discrete step position targets with body target offsets
    const targetPos = new THREE.Vector3(
      this._rootPositionTarget.x + this._bodyTarget.x,
      this._rootPositionTarget.y,
      this._rootPositionTarget.z
    );

    this._rootPositionCurrent.lerp(targetPos, lerpPos);

    // Interpolate full-body orientation (e.g. turning around 180 deg)
    this._rootRotationCurrent.x += (this._rootRotationTarget.x - this._rootRotationCurrent.x) * lerpRot;
    this._rootRotationCurrent.y += (this._rootRotationTarget.y - this._rootRotationCurrent.y) * lerpRot;
    this._rootRotationCurrent.z += (this._rootRotationTarget.z - this._rootRotationCurrent.z) * lerpRot;

    // Apply root position and rotation to character scene
    if (adapter.root) {
      adapter.root.position.copy(this._rootPositionCurrent);
      adapter.root.rotation.set(
        this._rootRotationCurrent.x,
        this._rootRotationCurrent.y,
        this._rootRotationCurrent.z
      );
    }

    // Apply spine lean
    const lerpLean = Math.min(1.0, delta * 8.0);
    this._bodyCurrent.roll += (this._bodyTarget.roll - this._bodyCurrent.roll) * lerpLean;
    const spine = adapter.getHumanoidBone("spine");
    if (spine) {
      spine.rotation.z = this._bodyCurrent.roll;
    }
  }

  _applyArmTransforms(adapter, delta) {
    const lerpFactor = Math.min(1.0, delta * 8.5);
    const boneNames = [
      "leftUpperArm", "leftLowerArm", "leftHand",
      "rightUpperArm", "rightLowerArm", "rightHand"
    ];

    for (const bName of boneNames) {
      const boneNode = adapter.getHumanoidBone(bName);
      if (!boneNode) continue;

      const cur = this._currentArms[bName];
      const tgt = this._targetArms[bName];

      cur.x += (tgt.x - cur.x) * lerpFactor;
      cur.y += (tgt.y - cur.y) * lerpFactor;
      cur.z += (tgt.z - cur.z) * lerpFactor;

      boneNode.rotation.set(cur.x, cur.y, cur.z);
    }
  }

  _applyLegTransforms(adapter, delta) {
    const lerpFactor = Math.min(1.0, delta * 9.0);
    const legBones = [
      "leftUpperLeg", "leftLowerLeg", "rightUpperLeg", "rightLowerLeg"
    ];

    for (const bName of legBones) {
      const boneNode = adapter.getHumanoidBone(bName);
      if (!boneNode) continue;

      const cur = this._currentLegs[bName];
      const tgt = this._targetLegs[bName];

      cur.x += (tgt.x - cur.x) * lerpFactor;
      cur.y += (tgt.y - cur.y) * lerpFactor;
      cur.z += (tgt.z - cur.z) * lerpFactor;

      boneNode.rotation.set(cur.x, cur.y, cur.z);
    }
  }

  _resetArmsToRest() {
    for (const [k, v] of Object.entries(REST_ARM_POSE)) {
      this._targetArms[k].copy(v);
    }
  }

  _resetLegsToRest() {
    for (const [k, v] of Object.entries(REST_LEG_POSE)) {
      this._targetLegs[k].copy(v);
    }
  }

  // ─── Real Skeletal Gestures Implementation ───────────────────────────────────

  /**
   * Real Clapping Animation:
   * 1. Raises both arms naturally to chest level.
   * 2. Bends both elbows inward toward chest midline.
   * 3. Palms face each other visibly in front of chest.
   * 4. 4 distinct rhythmic clapping cycles with hand impact and recoil.
   * 5. Character smiles cheerfully.
   * 6. Separates hands and smoothly lowers arms back to resting pose.
   */
  _execClap(params = {}) {
    const duration = params.duration || 2.7;
    EmotionEngine.setEmotion(EMOTIONS.HAPPY, { intensity: 0.85, duration: 2700 });

    return new Promise((resolve) => {
      this._activeGesture = {
        name: "clap",
        elapsed: 0,
        duration,
        resolve: () => {
          this._resetArmsToRest();
          this._gestureOffset = { pitch: 0, yaw: 0, roll: 0 };
          resolve();
        },
        tick: (delta, progress) => {
          if (progress < 0.18) {
            // Phase 1: Bring both arms up in front of chest
            const lift = progress / 0.18;
            this._targetArms.leftUpperArm.set(
              REST_ARM_POSE.leftUpperArm.x + (0.30 - REST_ARM_POSE.leftUpperArm.x) * lift,
              REST_ARM_POSE.leftUpperArm.y + (0.78 - REST_ARM_POSE.leftUpperArm.y) * lift,
              REST_ARM_POSE.leftUpperArm.z + (-0.48 - REST_ARM_POSE.leftUpperArm.z) * lift
            );
            this._targetArms.leftLowerArm.set(
              REST_ARM_POSE.leftLowerArm.x + (0.10 - REST_ARM_POSE.leftLowerArm.x) * lift,
              REST_ARM_POSE.leftLowerArm.y + (1.75 - REST_ARM_POSE.leftLowerArm.y) * lift,
              REST_ARM_POSE.leftLowerArm.z + (0.15 - REST_ARM_POSE.leftLowerArm.z) * lift
            );
            this._targetArms.leftHand.set(0.10 * lift, 0.15 * lift, 0.15 * lift);

            this._targetArms.rightUpperArm.set(
              REST_ARM_POSE.rightUpperArm.x + (0.30 - REST_ARM_POSE.rightUpperArm.x) * lift,
              REST_ARM_POSE.rightUpperArm.y + (-0.78 - REST_ARM_POSE.rightUpperArm.y) * lift,
              REST_ARM_POSE.rightUpperArm.z + (0.48 - REST_ARM_POSE.rightUpperArm.z) * lift
            );
            this._targetArms.rightLowerArm.set(
              REST_ARM_POSE.rightLowerArm.x + (0.10 - REST_ARM_POSE.rightLowerArm.x) * lift,
              REST_ARM_POSE.rightLowerArm.y + (-1.75 - REST_ARM_POSE.rightLowerArm.y) * lift,
              REST_ARM_POSE.rightLowerArm.z + (-0.15 - REST_ARM_POSE.rightLowerArm.z) * lift
            );
            this._targetArms.rightHand.set(0.10 * lift, -0.15 * lift, -0.15 * lift);
          } else if (progress < 0.82) {
            // Phase 2: Active Clapping Cycles (approx 4 claps @ 3.8 Hz)
            const clapTime = (progress - 0.18) * 24.0;
            const clapWave = (Math.sin(clapTime) + 1.0) * 0.5; // 0 (strike/closed) to 1 (recoil open)

            this._targetArms.leftUpperArm.set(
              0.30 - clapWave * 0.05,
              0.78 - clapWave * 0.23,
              -0.48 + clapWave * 0.06
            );
            this._targetArms.leftLowerArm.set(
              0.10 - clapWave * 0.05,
              1.75 - clapWave * 0.30,
              0.15 - clapWave * 0.05
            );
            this._targetArms.leftHand.set(0.10, 0.15 - clapWave * 0.08, 0.15);

            this._targetArms.rightUpperArm.set(
              0.30 - clapWave * 0.05,
              -0.78 + clapWave * 0.23,
              0.48 - clapWave * 0.06
            );
            this._targetArms.rightLowerArm.set(
              0.10 - clapWave * 0.05,
              -1.75 + clapWave * 0.30,
              -0.15 + clapWave * 0.05
            );
            this._targetArms.rightHand.set(0.10, -0.15 + clapWave * 0.08, -0.15);

            // Subtle cheerful head bob on each clap strike
            this._gestureOffset.pitch = (1 - clapWave) * -0.04;
          } else {
            // Phase 3: Smooth return to resting pose
            const returnProg = (progress - 0.82) / 0.18;
            const ease = 1 - returnProg;

            this._targetArms.leftUpperArm.set(
              REST_ARM_POSE.leftUpperArm.x + (0.30 - REST_ARM_POSE.leftUpperArm.x) * ease,
              REST_ARM_POSE.leftUpperArm.y + (0.78 - REST_ARM_POSE.leftUpperArm.y) * ease,
              REST_ARM_POSE.leftUpperArm.z + (-0.48 - REST_ARM_POSE.leftUpperArm.z) * ease
            );
            this._targetArms.leftLowerArm.set(
              REST_ARM_POSE.leftLowerArm.x + (0.10 - REST_ARM_POSE.leftLowerArm.x) * ease,
              REST_ARM_POSE.leftLowerArm.y + (1.75 - REST_ARM_POSE.leftLowerArm.y) * ease,
              REST_ARM_POSE.leftLowerArm.z + (0.15 - REST_ARM_POSE.leftLowerArm.z) * ease
            );
            this._targetArms.leftHand.set(0.10 * ease, 0.15 * ease, 0.15 * ease);

            this._targetArms.rightUpperArm.set(
              REST_ARM_POSE.rightUpperArm.x + (0.30 - REST_ARM_POSE.rightUpperArm.x) * ease,
              REST_ARM_POSE.rightUpperArm.y + (-0.78 - REST_ARM_POSE.rightUpperArm.y) * ease,
              REST_ARM_POSE.rightUpperArm.z + (0.48 - REST_ARM_POSE.rightUpperArm.z) * ease
            );
            this._targetArms.rightLowerArm.set(
              REST_ARM_POSE.rightLowerArm.x + (0.10 - REST_ARM_POSE.rightLowerArm.x) * ease,
              REST_ARM_POSE.rightLowerArm.y + (-1.75 - REST_ARM_POSE.rightLowerArm.y) * ease,
              REST_ARM_POSE.rightLowerArm.z + (-0.15 - REST_ARM_POSE.rightLowerArm.z) * ease
            );
            this._targetArms.rightHand.set(0.10 * ease, -0.15 * ease, -0.15 * ease);
            this._gestureOffset.pitch = 0;
          }
        }
      };
    });
  }

  /**
   * Real Right Hand Wave.
   */
  _execWaveRight(params = {}) {
    const duration = params.duration || 2.4;
    EmotionEngine.setEmotion(EMOTIONS.HAPPY, { intensity: 0.75, duration: 2400 });

    return new Promise((resolve) => {
      this._activeGesture = {
        name: "wave_right",
        elapsed: 0,
        duration,
        resolve: () => {
          this._resetArmsToRest();
          this._gestureOffset = { pitch: 0, yaw: 0, roll: 0 };
          resolve();
        },
        tick: (delta, progress) => {
          if (progress < 0.22) {
            const lift = progress / 0.22;
            this._targetArms.rightUpperArm.set(
              REST_ARM_POSE.rightUpperArm.x + (0.15 - REST_ARM_POSE.rightUpperArm.x) * lift,
              REST_ARM_POSE.rightUpperArm.y + (-0.35 - REST_ARM_POSE.rightUpperArm.y) * lift,
              REST_ARM_POSE.rightUpperArm.z + (-0.25 - REST_ARM_POSE.rightUpperArm.z) * lift
            );
            this._targetArms.rightLowerArm.set(
              REST_ARM_POSE.rightLowerArm.x + (0.0 - REST_ARM_POSE.rightLowerArm.x) * lift,
              REST_ARM_POSE.rightLowerArm.y + (-1.55 - REST_ARM_POSE.rightLowerArm.y) * lift,
              REST_ARM_POSE.rightLowerArm.z + (-0.20 - REST_ARM_POSE.rightLowerArm.z) * lift
            );
            this._gestureOffset.roll = -0.04 * lift;
          } else if (progress < 0.80) {
            const waveTime = (progress - 0.22) * 16.0;
            const handWave = Math.sin(waveTime) * 0.35;
            const elbowMicro = Math.cos(waveTime * 0.5) * 0.08;

            this._targetArms.rightUpperArm.set(0.15, -0.35, -0.25);
            this._targetArms.rightLowerArm.set(0.0, -1.55 + handWave * 0.10, -0.20 + elbowMicro);
            this._targetArms.rightHand.set(handWave * 0.30, 0.0, handWave * 0.35);
            this._gestureOffset.roll = -0.04;
          } else {
            const returnProg = (progress - 0.80) / 0.20;
            const ease = 1 - returnProg;

            this._targetArms.rightUpperArm.set(
              REST_ARM_POSE.rightUpperArm.x + (0.15 - REST_ARM_POSE.rightUpperArm.x) * ease,
              REST_ARM_POSE.rightUpperArm.y + (-0.35 - REST_ARM_POSE.rightUpperArm.y) * ease,
              REST_ARM_POSE.rightUpperArm.z + (-0.25 - REST_ARM_POSE.rightUpperArm.z) * ease
            );
            this._targetArms.rightLowerArm.set(
              REST_ARM_POSE.rightLowerArm.x + (0.0 - REST_ARM_POSE.rightLowerArm.x) * ease,
              REST_ARM_POSE.rightLowerArm.y + (-1.55 - REST_ARM_POSE.rightLowerArm.y) * ease,
              REST_ARM_POSE.rightLowerArm.z + (-0.20 - REST_ARM_POSE.rightLowerArm.z) * ease
            );
            this._targetArms.rightHand.set(0, 0, 0);
            this._gestureOffset.roll = -0.04 * ease;
          }
        }
      };
    });
  }

  /**
   * Real Left Hand Wave (mirrored).
   */
  _execWaveLeft(params = {}) {
    const duration = params.duration || 2.4;
    EmotionEngine.setEmotion(EMOTIONS.HAPPY, { intensity: 0.75, duration: 2400 });

    return new Promise((resolve) => {
      this._activeGesture = {
        name: "wave_left",
        elapsed: 0,
        duration,
        resolve: () => {
          this._resetArmsToRest();
          this._gestureOffset = { pitch: 0, yaw: 0, roll: 0 };
          resolve();
        },
        tick: (delta, progress) => {
          if (progress < 0.22) {
            const lift = progress / 0.22;
            this._targetArms.leftUpperArm.set(
              REST_ARM_POSE.leftUpperArm.x + (0.15 - REST_ARM_POSE.leftUpperArm.x) * lift,
              REST_ARM_POSE.leftUpperArm.y + (0.35 - REST_ARM_POSE.leftUpperArm.y) * lift,
              REST_ARM_POSE.leftUpperArm.z + (0.25 - REST_ARM_POSE.leftUpperArm.z) * lift
            );
            this._targetArms.leftLowerArm.set(
              REST_ARM_POSE.leftLowerArm.x + (0.0 - REST_ARM_POSE.leftLowerArm.x) * lift,
              REST_ARM_POSE.leftLowerArm.y + (1.55 - REST_ARM_POSE.leftLowerArm.y) * lift,
              REST_ARM_POSE.leftLowerArm.z + (0.20 - REST_ARM_POSE.leftLowerArm.z) * lift
            );
            this._gestureOffset.roll = 0.04 * lift;
          } else if (progress < 0.80) {
            const waveTime = (progress - 0.22) * 16.0;
            const handWave = Math.sin(waveTime) * 0.35;
            const elbowMicro = Math.cos(waveTime * 0.5) * 0.08;

            this._targetArms.leftUpperArm.set(0.15, 0.35, 0.25);
            this._targetArms.leftLowerArm.set(0.0, 1.55 - handWave * 0.10, 0.20 + elbowMicro);
            this._targetArms.leftHand.set(-handWave * 0.30, 0.0, -handWave * 0.35);
            this._gestureOffset.roll = 0.04;
          } else {
            const returnProg = (progress - 0.80) / 0.20;
            const ease = 1 - returnProg;

            this._targetArms.leftUpperArm.set(
              REST_ARM_POSE.leftUpperArm.x + (0.15 - REST_ARM_POSE.leftUpperArm.x) * ease,
              REST_ARM_POSE.leftUpperArm.y + (0.35 - REST_ARM_POSE.leftUpperArm.y) * ease,
              REST_ARM_POSE.leftUpperArm.z + (0.25 - REST_ARM_POSE.leftUpperArm.z) * ease
            );
            this._targetArms.leftLowerArm.set(
              REST_ARM_POSE.leftLowerArm.x + (0.0 - REST_ARM_POSE.leftLowerArm.x) * ease,
              REST_ARM_POSE.leftLowerArm.y + (1.55 - REST_ARM_POSE.leftLowerArm.y) * ease,
              REST_ARM_POSE.leftLowerArm.z + (0.20 - REST_ARM_POSE.leftLowerArm.z) * ease
            );
            this._targetArms.leftHand.set(0, 0, 0);
            this._gestureOffset.roll = 0.04 * ease;
          }
        }
      };
    });
  }

  /**
   * Real Both Hands Waving (celebratory).
   */
  _execWaveBoth(params = {}) {
    const duration = params.duration || 2.6;
    EmotionEngine.setEmotion(EMOTIONS.EXCITED, { intensity: 0.90, duration: 2600 });

    return new Promise((resolve) => {
      this._activeGesture = {
        name: "wave_both",
        elapsed: 0,
        duration,
        resolve: () => {
          this._resetArmsToRest();
          this._gestureOffset = { pitch: 0, yaw: 0, roll: 0 };
          resolve();
        },
        tick: (delta, progress) => {
          if (progress < 0.20) {
            const lift = progress / 0.20;
            this._targetArms.leftUpperArm.set(
              REST_ARM_POSE.leftUpperArm.x + (0.15 - REST_ARM_POSE.leftUpperArm.x) * lift,
              REST_ARM_POSE.leftUpperArm.y + (0.35 - REST_ARM_POSE.leftUpperArm.y) * lift,
              REST_ARM_POSE.leftUpperArm.z + (0.25 - REST_ARM_POSE.leftUpperArm.z) * lift
            );
            this._targetArms.leftLowerArm.set(0.0, 1.55 * lift, 0.20 * lift);

            this._targetArms.rightUpperArm.set(
              REST_ARM_POSE.rightUpperArm.x + (0.15 - REST_ARM_POSE.rightUpperArm.x) * lift,
              REST_ARM_POSE.rightUpperArm.y + (-0.35 - REST_ARM_POSE.rightUpperArm.y) * lift,
              REST_ARM_POSE.rightUpperArm.z + (-0.25 - REST_ARM_POSE.rightUpperArm.z) * lift
            );
            this._targetArms.rightLowerArm.set(0.0, -1.55 * lift, -0.20 * lift);
          } else if (progress < 0.82) {
            const waveTime = (progress - 0.20) * 16.0;
            const waveL = Math.sin(waveTime) * 0.32;
            const waveR = Math.sin(waveTime + 0.6) * 0.32;

            this._targetArms.leftUpperArm.set(0.15, 0.35, 0.25);
            this._targetArms.leftLowerArm.set(0.0, 1.55 - waveL * 0.10, 0.20);
            this._targetArms.leftHand.set(-waveL * 0.28, 0.0, -waveL * 0.35);

            this._targetArms.rightUpperArm.set(0.15, -0.35, -0.25);
            this._targetArms.rightLowerArm.set(0.0, -1.55 + waveR * 0.10, -0.20);
            this._targetArms.rightHand.set(waveR * 0.28, 0.0, waveR * 0.35);
          } else {
            const returnProg = (progress - 0.82) / 0.18;
            const ease = 1 - returnProg;
            this._targetArms.leftUpperArm.set(
              REST_ARM_POSE.leftUpperArm.x + (0.15 - REST_ARM_POSE.leftUpperArm.x) * ease,
              REST_ARM_POSE.leftUpperArm.y + (0.35 - REST_ARM_POSE.leftUpperArm.y) * ease,
              REST_ARM_POSE.leftUpperArm.z + (0.25 - REST_ARM_POSE.leftUpperArm.z) * ease
            );
            this._targetArms.leftLowerArm.set(0.0, 1.55 * ease, 0.20 * ease);
            this._targetArms.rightUpperArm.set(
              REST_ARM_POSE.rightUpperArm.x + (0.15 - REST_ARM_POSE.rightUpperArm.x) * ease,
              REST_ARM_POSE.rightUpperArm.y + (-0.35 - REST_ARM_POSE.rightUpperArm.y) * ease,
              REST_ARM_POSE.rightUpperArm.z + (-0.25 - REST_ARM_POSE.rightUpperArm.z) * ease
            );
            this._targetArms.rightLowerArm.set(0.0, -1.55 * ease, -0.20 * ease);
            this._targetArms.leftHand.set(0, 0, 0);
            this._targetArms.rightHand.set(0, 0, 0);
          }
        }
      };
    });
  }

  /**
   * Hair Adjustment Gesture:
   * Right hand smoothly rises to the temple / side of hair, touches gently, and returns.
   */
  _execHairAdjust(params = {}) {
    const duration = params.duration || 2.5;

    return new Promise((resolve) => {
      this._activeGesture = {
        name: "adjust_hair",
        elapsed: 0,
        duration,
        resolve: () => {
          this._resetArmsToRest();
          this._gestureOffset = { pitch: 0, yaw: 0, roll: 0 };
          resolve();
        },
        tick: (delta, progress) => {
          if (progress < 0.28) {
            // Hand raises to temple beside hair
            const lift = progress / 0.28;
            this._targetArms.rightUpperArm.set(
              REST_ARM_POSE.rightUpperArm.x + (0.35 - REST_ARM_POSE.rightUpperArm.x) * lift,
              REST_ARM_POSE.rightUpperArm.y + (-0.45 - REST_ARM_POSE.rightUpperArm.y) * lift,
              REST_ARM_POSE.rightUpperArm.z + (-0.30 - REST_ARM_POSE.rightUpperArm.z) * lift
            );
            this._targetArms.rightLowerArm.set(
              REST_ARM_POSE.rightLowerArm.x + (0.10 - REST_ARM_POSE.rightLowerArm.x) * lift,
              REST_ARM_POSE.rightLowerArm.y + (-1.85 - REST_ARM_POSE.rightLowerArm.y) * lift,
              REST_ARM_POSE.rightLowerArm.z + (-0.15 - REST_ARM_POSE.rightLowerArm.z) * lift
            );
            this._targetArms.rightHand.set(0.10 * lift, -0.20 * lift, 0.15 * lift);
            this._gestureOffset.roll = -0.06 * lift; // Head tilts slightly into touch
          } else if (progress < 0.72) {
            // Gentle brush motion at hair
            const brushTime = (progress - 0.28) * 8.0;
            const brush = Math.sin(brushTime) * 0.04;
            this._targetArms.rightUpperArm.set(0.35 + brush * 0.5, -0.45, -0.30);
            this._targetArms.rightLowerArm.set(0.10, -1.85 + brush, -0.15);
            this._targetArms.rightHand.set(0.10, -0.20 + brush, 0.15);
            this._gestureOffset.roll = -0.06;
          } else {
            // Lower arm smoothly back
            const ease = 1 - (progress - 0.72) / 0.28;
            this._targetArms.rightUpperArm.set(
              REST_ARM_POSE.rightUpperArm.x + (0.35 - REST_ARM_POSE.rightUpperArm.x) * ease,
              REST_ARM_POSE.rightUpperArm.y + (-0.45 - REST_ARM_POSE.rightUpperArm.y) * ease,
              REST_ARM_POSE.rightUpperArm.z + (-0.30 - REST_ARM_POSE.rightUpperArm.z) * ease
            );
            this._targetArms.rightLowerArm.set(
              REST_ARM_POSE.rightLowerArm.x + (0.10 - REST_ARM_POSE.rightLowerArm.x) * ease,
              REST_ARM_POSE.rightLowerArm.y + (-1.85 - REST_ARM_POSE.rightLowerArm.y) * ease,
              REST_ARM_POSE.rightLowerArm.z + (-0.15 - REST_ARM_POSE.rightLowerArm.z) * ease
            );
            this._targetArms.rightHand.set(0.10 * ease, -0.20 * ease, 0.15 * ease);
            this._gestureOffset.roll = -0.06 * ease;
          }
        }
      };
    });
  }

  startHairAdjustGesture(options = {}) {
    return this._execHairAdjust(options);
  }

  /**
   * Laugh Gesture: Radiant smile, slight mouth opening, upper-body chuckle bounce.
   */
  _execLaugh(params = {}) {
    const duration = params.duration || 2.4;
    EmotionEngine.setEmotion(EMOTIONS.PLAYFUL, { intensity: 1.0, duration: 2400 });

    const adapter = this._adapter || CharacterRegistry.getActiveAdapter();
    if (adapter) {
      adapter.setExpression("show_teeth", 0.9);
    }

    return new Promise((resolve) => {
      this._activeGesture = {
        name: "laugh",
        elapsed: 0,
        duration,
        resolve: () => {
          this._gestureOffset = { pitch: 0, yaw: 0, roll: 0 };
          if (adapter) adapter.setExpression("show_teeth", 0);
          resolve();
        },
        tick: (delta, progress) => {
          // Chuckle vibration (approx 6 Hz)
          const chuckle = Math.sin(progress * 38.0) * (1 - progress) * 0.035;
          this._gestureOffset.pitch = chuckle - 0.04;
          this._gestureOffset.roll  = Math.cos(progress * 19.0) * 0.015;
        }
      };
    });
  }

  /**
   * Move Body Left or Right (Translates root position in frame).
   */
  _execMove(deltaX) {
    this._rootPositionTarget.x = THREE.MathUtils.clamp(this._rootPositionTarget.x + deltaX, -0.55, 0.55);
    return new Promise((res) => setTimeout(res, 600));
  }

  /**
   * Lean Body Left or Right (Spine roll).
   */
  _execLean(deltaRoll) {
    this._bodyTarget.roll = THREE.MathUtils.clamp(this._bodyTarget.roll + deltaRoll, -0.16, 0.16);
    return new Promise((res) => setTimeout(res, 600));
  }

  /**
   * Full Body Spatial Movement (Forward, Backward, Lateral, Closer, Away).
   * Automatically adapts camera framing between HEAD_AND_SHOULDERS and FULL_BODY.
   * Executes authentic stepping kinematics so the character never slides stiffly.
   */
  _execMoveSpatial(options = {}) {
    const dx = options.x || 0;
    const dy = options.y || 0;
    const dz = options.z || 0;
    const duration = options.duration ? (options.duration > 20 ? options.duration / 1000 : options.duration) : 1.2;

    const startX = this._rootPositionTarget.x;
    const startZ = this._rootPositionTarget.z;
    const targetX = THREE.MathUtils.clamp(startX + dx, -0.65, 0.65);
    const targetZ = THREE.MathUtils.clamp(startZ + dz, -0.55, 1.40);
    this._rootPositionTarget.y = THREE.MathUtils.clamp(this._rootPositionTarget.y + dy, -0.20, 0.20);

    // Adaptive Camera Framing: stepping backward zooms out to show complete full body
    if (targetZ > 0.35 || options.cameraMode === "FULL_BODY") {
      CameraFramingManager.setMode(FRAMING_MODES.FULL_BODY);
    } else if (targetZ <= 0.20 && !options.cameraMode) {
      CameraFramingManager.setMode(FRAMING_MODES.HEAD_AND_SHOULDERS);
    }

    return new Promise((resolve) => {
      this._activeGesture = {
        name: "step_motion",
        elapsed: 0,
        duration,
        resolve: () => {
          this._rootPositionTarget.x = targetX;
          this._rootPositionTarget.z = targetZ;
          this._resetLegsToRest();
          this._resetArmsToRest();
          this._bodyTarget.roll = 0;
          this._gestureOffset = { pitch: 0, yaw: 0, roll: 0 };
          resolve();
        },
        tick: (delta, progress) => {
          // Advance spatial position smoothly
          this._rootPositionTarget.x = startX + (targetX - startX) * progress;
          this._rootPositionTarget.z = startZ + (targetZ - startZ) * progress;

          // Stepping stride cadence (approx 2.5 paces)
          const stridePhase = progress * Math.PI * 3.5;
          const swing = Math.sin(stridePhase);

          if (Math.abs(dz) > 0.05) {
            // Forward/backward stride
            const dir = Math.sign(dz);
            this._targetLegs.leftUpperLeg.x = -swing * 0.38 * dir;
            this._targetLegs.rightUpperLeg.x = swing * 0.38 * dir;
            this._targetLegs.leftLowerLeg.x = Math.max(0, swing * 0.40 * dir);
            this._targetLegs.rightLowerLeg.x = Math.max(0, -swing * 0.40 * dir);
            this._targetArms.leftUpperArm.x = REST_ARM_POSE.leftUpperArm.x + swing * 0.25 * dir;
            this._targetArms.rightUpperArm.x = REST_ARM_POSE.rightUpperArm.x - swing * 0.25 * dir;
          } else if (Math.abs(dx) > 0.05) {
            // Lateral side-step stride
            const dir = Math.sign(dx);
            this._targetLegs.leftUpperLeg.z = -swing * 0.22 * dir;
            this._targetLegs.rightUpperLeg.z = swing * 0.22 * dir;
            this._targetLegs.leftLowerLeg.x = Math.max(0, Math.abs(swing) * 0.25);
            this._targetLegs.rightLowerLeg.x = Math.max(0, Math.abs(swing) * 0.25);
          }

          // Subtle hip balance roll
          this._bodyTarget.roll = Math.sin(stridePhase) * 0.035;
        }
      };
    });
  }

  /**
   * Full Body Turn Left or Right (Yaw rotation).
   */
  _execTurnBody(yawDelta) {
    this._rootRotationTarget.y += yawDelta;
    return new Promise((res) => setTimeout(res, 750));
  }

  /**
   * Turn Around and Show Back: Full 180 degree body turn with hair & full body visible.
   */
  _execTurnAround() {
    CameraFramingManager.setMode(FRAMING_MODES.FULL_BODY);
    this._rootRotationTarget.y = Math.PI;
    return new Promise((res) => setTimeout(res, 900));
  }

  /**
   * Face Camera: Returns body orientation back to facing the viewer directly.
   */
  _execFaceCamera() {
    this._rootRotationTarget.y = 0;
    return new Promise((res) => setTimeout(res, 750));
  }

  /**
   * Procedural Walking Simulation: Alternating leg strides, hip sway, and natural arm counter-swings.
   */
  _execWalk(params = {}) {
    const duration = params.duration || 3.0;
    const targetZ = params.z !== undefined ? params.z : (this._rootPositionTarget.z > 0.2 ? -0.4 : 0.4);
    const targetX = params.x !== undefined ? params.x : 0;

    // Ensure camera can see full body walking motion
    CameraFramingManager.setMode(FRAMING_MODES.FULL_BODY);

    const startX = this._rootPositionTarget.x;
    const startZ = this._rootPositionTarget.z;

    return new Promise((resolve) => {
      this._activeGesture = {
        name: "walk",
        elapsed: 0,
        duration,
        resolve: () => {
          this._resetLegsToRest();
          this._resetArmsToRest();
          this._bodyTarget.roll = 0;
          this._gestureOffset = { pitch: 0, yaw: 0, roll: 0 };
          resolve();
        },
        tick: (delta, progress) => {
          // Advance spatial position towards target
          this._rootPositionTarget.x = startX + (targetX - startX) * progress;
          this._rootPositionTarget.z = startZ + (targetZ - startZ) * progress;

          // Leg Stride Cycle (approx 4 complete paces)
          const stridePhase = progress * Math.PI * 4.5;
          const leftSwing = Math.sin(stridePhase);
          const rightSwing = -leftSwing;

          // Upper legs swing forward & backward
          this._targetLegs.leftUpperLeg.x = leftSwing * 0.42;
          this._targetLegs.rightUpperLeg.x = rightSwing * 0.42;

          // Lower legs bend on back-kick recoil
          this._targetLegs.leftLowerLeg.x = Math.max(0, -leftSwing * 0.45);
          this._targetLegs.rightLowerLeg.x = Math.max(0, -rightSwing * 0.45);

          // Subtle hip & spine roll sway
          this._bodyTarget.roll = Math.sin(stridePhase) * 0.04;

          // Natural arm counter-swings opposite to leg motion
          this._targetArms.leftUpperArm.x = REST_ARM_POSE.leftUpperArm.x - leftSwing * 0.35;
          this._targetArms.rightUpperArm.x = REST_ARM_POSE.rightUpperArm.x - rightSwing * 0.35;
        }
      };
    });
  }

  /**
   * Handshake Greeting Gesture:
   * 1. Extends right arm forward toward viewer with palm in authentic handshake grip.
   * 2. Friendly gentle 2-cycle clasp bob oscillation.
   * 3. Cheerful greeting smile.
   * 4. Smoothly retracts arm back to rest.
   */
  _execHandshake(params = {}) {
    const duration = params.duration || 3.0;
    EmotionEngine.setEmotion(EMOTIONS.HAPPY, { intensity: 0.85, duration: 3000 });

    return new Promise((resolve) => {
      this._activeGesture = {
        name: "handshake",
        elapsed: 0,
        duration,
        resolve: () => {
          this._resetArmsToRest();
          this._gestureOffset = { pitch: 0, yaw: 0, roll: 0 };
          resolve();
        },
        tick: (delta, progress) => {
          if (progress < 0.24) {
            // Phase 1: Extend right arm forward toward viewer
            const ease = progress / 0.24;
            this._targetArms.rightUpperArm.set(
              REST_ARM_POSE.rightUpperArm.x + (0.44 - REST_ARM_POSE.rightUpperArm.x) * ease,
              REST_ARM_POSE.rightUpperArm.y + (-0.18 - REST_ARM_POSE.rightUpperArm.y) * ease,
              REST_ARM_POSE.rightUpperArm.z + (0.18 - REST_ARM_POSE.rightUpperArm.z) * ease
            );
            this._targetArms.rightLowerArm.set(
              REST_ARM_POSE.rightLowerArm.x + (0.16 - REST_ARM_POSE.rightLowerArm.x) * ease,
              REST_ARM_POSE.rightLowerArm.y + (-0.28 - REST_ARM_POSE.rightLowerArm.y) * ease,
              REST_ARM_POSE.rightLowerArm.z + (0.10 - REST_ARM_POSE.rightLowerArm.z) * ease
            );
            this._targetArms.rightHand.set(0.12 * ease, -0.18 * ease, -0.32 * ease);
          } else if (progress < 0.76) {
            // Phase 2: Gentle 2-cycle friendly hand-clasp handshake bob
            const shakeProgress = (progress - 0.24) / 0.52;
            const bob = Math.sin(shakeProgress * Math.PI * 4.0) * 0.08;

            this._targetArms.rightUpperArm.set(0.44 + bob * 0.5, -0.18, 0.18);
            this._targetArms.rightLowerArm.set(0.16 + bob * 0.7, -0.28, 0.10);
            this._targetArms.rightHand.set(0.12 + bob * 0.9, -0.18, -0.32);

            // Subtle agreeable head nod
            this._gestureOffset.pitch = Math.sin(shakeProgress * Math.PI * 2.0) * 0.05;
          } else {
            // Phase 3: Smoothly withdraw arm back to rest
            const ease = 1.0 - (progress - 0.76) / 0.24;
            this._targetArms.rightUpperArm.set(
              REST_ARM_POSE.rightUpperArm.x + (0.44 - REST_ARM_POSE.rightUpperArm.x) * ease,
              REST_ARM_POSE.rightUpperArm.y + (-0.18 - REST_ARM_POSE.rightUpperArm.y) * ease,
              REST_ARM_POSE.rightUpperArm.z + (0.18 - REST_ARM_POSE.rightUpperArm.z) * ease
            );
            this._targetArms.rightLowerArm.set(
              REST_ARM_POSE.rightLowerArm.x + (0.16 - REST_ARM_POSE.rightLowerArm.x) * ease,
              REST_ARM_POSE.rightLowerArm.y + (-0.28 - REST_ARM_POSE.rightLowerArm.y) * ease,
              REST_ARM_POSE.rightLowerArm.z + (0.10 - REST_ARM_POSE.rightLowerArm.z) * ease
            );
            this._targetArms.rightHand.set(0.12 * ease, -0.18 * ease, -0.32 * ease);
            this._gestureOffset.pitch = 0;
          }
        }
      };
    });
  }

  /**
   * Extend Hand Toward Viewer (Open palm reaching out).
   */
  _execExtendHand(params = {}) {
    const duration = params.duration || 2.4;
    return new Promise((resolve) => {
      this._activeGesture = {
        name: "extend_hand",
        elapsed: 0,
        duration,
        resolve: () => {
          this._resetArmsToRest();
          resolve();
        },
        tick: (delta, progress) => {
          const ease = progress < 0.25 ? progress / 0.25 : progress > 0.75 ? (1 - progress) / 0.25 : 1.0;
          this._targetArms.rightUpperArm.set(
            REST_ARM_POSE.rightUpperArm.x + (0.48 - REST_ARM_POSE.rightUpperArm.x) * ease,
            REST_ARM_POSE.rightUpperArm.y + (-0.12 - REST_ARM_POSE.rightUpperArm.y) * ease,
            REST_ARM_POSE.rightUpperArm.z + (0.15 - REST_ARM_POSE.rightUpperArm.z) * ease
          );
          this._targetArms.rightLowerArm.set(
            REST_ARM_POSE.rightLowerArm.x + (0.12 - REST_ARM_POSE.rightLowerArm.x) * ease,
            REST_ARM_POSE.rightLowerArm.y + (-0.20 - REST_ARM_POSE.rightLowerArm.y) * ease,
            REST_ARM_POSE.rightLowerArm.z + (0.05 - REST_ARM_POSE.rightLowerArm.z) * ease
          );
          this._targetArms.rightHand.set(0.10 * ease, -0.10 * ease, -0.15 * ease);
        }
      };
    });
  }

  /**
   * Pointing Gesture: Points arm and gazes towards a target direction or screen coordinate.
   */
  _execPoint(params = {}) {
    const duration = params.duration ? (params.duration > 20 ? params.duration / 1000 : params.duration) : 2.8;
    const isLeft = params.direction === "left" || (typeof params.x === "number" && params.x < -0.15);
    const pitch = typeof params.y === "number" ? -params.y * 0.25 : (params.direction === "up" ? -0.22 : params.direction === "down" ? 0.22 : 0);

    return new Promise((resolve) => {
      this._activeGesture = {
        name: "point",
        elapsed: 0,
        duration,
        resolve: () => {
          this._resetArmsToRest();
          this._headTarget.set(0, 0, 0);
          resolve();
        },
        tick: (delta, progress) => {
          const ease = progress < 0.22 ? progress / 0.22 : progress > 0.78 ? (1 - progress) / 0.22 : 1.0;

          if (isLeft) {
            // Point left arm outward & turn head left
            this._targetArms.leftUpperArm.set(
              REST_ARM_POSE.leftUpperArm.x + (0.35 + pitch * 0.5 - REST_ARM_POSE.leftUpperArm.x) * ease,
              REST_ARM_POSE.leftUpperArm.y + (0.45 - REST_ARM_POSE.leftUpperArm.y) * ease,
              REST_ARM_POSE.leftUpperArm.z + (-0.78 - REST_ARM_POSE.leftUpperArm.z) * ease
            );
            this._targetArms.leftLowerArm.set(
              REST_ARM_POSE.leftLowerArm.x + (0.08 - REST_ARM_POSE.leftLowerArm.x) * ease,
              REST_ARM_POSE.leftLowerArm.y + (0.60 - REST_ARM_POSE.leftLowerArm.y) * ease,
              REST_ARM_POSE.leftLowerArm.z + (0.12 - REST_ARM_POSE.leftLowerArm.z) * ease
            );
            this._targetArms.leftHand.set(0.05 * ease, 0.20 * ease, 0.15 * ease);
            this._headTarget.y = -0.38 * ease;
            this._headTarget.x = pitch * ease;
          } else {
            // Point right arm outward & turn head right
            this._targetArms.rightUpperArm.set(
              REST_ARM_POSE.rightUpperArm.x + (0.35 + pitch * 0.5 - REST_ARM_POSE.rightUpperArm.x) * ease,
              REST_ARM_POSE.rightUpperArm.y + (-0.45 - REST_ARM_POSE.rightUpperArm.y) * ease,
              REST_ARM_POSE.rightUpperArm.z + (0.78 - REST_ARM_POSE.rightUpperArm.z) * ease
            );
            this._targetArms.rightLowerArm.set(
              REST_ARM_POSE.rightLowerArm.x + (0.08 - REST_ARM_POSE.rightLowerArm.x) * ease,
              REST_ARM_POSE.rightLowerArm.y + (-0.60 - REST_ARM_POSE.rightLowerArm.y) * ease,
              REST_ARM_POSE.rightLowerArm.z + (-0.12 - REST_ARM_POSE.rightLowerArm.z) * ease
            );
            this._targetArms.rightHand.set(0.05 * ease, -0.20 * ease, -0.15 * ease);
            this._headTarget.y = 0.38 * ease;
            this._headTarget.x = pitch * ease;
          }
        }
      };
    });
  }

  /**
   * Raise Single Hand (Left or Right).
   */
  _execRaiseHand(options = {}) {
    const isLeft = options.hand === "left";
    const duration = options.duration || 1800;

    return new Promise((resolve) => {
      this._activeGesture = {
        name: "raise_hand",
        elapsed: 0,
        duration,
        resolve: () => {
          this._resetArmsToRest();
          resolve();
        },
        tick: (delta, progress) => {
          const ease = progress < 0.25 ? progress / 0.25 : progress > 0.75 ? (1 - progress) / 0.25 : 1.0;
          if (isLeft) {
            this._targetArms.leftUpperArm.set(
              REST_ARM_POSE.leftUpperArm.x + (0.20 - REST_ARM_POSE.leftUpperArm.x) * ease,
              REST_ARM_POSE.leftUpperArm.y + (0.35 - REST_ARM_POSE.leftUpperArm.y) * ease,
              REST_ARM_POSE.leftUpperArm.z + (0.25 - REST_ARM_POSE.leftUpperArm.z) * ease
            );
            this._targetArms.leftLowerArm.set(0.0, 1.55 * ease, 0.20 * ease);
          } else {
            this._targetArms.rightUpperArm.set(
              REST_ARM_POSE.rightUpperArm.x + (0.20 - REST_ARM_POSE.rightUpperArm.x) * ease,
              REST_ARM_POSE.rightUpperArm.y + (-0.35 - REST_ARM_POSE.rightUpperArm.y) * ease,
              REST_ARM_POSE.rightUpperArm.z + (-0.25 - REST_ARM_POSE.rightUpperArm.z) * ease
            );
            this._targetArms.rightLowerArm.set(0.0, -1.55 * ease, -0.20 * ease);
          }
        }
      };
    });
  }

  /**
   * Complete Pose & Transform Restoration (Return to Center, Face Camera, Reset Resting Pose).
   * Restores root position (0,0,0), root rotation (0,0,0), legs, arms, head, expressions, and camera.
   */
  _execResetAll() {
    this._rootPositionTarget.set(0, 0, 0);
    this._rootRotationTarget.set(0, 0, 0);
    this._bodyTarget = { x: 0, y: 0, roll: 0 };
    this._headTarget.set(0, 0, 0);
    this._gestureOffset = { pitch: 0, yaw: 0, roll: 0 };
    this._resetArmsToRest();
    this._resetLegsToRest();

    CameraFramingManager.setMode(FRAMING_MODES.HEAD_AND_SHOULDERS);
    EmotionEngine.resetToNeutral();

    const adapter = this._adapter || CharacterRegistry.getActiveAdapter();
    if (adapter) {
      adapter.resetExpressions();
    }

    return new Promise((res) => setTimeout(res, 750));
  }

  /**
   * Spatial Screen Component Inspection: Gaze and Point at on-screen component.
   */
  async _execInspectScreenComponent(params = {}) {
    const targetQuery = params.target || params.component || params.query || "this component";
    return ScreenTargetManager.inspectAndExplain(targetQuery, params);
  }

  /**
   * Public look-and-point method for screen awareness.
   */
  async lookAndPointAt(normX, normY, options = {}) {
    this.setLookTarget(normX, normY);
    const d = options.duration ? (options.duration > 20 ? options.duration / 1000 : options.duration) : 2.8;
    if (options.point !== false) {
      await this._execPoint({ x: normX, y: normY, duration: d });
    } else {
      await new Promise((res) => setTimeout(res, d * 1000));
      this.setLookTarget(0, 0);
    }
  }

  _execRaiseBothHands() {
    this._targetArms.leftUpperArm.set(0.15, 0.35, 0.25);
    this._targetArms.leftLowerArm.set(0.0, 1.55, 0.20);
    this._targetArms.rightUpperArm.set(0.15, -0.35, -0.25);
    this._targetArms.rightLowerArm.set(0.0, -1.55, -0.20);
    return new Promise((res) => setTimeout(res, 800));
  }

  _execLowerHands() {
    this._resetArmsToRest();
    return new Promise((res) => setTimeout(res, 800));
  }

  _execGreeting() {
    CharacterStateManager.transition(CHARACTER_STATES.GREETING);
    return Promise.all([
      this._execWaveRight({ duration: 2.5 }),
      this._execNod(),
      EmotionEngine.setEmotion(EMOTIONS.HAPPY, { intensity: 0.85, duration: 2500 })
    ]).then(() => {
      CharacterStateManager.transition(CHARACTER_STATES.IDLE);
    });
  }

  _execNod() {
    return new Promise((res) => {
      let t = 0;
      const interval = setInterval(() => {
        t += 0.14;
        this._gestureOffset.pitch = Math.sin(t * 3.6) * 0.18;
        if (t >= Math.PI * 2) {
          clearInterval(interval);
          this._gestureOffset.pitch = 0;
          res();
        }
      }, 30);
    });
  }

  _execShakeHead() {
    return new Promise((res) => {
      let t = 0;
      const interval = setInterval(() => {
        t += 0.12;
        this._gestureOffset.yaw = Math.sin(t * 3.8) * 0.22;
        if (t >= Math.PI * 2.5) {
          clearInterval(interval);
          this._gestureOffset.yaw = 0;
          res();
        }
      }, 30);
    });
  }

  _execTurn(yawDelta) {
    this._headTarget.y = THREE.MathUtils.clamp(this._headTarget.y + yawDelta, -0.5, 0.5);
    return new Promise((res) => setTimeout(res, 600));
  }

  _execLookVertical(pitchDelta) {
    this._headTarget.x = THREE.MathUtils.clamp(this._headTarget.x + pitchDelta, -0.4, 0.4);
    return new Promise((res) => setTimeout(res, 600));
  }

  _execLookAt(params = {}) {
    const x = typeof params.x === "number" ? params.x : 0;
    const y = typeof params.y === "number" ? params.y : 0;
    this.setLookTarget(x, y);
    return Promise.resolve();
  }

  _execThinking() {
    CharacterStateManager.transition(CHARACTER_STATES.THINKING);
    EmotionEngine.setEmotion(EMOTIONS.THINKING, { intensity: 0.85, duration: 2500 });

    this._targetArms.rightUpperArm.set(0.25, -0.50, 0.15);
    this._targetArms.rightLowerArm.set(0.10, -1.65, -0.10);
    this._gestureOffset.pitch = -0.05;
    this._gestureOffset.roll = -0.05;

    return new Promise((res) => {
      setTimeout(() => {
        this._resetArmsToRest();
        this._gestureOffset.pitch = 0;
        this._gestureOffset.roll = 0;
        res();
      }, 2500);
    });
  }

  _execShrug() {
    this._targetArms.leftUpperArm.set(0.10, 0.20, -0.90);
    this._targetArms.leftLowerArm.set(0.0, 0.80, 0.10);
    this._targetArms.rightUpperArm.set(0.10, -0.20, 0.90);
    this._targetArms.rightLowerArm.set(0.0, -0.80, -0.10);
    this._gestureOffset.pitch = -0.04;
    EmotionEngine.setEmotion(EMOTIONS.CONFUSED, { intensity: 0.65, duration: 2000 });

    return new Promise((res) => {
      setTimeout(() => {
        this._resetArmsToRest();
        this._gestureOffset.pitch = 0;
        res();
      }, 2000);
    });
  }

  _execBow() {
    this._gestureOffset.pitch = 0.28;
    return new Promise((res) => {
      setTimeout(() => {
        this._gestureOffset.pitch = 0;
        res();
      }, 2200);
    });
  }

  _execListening() {
    CharacterStateManager.transition(CHARACTER_STATES.LISTENING);
    this._resetArmsToRest();
    this._headTarget.set(0, 0, 0);
    return Promise.resolve();
  }

  _execSpeaking() {
    CharacterStateManager.transition(CHARACTER_STATES.SPEAKING);
    return Promise.resolve();
  }

  _execIdle() {
    CharacterStateManager.transition(CHARACTER_STATES.IDLE);
    this._resetArmsToRest();
    this._headTarget.set(0, 0, 0);
    this._gestureOffset = { pitch: 0, yaw: 0, roll: 0 };
    return Promise.resolve();
  }

  // ─── Expressions & Emotions ──────────────────────────────────────────────────

  _execBlink() {
    const adapter = this._adapter || CharacterRegistry.getActiveAdapter();
    if (!adapter) return Promise.resolve();
    adapter.setExpression("blink", 1.0);
    return new Promise((res) => {
      setTimeout(() => {
        adapter.setExpression("blink", 0);
        res();
      }, 140);
    });
  }

  _execEmotion(name, params = {}) {
    EmotionEngine.setEmotion(name, {
      intensity: params.intensity,
      duration: params.duration || 2400,
      reason: params.reason,
    });
    return new Promise((res) => setTimeout(res, params.duration || 2400));
  }

  _execWideSmile(params = {}) {
    return this._execEmotion(EMOTIONS.EXCITED, { intensity: 1.0, duration: params.duration || 2400 });
  }

  _execShowTeeth(params = {}) {
    const adapter = this._adapter || CharacterRegistry.getActiveAdapter();
    if (!adapter) return Promise.resolve();
    const duration = params.duration ?? 2400;

    adapter.setExpression("show_teeth", 1.0);
    return new Promise((res) => {
      setTimeout(() => {
        adapter.setExpression("show_teeth", 0);
        adapter.setExpression("happy", 0);
        adapter.setExpression("ee", 0);
        res();
      }, duration);
    });
  }

  _execExpression(name, params = {}) {
    const adapter = this._adapter || CharacterRegistry.getActiveAdapter();
    if (!adapter) return Promise.resolve();
    const intensity = params.intensity ?? 0.8;
    const duration = params.duration ?? 2000;

    adapter.setExpression(name, intensity);
    return new Promise((res) => {
      setTimeout(() => {
        adapter.setExpression(name, 0);
        res();
      }, duration);
    });
  }

  _execNeutralFace() {
    EmotionEngine.resetToNeutral();
    const adapter = this._adapter || CharacterRegistry.getActiveAdapter();
    if (adapter) adapter.resetExpressions();
    return Promise.resolve();
  }

  dispose() {
    this._activeGesture = null;
    this._resetArmsToRest();
    EmotionEngine.dispose();
    IdleBehaviorManager.dispose();
  }
}

const CharacterController = new CharacterControllerClass();
export default CharacterController;
