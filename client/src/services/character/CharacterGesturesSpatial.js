import CameraFramingManager, { FRAMING_MODES } from "./CameraFramingManager.js";
import BoneControlSystem from "./BoneControlSystem.js";
import BVHActionLibrary from "./BVHActionLibrary.js";
import { REST_ARM_POSE, envelopeWeights, smoothStep } from "./CharacterPoseConstants.js";

const WALK_MODES = {
  slow: { freq: 1.32, strideAmp: 0.28, kneeAmp: 0.44, bobAmp: 0.018, rollAmp: 0.022, armAmp: 0.2 },
  careful: { freq: 1.2, strideAmp: 0.24, kneeAmp: 0.38, bobAmp: 0.014, rollAmp: 0.018, armAmp: 0.16 },
  normal: { freq: 1.72, strideAmp: 0.36, kneeAmp: 0.56, bobAmp: 0.024, rollAmp: 0.028, armAmp: 0.28 },
  quick: { freq: 2.18, strideAmp: 0.45, kneeAmp: 0.68, bobAmp: 0.032, rollAmp: 0.035, armAmp: 0.36 },
};

function applyNaturalWalkTick(ctrl, progress, durationSec, options = {}) {
  const speedKey = options.speed && WALK_MODES[options.speed] ? options.speed : "normal";
  const mode = WALK_MODES[speedKey];
  const env = envelopeWeights(progress, 0.2, 0.22);
  const isBackward = options.direction === "backward" || options.direction === "away";
  const isSidestep = options.direction === "sidestep_left" || options.direction === "sidestep_right";
  const phaseSign = isBackward ? -1 : 1;

  const angle = progress * durationSec * mode.freq * Math.PI * 2 * phaseSign;
  const leftSin = Math.sin(angle);
  const rightSin = Math.sin(angle + Math.PI);
  const leftCos = Math.cos(angle);
  const rightCos = Math.cos(angle + Math.PI);

  const lThighPitch = (-leftSin * mode.strideAmp - Math.max(0, leftCos) * 0.12) * env;
  const rThighPitch = (-rightSin * mode.strideAmp - Math.max(0, rightCos) * 0.12) * env;
  const lAbduct = isSidestep ? Math.max(0, leftSin) * 0.22 * env : 0;
  const rAbduct = isSidestep ? -Math.max(0, rightSin) * 0.22 * env : 0;

  ctrl._targetLegs.leftUpperLeg.set(lThighPitch, 0, lAbduct);
  ctrl._targetLegs.rightUpperLeg.set(rThighPitch, 0, rAbduct);

  const lKnee = Math.max(0.03, (Math.max(0, leftCos) * mode.kneeAmp + Math.max(0, -leftSin) * 0.14) * env);
  const rKnee = Math.max(0.03, (Math.max(0, rightCos) * mode.kneeAmp + Math.max(0, -rightSin) * 0.14) * env);
  ctrl._targetLegs.leftLowerLeg.set(lKnee, 0, 0);
  ctrl._targetLegs.rightLowerLeg.set(rKnee, 0, 0);

  if (ctrl._targetLegs.leftFoot && ctrl._targetLegs.rightFoot) {
    const lAnkle = (-leftSin * 0.16 + Math.max(0, -leftCos) * 0.12) * env;
    const rAnkle = (-rightSin * 0.16 + Math.max(0, -rightCos) * 0.12) * env;
    ctrl._targetLegs.leftFoot.set(lAnkle, 0, 0);
    ctrl._targetLegs.rightFoot.set(rAnkle, 0, 0);
  }

  const lArmForward = Math.max(-0.12, rightSin * mode.armAmp) * env;
  const rArmForward = Math.max(-0.12, leftSin * mode.armAmp) * env;

  ctrl._targetArms.leftUpperArm.set(
    REST_ARM_POSE.leftUpperArm.x + Math.abs(rightSin) * 0.04 * env,
    REST_ARM_POSE.leftUpperArm.y - lArmForward,
    REST_ARM_POSE.leftUpperArm.z + 0.04 * env
  );
  ctrl._targetArms.rightUpperArm.set(
    REST_ARM_POSE.rightUpperArm.x + Math.abs(leftSin) * 0.04 * env,
    REST_ARM_POSE.rightUpperArm.y + rArmForward,
    REST_ARM_POSE.rightUpperArm.z - 0.04 * env
  );

  const lElbow = Math.max(0.18, 0.24 + Math.max(0, rightSin) * 0.26 * env);
  const rElbow = Math.max(0.18, 0.24 + Math.max(0, leftSin) * 0.26 * env);
  ctrl._targetArms.leftLowerArm.set(0.08, -lElbow, -0.05);
  ctrl._targetArms.rightLowerArm.set(0.08, rElbow, 0.05);

  ctrl._bodyTarget.roll = leftSin * mode.rollAmp * env;
  ctrl._rootPositionTarget.y = Math.abs(Math.sin(angle)) * mode.bobAmp * env;
  ctrl._gestureOffset.pitch = Math.cos(angle * 2) * 0.016 * env;
  ctrl._gestureOffset.yaw = -leftSin * 0.024 * env;
}

export function execWalk(ctrl, params = {}) {
  const duration = params.duration ? (params.duration > 20 ? params.duration / 1000 : params.duration) : 2.6;
  const dir = String(params.direction || "forward").toLowerCase();
  const speed = params.speed || "normal";

  if (params.cameraMode === "FULL_BODY" || params.fullBody) {
    CameraFramingManager.setMode(FRAMING_MODES.FULL_BODY);
  }

  const startX = ctrl._rootPositionTarget.x;
  const startZ = ctrl._rootPositionTarget.z;
  const startYaw = ctrl._rootRotationTarget.y;

  let targetX = typeof params.x === "number" ? params.x : startX;
  let targetZ = typeof params.z === "number" ? params.z : startZ;
  let targetYaw = startYaw;

  if (dir === "left") {
    targetX = typeof params.x === "number" ? params.x : -0.22;
    targetYaw = -1.32;
  } else if (dir === "right") {
    targetX = typeof params.x === "number" ? params.x : 0.22;
    targetYaw = 1.32;
  } else if (dir === "closer" || dir === "forward") {
    targetZ = typeof params.z === "number" ? params.z : Math.min(0.24, startZ + 0.14);
  } else if (dir === "backward" || dir === "away") {
    targetZ = typeof params.z === "number" ? params.z : Math.max(-0.35, startZ - 0.16);
  }

  const locomotion = BVHActionLibrary.beginLocomotion(speed);

  return new Promise((resolve) => {
    ctrl._activeGesture = {
      name: "walk",
      elapsed: 0,
      duration,
      resolve: () => {
        locomotion.end();
        ctrl._resetArmsToRest();
        ctrl._resetLegsToRest();
        ctrl._rootPositionTarget.y = 0;
        ctrl._rootRotationTarget.y = 0;
        ctrl._bodyTarget.roll = 0;
        ctrl._gestureOffset = { pitch: 0, yaw: 0, roll: 0 };
        resolve({ success: true, action: "walk" });
      },
      tick: (_delta, progress) => {
        const s = smoothStep(progress);
        ctrl._rootPositionTarget.x = startX + (targetX - startX) * s;
        ctrl._rootPositionTarget.z = startZ + (targetZ - startZ) * s;
        const turnEnv = envelopeWeights(progress, 0.14, 0.18);
        ctrl._rootRotationTarget.y = startYaw + (targetYaw - startYaw) * turnEnv;
        ctrl._headTarget.y = targetYaw * 0.22 * turnEnv;
        applyNaturalWalkTick(ctrl, progress, duration, { direction: dir, speed });
      },
    };
  });
}

export function execStepOutWindow(ctrl, duration = 0.85) {
  const d = duration > 20 ? duration / 1000 : duration;
  const startZ = ctrl._rootPositionTarget.z;
  return new Promise((resolve) => {
    ctrl._activeGesture = {
      name: "step_out_window",
      elapsed: 0,
      duration: d,
      resolve: () => {
        ctrl._resetArmsToRest();
        ctrl._resetLegsToRest();
        ctrl._rootPositionTarget.set(0, 0, 0);
        ctrl._bodyTarget.roll = 0;
        resolve({ success: true });
      },
      tick: (_delta, progress) => {
        const s = smoothStep(progress);
        ctrl._rootPositionTarget.z = startZ + 0.22 * Math.sin(s * Math.PI);
        applyNaturalWalkTick(ctrl, progress, d, { direction: "forward", speed: "normal" });
      },
    };
  });
}

export function execStepInWindow(ctrl, duration = 0.9) {
  const d = duration > 20 ? duration / 1000 : duration;
  return new Promise((resolve) => {
    ctrl._activeGesture = {
      name: "step_in_window",
      elapsed: 0,
      duration: d,
      resolve: () => {
        ctrl._resetArmsToRest();
        ctrl._resetLegsToRest();
        ctrl._rootPositionTarget.set(0, 0, 0);
        ctrl._rootRotationTarget.set(0, 0, 0);
        ctrl._bodyTarget.roll = 0;
        resolve({ success: true });
      },
      tick: (_delta, progress) => {
        const s = smoothStep(progress);
        ctrl._rootPositionTarget.x *= 1 - s;
        ctrl._rootPositionTarget.z *= 1 - s;
        applyNaturalWalkTick(ctrl, progress, d, { direction: "forward", speed: "normal" });
      },
    };
  });
}

export function execJump(ctrl, params = {}) {
  const duration = params.duration ? (params.duration > 20 ? params.duration / 1000 : params.duration) : 1.45;
  const jumpHeight = Math.min(0.28, Math.max(0.1, Number(params.height) || 0.2));

  return new Promise((resolve) => {
    ctrl._activeGesture = {
      name: "jump",
      elapsed: 0,
      duration,
      resolve: () => {
        ctrl._resetArmsToRest();
        ctrl._resetLegsToRest();
        ctrl._rootPositionTarget.y = 0;
        ctrl._bodyTarget.roll = 0;
        ctrl._gestureOffset = { pitch: 0, yaw: 0, roll: 0 };
        resolve({ success: true, action: "jump" });
      },
      tick: (_delta, progress) => {
        if (progress < 0.24) {
          const c = Math.sin((progress / 0.24) * Math.PI * 0.5);
          ctrl._rootPositionTarget.y = -0.1 * c;
          ctrl._targetLegs.leftUpperLeg.set(-0.4 * c, 0, 0);
          ctrl._targetLegs.rightUpperLeg.set(-0.4 * c, 0, 0);
          ctrl._targetLegs.leftLowerLeg.set(0.68 * c, 0, 0);
          ctrl._targetLegs.rightLowerLeg.set(0.68 * c, 0, 0);
          if (ctrl._targetLegs.leftFoot && ctrl._targetLegs.rightFoot) {
            ctrl._targetLegs.leftFoot.set(-0.2 * c, 0, 0);
            ctrl._targetLegs.rightFoot.set(-0.2 * c, 0, 0);
          }
          ctrl._gestureOffset.pitch = 0.08 * c;
        } else if (progress <= 0.76) {
          const airP = (progress - 0.24) / 0.52;
          const arc = Math.sin(airP * Math.PI);
          ctrl._rootPositionTarget.y = jumpHeight * arc;
          const tuck = arc * 0.36;
          ctrl._targetLegs.leftUpperLeg.set(-tuck, 0, 0.04);
          ctrl._targetLegs.rightUpperLeg.set(-tuck * 0.88, 0, -0.04);
          ctrl._targetLegs.leftLowerLeg.set(tuck * 1.35, 0, 0);
          ctrl._targetLegs.rightLowerLeg.set(tuck * 1.2, 0, 0);
          if (ctrl._targetLegs.leftFoot && ctrl._targetLegs.rightFoot) {
            ctrl._targetLegs.leftFoot.set(0.22 * arc, 0, 0);
            ctrl._targetLegs.rightFoot.set(0.22 * arc, 0, 0);
          }
          ctrl._targetArms.leftUpperArm.set(0.18, -0.42 * arc - 0.1, -1.24 + 0.45 * arc);
          ctrl._targetArms.rightUpperArm.set(0.18, 0.42 * arc + 0.1, 1.24 - 0.45 * arc);
          ctrl._targetArms.leftLowerArm.set(0.08, -0.65 * arc - 0.22, -0.05);
          ctrl._targetArms.rightLowerArm.set(0.08, 0.65 * arc + 0.22, 0.05);
          ctrl._gestureOffset.pitch = -0.06 * arc;
        } else {
          const landP = (progress - 0.76) / 0.24;
          const absorb = Math.sin(landP * Math.PI);
          ctrl._rootPositionTarget.y = -0.07 * absorb;
          ctrl._targetLegs.leftUpperLeg.set(-0.25 * absorb, 0, 0);
          ctrl._targetLegs.rightUpperLeg.set(-0.25 * absorb, 0, 0);
          ctrl._targetLegs.leftLowerLeg.set(0.45 * absorb, 0, 0);
          ctrl._targetLegs.rightLowerLeg.set(0.45 * absorb, 0, 0);
          ctrl._gestureOffset.pitch = 0.05 * absorb;
        }
      },
    };
  });
}

export function execClimb(ctrl, params = {}) {
  const duration = params.duration ? (params.duration > 20 ? params.duration / 1000 : params.duration) : 1.9;
  return new Promise((resolve) => {
    ctrl._activeGesture = {
      name: "climb",
      elapsed: 0,
      duration,
      resolve: () => {
        ctrl._resetArmsToRest();
        ctrl._resetLegsToRest();
        ctrl._rootPositionTarget.y = 0;
        ctrl._bodyTarget.roll = 0;
        ctrl._gestureOffset = { pitch: 0, yaw: 0, roll: 0 };
        resolve({ success: true, action: "climb" });
      },
      tick: (_delta, progress) => {
        const env = envelopeWeights(progress, 0.18, 0.22);
        const angle = progress * Math.PI * 4;
        const lStep = Math.max(0, Math.sin(angle));
        const rStep = Math.max(0, Math.sin(angle + Math.PI));

        ctrl._rootPositionTarget.y = Math.sin(progress * Math.PI) * 0.12 * env;
        ctrl._targetLegs.leftUpperLeg.set(-0.65 * lStep * env, 0, 0);
        ctrl._targetLegs.leftLowerLeg.set((0.82 * lStep + 0.08) * env, 0, 0);
        ctrl._targetLegs.rightUpperLeg.set(-0.65 * rStep * env, 0, 0);
        ctrl._targetLegs.rightLowerLeg.set((0.82 * rStep + 0.08) * env, 0, 0);

        const adapter = ctrl._adapter;
        if (adapter?.getHumanoidBone("leftUpperArm") && adapter?.getHumanoidBone("rightUpperArm")) {
          const lTarget = BoneControlSystem.getRelativeBodyTarget(adapter, "head", [
            0.18,
            0.04 + rStep * 0.15,
            0.24,
          ]);
          const rTarget = BoneControlSystem.getRelativeBodyTarget(adapter, "head", [
            -0.18,
            0.04 + lStep * 0.15,
            0.24,
          ]);
          const lSol = BoneControlSystem.solveArmIK(adapter, "left", lTarget);
          const rSol = BoneControlSystem.solveArmIK(adapter, "right", rTarget);
          ctrl._targetArms.leftUpperArm.set(...lSol.upperEuler);
          ctrl._targetArms.leftLowerArm.set(...lSol.lowerEuler);
          ctrl._targetArms.rightUpperArm.set(...rSol.upperEuler);
          ctrl._targetArms.rightLowerArm.set(...rSol.lowerEuler);
        } else {
          ctrl._targetArms.leftUpperArm.set(0.2, -0.58, -0.35 + rStep * 0.35);
          ctrl._targetArms.leftLowerArm.set(0.1, -1.25, 0);
          ctrl._targetArms.rightUpperArm.set(0.2, 0.58, 0.35 - lStep * 0.35);
          ctrl._targetArms.rightLowerArm.set(0.1, 1.25, 0);
        }
        ctrl._gestureOffset.pitch = -0.12 * env;
        ctrl._bodyTarget.roll = Math.sin(angle) * 0.035 * env;
      },
    };
  });
}

export function execSit(ctrl, params = {}) {
  const duration = params.duration ? (params.duration > 20 ? params.duration / 1000 : params.duration) : 3.0;
  return new Promise((resolve) => {
    ctrl._activeGesture = {
      name: "sit",
      elapsed: 0,
      duration,
      resolve: () => {
        ctrl._resetArmsToRest();
        ctrl._resetLegsToRest();
        ctrl._rootPositionTarget.y = 0;
        ctrl._bodyTarget.roll = 0;
        resolve({ success: true, action: "sit" });
      },
      tick: (_delta, progress) => {
        const env = envelopeWeights(progress, 0.22, 0.22);
        ctrl._rootPositionTarget.y = -0.26 * env;
        ctrl._targetLegs.leftUpperLeg.set(-1.18 * env, 0, 0.05 * env);
        ctrl._targetLegs.rightUpperLeg.set(-1.18 * env, 0, -0.05 * env);
        ctrl._targetLegs.leftLowerLeg.set(1.25 * env, 0, 0);
        ctrl._targetLegs.rightLowerLeg.set(1.25 * env, 0, 0);
        ctrl._targetArms.leftUpperArm.set(0.16, -0.35 * env - 0.1, -1.05);
        ctrl._targetArms.leftLowerArm.set(0.1, -0.75 * env - 0.22, 0);
        ctrl._targetArms.rightUpperArm.set(0.16, 0.35 * env + 0.1, 1.05);
        ctrl._targetArms.rightLowerArm.set(0.1, 0.75 * env + 0.22, 0);
      },
    };
  });
}

export function execLookAround(ctrl, params = {}) {
  const duration = params.duration ? (params.duration > 20 ? params.duration / 1000 : params.duration) : 2.6;
  return new Promise((resolve) => {
    ctrl._activeGesture = {
      name: "look_around",
      elapsed: 0,
      duration,
      resolve: () => {
        ctrl._gestureOffset = { pitch: 0, yaw: 0, roll: 0 };
        ctrl._bodyTarget.roll = 0;
        resolve({ success: true });
      },
      tick: (_delta, progress) => {
        const env = envelopeWeights(progress, 0.16, 0.2);
        ctrl._gestureOffset.yaw = Math.sin(progress * Math.PI * 2) * 0.36 * env;
        ctrl._gestureOffset.pitch = Math.sin(progress * Math.PI * 4) * 0.08 * env;
        ctrl._bodyTarget.roll = Math.sin(progress * Math.PI * 2) * 0.035 * env;
      },
    };
  });
}

export function execMove(ctrl, deltaX = 0) {
  return execWalk(ctrl, {
    x: Math.max(-0.45, Math.min(0.45, ctrl._rootPositionTarget.x + deltaX)),
    direction: deltaX < 0 ? "left" : "right",
    duration: 1.4,
  });
}

export function execMoveSpatial(ctrl, params = {}) {
  if (params.cameraMode && FRAMING_MODES[params.cameraMode]) {
    CameraFramingManager.setMode(params.cameraMode);
  }
  const targetX = typeof params.x === "number" ? params.x : ctrl._rootPositionTarget.x;
  const targetZ = typeof params.z === "number" ? params.z : ctrl._rootPositionTarget.z;
  return execWalk(ctrl, {
    x: targetX,
    z: targetZ,
    direction: targetZ < ctrl._rootPositionTarget.z ? "backward" : "forward",
    duration: params.duration || 1.8,
  });
}

export function execLean(ctrl, optionsOrRoll = 0) {
  const roll =
    typeof optionsOrRoll === "number"
      ? optionsOrRoll
      : optionsOrRoll?.direction === "left"
      ? -0.08
      : 0.08;
  ctrl._bodyTarget.roll = roll;
  return new Promise((res) => setTimeout(res, 750));
}

export function execResetAll(ctrl) {
  CameraFramingManager.setMode(FRAMING_MODES.HEAD_AND_SHOULDERS);
  ctrl._rootPositionTarget.set(0, 0, 0);
  ctrl._rootRotationTarget.set(0, 0, 0);
  ctrl._bodyTarget = { x: 0, y: 0, roll: 0 };
  ctrl._headTarget.set(0, 0, 0);
  ctrl._gestureOffset = { pitch: 0, yaw: 0, roll: 0 };
  ctrl._resetArmsToRest();
  ctrl._resetLegsToRest();
  return new Promise((res) => setTimeout(res, 750));
}

export function applySpatialGesture() {
  return smoothStep(1);
}
