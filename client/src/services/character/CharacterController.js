import * as THREE from "three";
import ActionRegistry from "./ActionRegistry.js";
import CharacterStateManager, { CHARACTER_STATES } from "./CharacterStateManager.js";
import CharacterRegistry from "./CharacterRegistry.js";
import VoiceSyncManager from "./VoiceSyncManager.js";
import EmotionEngine, { EMOTIONS } from "./EmotionEngine.js";
import IdleBehaviorManager from "./IdleBehaviorManager.js";
import CameraFramingManager, { FRAMING_MODES } from "./CameraFramingManager.js";
import ScreenTargetManager from "./ScreenTargetManager.js";
import FrameAwareCharacterController from "./FrameAwareCharacterController.js";
import CharacterActionLearner from "./CharacterActionLearner.js";
import BoneControlSystem from "./BoneControlSystem.js";
import { REST_ARM_POSE, REST_LEG_POSE } from "./CharacterPoseConstants.js";
import * as UpperGestures from "./CharacterGesturesUpper.js";
import * as SpatialGestures from "./CharacterGesturesSpatial.js";
import AnimationManager from "./AnimationManager.js";

export { REST_ARM_POSE, REST_LEG_POSE };

class CharacterControllerClass {
  constructor() {
    this._adapter = null;
    this._headTarget = new THREE.Euler(0, 0, 0);
    this._headCurrent = new THREE.Euler(0, 0, 0);
    this._speechCadenceOffset = { pitch: 0, yaw: 0 };
    this._gestureOffset = { pitch: 0, yaw: 0, roll: 0 };
    this._rootPositionTarget = new THREE.Vector3(0, 0, 0);
    this._rootPositionCurrent = new THREE.Vector3(0, 0, 0);
    this._rootRotationTarget = new THREE.Euler(0, 0, 0);
    this._rootRotationCurrent = new THREE.Euler(0, 0, 0);
    this._bodyTarget = { x: 0, y: 0, roll: 0 };
    this._bodyCurrent = { x: 0, y: 0, roll: 0 };
    const cloneMap = (src) => Object.fromEntries(Object.entries(src).map(([k, v]) => [k, v.clone()]));
    this._currentLegs = cloneMap(REST_LEG_POSE);
    this._targetLegs = cloneMap(REST_LEG_POSE);
    this._currentArms = cloneMap(REST_ARM_POSE);
    this._targetArms = cloneMap(REST_ARM_POSE);
    this._speakingTime = 0;
    this._isSpeaking = false;
    this._activeGestureVal = null;
    this._fallbackTicker = null;
    this._lastUpdateAt = 0;
    this._initialized = false;
  }

  get _activeGesture() {
    return this._activeGestureVal;
  }

  set _activeGesture(val) {
    this._activeGestureVal = val;
    if (val && !this._fallbackTicker) {
      this._fallbackTicker = setInterval(() => {
        if (!this._activeGestureVal) {
          clearInterval(this._fallbackTicker);
          this._fallbackTicker = null;
          return;
        }
        if (performance.now() - this._lastUpdateAt > 34) {
          this.update(0.08);
        }
      }, 40);
    } else if (!val && this._fallbackTicker) {
      clearInterval(this._fallbackTicker);
      this._fallbackTicker = null;
    }
  }

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
    CharacterActionLearner.initialize(this);
  }

  setVRM() {
    const active = CharacterRegistry.getActiveAdapter();
    if (active) {
      this.setAdapter(active);
    } else {
      this._initialized = true;
      this._registerExecutors();
      CharacterActionLearner.initialize(this);
    }
  }

  isInitialized() { return this._initialized; }
  hasActiveGesture() { return Boolean(this._activeGesture); }
  setIsSpeaking(val) { this._isSpeaking = Boolean(val); }

  _registerExecutors() {
    const reg = (keys, fn) => { for (const k of keys) ActionRegistry.registerExecutor(k, fn); };
    reg(["idle"], () => this._execIdle());
    reg(["listening"], () => this._execListening());
    reg(["speaking"], () => this._execSpeaking());
    reg(["thinking"], () => this._execThinking());
    reg(["nod"], (p) => UpperGestures.execNod(this, p));
    reg(["shake_head"], (p) => UpperGestures.execShakeHead(this, p));
    reg(["turn_left", "look_left"], () => this._execTurn(-0.32));
    reg(["turn_right", "look_right"], () => this._execTurn(0.32));
    reg(["look_up"], () => this._execLookVertical(-0.24));
    reg(["look_down"], () => this._execLookVertical(0.24));
    reg(["look_at"], (p) => this._execLookAt(p));
    reg(["look_around", "look_everywhere"], (p) => SpatialGestures.execLookAround(this, p));
    reg(["clap", "clap_hands", "clapping"], (p) => UpperGestures.execClap(this, p));
    reg(["wave", "wave_right"], (p) => UpperGestures.execWaveRight(this, p));
    reg(["wave_left"], (p) => UpperGestures.execWaveLeft(this, p));
    reg(["wave_both", "both_hands_waving"], (p) => UpperGestures.execWaveBoth(this, p));
    reg(["raise_both_hands", "both_hands_raised"], () => this._execRaiseBothHands());
    reg(["lower_hands", "hands_lowered"], () => this._execLowerHands());
    reg(["greeting"], () => UpperGestures.execGreeting(this));
    reg(["adjust_hair", "hair_adjust"], (p) => UpperGestures.execHairAdjust(this, p));
    reg(["move_left"], () => SpatialGestures.execMove(this, -0.25));
    reg(["move_right"], () => SpatialGestures.execMove(this, 0.25));
    reg(["lean_left"], () => SpatialGestures.execLean(this, -0.08));
    reg(["lean_right"], () => SpatialGestures.execLean(this, 0.08));
    reg(["center", "return_to_center", "return_to_original_position", "stand_straight", "reset_pose"], () => SpatialGestures.execResetAll(this));
    reg(["move_forward", "come_closer", "come_forward"], (p) => SpatialGestures.execMoveSpatial(this, { z: 0.22, ...p }));
    reg(["move_backward", "step_back", "move_away"], (p) => SpatialGestures.execMoveSpatial(this, { z: -0.35, cameraMode: "FULL_BODY", ...p }));
    reg(["turn_body_left"], () => this._execTurnBody(-Math.PI / 4));
    reg(["turn_body_right"], () => this._execTurnBody(Math.PI / 4));
    reg(["turn_around", "show_back"], () => this._execTurnAround());
    reg(["face_camera", "turn_front"], () => this._execFaceCamera());
    reg(["walk", "walk_to", "walk_forward"], (p) => SpatialGestures.execWalk(this, p));
    reg(["walk_slow"], (p) => FrameAwareCharacterController.walkAlongBottom(p?.direction || "patrol", { ...p, speed: "slow" }));
    reg(["walk_quick", "run"], (p) => FrameAwareCharacterController.walkAlongBottom(p?.direction || "patrol", { ...p, speed: "quick" }));
    reg(["walk_bottom", "roam_bottom"], (p) => FrameAwareCharacterController.walkAlongBottom(p?.direction || "patrol", p));
    reg(["walk_left"], (p) => FrameAwareCharacterController.walkAlongBottom("left", p));
    reg(["walk_right"], (p) => FrameAwareCharacterController.walkAlongBottom("right", p));
    reg(["walk_center"], (p) => FrameAwareCharacterController.walkAlongBottom("center", p));
    reg(["jump", "hop", "leap"], (p) => FrameAwareCharacterController.jumpOrPerform(p));
    reg(["climb", "climb_onto", "jump_onto"], (p) => FrameAwareCharacterController.climbOntoTarget(p?.target || p?.component || p?.query, p));
    reg(["sit", "sit_down"], (p) => SpatialGestures.execSit(this, p));
    reg(["exit_frame", "exit_frame_and_navigate", "come_outside", "step_out", "bahar_aao"], (p) => FrameAwareCharacterController.exitFrameAndNavigate(p));
    reg(["return_to_frame", "go_back", "enter_frame", "wapas_jao", "andar_jao"], () => FrameAwareCharacterController.returnToFrame());
    reg(["handshake", "handshake_greeting"], (p) => UpperGestures.execHandshake(this, p));
    reg(["extend_hand", "reach_out"], (p) => UpperGestures.execExtendHand(this, p));
    reg(["raise_hand"], (p) => UpperGestures.execRaiseHand(this, p));
    reg(["raise_right_hand"], () => UpperGestures.execRaiseHand(this, { hand: "right" }));
    reg(["raise_left_hand"], () => UpperGestures.execRaiseHand(this, { hand: "left" }));
    reg(["point", "point_at"], (p) => UpperGestures.execPoint(this, p));
    reg(["point_left"], (p) => UpperGestures.execPoint(this, { direction: "left", ...p }));
    reg(["point_right"], (p) => UpperGestures.execPoint(this, { direction: "right", ...p }));
    reg(["point_up"], (p) => UpperGestures.execPoint(this, { direction: "up", ...p }));
    reg(["point_down"], (p) => UpperGestures.execPoint(this, { direction: "down", ...p }));
    reg(["inspect_screen_component", "look_at_component"], (p) => this._execInspectScreenComponent(p));
    reg(["click_component"], (p) => FrameAwareCharacterController.clickComponent(p?.target || p?.component || p?.query));
    reg(["highlight_component"], async (p) => {
      const t = ScreenTargetManager.resolveTarget(p?.target || p?.component || p?.query);
      if (t?.element) FrameAwareCharacterController.highlightElement(t.element, p?.duration || 4000);
      if (!t?.ambiguous) {
        await this.lookAndPointAt(t.normX || 0, t.normY || 0, { duration: 1.8, point: true });
      }
      return { success: Boolean(t?.element), target: t?.label };
    });
    reg(["blink"], () => this._execBlink());
    reg(["smile", "natural_smile"], (p) => this._execEmotion(EMOTIONS.HAPPY, p));
    reg(["wide_smile"], (p) => this._execWideSmile(p));
    reg(["laugh"], (p) => UpperGestures.execLaugh(this, p));
    reg(["show_teeth", "teeth"], (p) => this._execShowTeeth(p));
    reg(["sad"], (p) => this._execEmotion(EMOTIONS.SAD, p));
    reg(["excited"], (p) => this._execEmotion(EMOTIONS.EXCITED, p));
    reg(["disappointed"], (p) => this._execEmotion(EMOTIONS.DISAPPOINTED, p));
    reg(["angry"], (p) => this._execEmotion(EMOTIONS.ANGRY, p));
    reg(["surprised"], (p) => this._execEmotion(EMOTIONS.SURPRISED, p));
    reg(["curious"], (p) => this._execEmotion(EMOTIONS.CURIOUS, p));
    reg(["confused"], (p) => this._execEmotion(EMOTIONS.CONFUSED, p));
    reg(["shy"], (p) => this._execEmotion(EMOTIONS.SHY, p));
    reg(["playful"], (p) => this._execEmotion(EMOTIONS.PLAYFUL, p));
    reg(["empathetic"], (p) => this._execEmotion(EMOTIONS.EMPATHETIC, p));
    reg(["neutral"], () => this._execNeutralFace());
    reg(["mouth_open"], (p) => this._execExpression("aa", p));
    reg(["shrug"], () => this._execShrug());
    reg(["bow"], () => this._execBow());

    for (const [id, name, category, duration] of [
      ["shrug", "Shrug", "gesture", 2000], ["bow", "Bow", "gesture", 2200],
      ["look_around", "Look Around", "movement", 2600], ["look_everywhere", "Look Everywhere", "movement", 2600],
      ["walk_bottom", "Walk Bottom", "movement", 3000], ["roam_bottom", "Roam Bottom", "movement", 3200],
      ["walk_left", "Walk Left", "movement", 2200], ["walk_right", "Walk Right", "movement", 2200],
      ["walk_center", "Walk Center", "movement", 2200], ["walk_slow", "Walk Slow", "movement", 2800],
      ["walk_quick", "Walk Quick", "movement", 2000], ["jump", "Jump", "movement", 1500],
      ["climb", "Climb", "movement", 2200], ["climb_onto", "Climb Onto", "movement", 2400],
      ["jump_onto", "Jump Onto", "movement", 2200], ["sit", "Sit", "movement", 3000],
      ["come_outside", "Come Outside", "movement", 3200], ["step_out", "Step Out", "movement", 3200],
      ["bahar_aao", "Bahar Aao", "movement", 3200], ["go_back", "Go Back", "movement", 3000],
      ["enter_frame", "Enter Frame", "movement", 3000], ["wapas_jao", "Wapas Jao", "movement", 3000],
      ["andar_jao", "Andar Jao", "movement", 3000],
    ]) {
      ActionRegistry.register({ id, name, category, duration, animation: "procedural", enabled: true }, { forceUpdate: true });
    }
  }

  async executeAction(actionId, params = {}) {
    const id = String(actionId || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
    const adapter = this._adapter || CharacterRegistry.getActiveAdapter();
    if (!adapter) {
      return { success: false, error: "adapter_unavailable", reason: "No active character adapter is currently attached to the controller." };
    }

    if (!ActionRegistry.hasExecutor(id)) {
      const learned = await CharacterActionLearner.learnAndExecute(this, id, params);
      if (learned?.success) {
        return { success: true, action: learned.actionId, learned: learned.learned, durationMs: Math.round((params.duration || 2.2) * 1000) };
      }
      return { success: false, error: "action_unavailable", reason: `Action '${id}' is not supported by character rig and cannot be procedurally synthesized.` };
    }

    if (id.includes("clap") || id.includes("wave") || id.includes("hand") || id.includes("hair")) {
      const hasRight = Boolean(adapter.getHumanoidBone("rightUpperArm"));
      const hasLeft = Boolean(adapter.getHumanoidBone("leftUpperArm"));
      if (!hasRight && !hasLeft) {
        return { success: false, error: "rig_unsupported", reason: "Active character rig lacks humanoid arm bones required for this gesture." };
      }
    }

    try {
      const startTime = performance.now();
      const execRes = await ActionRegistry.execute(id, params);
      if (execRes && execRes.success === false) {
        return { success: false, error: execRes.error || "execution_error", reason: execRes.error || "Animation execution failed." };
      }
      return { success: true, action: id, durationMs: Math.round(performance.now() - startTime) };
    } catch (err) {
      return { success: false, error: "execution_error", reason: err?.message || "Animation execution encountered an error." };
    }
  }

  setLookTarget(x, y) {
    this._headTarget.set(
      THREE.MathUtils.clamp(-y * 0.35, -0.42, 0.42),
      THREE.MathUtils.clamp(x * 0.45, -0.52, 0.52),
      0
    );
  }

  update(delta) {
    this._lastUpdateAt = performance.now();
    const adapter = this._adapter || CharacterRegistry.getActiveAdapter();
    if (!adapter) return;

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

    const clipActive = AnimationManager.hasActiveClip();
    IdleBehaviorManager.update(delta, {
      adapter,
      isSpeaking: this._isSpeaking,
      hasActiveAction: Boolean(this._activeGesture) || clipActive,
      characterController: this,
    });

    EmotionEngine.update(delta, adapter);
    this._updateSpeechCadenceLayer(delta);
    if (!clipActive) this._applyHeadTransform(adapter, delta);
    this._applyBodyTransform(adapter, delta, clipActive);
    if (!clipActive) {
      this._applyArmTransforms(adapter, delta);
      this._applyLegTransforms(adapter, delta);
      BoneControlSystem.enforceForwardHandSafety(adapter, this._activeGesture?.name?.toUpperCase() || "");
    }
    AnimationManager.update(delta);
    adapter.update(delta);
  }

  _updateSpeechCadenceLayer(delta) {
    const energy = VoiceSyncManager.getSpeechEnergy();
    if (energy > 0.03) {
      this._speakingTime += delta * (1.8 + energy * 2.2);
      this._speechCadenceOffset.pitch = Math.sin(this._speakingTime * 4.2) * (0.025 + energy * 0.045);
      this._speechCadenceOffset.yaw = Math.cos(this._speakingTime * 2.4) * (0.012 + energy * 0.025);
    } else {
      this._speechCadenceOffset.pitch *= Math.max(0, 1 - delta * 6);
      this._speechCadenceOffset.yaw *= Math.max(0, 1 - delta * 6);
    }
  }

  _applyHeadTransform(adapter, delta) {
    const headNode = adapter.getHumanoidBone("head");
    if (!headNode) return;
    const idleHead = IdleBehaviorManager.getHeadOffset();
    const emotionHead = EmotionEngine.getHeadOffset();

    const targetPitch = this._headTarget.x + idleHead.pitch + emotionHead.pitch + this._speechCadenceOffset.pitch + this._gestureOffset.pitch;
    const targetYaw = this._headTarget.y + idleHead.yaw + emotionHead.yaw + this._speechCadenceOffset.yaw + this._gestureOffset.yaw;
    const targetRoll = this._headTarget.z + idleHead.roll + emotionHead.roll + this._gestureOffset.roll;

    const lerpFactor = Math.min(1.0, delta * 9.0);
    this._headCurrent.x += (targetPitch - this._headCurrent.x) * lerpFactor;
    this._headCurrent.y += (targetYaw - this._headCurrent.y) * lerpFactor;
    this._headCurrent.z += (targetRoll - this._headCurrent.z) * lerpFactor;
    const neckNode = adapter.getHumanoidBone("neck");
    if (neckNode) {
      neckNode.rotation.set(this._headCurrent.x * 0.3, this._headCurrent.y * 0.3, this._headCurrent.z * 0.3);
      headNode.rotation.set(this._headCurrent.x * 0.7, this._headCurrent.y * 0.7, this._headCurrent.z * 0.7);
    } else {
      headNode.rotation.set(this._headCurrent.x, this._headCurrent.y, this._headCurrent.z);
    }
    const leftEye = adapter.getHumanoidBone("leftEye");
    const rightEye = adapter.getHumanoidBone("rightEye");
    const eyePitch = THREE.MathUtils.clamp(this._headCurrent.x * 0.35, -0.18, 0.18);
    const eyeYaw = THREE.MathUtils.clamp(this._headCurrent.y * 0.35, -0.22, 0.22);
    if (leftEye) leftEye.rotation.set(eyePitch, eyeYaw, 0);
    if (rightEye) rightEye.rotation.set(eyePitch, eyeYaw, 0);
  }

  _applyBodyTransform(adapter, delta, skipSpineRoll = false) {
    const lerpPos = Math.min(1.0, delta * 6.5);
    const lerpRot = Math.min(1.0, delta * 7.0);
    const targetPos = new THREE.Vector3(
      this._rootPositionTarget.x + this._bodyTarget.x,
      this._rootPositionTarget.y,
      this._rootPositionTarget.z
    );
    this._rootPositionCurrent.lerp(targetPos, lerpPos);
    this._rootRotationCurrent.x += (this._rootRotationTarget.x - this._rootRotationCurrent.x) * lerpRot;
    this._rootRotationCurrent.y += (this._rootRotationTarget.y - this._rootRotationCurrent.y) * lerpRot;
    this._rootRotationCurrent.z += (this._rootRotationTarget.z - this._rootRotationCurrent.z) * lerpRot;

    if (adapter.root) {
      adapter.root.position.copy(this._rootPositionCurrent);
      adapter.root.rotation.set(this._rootRotationCurrent.x, this._rootRotationCurrent.y, this._rootRotationCurrent.z);
    }

    const lerpLean = Math.min(1.0, delta * 8.0);
    this._bodyCurrent.roll += (this._bodyTarget.roll - this._bodyCurrent.roll) * lerpLean;
    const spine = adapter.getHumanoidBone("spine");
    if (spine && !skipSpineRoll) spine.rotation.z = this._bodyCurrent.roll;
  }

  _applyArmTransforms(adapter, delta) {
    const lerpFactor = Math.min(1.0, delta * 8.5);
    for (const bName of ["leftShoulder", "rightShoulder", "leftUpperArm", "leftLowerArm", "leftHand", "rightUpperArm", "rightLowerArm", "rightHand"]) {
      const boneNode = adapter.getHumanoidBone(bName);
      const cur = this._currentArms[bName];
      const tgt = this._targetArms[bName];
      if (!boneNode || !cur || !tgt) continue;
      cur.x += (tgt.x - cur.x) * lerpFactor;
      cur.y += (tgt.y - cur.y) * lerpFactor;
      cur.z += (tgt.z - cur.z) * lerpFactor;
      boneNode.rotation.set(cur.x, cur.y, cur.z);
    }
  }

  _applyLegTransforms(adapter, delta) {
    const lerpFactor = Math.min(1.0, delta * 9.0);
    for (const bName of ["leftUpperLeg", "leftLowerLeg", "leftFoot", "rightUpperLeg", "rightLowerLeg", "rightFoot"]) {
      const boneNode = adapter.getHumanoidBone(bName);
      const cur = this._currentLegs[bName];
      const tgt = this._targetLegs[bName];
      if (!boneNode || !cur || !tgt) continue;
      cur.x += (tgt.x - cur.x) * lerpFactor;
      cur.y += (tgt.y - cur.y) * lerpFactor;
      cur.z += (tgt.z - cur.z) * lerpFactor;
      boneNode.rotation.set(cur.x, cur.y, cur.z);
    }
  }

  _resetArmsToRest() {
    for (const [k, v] of Object.entries(REST_ARM_POSE)) if (this._targetArms[k]) this._targetArms[k].copy(v);
  }
  _resetLegsToRest() {
    for (const [k, v] of Object.entries(REST_LEG_POSE)) if (this._targetLegs[k]) this._targetLegs[k].copy(v);
  }

  startHairAdjustGesture(options = {}) { return UpperGestures.execHairAdjust(this, options); }
  _execStepOutWindow(duration = 0.7) { return SpatialGestures.execStepOutWindow(this, duration); }
  _execStepInWindow(duration = 0.85) { return SpatialGestures.execStepInWindow(this, duration); }
  _execWalk(params = {}) { return SpatialGestures.execWalk(this, params); }
  _execJump(params = {}) { return SpatialGestures.execJump(this, params); }
  _execClimb(params = {}) { return SpatialGestures.execClimb(this, params); }
  _execSit(params = {}) { return SpatialGestures.execSit(this, params); }
  _execLookAround(params = {}) { return SpatialGestures.execLookAround(this, params); }
  _execPoint(params = {}) { return UpperGestures.execPoint(this, params); }
  _execLean(optionsOrRoll) { return SpatialGestures.execLean(this, optionsOrRoll); }
  _execResetAll() { return SpatialGestures.execResetAll(this); }

  _execTurnBody(yawDelta) { this._rootRotationTarget.y += yawDelta; return new Promise((res) => setTimeout(res, 750)); }
  _execTurnAround() { CameraFramingManager.setMode(FRAMING_MODES.FULL_BODY); this._rootRotationTarget.y = Math.PI; return new Promise((res) => setTimeout(res, 900)); }
  _execFaceCamera() { this._rootRotationTarget.y = 0; return new Promise((res) => setTimeout(res, 750)); }
  async _execInspectScreenComponent(params = {}) { return ScreenTargetManager.inspectAndExplain(params.target || params.component || params.query || "this component", params); }

  async lookAndPointAt(normX, normY, options = {}) {
    this.setLookTarget(normX, normY);
    const d = options.duration ? (options.duration > 20 ? options.duration / 1000 : options.duration) : 2.8;
    if (options.point !== false) {
      await UpperGestures.execPoint(this, { x: normX, y: normY, duration: d });
    } else {
      await new Promise((res) => setTimeout(res, d * 1000));
      this.setLookTarget(0, 0);
    }
  }

  _execRaiseBothHands() {
    this._targetArms.leftUpperArm.set(0.16, -0.42, 0.25);
    this._targetArms.leftLowerArm.set(0.08, -1.35, -0.12);
    this._targetArms.rightUpperArm.set(0.16, 0.42, -0.25);
    this._targetArms.rightLowerArm.set(0.08, 1.35, 0.12);
    return new Promise((res) => setTimeout(res, 800));
  }
  _execLowerHands() { this._resetArmsToRest(); return new Promise((res) => setTimeout(res, 800)); }
  _execTurn(yawDelta) { this._headTarget.y = THREE.MathUtils.clamp(this._headTarget.y + yawDelta, -0.5, 0.5); return new Promise((res) => setTimeout(res, 600)); }
  _execLookVertical(pitchDelta) { this._headTarget.x = THREE.MathUtils.clamp(this._headTarget.x + pitchDelta, -0.4, 0.4); return new Promise((res) => setTimeout(res, 600)); }
  _execLookAt(params = {}) { this.setLookTarget(typeof params.x === "number" ? params.x : 0, typeof params.y === "number" ? params.y : 0); return Promise.resolve(); }

  _execThinking() {
    CharacterStateManager.transition(CHARACTER_STATES.THINKING);
    EmotionEngine.setEmotion(EMOTIONS.THINKING, { intensity: 0.85, duration: 2500 });
    this._targetArms.rightUpperArm.set(0.22, 0.62, 0.42);
    this._targetArms.rightLowerArm.set(0.12, 1.65, 0.12);
    this._gestureOffset.pitch = -0.05;
    this._gestureOffset.roll = -0.05;
    return new Promise((res) => setTimeout(() => { this._resetArmsToRest(); this._gestureOffset.pitch = 0; this._gestureOffset.roll = 0; res(); }, 2500));
  }

  _execShrug() {
    this._targetArms.leftUpperArm.set(0.14, -0.35, -0.82);
    this._targetArms.leftLowerArm.set(0.08, -1.05, -0.1);
    this._targetArms.rightUpperArm.set(0.14, 0.35, 0.82);
    this._targetArms.rightLowerArm.set(0.08, 1.05, 0.1);
    this._gestureOffset.pitch = -0.04;
    EmotionEngine.setEmotion(EMOTIONS.CONFUSED, { intensity: 0.65, duration: 2000 });
    return new Promise((res) => setTimeout(() => { this._resetArmsToRest(); this._gestureOffset.pitch = 0; res(); }, 2000));
  }

  _execBow() { this._gestureOffset.pitch = 0.28; return new Promise((res) => setTimeout(() => { this._gestureOffset.pitch = 0; res(); }, 2200)); }
  _execListening() { CharacterStateManager.transition(CHARACTER_STATES.LISTENING); this._resetArmsToRest(); this._headTarget.set(0, 0, 0); return Promise.resolve(); }
  _execSpeaking() { CharacterStateManager.transition(CHARACTER_STATES.SPEAKING); return Promise.resolve(); }
  _execIdle() { CharacterStateManager.transition(CHARACTER_STATES.IDLE); this._resetArmsToRest(); this._headTarget.set(0, 0, 0); this._gestureOffset = { pitch: 0, yaw: 0, roll: 0 }; return Promise.resolve(); }
  _execBlink() { const adapter = this._adapter || CharacterRegistry.getActiveAdapter(); if (!adapter) return Promise.resolve(); adapter.setExpression("blink", 1.0); return new Promise((res) => setTimeout(() => { adapter.setExpression("blink", 0); res(); }, 140)); }
  _execEmotion(name, params = {}) { EmotionEngine.setEmotion(name, { intensity: params.intensity, duration: params.duration || 2400, reason: params.reason }); return new Promise((res) => setTimeout(res, params.duration || 2400)); }
  _execWideSmile(params = {}) { return this._execEmotion(EMOTIONS.EXCITED, { intensity: 1.0, duration: params.duration || 2400 }); }
  _execShowTeeth(params = {}) { const adapter = this._adapter || CharacterRegistry.getActiveAdapter(); if (!adapter) return Promise.resolve(); const duration = params.duration ?? 2400; adapter.setExpression("show_teeth", 1.0); return new Promise((res) => setTimeout(() => { adapter.setExpression("show_teeth", 0); adapter.setExpression("happy", 0); adapter.setExpression("ee", 0); res(); }, duration)); }
  _execExpression(name, params = {}) { const adapter = this._adapter || CharacterRegistry.getActiveAdapter(); if (!adapter) return Promise.resolve(); adapter.setExpression(name, params.intensity ?? 0.8); return new Promise((res) => setTimeout(() => { adapter.setExpression(name, 0); res(); }, params.duration ?? 2000)); }
  _execNeutralFace() { EmotionEngine.resetToNeutral(); const adapter = this._adapter || CharacterRegistry.getActiveAdapter(); if (adapter) adapter.resetExpressions(); return Promise.resolve(); }

  dispose() {
    this._activeGesture = null;
    this._resetArmsToRest();
    EmotionEngine.dispose();
    IdleBehaviorManager.dispose();
  }
}

const CharacterController = new CharacterControllerClass();
export default CharacterController;
