import * as THREE from "three";

const BONE_CONSTRAINTS = {
  hips: {
    dof: ["rotX", "rotY", "rotZ", "posX", "posY", "posZ"],
    rotLimits: { x: [-0.45, 0.55], y: [-0.85, 0.85], z: [-0.35, 0.35] },
    posLimits: { x: [-0.8, 0.8], y: [-0.45, 0.65], z: [-0.8, 0.8] },
  },
  spine: {
    dof: ["rotX", "rotY", "rotZ"],
    rotLimits: { x: [-0.45, 0.65], y: [-0.55, 0.55], z: [-0.35, 0.35] },
  },
  chest: {
    dof: ["rotX", "rotY", "rotZ"],
    rotLimits: { x: [-0.4, 0.55], y: [-0.55, 0.55], z: [-0.35, 0.35] },
  },
  upperChest: {
    dof: ["rotX", "rotY", "rotZ"],
    rotLimits: { x: [-0.3, 0.4], y: [-0.4, 0.4], z: [-0.25, 0.25] },
  },
  neck: {
    dof: ["rotX", "rotY", "rotZ"],
    rotLimits: { x: [-0.45, 0.45], y: [-0.65, 0.65], z: [-0.35, 0.35] },
  },
  head: {
    dof: ["rotX", "rotY", "rotZ"],
    rotLimits: { x: [-0.55, 0.55], y: [-0.85, 0.85], z: [-0.4, 0.4] },
  },
  leftShoulder: {
    dof: ["rotX", "rotY", "rotZ"],
    rotLimits: { x: [-0.35, 0.35], y: [-0.45, 0.35], z: [-0.35, 0.55] },
  },
  rightShoulder: {
    dof: ["rotX", "rotY", "rotZ"],
    rotLimits: { x: [-0.35, 0.35], y: [-0.35, 0.45], z: [-0.55, 0.35] },
  },
  leftUpperArm: {
    dof: ["rotX", "rotY", "rotZ"],
    rotLimits: { x: [-1.45, 1.45], y: [-1.65, 0.45], z: [-1.45, 1.35] },
    primaryAxis: [1, 0, 0],
    forwardYawSign: -1,
  },
  rightUpperArm: {
    dof: ["rotX", "rotY", "rotZ"],
    rotLimits: { x: [-1.45, 1.45], y: [-0.45, 1.65], z: [-1.35, 1.45] },
    primaryAxis: [-1, 0, 0],
    forwardYawSign: 1,
  },
  leftLowerArm: {
    dof: ["rotX", "rotY", "rotZ"],
    rotLimits: { x: [-0.85, 0.85], y: [-2.35, 0.05], z: [-0.95, 0.95] },
    primaryAxis: [1, 0, 0],
    forwardFlexSign: -1,
  },
  rightLowerArm: {
    dof: ["rotX", "rotY", "rotZ"],
    rotLimits: { x: [-0.85, 0.85], y: [-0.05, 2.35], z: [-0.95, 0.95] },
    primaryAxis: [-1, 0, 0],
    forwardFlexSign: 1,
  },
  leftHand: {
    dof: ["rotX", "rotY", "rotZ"],
    rotLimits: { x: [-0.95, 0.95], y: [-0.85, 0.85], z: [-0.95, 0.95] },
  },
  rightHand: {
    dof: ["rotX", "rotY", "rotZ"],
    rotLimits: { x: [-0.95, 0.95], y: [-0.85, 0.85], z: [-0.95, 0.95] },
  },
  leftUpperLeg: {
    dof: ["rotX", "rotY", "rotZ"],
    rotLimits: { x: [-1.55, 0.65], y: [-0.55, 0.55], z: [-0.55, 0.55] },
    primaryAxis: [0, -1, 0],
    forwardLiftSign: -1,
  },
  rightUpperLeg: {
    dof: ["rotX", "rotY", "rotZ"],
    rotLimits: { x: [-1.55, 0.65], y: [-0.55, 0.55], z: [-0.55, 0.55] },
    primaryAxis: [0, -1, 0],
    forwardLiftSign: -1,
  },
  leftLowerLeg: {
    dof: ["rotX"],
    rotLimits: { x: [0.0, 2.25], y: [-0.15, 0.15], z: [-0.15, 0.15] },
    primaryAxis: [0, -1, 0],
    kneeBendSign: 1,
  },
  rightLowerLeg: {
    dof: ["rotX"],
    rotLimits: { x: [0.0, 2.25], y: [-0.15, 0.15], z: [-0.15, 0.15] },
    primaryAxis: [0, -1, 0],
    kneeBendSign: 1,
  },
  leftFoot: {
    dof: ["rotX", "rotY", "rotZ"],
    rotLimits: { x: [-0.65, 0.75], y: [-0.35, 0.35], z: [-0.35, 0.35] },
  },
  rightFoot: {
    dof: ["rotX", "rotY", "rotZ"],
    rotLimits: { x: [-0.65, 0.75], y: [-0.35, 0.35], z: [-0.35, 0.35] },
  },
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

class BoneControlSystemClass {
  constructor() {
    this._tempVecA = new THREE.Vector3();
    this._tempVecB = new THREE.Vector3();
    this._tempVecC = new THREE.Vector3();
    this._tempQuatA = new THREE.Quaternion();
    this._tempQuatB = new THREE.Quaternion();
  }

  getBoneSpec(boneName) {
    return BONE_CONSTRAINTS[boneName] || {
      dof: ["rotX", "rotY", "rotZ"],
      rotLimits: { x: [-1.2, 1.2], y: [-1.2, 1.2], z: [-1.2, 1.2] },
    };
  }

  getAllBoneConstraints() {
    return BONE_CONSTRAINTS;
  }

  clampBoneEuler(boneName, rx = 0, ry = 0, rz = 0, allowRearReach = false) {
    const spec = this.getBoneSpec(boneName);
    const lim = spec.rotLimits || { x: [-1.5, 1.5], y: [-1.5, 1.5], z: [-1.5, 1.5] };
    let cx = clamp(Number(rx) || 0, lim.x[0], lim.x[1]);
    let cy = clamp(Number(ry) || 0, lim.y[0], lim.y[1]);
    let cz = clamp(Number(rz) || 0, lim.z[0], lim.z[1]);

    if (!allowRearReach) {
      if (boneName === "leftUpperArm" && cy > 0.18) {
        cy = -Math.abs(cy);
      } else if (boneName === "rightUpperArm" && cy < -0.18) {
        cy = Math.abs(cy);
      } else if (boneName === "leftLowerArm" && cy > 0.05) {
        cy = -Math.abs(cy);
      } else if (boneName === "rightLowerArm" && cy < -0.05) {
        cy = Math.abs(cy);
      }
    }

    return [cx, cy, cz];
  }

  getRelativeBodyTarget(adapter, anchor = "chest", localOffset = [0, 0, 0.28]) {
    if (!adapter) return new THREE.Vector3(localOffset[0], 1.2 + localOffset[1], localOffset[2]);
    const bone =
      adapter.getHumanoidBone(anchor) ||
      adapter.getHumanoidBone("chest") ||
      adapter.getHumanoidBone("hips");
    const pos = new THREE.Vector3(0, anchor === "head" ? 1.38 : 1.15, 0);
    if (bone) {
      if (adapter.root) adapter.root.updateMatrixWorld(true);
      bone.getWorldPosition(pos);
    }
    const rootQuat = adapter.root ? adapter.root.quaternion : new THREE.Quaternion();
    const off = new THREE.Vector3(localOffset[0], localOffset[1], localOffset[2]).applyQuaternion(rootQuat);
    return pos.add(off);
  }

  solveArmIK(adapter, side = "left", targetWorldPos, poleDirection = null) {
    const isLeft = side === "left";
    const s = isLeft ? 1 : -1;
    const upperName = isLeft ? "leftUpperArm" : "rightUpperArm";
    const lowerName = isLeft ? "leftLowerArm" : "rightLowerArm";
    const handName = isLeft ? "leftHand" : "rightHand";

    const upperNode = adapter?.getHumanoidBone(upperName);
    const lowerNode = adapter?.getHumanoidBone(lowerName);
    const handNode = adapter?.getHumanoidBone(handName);

    if (!upperNode || !lowerNode || !handNode) {
      return {
        upperEuler: [0.15, -s * 0.65, -s * 0.45],
        lowerEuler: [0.1, -s * 1.15, 0],
      };
    }

    if (adapter.root) adapter.root.updateMatrixWorld(true);

    const shoulderWorld = new THREE.Vector3();
    const elbowWorld = new THREE.Vector3();
    const wristWorld = new THREE.Vector3();
    upperNode.getWorldPosition(shoulderWorld);
    lowerNode.getWorldPosition(elbowWorld);
    handNode.getWorldPosition(wristWorld);

    const L1 = Math.max(0.14, shoulderWorld.distanceTo(elbowWorld) || 0.214);
    const L2 = Math.max(0.14, elbowWorld.distanceTo(wristWorld) || 0.222);

    const parentQuat = new THREE.Quaternion();
    if (upperNode.parent) {
      upperNode.parent.getWorldQuaternion(parentQuat);
    }

    const toTargetLocal = targetWorldPos
      .clone()
      .sub(shoulderWorld)
      .applyQuaternion(parentQuat.clone().invert());

    if (toTargetLocal.z < 0.04) {
      toTargetLocal.z = Math.max(0.06, Math.abs(toTargetLocal.z));
    }

    const maxReach = (L1 + L2) * 0.985;
    const minReach = Math.abs(L1 - L2) + 0.03;
    const d = clamp(toTargetLocal.length(), minReach, maxReach);
    const dir = toTargetLocal.clone().normalize();

    const cosElbowInterior = clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1);
    const elbowBend = Math.PI - Math.acos(cosElbowInterior);

    const cosShoulderOffset = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
    const alpha = Math.acos(cosShoulderOffset);

    const restDir = new THREE.Vector3(s, 0, 0);
    const qBase = new THREE.Quaternion().setFromUnitVectors(restDir, dir);

    const defaultPole = poleDirection
      ? poleDirection.clone().normalize()
      : new THREE.Vector3(s * 0.28, -0.92, -0.22).normalize();

    const bendAxis = new THREE.Vector3().crossVectors(dir, defaultPole);
    if (bendAxis.lengthSq() < 1e-5) {
      bendAxis.set(0, 1, 0);
    } else {
      bendAxis.normalize();
    }

    const qOffset = new THREE.Quaternion().setFromAxisAngle(bendAxis, alpha);
    const qUpper = qOffset.multiply(qBase);

    const upperEuler = new THREE.Euler().setFromQuaternion(qUpper, "XYZ");
    const clampedUpper = this.clampBoneEuler(
      upperName,
      upperEuler.x,
      upperEuler.y,
      upperEuler.z,
      false
    );

    const lowerRotY = clamp(-s * elbowBend, isLeft ? -2.3 : 0.0, isLeft ? 0.0 : 2.3);
    const lowerEuler = [0, lowerRotY, 0];

    return {
      upperEuler: clampedUpper,
      lowerEuler,
      reachDistance: d,
      elbowBend,
    };
  }

  applyArmIK(adapter, side, targetWorldPos, factor = 0.22, poleDirection = null) {
    if (!adapter) return null;
    const isLeft = side === "left";
    const upperName = isLeft ? "leftUpperArm" : "rightUpperArm";
    const lowerName = isLeft ? "leftLowerArm" : "rightLowerArm";
    const upperNode = adapter.getHumanoidBone(upperName);
    const lowerNode = adapter.getHumanoidBone(lowerName);
    if (!upperNode || !lowerNode) return null;

    const sol = this.solveArmIK(adapter, side, targetWorldPos, poleDirection);
    this.slerpBoneEuler(upperNode, sol.upperEuler[0], sol.upperEuler[1], sol.upperEuler[2], factor);
    this.slerpBoneEuler(lowerNode, sol.lowerEuler[0], sol.lowerEuler[1], sol.lowerEuler[2], factor);
    return sol;
  }

  slerpBoneEuler(boneNode, rx, ry, rz, factor = 0.2) {
    if (!boneNode) return;
    const euler = new THREE.Euler(rx, ry, rz, "XYZ");
    this._tempQuatA.setFromEuler(euler);
    boneNode.quaternion.slerp(this._tempQuatA, clamp(factor, 0.01, 1.0));
  }

  enforceForwardHandSafety(adapter, activeGestureType = "") {
    if (!adapter?.root) return;
    const rearAllowed = activeGestureType === "WALK" || activeGestureType === "JUMP";
    if (rearAllowed) return;

    const lUpper = adapter.getHumanoidBone("leftUpperArm");
    const lLower = adapter.getHumanoidBone("leftLowerArm");
    const rUpper = adapter.getHumanoidBone("rightUpperArm");
    const rLower = adapter.getHumanoidBone("rightLowerArm");

    if (lUpper && lUpper.rotation.y > 0.16) {
      lUpper.rotation.y = -Math.abs(lUpper.rotation.y);
    }
    if (lLower && lLower.rotation.y > 0.05) {
      lLower.rotation.y = -Math.abs(lLower.rotation.y);
    }
    if (rUpper && rUpper.rotation.y < -0.16) {
      rUpper.rotation.y = Math.abs(rUpper.rotation.y);
    }
    if (rLower && rLower.rotation.y < -0.05) {
      rLower.rotation.y = Math.abs(rLower.rotation.y);
    }
  }

  inspectRigState(adapter) {
    if (!adapter) return { available: false, bones: {} };
    if (adapter.root) adapter.root.updateMatrixWorld(true);
    const bones = {};
    for (const boneName of Object.keys(BONE_CONSTRAINTS)) {
      const node = adapter.getHumanoidBone(boneName);
      if (!node) continue;
      const worldPos = new THREE.Vector3();
      node.getWorldPosition(worldPos);
      bones[boneName] = {
        rotation: [
          Number(node.rotation.x.toFixed(3)),
          Number(node.rotation.y.toFixed(3)),
          Number(node.rotation.z.toFixed(3)),
        ],
        worldPosition: [
          Number(worldPos.x.toFixed(3)),
          Number(worldPos.y.toFixed(3)),
          Number(worldPos.z.toFixed(3)),
        ],
        constraints: BONE_CONSTRAINTS[boneName],
      };
    }
    return {
      available: true,
      characterId: adapter.characterId,
      rootPosition: adapter.root
        ? [
            Number(adapter.root.position.x.toFixed(3)),
            Number(adapter.root.position.y.toFixed(3)),
            Number(adapter.root.position.z.toFixed(3)),
          ]
        : [0, 0, 0],
      bones,
    };
  }
}

const BoneControlSystem = new BoneControlSystemClass();
export default BoneControlSystem;
