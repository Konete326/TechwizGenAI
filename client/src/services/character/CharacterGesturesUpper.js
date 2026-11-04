import * as THREE from "three";
import CharacterStateManager, { CHARACTER_STATES } from "./CharacterStateManager.js";
import EmotionEngine, { EMOTIONS } from "./EmotionEngine.js";
import BoneControlSystem from "./BoneControlSystem.js";
import { REST_ARM_POSE, envelopeWeights, smoothStep } from "./CharacterPoseConstants.js";

function lerpArmToEuler(ctrl, boneKey, targetEulerArr, env) {
  const rest = REST_ARM_POSE[boneKey];
  if (!rest || !ctrl._targetArms[boneKey]) return;
  const clamped = BoneControlSystem.clampBoneEuler(
    boneKey,
    targetEulerArr[0],
    targetEulerArr[1],
    targetEulerArr[2],
    false
  );
  ctrl._targetArms[boneKey].set(
    rest.x + (clamped[0] - rest.x) * env,
    rest.y + (clamped[1] - rest.y) * env,
    rest.z + (clamped[2] - rest.z) * env
  );
}

function finishUpperGesture(ctrl, resolve, result = { success: true }) {
  ctrl._resetArmsToRest();
  ctrl._gestureOffset = { pitch: 0, yaw: 0, roll: 0 };
  ctrl._bodyTarget.roll = 0;
  resolve?.(result);
}

export function execNod(ctrl, params = {}) {
  const duration = params.duration ? (params.duration > 20 ? params.duration / 1000 : params.duration) : 1.3;
  return new Promise((resolve) => {
    ctrl._activeGesture = {
      name: "nod",
      elapsed: 0,
      duration,
      resolve: () => finishUpperGesture(ctrl, resolve),
      tick: (_delta, progress) => {
        const env = envelopeWeights(progress, 0.18, 0.22);
        ctrl._gestureOffset.pitch = Math.sin(progress * Math.PI * 4) * 0.18 * env;
      },
    };
  });
}

export function execShakeHead(ctrl, params = {}) {
  const duration = params.duration ? (params.duration > 20 ? params.duration / 1000 : params.duration) : 1.4;
  return new Promise((resolve) => {
    ctrl._activeGesture = {
      name: "shake_head",
      elapsed: 0,
      duration,
      resolve: () => finishUpperGesture(ctrl, resolve),
      tick: (_delta, progress) => {
        const env = envelopeWeights(progress, 0.18, 0.22);
        ctrl._gestureOffset.yaw = Math.sin(progress * Math.PI * 5) * 0.24 * env;
      },
    };
  });
}

export function execClap(ctrl, params = {}) {
  const duration = params.duration ? (params.duration > 20 ? params.duration / 1000 : params.duration) : 2.5;
  const cycles = params.cycles || 5;
  EmotionEngine.setEmotion(EMOTIONS.EXCITED, { intensity: 0.9, duration: duration * 1000 });

  return new Promise((resolve) => {
    ctrl._activeGesture = {
      name: "clap",
      elapsed: 0,
      duration,
      resolve: () => finishUpperGesture(ctrl, resolve),
      tick: (_delta, progress) => {
        const env = envelopeWeights(progress, 0.18, 0.2);
        const clapPulse =
          progress >= 0.16 && progress <= 0.84
            ? Math.abs(Math.sin(((progress - 0.16) / 0.68) * Math.PI * cycles))
            : 0;
        const spread = (1 - clapPulse) * 0.085 + 0.022;
        const bob = clapPulse * 0.016;

        const adapter = ctrl._adapter;
        if (adapter?.getHumanoidBone("leftUpperArm") && adapter?.getHumanoidBone("rightUpperArm")) {
          const lTarget = BoneControlSystem.getRelativeBodyTarget(adapter, "chest", [
            spread,
            0.06 + bob,
            0.26,
          ]);
          const rTarget = BoneControlSystem.getRelativeBodyTarget(adapter, "chest", [
            -spread,
            0.06 + bob,
            0.26,
          ]);
          const lSol = BoneControlSystem.solveArmIK(adapter, "left", lTarget);
          const rSol = BoneControlSystem.solveArmIK(adapter, "right", rTarget);
          lerpArmToEuler(ctrl, "leftUpperArm", lSol.upperEuler, env);
          lerpArmToEuler(ctrl, "leftLowerArm", lSol.lowerEuler, env);
          lerpArmToEuler(ctrl, "rightUpperArm", rSol.upperEuler, env);
          lerpArmToEuler(ctrl, "rightLowerArm", rSol.lowerEuler, env);
        } else {
          lerpArmToEuler(ctrl, "leftUpperArm", [0.18, -0.78 - clapPulse * 0.14, -0.58], env);
          lerpArmToEuler(ctrl, "leftLowerArm", [0.08, -1.38 - clapPulse * 0.16, 0.05], env);
          lerpArmToEuler(ctrl, "rightUpperArm", [0.18, 0.78 + clapPulse * 0.14, 0.58], env);
          lerpArmToEuler(ctrl, "rightLowerArm", [0.08, 1.38 + clapPulse * 0.16, -0.05], env);
        }

        lerpArmToEuler(ctrl, "leftHand", [-0.1, -0.32, (0.14 - clapPulse * 0.16)], env);
        lerpArmToEuler(ctrl, "rightHand", [-0.1, 0.32, (-0.14 + clapPulse * 0.16)], env);
        ctrl._gestureOffset.pitch = (-0.04 + clapPulse * 0.035) * env;
        ctrl._bodyTarget.roll = Math.sin(progress * Math.PI * 2) * 0.025 * env;
      },
    };
  });
}

export function execWaveRight(ctrl, params = {}) {
  const duration = params.duration ? (params.duration > 20 ? params.duration / 1000 : params.duration) : 2.3;
  EmotionEngine.setEmotion(EMOTIONS.HAPPY, { intensity: 0.85, duration: duration * 1000 });

  return new Promise((resolve) => {
    ctrl._activeGesture = {
      name: "wave_right",
      elapsed: 0,
      duration,
      resolve: () => finishUpperGesture(ctrl, resolve),
      tick: (_delta, progress) => {
        const env = envelopeWeights(progress, 0.18, 0.22);
        const wave = Math.sin(progress * Math.PI * 6) * env;
        const adapter = ctrl._adapter;
        if (adapter?.getHumanoidBone("rightUpperArm")) {
          const target = BoneControlSystem.getRelativeBodyTarget(adapter, "head", [
            -0.21 - wave * 0.045,
            0.02,
            0.24,
          ]);
          const sol = BoneControlSystem.solveArmIK(adapter, "right", target);
          lerpArmToEuler(ctrl, "rightUpperArm", sol.upperEuler, env);
          lerpArmToEuler(ctrl, "rightLowerArm", sol.lowerEuler, env);
        } else {
          lerpArmToEuler(ctrl, "rightUpperArm", [0.16, 0.55, 0.28], env);
          lerpArmToEuler(ctrl, "rightLowerArm", [0.12, 1.45 + wave * 0.18, 0.12], env);
        }
        lerpArmToEuler(ctrl, "rightHand", [0.1, 0.18, wave * 0.42], env);
        ctrl._gestureOffset.roll = -0.05 * env;
        ctrl._gestureOffset.yaw = 0.04 * env;
      },
    };
  });
}

export function execWaveLeft(ctrl, params = {}) {
  const duration = params.duration ? (params.duration > 20 ? params.duration / 1000 : params.duration) : 2.3;
  EmotionEngine.setEmotion(EMOTIONS.HAPPY, { intensity: 0.85, duration: duration * 1000 });

  return new Promise((resolve) => {
    ctrl._activeGesture = {
      name: "wave_left",
      elapsed: 0,
      duration,
      resolve: () => finishUpperGesture(ctrl, resolve),
      tick: (_delta, progress) => {
        const env = envelopeWeights(progress, 0.18, 0.22);
        const wave = Math.sin(progress * Math.PI * 6) * env;
        const adapter = ctrl._adapter;
        if (adapter?.getHumanoidBone("leftUpperArm")) {
          const target = BoneControlSystem.getRelativeBodyTarget(adapter, "head", [
            0.21 + wave * 0.045,
            0.02,
            0.24,
          ]);
          const sol = BoneControlSystem.solveArmIK(adapter, "left", target);
          lerpArmToEuler(ctrl, "leftUpperArm", sol.upperEuler, env);
          lerpArmToEuler(ctrl, "leftLowerArm", sol.lowerEuler, env);
        } else {
          lerpArmToEuler(ctrl, "leftUpperArm", [0.16, -0.55, -0.28], env);
          lerpArmToEuler(ctrl, "leftLowerArm", [0.12, -1.45 - wave * 0.18, -0.12], env);
        }
        lerpArmToEuler(ctrl, "leftHand", [0.1, -0.18, -wave * 0.42], env);
        ctrl._gestureOffset.roll = 0.05 * env;
        ctrl._gestureOffset.yaw = -0.04 * env;
      },
    };
  });
}

export function execWaveBoth(ctrl, params = {}) {
  const duration = params.duration ? (params.duration > 20 ? params.duration / 1000 : params.duration) : 2.5;
  EmotionEngine.setEmotion(EMOTIONS.EXCITED, { intensity: 0.9, duration: duration * 1000 });

  return new Promise((resolve) => {
    ctrl._activeGesture = {
      name: "wave_both",
      elapsed: 0,
      duration,
      resolve: () => finishUpperGesture(ctrl, resolve),
      tick: (_delta, progress) => {
        const env = envelopeWeights(progress, 0.18, 0.22);
        const wave = Math.sin(progress * Math.PI * 6) * env;
        const adapter = ctrl._adapter;
        if (adapter?.getHumanoidBone("leftUpperArm") && adapter?.getHumanoidBone("rightUpperArm")) {
          const lTarget = BoneControlSystem.getRelativeBodyTarget(adapter, "head", [
            0.22 + wave * 0.04,
            0.06,
            0.24,
          ]);
          const rTarget = BoneControlSystem.getRelativeBodyTarget(adapter, "head", [
            -0.22 - wave * 0.04,
            0.06,
            0.24,
          ]);
          const lSol = BoneControlSystem.solveArmIK(adapter, "left", lTarget);
          const rSol = BoneControlSystem.solveArmIK(adapter, "right", rTarget);
          lerpArmToEuler(ctrl, "leftUpperArm", lSol.upperEuler, env);
          lerpArmToEuler(ctrl, "leftLowerArm", lSol.lowerEuler, env);
          lerpArmToEuler(ctrl, "rightUpperArm", rSol.upperEuler, env);
          lerpArmToEuler(ctrl, "rightLowerArm", rSol.lowerEuler, env);
        } else {
          lerpArmToEuler(ctrl, "leftUpperArm", [0.16, -0.52, -0.22], env);
          lerpArmToEuler(ctrl, "leftLowerArm", [0.1, -1.42 - wave * 0.16, -0.1], env);
          lerpArmToEuler(ctrl, "rightUpperArm", [0.16, 0.52, 0.22], env);
          lerpArmToEuler(ctrl, "rightLowerArm", [0.1, 1.42 + wave * 0.16, 0.1], env);
        }
        lerpArmToEuler(ctrl, "leftHand", [0.1, -0.18, -wave * 0.38], env);
        lerpArmToEuler(ctrl, "rightHand", [0.1, 0.18, wave * 0.38], env);
      },
    };
  });
}

export function execGreeting(ctrl) {
  CharacterStateManager.transition(CHARACTER_STATES.GREETING);
  return execWaveRight(ctrl, { duration: 2.3 });
}

export function execHairAdjust(ctrl, params = {}) {
  const duration = params.duration ? (params.duration > 20 ? params.duration / 1000 : params.duration) : 2.3;
  const hand = params.hand === "left" ? "left" : "right";
  const isLeft = hand === "left";

  return new Promise((resolve) => {
    ctrl._activeGesture = {
      name: "hair_adjust",
      elapsed: 0,
      duration,
      resolve: () => finishUpperGesture(ctrl, resolve),
      tick: (_delta, progress) => {
        const env = envelopeWeights(progress, 0.22, 0.24);
        const sweep = Math.sin(progress * Math.PI * 2) * 0.035;
        const adapter = ctrl._adapter;
        if (adapter?.getHumanoidBone(isLeft ? "leftUpperArm" : "rightUpperArm")) {
          const target = BoneControlSystem.getRelativeBodyTarget(adapter, "head", [
            isLeft ? 0.14 : -0.14,
            0.02 + sweep,
            0.17,
          ]);
          const sol = BoneControlSystem.solveArmIK(adapter, hand, target);
          lerpArmToEuler(ctrl, isLeft ? "leftUpperArm" : "rightUpperArm", sol.upperEuler, env);
          lerpArmToEuler(ctrl, isLeft ? "leftLowerArm" : "rightLowerArm", sol.lowerEuler, env);
        } else if (isLeft) {
          lerpArmToEuler(ctrl, "leftUpperArm", [0.22, -0.62, -0.32], env);
          lerpArmToEuler(ctrl, "leftLowerArm", [0.12, -1.68, -0.12], env);
        } else {
          lerpArmToEuler(ctrl, "rightUpperArm", [0.22, 0.62, 0.32], env);
          lerpArmToEuler(ctrl, "rightLowerArm", [0.12, 1.68, 0.12], env);
        }
        lerpArmToEuler(
          ctrl,
          isLeft ? "leftHand" : "rightHand",
          [-0.14, isLeft ? -0.22 : 0.22, sweep * 2.2],
          env
        );
        ctrl._gestureOffset.roll = (isLeft ? 0.08 : -0.08) * env;
        ctrl._gestureOffset.yaw = (isLeft ? -0.06 : 0.06) * env;
      },
    };
  });
}

export function execHandshake(ctrl, params = {}) {
  const duration = params.duration ? (params.duration > 20 ? params.duration / 1000 : params.duration) : 2.3;
  EmotionEngine.setEmotion(EMOTIONS.HAPPY, { intensity: 0.85, duration: duration * 1000 });

  return new Promise((resolve) => {
    ctrl._activeGesture = {
      name: "handshake",
      elapsed: 0,
      duration,
      resolve: () => finishUpperGesture(ctrl, resolve),
      tick: (_delta, progress) => {
        const env = envelopeWeights(progress, 0.2, 0.22);
        const shake = Math.sin(progress * Math.PI * 5) * 0.035 * env;
        const adapter = ctrl._adapter;
        if (adapter?.getHumanoidBone("rightUpperArm")) {
          const target = BoneControlSystem.getRelativeBodyTarget(adapter, "chest", [
            -0.12,
            -0.02 + shake,
            0.34,
          ]);
          const sol = BoneControlSystem.solveArmIK(adapter, "right", target);
          lerpArmToEuler(ctrl, "rightUpperArm", sol.upperEuler, env);
          lerpArmToEuler(ctrl, "rightLowerArm", sol.lowerEuler, env);
        } else {
          lerpArmToEuler(ctrl, "rightUpperArm", [0.24, 0.58, 0.82], env);
          lerpArmToEuler(ctrl, "rightLowerArm", [0.08, 1.08 + shake * 2, 0.06], env);
        }
        ctrl._gestureOffset.pitch = 0.06 * env;
      },
    };
  });
}

export function execExtendHand(ctrl, params = {}) {
  const duration = params.duration ? (params.duration > 20 ? params.duration / 1000 : params.duration) : 2.2;
  const isLeft = params.hand === "left";
  const side = isLeft ? "left" : "right";

  return new Promise((resolve) => {
    ctrl._activeGesture = {
      name: "extend_hand",
      elapsed: 0,
      duration,
      resolve: () => finishUpperGesture(ctrl, resolve),
      tick: (_delta, progress) => {
        const env = envelopeWeights(progress, 0.2, 0.22);
        const adapter = ctrl._adapter;
        if (adapter?.getHumanoidBone(isLeft ? "leftUpperArm" : "rightUpperArm")) {
          const target = BoneControlSystem.getRelativeBodyTarget(adapter, "chest", [
            isLeft ? 0.16 : -0.16,
            0.04,
            0.36,
          ]);
          const sol = BoneControlSystem.solveArmIK(adapter, side, target);
          lerpArmToEuler(ctrl, isLeft ? "leftUpperArm" : "rightUpperArm", sol.upperEuler, env);
          lerpArmToEuler(ctrl, isLeft ? "leftLowerArm" : "rightLowerArm", sol.lowerEuler, env);
        } else if (isLeft) {
          lerpArmToEuler(ctrl, "leftUpperArm", [0.2, -0.62, -0.72], env);
          lerpArmToEuler(ctrl, "leftLowerArm", [0.06, -0.88, -0.05], env);
        } else {
          lerpArmToEuler(ctrl, "rightUpperArm", [0.2, 0.62, 0.72], env);
          lerpArmToEuler(ctrl, "rightLowerArm", [0.06, 0.88, 0.05], env);
        }
      },
    };
  });
}

export function execRaiseHand(ctrl, params = {}) {
  const duration = params.duration ? (params.duration > 20 ? params.duration / 1000 : params.duration) : 2.2;
  const isLeft = params.hand === "left";
  const side = isLeft ? "left" : "right";

  return new Promise((resolve) => {
    ctrl._activeGesture = {
      name: "raise_hand",
      elapsed: 0,
      duration,
      resolve: () => finishUpperGesture(ctrl, resolve),
      tick: (_delta, progress) => {
        const env = envelopeWeights(progress, 0.18, 0.22);
        const adapter = ctrl._adapter;
        if (adapter?.getHumanoidBone(isLeft ? "leftUpperArm" : "rightUpperArm")) {
          const target = BoneControlSystem.getRelativeBodyTarget(adapter, "head", [
            isLeft ? 0.19 : -0.19,
            0.2,
            0.22,
          ]);
          const sol = BoneControlSystem.solveArmIK(adapter, side, target);
          lerpArmToEuler(ctrl, isLeft ? "leftUpperArm" : "rightUpperArm", sol.upperEuler, env);
          lerpArmToEuler(ctrl, isLeft ? "leftLowerArm" : "rightLowerArm", sol.lowerEuler, env);
        } else if (isLeft) {
          lerpArmToEuler(ctrl, "leftUpperArm", [0.16, -0.45, 0.22], env);
          lerpArmToEuler(ctrl, "leftLowerArm", [0.06, -1.15, -0.08], env);
        } else {
          lerpArmToEuler(ctrl, "rightUpperArm", [0.16, 0.45, -0.22], env);
          lerpArmToEuler(ctrl, "rightLowerArm", [0.06, 1.15, 0.08], env);
        }
        ctrl._gestureOffset.pitch = -0.05 * env;
      },
    };
  });
}

export function execPoint(ctrl, params = {}) {
  const duration = params.duration ? (params.duration > 20 ? params.duration / 1000 : params.duration) : 2.3;
  const dir = String(params.direction || "").toLowerCase();
  const normX = typeof params.x === "number" ? params.x : dir === "left" ? -0.65 : dir === "right" ? 0.65 : 0.25;
  const normY = typeof params.y === "number" ? params.y : dir === "up" ? 0.55 : dir === "down" ? -0.55 : 0.12;

  const useLeft = dir === "left" || normX < -0.15;
  const side = useLeft ? "left" : "right";

  const offsetX = THREE.MathUtils.clamp(-normX * 0.34, -0.36, 0.36) || (useLeft ? 0.28 : -0.28);
  const offsetY = THREE.MathUtils.clamp(normY * 0.28 + 0.04, -0.24, 0.34);
  const offsetZ = 0.34;

  ctrl.setLookTarget(THREE.MathUtils.clamp(normX, -0.85, 0.85), THREE.MathUtils.clamp(normY, -0.75, 0.75));

  return new Promise((resolve) => {
    ctrl._activeGesture = {
      name: "point",
      elapsed: 0,
      duration,
      resolve: () => {
        ctrl.setLookTarget(0, 0);
        finishUpperGesture(ctrl, resolve);
      },
      tick: (_delta, progress) => {
        const env = envelopeWeights(progress, 0.18, 0.22);
        const pulse = Math.sin(progress * Math.PI * 3) * 0.02 * env;
        const adapter = ctrl._adapter;
        if (adapter?.getHumanoidBone(useLeft ? "leftUpperArm" : "rightUpperArm")) {
          const target = BoneControlSystem.getRelativeBodyTarget(adapter, "chest", [
            offsetX,
            offsetY,
            offsetZ + pulse,
          ]);
          const sol = BoneControlSystem.solveArmIK(adapter, side, target);
          lerpArmToEuler(ctrl, useLeft ? "leftUpperArm" : "rightUpperArm", sol.upperEuler, env);
          lerpArmToEuler(ctrl, useLeft ? "leftLowerArm" : "rightLowerArm", sol.lowerEuler, env);
        } else if (useLeft) {
          lerpArmToEuler(ctrl, "leftUpperArm", [0.18, -0.65, -0.42 + offsetY], env);
          lerpArmToEuler(ctrl, "leftLowerArm", [0.06, -0.72, -0.05], env);
        } else {
          lerpArmToEuler(ctrl, "rightUpperArm", [0.18, 0.65, 0.42 - offsetY], env);
          lerpArmToEuler(ctrl, "rightLowerArm", [0.06, 0.72, 0.05], env);
        }
        lerpArmToEuler(
          ctrl,
          useLeft ? "leftHand" : "rightHand",
          [-0.08, useLeft ? -0.18 : 0.18, 0],
          env
        );
        ctrl._bodyTarget.roll = (useLeft ? 0.035 : -0.035) * env;
      },
    };
  });
}

export function execLaugh(ctrl, params = {}) {
  const duration = params.duration ? (params.duration > 20 ? params.duration / 1000 : params.duration) : 2.5;
  EmotionEngine.setEmotion(EMOTIONS.EXCITED, { intensity: 1.0, duration: duration * 1000 });
  if (ctrl._adapter) {
    ctrl._adapter.setExpression("show_teeth", 0.9);
  }

  return new Promise((resolve) => {
    ctrl._activeGesture = {
      name: "laugh",
      elapsed: 0,
      duration,
      resolve: () => {
        if (ctrl._adapter) {
          ctrl._adapter.setExpression("show_teeth", 0);
        }
        finishUpperGesture(ctrl, resolve);
      },
      tick: (_delta, progress) => {
        const env = envelopeWeights(progress, 0.16, 0.22);
        const chuckle = Math.abs(Math.sin(progress * Math.PI * 7)) * env;
        const adapter = ctrl._adapter;
        if (adapter?.getHumanoidBone("rightUpperArm")) {
          const target = BoneControlSystem.getRelativeBodyTarget(adapter, "chest", [
            -0.08,
            0.12 + chuckle * 0.02,
            0.22,
          ]);
          const sol = BoneControlSystem.solveArmIK(adapter, "right", target);
          lerpArmToEuler(ctrl, "rightUpperArm", sol.upperEuler, env);
          lerpArmToEuler(ctrl, "rightLowerArm", sol.lowerEuler, env);
        } else {
          lerpArmToEuler(ctrl, "rightUpperArm", [0.22, 0.68, 0.62], env);
          lerpArmToEuler(ctrl, "rightLowerArm", [0.12, 1.52, 0.1], env);
        }
        ctrl._gestureOffset.pitch = (-0.08 + chuckle * 0.09) * env;
        ctrl._bodyTarget.roll = Math.sin(progress * Math.PI * 3) * 0.03 * env;
      },
    };
  });
}

export function applyUpperBodyGesture() {
  return smoothStep(1);
}
