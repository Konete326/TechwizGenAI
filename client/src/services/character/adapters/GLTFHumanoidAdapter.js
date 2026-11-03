/**
 * GLTFHumanoidAdapter — Universal adapter for standard GLB/GLTF humanoid characters
 * (Mixamo, ReadyPlayerMe, standard game avatars).
 * Implements ICharacterAdapter.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ICharacterAdapter } from "./ICharacterAdapter.js";

// Common bone naming patterns mapped to standard humanoid names
const BONE_PATTERNS = {
  head: [/head/i, /bip.*head/i],
  neck: [/neck/i, /bip.*neck/i],
  chest: [/chest/i, /spine2/i, /bip.*spine2/i],
  spine: [/spine/i, /bip.*spine/i],
  hips: [/hips/i, /pelvis/i, /root/i],
  leftEye: [/eye.*l/i, /left.*eye/i],
  rightEye: [/eye.*r/i, /right.*eye/i],
  leftShoulder: [/shoulder.*l/i, /clavicle.*l/i],
  rightShoulder: [/shoulder.*r/i, /clavicle.*r/i],
  leftUpperArm: [/upper.*arm.*l/i, /arm.*l/i],
  rightUpperArm: [/upper.*arm.*r/i, /arm.*r/i],
  leftLowerArm: [/forearm.*l/i, /lower.*arm.*l/i],
  rightLowerArm: [/forearm.*r/i, /lower.*arm.*r/i],
  leftHand: [/hand.*l/i, /wrist.*l/i],
  rightHand: [/hand.*r/i, /wrist.*r/i],
};

export class GLTFHumanoidAdapter extends ICharacterAdapter {
  constructor(characterId, metadata = {}) {
    super(characterId, metadata);
    /** @type {Map<string, THREE.Bone>} */
    this._boneMap = new Map();
    /** @type {Map<string, { mesh: THREE.Mesh, index: number }>} */
    this._morphMap = new Map();
    this._availableExpressions = new Set();
  }

  async load(modelUrl, onProgress) {
    const loader = new GLTFLoader();

    const gltf = await new Promise((resolve, reject) => {
      loader.load(
        modelUrl,
        resolve,
        (pe) => {
          if (pe.total > 0 && onProgress) {
            onProgress(Math.round((pe.loaded / pe.total) * 100));
          }
        },
        reject
      );
    });

    this.root = gltf.scene;
    this._discoverBones(this.root);
    this._discoverMorphTargets(this.root);

    this.profile = this.inspectCapabilities();
    return this.root;
  }

  _discoverBones(root) {
    this._boneMap.clear();
    const bones = [];
    root.traverse((obj) => {
      if (obj.isBone || obj.type === "Bone") bones.push(obj);
    });

    for (const [standardName, patterns] of Object.entries(BONE_PATTERNS)) {
      for (const bone of bones) {
        if (patterns.some((p) => p.test(bone.name))) {
          this._boneMap.set(standardName, bone);
          break;
        }
      }
    }
  }

  _discoverMorphTargets(root) {
    this._morphMap.clear();
    this._availableExpressions.clear();

    root.traverse((obj) => {
      if (obj.isMesh && obj.morphTargetDictionary && obj.morphTargetInfluences) {
        for (const [name, index] of Object.entries(obj.morphTargetDictionary)) {
          const lower = name.toLowerCase();
          this._morphMap.set(lower, { mesh: obj, index });
          this._availableExpressions.add(lower);

          // Standardize common ARKit/blendshape names
          if (lower.includes("smile") || lower.includes("mouthsmile")) this._morphMap.set("happy", { mesh: obj, index });
          if (lower.includes("blink") || lower.includes("eyeblink")) this._morphMap.set("blink", { mesh: obj, index });
          if (lower.includes("jawopen") || lower.includes("mouthopen")) this._morphMap.set("aa", { mesh: obj, index });
        }
      }
    });
  }

  inspectCapabilities() {
    const bones = Array.from(this._boneMap.keys());
    const expressions = Array.from(this._availableExpressions);

    return {
      characterId: this.characterId,
      format: "GLTF_HUMANOID",
      name: this.metadata.name || this.characterId,
      bones,
      expressions,
      capabilities: {
        proceduralLookAt: this._boneMap.has("head"),
        proceduralGestures: this._boneMap.has("head"),
        handGestures: this._boneMap.has("leftHand") && this._boneMap.has("rightHand"),
        realtimeLipSync: this._morphMap.has("aa") || expressions.some((e) => e.includes("mouth")),
        facialExpressions: expressions.length > 0,
        eyeBlink: this._morphMap.has("blink")
      },
      inspectedAt: new Date().toISOString()
    };
  }

  getHumanoidBone(boneName) {
    return this._boneMap.get(boneName) || null;
  }

  setExpression(expressionName, intensity = 1.0) {
    const lower = expressionName.toLowerCase();
    const entry = this._morphMap.get(lower);
    if (!entry) return;
    const clamped = Math.max(0, Math.min(1, intensity));
    entry.mesh.morphTargetInfluences[entry.index] = clamped;
  }

  getExpression(expressionName) {
    const entry = this._morphMap.get(expressionName.toLowerCase());
    return entry ? entry.mesh.morphTargetInfluences[entry.index] : 0;
  }

  getAvailableExpressions() {
    return Array.from(this._availableExpressions);
  }

  resetExpressions() {
    for (const [, entry] of this._morphMap) {
      entry.mesh.morphTargetInfluences[entry.index] = 0;
    }
  }

  update(delta) {
    // update hooks if needed
  }

  getCameraFraming(mode = "HEAD_AND_SHOULDERS", aspect = 1.0) {
    const head = this.getHumanoidBone("head");
    const headPos = new THREE.Vector3();
    if (head) head.getWorldPosition(headPos);
    const headY = head ? headPos.y : 1.5;

    switch (mode) {
      case "CLOSE_UP":
        return { cameraPosition: [0, headY, aspect < 1 ? 0.75 : 0.65], target: [0, headY, 0], fov: 24 };
      case "HEAD_AND_SHOULDERS":
      default:
        return { cameraPosition: [0, headY + 0.02, aspect < 0.8 ? 1.35 : 1.15], target: [0, headY - 0.08, 0], fov: 28 };
      case "BUST":
        return { cameraPosition: [0, headY, aspect < 0.8 ? 1.6 : 1.4], target: [0, headY - 0.2, 0], fov: 30 };
      case "FULL_BODY":
        return { cameraPosition: [0, headY * 0.55, aspect < 0.8 ? 3.4 : 2.8], target: [0, headY * 0.5, 0], fov: 32 };
    }
  }

  dispose() {
    if (this.root) {
      this.root.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });
      this.root = null;
    }
    this._boneMap.clear();
    this._morphMap.clear();
    this._availableExpressions.clear();
    super.dispose();
  }
}
