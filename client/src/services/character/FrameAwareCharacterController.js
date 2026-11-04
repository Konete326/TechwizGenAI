import * as THREE from "three";
import CharacterController from "./CharacterController.js";
import CameraFramingManager, { FRAMING_MODES } from "./CameraFramingManager.js";
import EmotionEngine, { EMOTIONS } from "./EmotionEngine.js";
import CharacterPhysicsEngine from "./CharacterPhysicsEngine.js";
import ScreenTargetManager from "./ScreenTargetManager.js";
import { FRAME_STATES } from "./FrameAwareStates.js";
import {
  navigateToComponent,
  highlightElement,
  clearHighlight,
  clickComponent,
} from "./FrameAwareScreenInteraction.js";

export { FRAME_STATES };

const WALK_SPEED_PX = { slow: 105, careful: 95, normal: 155, quick: 235 };

function getResponsiveOutsideDimensions() {
  const vw = typeof window !== "undefined" ? window.innerWidth || 1280 : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight || 800 : 800;
  const width = Math.min(285, Math.max(205, Math.round(vw * 0.21)));
  const height = Math.min(450, Math.max(320, Math.round(vh * 0.53)));
  return { width, height, vw, vh };
}

class FrameAwareCharacterControllerClass {
  constructor() {
    this._state = FRAME_STATES.IN_FRAME;
    this._listeners = new Set();
    this._currentTargetComponent = null;
    this._frameRect = { left: 960, top: 120, width: 340, height: 520 };
    this._outsidePosition = { x: 640, y: 340, width: 250, height: 410 };
    this._activeHighlightElement = null;
    this._highlightTimer = null;
    this._inFrameElement = null;
    this._activeAdapter = null;
    this._activeCamera = null;
    this._tempVec = new THREE.Vector3();
    this._tempBox = new THREE.Box3();
    this._cachedFootY = null;
    this._lastLandmarkUpdate = 0;
    this._transitionId = 0;
    this._landmarks = {
      head: { x: 0, y: 0 },
      chest: { x: 0, y: 0 },
      leftHand: { x: 0, y: 0 },
      rightHand: { x: 0, y: 0 },
      feet: { x: 0, y: 0 },
    };
  }

  getState() { return this._state; }
  isOutsideFrame() { return this._state !== FRAME_STATES.IN_FRAME; }
  isOutside() { return this._state !== FRAME_STATES.IN_FRAME; }
  getOutsidePosition() { return { ...this._outsidePosition }; }

  setOutsidePosition(pos) {
    if (!pos || typeof pos !== "object") return;
    const { width: defW, height: defH } = getResponsiveOutsideDimensions();
    this._outsidePosition = {
      x: Number.isFinite(pos.x) ? Math.round(pos.x) : this._outsidePosition.x,
      y: Number.isFinite(pos.y) ? Math.round(pos.y) : this._outsidePosition.y,
      width: Number.isFinite(pos.width) && pos.width >= 120 ? Math.round(pos.width) : this._outsidePosition.width || defW,
      height: Number.isFinite(pos.height) && pos.height >= 180 ? Math.round(pos.height) : this._outsidePosition.height || defH,
    };
  }

  resetImmediate() {
    this._transitionId += 1;
    this.clearHighlight();
    this._currentTargetComponent = null;
    if (this._state !== FRAME_STATES.IN_FRAME) {
      this._setState(FRAME_STATES.IN_FRAME);
    }
  }

  getOutsideRect() {
    return {
      left: this._outsidePosition.x,
      top: this._outsidePosition.y,
      width: this._outsidePosition.width,
      height: this._outsidePosition.height,
    };
  }

  getFrameRect() { return { ...this._frameRect }; }
  getLandmarks() { return { ...this._landmarks }; }

  bindFrameElement(el) {
    this._inFrameElement = el;
    this.refreshFrameRect();
  }

  bindSceneContext(adapter, camera) {
    this._activeAdapter = adapter;
    this._activeCamera = camera;
    this._cachedFootY = null;
  }

  setFrameRect(rect) {
    if (!rect) return;
    if (rect.width > 20 && rect.height > 20 && rect.left > -1000 && rect.top > -1000) {
      this._frameRect = {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    }
  }

  refreshFrameRect() {
    const el =
      this._inFrameElement ||
      (typeof document !== "undefined"
        ? document.getElementById("nesa-call-widget") || document.getElementById("nesa-call-widget-mobile")
        : null);
    if (el && typeof el.getBoundingClientRect === "function") {
      this.setFrameRect(el.getBoundingClientRect());
    }
    return this._frameRect;
  }

  updateLandmarks(adapter = this._activeAdapter, camera = this._activeCamera) {
    if (!adapter || !camera) return;
    const now = performance.now();
    if (now - this._lastLandmarkUpdate < 180) return;
    this._lastLandmarkUpdate = now;

    const root = adapter.root;
    if (!root) return;

    const rect = this.isOutsideFrame() ? this.getOutsideRect() : this._frameRect;
    if (!rect || rect.width <= 0 || rect.height <= 0) return;

    const projectToScreen = (worldPos) => {
      const v = this._tempVec.copy(worldPos).project(camera);
      return {
        x: Math.round(rect.left + (v.x + 1) * 0.5 * rect.width),
        y: Math.round(rect.top + (-v.y + 1) * 0.5 * rect.height),
      };
    };

    const sampleBone = (boneName, fallbackY) => {
      const bone = adapter.getHumanoidBone?.(boneName);
      const pos = new THREE.Vector3();
      if (bone) bone.getWorldPosition(pos);
      else { root.getWorldPosition(pos); pos.y += fallbackY; }
      return projectToScreen(pos);
    };

    if (this._cachedFootY === null) {
      this._tempBox.setFromObject(root);
      this._cachedFootY = Number.isFinite(this._tempBox.min.y) ? this._tempBox.min.y : 0;
    }

    const rootPos = new THREE.Vector3();
    root.getWorldPosition(rootPos);

    this._landmarks = {
      head: sampleBone("head", 1.42),
      chest: sampleBone("chest", 1.15),
      leftHand: sampleBone("leftHand", 0.95),
      rightHand: sampleBone("rightHand", 0.95),
      feet: projectToScreen(new THREE.Vector3(rootPos.x, this._cachedFootY, rootPos.z)),
    };
  }

  onStateChange(cb) {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  _setState(newState, payload = {}) {
    const prevState = this._state;
    this._state = newState;
    if (payload?.position) this.setOutsidePosition(payload.position);
    const eventData = {
      state: newState,
      prevState,
      ...payload,
      position: { ...this._outsidePosition },
      outsideRect: this.getOutsideRect(),
      frameRect: { ...this._frameRect },
      target: payload?.target || this._currentTargetComponent,
    };
    for (const cb of this._listeners) {
      try { cb(eventData); } catch { void 0; }
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("nisa:frame_state", { detail: eventData }));
    }
  }

  _emitContinuousMove(pos, immediate = true) {
    this.setOutsidePosition(pos);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("nisa:frame_move", { detail: { ...this._outsidePosition, immediate } }));
    }
  }

  async animateOutsideMove(targetPos, options = {}) {
    const startX = this._outsidePosition.x;
    const startY = this._outsidePosition.y;
    const outW = targetPos.width || this._outsidePosition.width || 250;
    const outH = targetPos.height || this._outsidePosition.height || 410;
    const endX = Number.isFinite(targetPos.x) ? targetPos.x : startX;
    const endY = Number.isFinite(targetPos.y) ? targetPos.y : startY;

    const distPx = Math.hypot(endX - startX, endY - startY);
    const speedKey = options.speed && WALK_SPEED_PX[options.speed] ? options.speed : "normal";
    const computedDur = Math.max(1.25, Math.min(3.8, distPx / WALK_SPEED_PX[speedKey]));
    const durationSec = options.duration ? (options.duration > 20 ? options.duration / 1000 : options.duration) : computedDur;
    const dx = endX - startX;
    const walkDir = dx < -15 ? "left" : dx > 15 ? "right" : "forward";

    this._setState(FRAME_STATES.NAVIGATING_TO_TARGET, {
      position: { x: startX, y: startY, width: outW, height: outH },
    });

    const startTime = performance.now();
    let rafId = null;
    const stepFrame = (now) => {
      const p = Math.min(1, (now - startTime) / (durationSec * 1000));
      const smoothP = p * p * (3 - 2 * p);
      const curX = Math.round(startX + (endX - startX) * smoothP);
      const curY = Math.round(startY + (endY - startY) * smoothP);
      this._emitContinuousMove({ x: curX, y: curY, width: outW, height: outH }, true);
      if (p < 1) rafId = requestAnimationFrame(stepFrame);
    };
    if (typeof requestAnimationFrame === "function") rafId = requestAnimationFrame(stepFrame);

    await CharacterController._execWalk({ duration: durationSec, direction: walkDir, speed: speedKey, z: 0.08 });
    if (rafId && typeof cancelAnimationFrame === "function") cancelAnimationFrame(rafId);
    this._emitContinuousMove({ x: endX, y: endY, width: outW, height: outH }, true);
  }

  async exitFrameAndNavigate(params = {}, extraOptions = {}) {
    this._transitionId += 1;
    const tid = this._transitionId;
    let targetQuery = null;
    let options = extraOptions || {};
    if (typeof params === "string") targetQuery = params;
    else if (params && typeof params === "object") {
      targetQuery = params.target || params.targetComponent || params.component || params.query || null;
      options = { ...params, ...extraOptions };
    }

    this.refreshFrameRect();
    const { width: outW, height: outH } = getResponsiveOutsideDimensions();

    if (!this.isOutsideFrame()) {
      this.setOutsidePosition({
        x: this._frameRect.left,
        y: this._frameRect.top,
        width: Math.max(200, this._frameRect.width),
        height: Math.max(280, this._frameRect.height),
      });
      this._setState(FRAME_STATES.PREPARING_EXIT);

      CameraFramingManager.setMode(FRAMING_MODES.FULL_BODY);
      await CharacterController._execStepOutWindow(0.65);
      if (this._transitionId !== tid) return { success: false, cancelled: true, state: this._state };

      const desiredExitX = this._frameRect.left - outW - 22;
      const groundLanding = CharacterPhysicsEngine.getGroundPosition(outW, outH, desiredExitX);
      this.setOutsidePosition(groundLanding);
      this._setState(FRAME_STATES.EXITING_FRAME, { position: groundLanding });

      await CharacterController._execWalk({ duration: 1.15, z: 0.1, speed: "normal" });
      if (this._transitionId !== tid) return { success: false, cancelled: true, state: this._state };
      this._setState(FRAME_STATES.OUTSIDE_FRAME, { position: groundLanding });
    }

    const normTarget = typeof targetQuery === "string" ? targetQuery.trim().toLowerCase() : "";
    const bottomKeywords = new Set(["bottom", "outside", "screen", "patrol", "left", "right", "center", "bahar", "neeche", "walk"]);
    if (targetQuery && !bottomKeywords.has(normTarget)) {
      const navRes = await this.navigateToComponent(targetQuery, options);
      if (this._transitionId !== tid) return { success: false, cancelled: true, state: this._state };
      if (options.click) await this.clickComponent(targetQuery);
      return navRes;
    }

    if (options.walkBottom !== false) {
      const dir = ["left", "right", "center", "patrol"].includes(normTarget) ? normTarget : options.direction || "patrol";
      await this.walkAlongBottom(dir, { ...options, _tid: tid });
    }

    return {
      success: true,
      state: this._state,
      position: { ...this._outsidePosition },
      spokenExplanation: "Main frame se bahar aa gayi hoon aur screen par chal rahi hoon!",
    };
  }

  async walkAlongBottom(directionOrX = "patrol", options = {}) {
    if (!this.isOutsideFrame()) await this.exitFrameAndNavigate({ walkBottom: false });
    const tid = options._tid ?? (this._transitionId += 1);
    const { width: outW, height: outH, vw } = getResponsiveOutsideDimensions();

    const minX = 24;
    const maxX = Math.max(minX + 40, vw - outW - 24);
    const centerX = CharacterPhysicsEngine.resolveObstacleFreeX(Math.round((vw - outW) * 0.45), this._outsidePosition.y, outW, outH);

    const walkToX = async (destX, dur = null) => {
      if (this._transitionId !== tid) return;
      const groundPos = CharacterPhysicsEngine.getGroundPosition(outW, outH, destX);
      await this.animateOutsideMove(groundPos, { duration: dur, speed: options.speed || "normal" });
      if (this._transitionId !== tid) return;
      this._setState(FRAME_STATES.OUTSIDE_FRAME, { position: groundPos });
    };

    if (directionOrX === "patrol") {
      const leftPatrolX = minX + Math.round((centerX - minX) * 0.35);
      await walkToX(leftPatrolX, options.duration || null);
      if (this._transitionId !== tid) return { success: false, cancelled: true, state: this._state };
      await CharacterController._execLookAround({ duration: 1.5 });
      if (this._transitionId !== tid) return { success: false, cancelled: true, state: this._state };
      await walkToX(centerX, null);
      return { success: true, state: this._state, position: { ...this._outsidePosition } };
    }

    let targetX = centerX;
    if (typeof directionOrX === "number") targetX = directionOrX - outW * 0.5;
    else if (directionOrX === "left") targetX = minX + 20;
    else if (directionOrX === "right") targetX = CharacterPhysicsEngine.resolveObstacleFreeX(maxX - 20, this._outsidePosition.y, outW, outH);

    await walkToX(targetX, options.duration || null);
    if (this._transitionId !== tid) return { success: false, cancelled: true, state: this._state };
    if (options.lookAround !== false) await CharacterController._execLookAround({ duration: 1.5 });

    return { success: true, state: this._state, position: { ...this._outsidePosition } };
  }

  async jumpOrPerform(params = {}) {
    if (params?.target || params?.component || params?.query) {
      return this.climbOntoTarget(params.target || params.component || params.query, params);
    }
    if (this.isOutsideFrame()) {
      const startPos = this.getOutsidePosition();
      const traj = CharacterPhysicsEngine.computeJumpTrajectory(startPos, startPos, 1.35);
      const startTime = performance.now();
      let rafId = null;
      const stepArc = (now) => {
        const p = Math.min(1, (now - startTime) / (traj.durationSec * 1000));
        const pt = traj.sampleAt(p);
        this._emitContinuousMove({ ...startPos, x: pt.x, y: pt.y }, true);
        if (p < 1) rafId = requestAnimationFrame(stepArc);
      };
      if (typeof requestAnimationFrame === "function") rafId = requestAnimationFrame(stepArc);
      await CharacterController._execJump({ duration: traj.durationSec });
      if (rafId && typeof cancelAnimationFrame === "function") cancelAnimationFrame(rafId);
      this._emitContinuousMove(startPos, true);
      return { success: true, action: "jump", position: startPos };
    }
    return CharacterController._execJump(params);
  }

  async climbOntoTarget(queryOrKey, options = {}) {
    if (!this.isOutsideFrame()) await this.exitFrameAndNavigate({ walkBottom: false });
    const { width: outW, height: outH } = getResponsiveOutsideDimensions();
    const target = ScreenTargetManager.resolveTarget(queryOrKey || "chat_input");
    const landing = CharacterPhysicsEngine.findLandingSurfaceForElement(target?.element, outW, outH);

    const groundApproach = CharacterPhysicsEngine.getGroundPosition(outW, outH, Math.max(16, landing.x - 36));
    await this.animateOutsideMove(groundApproach, { speed: "normal" });

    const traj = CharacterPhysicsEngine.computeJumpTrajectory(groundApproach, landing, 1.35);
    const startTime = performance.now();
    let rafId = null;
    const stepArc = (now) => {
      const p = Math.min(1, (now - startTime) / (traj.durationSec * 1000));
      const pt = traj.sampleAt(p);
      this._emitContinuousMove({ x: pt.x, y: pt.y, width: outW, height: outH }, true);
      if (p < 1) rafId = requestAnimationFrame(stepArc);
    };
    if (typeof requestAnimationFrame === "function") rafId = requestAnimationFrame(stepArc);

    if (landing.surfaceType === "step_up") await CharacterController._execClimb({ duration: traj.durationSec });
    else await CharacterController._execJump({ duration: traj.durationSec });

    if (rafId && typeof cancelAnimationFrame === "function") cancelAnimationFrame(rafId);
    this._emitContinuousMove(landing, true);
    this._setState(FRAME_STATES.OUTSIDE_FRAME, { position: landing, target });

    if (options.sit) await CharacterController._execSit({ duration: 2.5 });
    return {
      success: true,
      target: target?.label || "surface",
      canStandOnTop: landing.canStandOnTop,
      position: landing,
      spokenExplanation: `Main ${target?.label || "is hisse"} par aa gayi hoon!`,
    };
  }

  calculateTargetScreenPosition(el) {
    const { width: outW, height: outH, vw } = getResponsiveOutsideDimensions();
    const groundPos = CharacterPhysicsEngine.getGroundPosition(outW, outH);
    if (!el || typeof el.getBoundingClientRect !== "function") {
      this.setOutsidePosition(groundPos);
      return { ...groundPos, direction: "right" };
    }

    const r = el.getBoundingClientRect();
    const targetCenterX = r.left + r.width * 0.5;
    const desiredX = targetCenterX < vw * 0.5 ? Math.min(vw - outW - 20, Math.round(r.right + 16)) : Math.max(20, Math.round(r.left - outW - 16));
    const direction = targetCenterX < vw * 0.5 ? "left" : "right";
    const safeGround = CharacterPhysicsEngine.getGroundPosition(outW, outH, desiredX);
    this.setOutsidePosition(safeGround);
    return { ...safeGround, direction };
  }

  async navigateToComponent(queryOrKey, options = {}) { return navigateToComponent(this, queryOrKey, options); }
  highlightElement(el, durationMs = 5500) { return highlightElement(this, el, durationMs); }
  clearHighlight() { return clearHighlight(this); }
  async clickComponent(queryOrKey) { return clickComponent(this, queryOrKey); }

  async returnToFrame() {
    this._transitionId += 1;
    const tid = this._transitionId;
    this.clearHighlight();
    this._currentTargetComponent = null;

    if (!this.isOutsideFrame()) {
      await CharacterController._execResetAll();
      return { success: true, state: FRAME_STATES.IN_FRAME, spokenExplanation: "Main wapas apni jagah aa gayi hoon." };
    }

    this.refreshFrameRect();
    const frameTarget = {
      x: Math.round(this._frameRect.left),
      y: Math.round(this._frameRect.top),
      width: Math.max(200, Math.round(this._frameRect.width)),
      height: Math.max(260, Math.round(this._frameRect.height)),
    };

    this._setState(FRAME_STATES.RETURNING_TO_FRAME, { position: frameTarget });
    await CharacterController._execWalk({ duration: 1.05, z: 0, speed: "normal" });
    if (this._transitionId !== tid) return { success: false, cancelled: true, state: this._state };

    CameraFramingManager.setMode(FRAMING_MODES.HEAD_AND_SHOULDERS);
    this._setState(FRAME_STATES.ENTERING_FRAME, { position: frameTarget });
    await CharacterController._execStepInWindow(0.85);
    if (this._transitionId !== tid) return { success: false, cancelled: true, state: this._state };

    this._setState(FRAME_STATES.RESTORING_NORMAL_VIEW, { position: frameTarget });
    await CharacterController._execResetAll();
    if (this._transitionId !== tid) return { success: false, cancelled: true, state: this._state };
    EmotionEngine.setEmotion(EMOTIONS.HAPPY, { intensity: 0.75, duration: 1800 });
    this._setState(FRAME_STATES.IN_FRAME);

    return { success: true, state: FRAME_STATES.IN_FRAME, spokenExplanation: "Main wapas apne frame mein aa gayi hoon." };
  }
}

const FrameAwareCharacterController = new FrameAwareCharacterControllerClass();
export default FrameAwareCharacterController;
