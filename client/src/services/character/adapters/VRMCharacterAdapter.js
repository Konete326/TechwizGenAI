/**
 * VRMCharacterAdapter — Universal adapter for VRM 1.0 and VRM 0.x characters.
 * Implements ICharacterAdapter.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { ICharacterAdapter } from "./ICharacterAdapter.js";

export class VRMCharacterAdapter extends ICharacterAdapter {
  constructor(characterId, metadata = {}) {
    super(characterId, metadata);
    /** @type {VRM | null} */
    this.vrm = null;
    this._availableExpressions = new Set();
    this._expressionMap = new Map(); // standard name -> adapter name
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

    // Geometry optimization
    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.combineSkeletons(gltf.scene);

    // Rotate VRM 0.x models to face camera (+Z in glTF space)
    VRMUtils.rotateVRM0(vrm);

    this.vrm = vrm;
    this.root = vrm.scene;
    this._faceMesh = null;

    // Enhance texture filtering and find face mesh with morph targets
    this.root.traverse((obj) => {
      if (obj.isMesh) {
        if (obj.morphTargetDictionary && (obj.name.toLowerCase().includes("face") || obj.name.toLowerCase().includes("head"))) {
          this._faceMesh = obj;
        }
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const mat of mats) {
            if (mat.map) {
              mat.map.anisotropy = 8;
              mat.map.generateMipmaps = true;
              mat.map.minFilter = THREE.LinearMipmapLinearFilter;
              mat.map.magFilter = THREE.LinearFilter;
              mat.map.needsUpdate = true;
            }
          }
        }
      }
    });

    // Discover capabilities
    this.profile = this.inspectCapabilities();

    return this.root;
  }

  inspectCapabilities() {
    this._availableExpressions.clear();
    const bones = [];
    const expressions = [];

    // 1. Inspect humanoid rig (both upper body and full lower body for spatial movement)
    const standardBones = [
      "hips", "spine", "chest", "upperChest", "neck", "head",
      "leftEye", "rightEye", "leftShoulder", "rightShoulder",
      "leftUpperArm", "leftLowerArm", "leftHand",
      "rightUpperArm", "rightLowerArm", "rightHand",
      "leftUpperLeg", "leftLowerLeg", "leftFoot", "leftToes",
      "rightUpperLeg", "rightLowerLeg", "rightFoot", "rightToes"
    ];

    for (const bName of standardBones) {
      if (this.getHumanoidBone(bName)) bones.push(bName);
    }

    // 2. Inspect VRM expressions (VRM 1.0 or 0.x)
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
        "blink", "blinkLeft", "blinkRight", "neutral"
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

    // Check for teeth visibility support (happy + ee/ih or direct mouth shapes)
    const hasTeethSupport = this._availableExpressions.has("happy") && (this._availableExpressions.has("ee") || this._availableExpressions.has("ih"));
    if (hasTeethSupport) {
      this._availableExpressions.add("show_teeth");
      this._availableExpressions.add("teeth");
    }

    expressions.push(...this._availableExpressions);

    const hasPhonemes = ["aa", "oh", "ee"].some((p) => this._availableExpressions.has(p));
    const hasHead = bones.includes("head");
    const hasHands = bones.includes("leftHand") && bones.includes("rightHand");
    const hasLegs = bones.includes("leftUpperLeg") && bones.includes("rightUpperLeg");
    const springManager = this.vrm?.springBoneManager;
    const hasHairPhysics = Boolean(springManager && (springManager.springs?.length > 0 || springManager.springs?.size > 0));

    return {
      characterId: this.characterId,
      format: this.vrm?.meta?.metaVersion === "0" ? "VRM_0" : "VRM_1",
      name: this.vrm?.meta?.name || this.characterId,
      authors: this.vrm?.meta?.authors || [],
      bones,
      expressions,
      capabilities: {
        proceduralLookAt: hasHead,
        proceduralGestures: hasHead,
        handGestures: hasHands,
        fullBodyMovement: hasLegs,
        proceduralWalking: hasLegs,
        hairPhysics: hasHairPhysics,
        realtimeLipSync: hasPhonemes,
        facialExpressions: expressions.length > 0,
        teethVisible: hasTeethSupport,
        eyeBlink: this._availableExpressions.has("blink") || this._availableExpressions.has("blinkLeft")
      },
      inspectedAt: new Date().toISOString()
    };
  }

  getHumanoidBone(boneName) {
    if (!this.vrm?.humanoid) return null;
    try {
      return (
        this.vrm.humanoid.getNormalizedBoneNode?.(boneName) ||
        this.vrm.humanoid.getBoneNode?.(boneName) ||
        this.vrm.humanoid.getRawBoneNode?.(boneName) ||
        null
      );
    } catch (_) { return null; }
  }

  setExpression(expressionName, intensity = 1.0) {
    if (!this.vrm) return;
    const clamped = Math.max(0, Math.min(1, intensity));

    // Composite expressions for teeth visibility (Visibly reveals upper teeth / fangs)
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
    } catch (_) {}
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

  /**
   * Adaptive video-call camera framing:
   * Accurately measures model bounds (hair top) and humanoid landmarks (head, neck, chest)
   * with configurable safe headroom margins so hair is never cropped.
   */
  getCameraFraming(mode = "HEAD_AND_SHOULDERS", aspect = 1.0) {
    const headNode = this.getHumanoidBone("head");
    const neckNode = this.getHumanoidBone("neck");
    const chestNode = this.getHumanoidBone("chest") || this.getHumanoidBone("upperChest") || this.getHumanoidBone("spine");
    const hipsNode = this.getHumanoidBone("hips");

    // Measure world coordinates of key bones
    const headPos = new THREE.Vector3();
    const chestPos = new THREE.Vector3();
    const hipsPos = new THREE.Vector3();

    if (headNode) headNode.getWorldPosition(headPos);
    if (chestNode) chestNode.getWorldPosition(chestPos);
    if (hipsNode) hipsNode.getWorldPosition(hipsPos);

    const headY = headNode ? headPos.y : 1.42;
    const chestY = chestNode ? chestPos.y : headY - 0.26;
    const hipsY = hipsNode ? hipsPos.y : headY - 0.52;

    // Measure top of model (hair / accessories) from actual scene bounding box
    let topHairY = headY + 0.25;
    if (this.root) {
      try {
        const box = new THREE.Box3().setFromObject(this.root);
        if (box.max.y > headY) {
          topHairY = box.max.y;
        }
      } catch (_) {}
    }

    const rootX = this.root ? this.root.position.x : 0;
    const rootZ = this.root ? this.root.position.z : 0;

    switch (mode) {
      case "CLOSE_UP": {
        // Tight on face
        const targetY = headY;
        const dist = aspect < 1.0 ? 0.85 : 0.72;
        return {
          cameraPosition: [rootX * 0.5, headY, dist + rootZ],
          target: [rootX * 0.5, targetY, rootZ],
          fov: 24
        };
      }
      case "HEAD_AND_SHOULDERS":
      default: {
        // Professional Video Call: Entire hair visible with safe headroom,
        // face centered in upper-middle, neck, shoulders, and upper chest visible.
        const SAFE_HEADROOM = 0.08; // 8 cm safe breathing margin above highest hair vertex
        const topFramingY = topHairY + SAFE_HEADROOM;
        const bottomFramingY = chestY - 0.06; // includes entire upper chest & shoulder slope
        const spanY = Math.max(0.65, topFramingY - bottomFramingY);
        const targetY = (topFramingY + bottomFramingY) / 2;

        const fov = 28;
        const halfFovRad = (fov * Math.PI) / 360;
        const distVertical = (spanY / 2) / Math.tan(halfFovRad);

        // Shoulder span ~ 0.48m. Ensure horizontal framing on narrow viewports
        const shoulderSpan = 0.48;
        const distHorizontal = (shoulderSpan / 2) / (Math.max(0.4, aspect) * Math.tan(halfFovRad));

        const dist = Math.max(distVertical, distHorizontal, 1.38);

        return {
          cameraPosition: [rootX * 0.45, targetY + 0.02, dist + rootZ],
          target: [rootX * 0.45, targetY - 0.02, rootZ],
          fov
        };
      }
      case "BUST": {
        // Upper mid-torso down to chest
        const targetY = (headY + chestY) / 2;
        const dist = aspect < 0.8 ? 1.75 : 1.50;
        return {
          cameraPosition: [rootX * 0.5, targetY + 0.04, dist + rootZ],
          target: [rootX * 0.5, targetY, rootZ],
          fov: 30
        };
      }
      case "FULL_BODY": {
        // Full Body Framing: Complete avatar from feet (0) to hair top with safe breathing margins
        const targetY = (topHairY + 0) * 0.48;
        const baseDist = aspect < 0.8 ? 3.6 : 3.0;
        // If character steps backward (rootZ > 0), adjust distance to preserve entire view
        const dist = baseDist + Math.max(0, rootZ * 0.4);
        return {
          cameraPosition: [rootX * 0.6, targetY + 0.05, dist + rootZ],
          target: [rootX * 0.6, targetY - 0.05, rootZ],
          fov: 32
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
    super.dispose();
  }
}
