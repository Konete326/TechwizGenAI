import * as THREE from "three";

export const REST_ARM_POSE = {
  leftShoulder: new THREE.Euler(0.0, 0.0, -0.04),
  rightShoulder: new THREE.Euler(0.0, 0.0, 0.04),
  leftUpperArm: new THREE.Euler(0.06, -0.1, -1.24),
  leftLowerArm: new THREE.Euler(0.08, -0.22, -0.05),
  leftHand: new THREE.Euler(0.04, -0.05, -0.1),
  rightUpperArm: new THREE.Euler(0.06, 0.1, 1.24),
  rightLowerArm: new THREE.Euler(0.08, 0.22, 0.05),
  rightHand: new THREE.Euler(0.04, 0.05, 0.1),
};

export const REST_LEG_POSE = {
  leftUpperLeg: new THREE.Euler(0, 0, 0),
  leftLowerLeg: new THREE.Euler(0.02, 0, 0),
  leftFoot: new THREE.Euler(0, 0, 0),
  rightUpperLeg: new THREE.Euler(0, 0, 0),
  rightLowerLeg: new THREE.Euler(0.02, 0, 0),
  rightFoot: new THREE.Euler(0, 0, 0),
};

export const RELAXED_POSE = {
  leftShoulder: { rotX: 0.0, rotY: 0.0, rotZ: -0.04 },
  rightShoulder: { rotX: 0.0, rotY: 0.0, rotZ: 0.04 },
  leftUpperArm: { rotX: 0.06, rotY: -0.1, rotZ: -1.24 },
  rightUpperArm: { rotX: 0.06, rotY: 0.1, rotZ: 1.24 },
  leftLowerArm: { rotX: 0.08, rotY: -0.22, rotZ: -0.05 },
  rightLowerArm: { rotX: 0.08, rotY: 0.22, rotZ: 0.05 },
  leftHand: { rotX: 0.04, rotY: -0.05, rotZ: -0.1 },
  rightHand: { rotX: 0.04, rotY: 0.05, rotZ: 0.1 },
};

export function smoothStep(t) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

export function envelopeWeights(progress, rampIn = 0.2, rampOut = 0.22) {
  if (progress < rampIn) return smoothStep(progress / rampIn);
  if (progress > 1 - rampOut) return smoothStep((1 - progress) / rampOut);
  return 1.0;
}
