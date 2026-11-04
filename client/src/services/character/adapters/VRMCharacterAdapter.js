import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { ICharacterAdapter } from "./ICharacterAdapter.js";

const STANDARD_HUMANOID_BONES = [
  "hips", "spine", "chest", "upperChest", "neck", "head",
  "leftEye", "rightEye", "jaw",
  "leftShoulder", "rightShoulder",
  "leftUpperArm", "leftLowerArm", "leftHand",
  "rightUpperArm", "rightLowerArm", "rightHand",
  "leftUpperLeg", "leftLowerLeg", "leftFoot", "leftToes",
  "rightUpperLeg", "rightLowerLeg", "rightFoot", "rightToes",
  "leftThumbMetacarpal", "leftThumbProximal", "leftThumbDistal",
  "leftIndexProximal", "leftIndexIntermediate", "leftIndexDistal",
  "leftMiddleProximal", "leftMiddleIntermediate", "leftMiddleDistal",
  "leftRingProximal", "leftRingIntermediate", "leftRingDistal",
  "leftLittleProximal", "leftLittleIntermediate", "leftLittleDistal",
  "rightThumbMetacarpal", "rightThumbProximal", "rightThumbDistal",
  "rightIndexProximal", "rightIndexIntermediate", "rightIndexDistal",
  "rightMiddleProximal", "rightMiddleIntermediate", "rightMiddleDistal",
  "rightRingProximal", "rightRingIntermediate", "rightRingDistal",
  "rightLittleProximal", "rightLittleIntermediate", "rightLittleDistal",
];

export class VRMCharacterAdapter extends ICharacterAdapter {
  constructor(characterId, metadata = {}) {
    super(characterId, metadata);
    this.vrm = null;
    this._availableExpressions = new Set();
    this._expressionMap = new Map();
    this._cachedTopHairY = null;
    this._cachedBounds = null;
    this._restPoseMap = new Map();
  }

  async load(modelUrl, onProgress) {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

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

    const vrm = gltf.userData.vrm;
    if (!vrm) {
      throw new Error(`Loaded asset at ${modelUrl} does not contain valid VRM data.`);
    }

    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.combineSkeletons(gltf.scene);
    VRMUtils.rotateVRM0(vrm);

    this.vrm = vrm;
    this.root = vrm.scene;
    this._faceMesh = null;
    this._cachedTopHairY = null;
    this._cachedBounds = null;
    this._restPoseMap.clear();

    this.root.updateMatrixWorld(true);

    this.root.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
        obj.frustumCulled = false;
        if (
          obj.morphTargetDictionary &&
          (obj.name.toLowerCase().includes("face") || obj.name.toLowerCase().includes("head"))
        ) {
          this._faceMesh = obj;
        }
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const mat of mats) {
            if (mat.map) {
              mat.map.anisotropy = 2;
              mat.map.generateMipmaps = true;
              mat.map.minFilter = THREE.LinearMipmapLinearFilter;
              mat.map.magFilter = THREE.LinearFilter;
              mat.map.needsUpdate = true;
            }
          }
        }
      }
    });

    this.profile = this.inspectCapabilities();
    return this.root;
  }

  inspectCapabilities() {
    this._availableExpressions.clear();
    const bones = [];
    const expressions = [];
    const boneHierarchy = {};
    const morphTargets = new Set();

    if (this.root) {
      this.root.updateMatrixWorld(true);
      this.root.traverse((obj) => {
        if (obj.isMesh && obj.morphTargetDictionary) {
          for (const key of Object.keys(obj.morphTargetDictionary)) {
            morphTargets.add(key);
          }
        }
      });
    }

    for (const bName of STANDARD_HUMANOID_BONES) {
      const node = this.getHumanoidBone(bName);
      if (node) {
        bones.push(bName);
        const worldPos = new THREE.Vector3();
        node.getWorldPosition(worldPos);
        this._restPoseMap.set(bName, {
          position: [node.position.x, node.position.y, node.position.z],
          quaternion: [node.quaternion.x, node.quaternion.y, node.quaternion.z, node.quaternion.w],
          worldPosition: [worldPos.x, worldPos.y, worldPos.z],
        });
        boneHierarchy[bName] = {
          name: bName,
          nodeName: node.name,
          parentName: node.parent?.name || null,
          restPosition: [
            Number(node.position.x.toFixed(4)),
            Number(node.position.y.toFixed(4)),
            Number(node.position.z.toFixed(4)),
          ],
          worldRestPosition: [
            Number(worldPos.x.toFixed(4)),
            Number(worldPos.y.toFixed(4)),
            Number(worldPos.z.toFixed(4)),
          ],
        };
      }
    }

    const em = this.vrm?.expressionManager;
    if (em) {
      if (em.expressionMap) {
        if (em.expressionMap instanceof Map) {
          for (const k of em.expressionMap.keys()) this._availableExpressions.add(k);
        } else if (typeof em.expressionMap === "object") {
          for (const k of Object.keys(em.expressionMap)) this._availableExpressions.add(k);
        }
      }
      if (Array.isArray(em.expressions)) {
        for (const exp of em.expressions) {
          const name = exp?.expressionName || exp?.name;
          if (name) this._availableExpressions.add(name);
        }
      }
      const candidates = [
        "happy", "angry", "sad", "relaxed", "surprised",
        "aa", "ih", "ou", "ee", "oh",
        "blink", "blinkLeft", "blinkRight", "neutral",
      ];
      for (const c of candidates) {
        if (em.getExpression?.(c) != null) this._availableExpressions.add(c);
      }
    } else if (this.vrm?.blendShapeProxy) {
      const bsp = this.vrm.blendShapeProxy;
      if (bsp.blendShapeGroups) {
        for (const g of bsp.blendShapeGroups) {
          const n = (g.name || g.presetName || "").toLowerCase();
          if (n) this._availableExpressions.add(n);
        }
      }
    }

    const hasTeethSupport =
      this._availableExpressions.has("happy") &&
      (this._availableExpressions.has("ee") || this._availableExpressions.has("ih"));
    if (hasTeethSupport) {
      this._availableExpressions.add("show_teeth");
      this._availableExpressions.add("teeth");
    }

    expressions.push(...this._availableExpressions);

    const bounds = this._computeModelBounds();
    this._cachedBounds = bounds;
    this._cachedTopHairY = bounds.height;

    const hasPhonemes = ["aa", "oh", "ee"].some((p) => this._availableExpressions.has(p));
    const hasHead = bones.includes("head");
    const hasHands = bones.includes("leftHand") && bones.includes("rightHand");
    const hasLegs = bones.includes("leftUpperLeg") && bones.includes("rightUpperLeg");
    const hasFingers = bones.some((b) => b.includes("IndexProximal"));
    const springManager = this.vrm?.springBoneManager;
    const springCount = springManager?.springs?.length || springManager?.springs?.size || 0;
    const hasHairPhysics = springCount > 0;

    return {
      characterId: this.characterId,
      format: this.vrm?.meta?.metaVersion === "0" ? "VRM_0" : "VRM_1",
      name: this.vrm?.meta?.name || this.characterId,
      authors: this.vrm?.meta?.authors || [],
      bones,
      boneHierarchy,
      expressions,
      morphTargets: Array.from(morphTargets),
      bounds,
      springBoneChains: springCount,
      capabilities: {
        proceduralLookAt: hasHead,
        proceduralGestures: hasHead,
        handGestures: hasHands,
        fingerArticulation: hasFingers,
        fullBodyMovement: hasLegs,
        proceduralWalking: hasLegs,
        jumpingAndClimbing: hasLegs,
        inverseKinematics: hasHands && bones.includes("leftLowerArm"),
        hairPhysics: hasHairPhysics,
        realtimeLipSync: hasPhonemes,
        facialExpressions: expressions.length > 0,
        teethVisible: hasTeethSupport,
        eyeBlink: this._availableExpressions.has("blink") || this._availableExpressions.has("blinkLeft"),
      },
      inspectedAt: new Date().toISOString(),
    };
  }

  _computeModelBounds() {
    let height = 1.62;
    let width = 0.48;
    let depth = 0.28;
    if (this.root) {
      try {
        const box = new THREE.Box3().setFromObject(this.root);
        if (Number.isFinite(box.max.y) && box.max.y > 0.5) {
          height = Number(box.max.y.toFixed(3));
          width = Number(Math.max(0.35, box.max.x - box.min.x).toFixed(3));
          depth = Number(Math.max(0.2, box.max.z - box.min.z).toFixed(3));
        }
      } catch {
        void 0;
      }
    }
    const lUpper = this.getHumanoidBone("leftUpperArm");
    const lLower = this.getHumanoidBone("leftLowerArm");
    const lHand = this.getHumanoidBone("leftHand");
    let armReach = 0.46;
    if (lUpper && lLower && lHand) {
      const p1 = new THREE.Vector3();
      const p2 = new THREE.Vector3();
      const p3 = new THREE.Vector3();
      lUpper.getWorldPosition(p1);
      lLower.getWorldPosition(p2);
      lHand.getWorldPosition(p3);
      const len = p1.distanceTo(p2) + p2.distanceTo(p3);
      if (len > 0.15) armReach = Number(len.toFixed(3));
    }
    return { height, width, depth, armReach };
  }

  getHumanoidBone(boneName) {
    const h = this.vrm?.humanoid;
    if (!h) return null;
    try {
      if (typeof h.getNormalizedBoneNode === "function" || typeof h.getRawBoneNode === "function") {
        return h.getNormalizedBoneNode?.(boneName) || h.getRawBoneNode?.(boneName) || null;
      }
      return h.getBoneNode?.(boneName) || null;
    } catch {
      return null;
    }
  }

  getRestPose(boneName) {
    return this._restPoseMap.get(boneName) || null;
  }

  setExpression(expressionName, intensity = 1.0) {
    if (!this.vrm) return;
    const clamped = Math.max(0, Math.min(1, intensity));

    if (expressionName === "show_teeth" || expressionName === "teeth") {
      this.setExpression("happy", clamped * 0.55);
      this.setExpression("ee", clamped * 0.85);
      this.setExpression("ih", clamped * 0.35);

      if (this._faceMesh?.morphTargetDictionary && this._faceMesh?.morphTargetInfluences) {
        const dict = this._faceMesh.morphTargetDictionary;
        const infl = this._faceMesh.morphTargetInfluences;
        const teethTargets = ["Fcl_HA_Fung1_Up", "Fcl_HA_Fung2_Up", "Fcl_HA_Fung1", "Fcl_HA_Short_Up"];
        for (const t of teethTargets) {
          if (dict[t] !== undefined) {
            infl[dict[t]] = clamped * 0.85;
          }
        }
      }
      return;
    }

    if (this.vrm.expressionManager?.setValue) {
      if (this._availableExpressions.has(expressionName)) {
        this.vrm.expressionManager.setValue(expressionName, clamped);
      }
    } else if (this.vrm.blendShapeProxy?.setValue) {
      if (this._availableExpressions.has(expressionName)) {
        this.vrm.blendShapeProxy.setValue(expressionName, clamped);
      }
    }
  }

  getExpression(expressionName) {
    try {
      if (this.vrm?.expressionManager?.getValue) {
        return this.vrm.expressionManager.getValue(expressionName) || 0;
      }
      if (this.vrm?.blendShapeProxy?.getValue) {
        return this.vrm.blendShapeProxy.getValue(expressionName) || 0;
      }
    } catch {
      void 0;
    }
    return 0;
  }

  getAvailableExpressions() {
    return Array.from(this._availableExpressions);
  }

  resetExpressions() {
    if (this.vrm?.expressionManager?.resetValues) {
      this.vrm.expressionManager.resetValues();
    } else {
      for (const e of this._availableExpressions) this.setExpression(e, 0);
    }
    if (this._faceMesh?.morphTargetDictionary && this._faceMesh?.morphTargetInfluences) {
      const dict = this._faceMesh.morphTargetDictionary;
      const infl = this._faceMesh.morphTargetInfluences;
      const teethTargets = ["Fcl_HA_Fung1_Up", "Fcl_HA_Fung2_Up", "Fcl_HA_Fung1", "Fcl_HA_Short_Up"];
      for (const t of teethTargets) {
        if (dict[t] !== undefined) infl[dict[t]] = 0;
      }
    }
  }

  update(delta) {
    if (!this.vrm) return;
    this.vrm.expressionManager?.update?.();
    this.vrm.update?.(delta);
  }

  getCameraFraming(mode = "HEAD_AND_SHOULDERS", aspect = 1.0) {
    const headNode = this.getHumanoidBone("head");
    const chestNode =
      this.getHumanoidBone("chest") ||
      this.getHumanoidBone("upperChest") ||
      this.getHumanoidBone("spine");

    const headPos = new THREE.Vector3();
    const chestPos = new THREE.Vector3();

    if (headNode) headNode.getWorldPosition(headPos);
    if (chestNode) chestNode.getWorldPosition(chestPos);

    const headY = headNode && headPos.y > 0.5 ? headPos.y : 1.38;
    const chestY = chestNode && chestPos.y > 0.4 ? chestPos.y : headY - 0.24;

    const topHairY = this._cachedTopHairY || headY + 0.24;
    const rootX = this.root ? this.root.position.x : 0;
    const rootY = this.root ? Math.max(0, this.root.position.y) : 0;
    const rootZ = this.root ? this.root.position.z : 0;

    switch (mode) {
      case "CLOSE_UP": {
        const targetY = headY;
        const dist = aspect < 1.0 ? 0.85 : 0.72;
        return {
          cameraPosition: [rootX * 0.5, headY, dist + rootZ],
          target: [rootX * 0.5, targetY, rootZ],
          fov: 24,
        };
      }
      case "BUST": {
        const targetY = (headY + chestY) / 2;
        const dist = aspect < 0.8 ? 1.75 : 1.5;
        return {
          cameraPosition: [rootX * 0.5, targetY + 0.04, dist + rootZ],
          target: [rootX * 0.5, targetY, rootZ],
          fov: 30,
        };
      }
      case "FULL_BODY": {
        const fullHeight = Math.max(1.58, topHairY) + 0.16;
        const targetY = fullHeight * 0.48 + rootY * 0.5;
        const fov = 30;
        const halfFovRad = (fov * Math.PI) / 360;
        const distVertical = (fullHeight / 2) / Math.tan(halfFovRad);
        const bodyWidthSpan = 0.82;
        const safeAspect = Math.max(0.45, aspect || 0.62);
        const distHorizontal = (bodyWidthSpan / 2) / (safeAspect * Math.tan(halfFovRad));
        const dist = Math.max(distVertical, distHorizontal, 3.35) + Math.max(0, rootZ * 0.35);
        return {
          cameraPosition: [rootX * 0.65, targetY + 0.04, dist + rootZ],
          target: [rootX * 0.65, targetY - 0.02, rootZ],
          fov,
        };
      }
      case "HEAD_AND_SHOULDERS":
      default: {
        const safeHeadroom = 0.08;
        const topFramingY = topHairY + safeHeadroom;
        const bottomFramingY = chestY - 0.06;
        const spanY = Math.max(0.65, topFramingY - bottomFramingY);
        const targetY = (topFramingY + bottomFramingY) / 2;

        const fov = 28;
        const halfFovRad = (fov * Math.PI) / 360;
        const distVertical = (spanY / 2) / Math.tan(halfFovRad);
        const shoulderSpan = 0.48;
        const distHorizontal =
          (shoulderSpan / 2) / (Math.max(0.4, aspect) * Math.tan(halfFovRad));
        const dist = Math.max(distVertical, distHorizontal, 1.38);

        return {
          cameraPosition: [rootX * 0.45, targetY + 0.02, dist + rootZ],
          target: [rootX * 0.45, targetY - 0.02, rootZ],
          fov,
        };
      }
    }
  }

  dispose() {
    if (this.vrm) {
      VRMUtils.deepDispose(this.vrm.scene);
      this.vrm = null;
    }
    this._availableExpressions.clear();
    this._restPoseMap.clear();
    super.dispose();
  }
}
