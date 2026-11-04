import ActionRegistry from "./ActionRegistry.js";
import EmotionEngine, { EMOTIONS } from "./EmotionEngine.js";
import BoneControlSystem from "./BoneControlSystem.js";
import { REST_ARM_POSE } from "./CharacterPoseConstants.js";

const LEARNED_ACTIONS_KEY = "nisa_learned_character_actions_v2";
const LEARNED_UI_KEY = "nisa_learned_ui_actions_v1";

const PRESET_RECIPES = {
  salute: {
    name: "Salute / Adab", category: "gesture", duration: 2.2, emotion: EMOTIONS.HAPPY, cycles: 1,
    pose: { rightUpperArm: [0.22, 0.62, 0.32], rightLowerArm: [0.12, 1.78, 0.14], rightHand: [0.08, 0.22, 0.18], head: [0.1, 0, -0.03], spineRoll: 0 },
  },
  adab: {
    name: "Adab / Salam Gesture", category: "gesture", duration: 2.3, emotion: EMOTIONS.HAPPY, cycles: 2,
    pose: { rightUpperArm: [0.24, 0.66, 0.42], rightLowerArm: [0.14, 1.72, 0.12], rightHand: [0.12, 0.2, 0.15], head: [0.18, 0, -0.04], spineRoll: -0.02 },
  },
  namaste: {
    name: "Namaste / Pray", category: "gesture", duration: 2.4, emotion: EMOTIONS.HAPPY, cycles: 1,
    pose: {
      leftUpperArm: [0.2, -0.78, -0.56], leftLowerArm: [0.1, -1.52, -0.12], leftHand: [-0.08, -0.28, 0.28],
      rightUpperArm: [0.2, 0.78, 0.56], rightLowerArm: [0.1, 1.52, 0.12], rightHand: [-0.08, 0.28, -0.28],
      head: [0.16, 0, 0], spineRoll: 0,
    },
  },
  thumbs_up: {
    name: "Thumbs Up", category: "gesture", duration: 2.1, emotion: EMOTIONS.EXCITED, cycles: 2,
    pose: { rightUpperArm: [0.22, 0.56, 0.62], rightLowerArm: [0.1, 1.28, 0.08], rightHand: [0.05, 0.15, 0.28], head: [-0.06, 0.05, -0.04], spineRoll: -0.03 },
  },
  peace_sign: {
    name: "Peace Sign", category: "gesture", duration: 2.2, emotion: EMOTIONS.PLAYFUL, cycles: 2,
    pose: { rightUpperArm: [0.2, 0.58, 0.38], rightLowerArm: [0.1, 1.54, 0.12], rightHand: [0.08, 0.18, 0.22], head: [-0.04, 0.06, -0.08], spineRoll: -0.04 },
  },
  heart_hands: {
    name: "Heart Hands", category: "gesture", duration: 2.5, emotion: EMOTIONS.HAPPY, cycles: 2,
    pose: {
      leftUpperArm: [0.22, -0.74, -0.48], leftLowerArm: [0.14, -1.58, -0.18], leftHand: [0.18, -0.2, 0.35],
      rightUpperArm: [0.22, 0.74, 0.48], rightLowerArm: [0.14, 1.58, 0.18], rightHand: [0.18, 0.2, -0.35],
      head: [-0.04, 0, -0.05], spineRoll: -0.03,
    },
  },
  cross_arms: {
    name: "Cross Arms", category: "gesture", duration: 2.5, emotion: EMOTIONS.CURIOUS, cycles: 1,
    pose: {
      leftUpperArm: [0.24, -0.82, -0.62], leftLowerArm: [0.1, -1.56, -0.08],
      rightUpperArm: [0.24, 0.82, 0.62], rightLowerArm: [0.1, 1.56, 0.08],
      head: [-0.04, 0.08, -0.03], spineRoll: 0.02,
    },
  },
  hands_on_hips: {
    name: "Hands On Hips", category: "gesture", duration: 2.4, emotion: EMOTIONS.PLAYFUL, cycles: 1,
    pose: {
      leftUpperArm: [0.12, -0.32, -0.78], leftLowerArm: [0.08, -1.24, -0.18],
      rightUpperArm: [0.12, 0.32, 0.78], rightLowerArm: [0.08, 1.24, 0.18],
      head: [-0.05, -0.05, 0.04], spineRoll: 0.04,
    },
  },
  stretch: {
    name: "Stretch Arms", category: "gesture", duration: 2.6, emotion: EMOTIONS.HAPPY, cycles: 1,
    pose: {
      leftUpperArm: [0.18, -0.35, 0.28], leftLowerArm: [0.04, -0.42, -0.1],
      rightUpperArm: [0.18, 0.35, -0.28], rightLowerArm: [0.04, 0.42, 0.1],
      head: [-0.14, 0, 0.04], spineRoll: 0.03,
    },
  },
  celebrate: {
    name: "Celebrate / Cheer", category: "gesture", duration: 2.8, emotion: EMOTIONS.EXCITED, cycles: 4,
    pose: {
      leftUpperArm: [0.18, -0.45, 0.24], leftLowerArm: [0.06, -1.18, -0.12],
      rightUpperArm: [0.18, 0.45, -0.24], rightLowerArm: [0.06, 1.18, 0.12],
      head: [-0.08, 0, 0], spineRoll: 0.05, bounceY: 0.045,
    },
  },
  dance: {
    name: "Happy Dance", category: "movement", duration: 3.2, emotion: EMOTIONS.PLAYFUL, cycles: 5,
    pose: {
      leftUpperArm: [0.2, -0.56, -0.32], leftLowerArm: [0.1, -1.38, -0.14],
      rightUpperArm: [0.2, 0.56, 0.32], rightLowerArm: [0.1, 1.38, 0.14],
      head: [-0.04, 0.12, 0.08], spineRoll: 0.08, bounceY: 0.05, legSwing: 0.32,
    },
  },
  jump: {
    name: "Cheerful Jump", category: "movement", duration: 1.8, emotion: EMOTIONS.EXCITED, cycles: 2,
    pose: {
      leftUpperArm: [0.18, -0.42, 0.18], leftLowerArm: [0.06, -1.08, 0],
      rightUpperArm: [0.18, 0.42, -0.18], rightLowerArm: [0.06, 1.08, 0],
      head: [-0.08, 0, 0], bounceY: 0.14, legSwing: 0.28,
    },
  },
  spin: {
    name: "Full Spin / Twirl", category: "movement", duration: 2.2, emotion: EMOTIONS.PLAYFUL, cycles: 1,
    pose: {
      leftUpperArm: [0.14, -0.32, -0.68], leftLowerArm: [0.06, -0.65, 0],
      rightUpperArm: [0.14, 0.32, 0.68], rightLowerArm: [0.06, 0.65, 0],
      head: [0, 0, 0.04], spinYaw: Math.PI * 2,
    },
  },
  curtsy: {
    name: "Graceful Curtsy", category: "movement", duration: 2.4, emotion: EMOTIONS.HAPPY, cycles: 1,
    pose: {
      leftUpperArm: [0.14, -0.28, -0.82], leftLowerArm: [0.08, -0.48, 0],
      rightUpperArm: [0.14, 0.28, 0.82], rightLowerArm: [0.08, 0.48, 0],
      head: [0.16, 0, -0.04], bounceY: -0.08, legSwing: 0.26,
    },
  },
  blow_kiss: {
    name: "Blow Kiss", category: "gesture", duration: 2.3, emotion: EMOTIONS.PLAYFUL, cycles: 1,
    pose: { rightUpperArm: [0.24, 0.68, 0.42], rightLowerArm: [0.14, 1.68, 0.12], rightHand: [0.16, 0.18, 0.22], head: [-0.04, 0.05, -0.05], spineRoll: -0.03 },
  },
  listen_closely: {
    name: "Listen Closely", category: "gesture", duration: 2.3, emotion: EMOTIONS.CURIOUS, cycles: 1,
    pose: { rightUpperArm: [0.22, 0.58, 0.32], rightLowerArm: [0.12, 1.65, 0.12], rightHand: [0.1, 0.22, 0.1], head: [0.05, -0.14, 0.08], spineRoll: 0.05 },
  },
  wink: {
    name: "Friendly Wink", category: "expression", duration: 1.6, emotion: EMOTIONS.PLAYFUL, cycles: 1,
    pose: { head: [-0.03, 0.05, -0.07], spineRoll: -0.03, winkRight: true },
  },
};

const ALIAS_MAP = {
  salam: "adab", adaab: "adab", assalamualaikum: "adab", respect: "adab", pranam: "namaste", pray: "namaste", dua: "namaste",
  shabash: "thumbs_up", like: "thumbs_up", approve: "thumbs_up", good_job: "thumbs_up", victory: "peace_sign", peace: "peace_sign",
  dil: "heart_hands", love: "heart_hands", heart: "heart_hands", dil_banao: "heart_hands", fold_arms: "cross_arms", bazu_bandho: "cross_arms",
  kamar_par_haath: "hands_on_hips", superhero: "hands_on_hips", angrai: "stretch", relax: "stretch", yawn: "stretch",
  cheer: "celebrate", jashan: "celebrate", hooray: "celebrate", yay: "celebrate", bhangra: "dance", nacho: "dance", groove: "dance", happy_dance: "dance",
  uchlo: "jump", hop: "jump", leap: "jump", ghoomo: "spin", twirl: "spin", rotate_full: "spin", chakkar: "spin",
  jhuko: "curtsy", respectful_bow: "curtsy", flying_kiss: "blow_kiss", kiss: "blow_kiss", aankh_maro: "wink", wink_right: "wink", wink_left: "wink",
  dhyan_se_suno: "listen_closely", focus: "listen_closely",
};

function clampVal(v, min, max) {
  const num = Number(v);
  if (!Number.isFinite(num)) return 0;
  return Math.max(min, Math.min(max, num));
}

function smoothStep01(t) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function sanitizeRecipe(id, raw = {}) {
  const pose = raw.pose || raw;
  const clampArm = (boneName, arr, def) => {
    if (!Array.isArray(arr) || arr.length < 3) return def;
    return BoneControlSystem.clampBoneEuler(boneName, arr[0], arr[1], arr[2], false);
  };
  return {
    id,
    name: raw.name || id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    category: ["gesture", "movement", "expression", "custom", "composite"].includes(raw.category) ? raw.category : "custom",
    duration: clampVal(raw.duration || 2.3, 0.6, 6.0),
    emotion: raw.emotion || EMOTIONS.HAPPY,
    cycles: Math.round(clampVal(raw.cycles || 2, 1, 6)),
    learned: true,
    learnedAt: raw.learnedAt || new Date().toISOString(),
    steps: Array.isArray(raw.steps) ? raw.steps : null,
    pose: {
      leftUpperArm: clampArm("leftUpperArm", pose.leftUpperArm, [REST_ARM_POSE.leftUpperArm.x, REST_ARM_POSE.leftUpperArm.y, REST_ARM_POSE.leftUpperArm.z]),
      leftLowerArm: clampArm("leftLowerArm", pose.leftLowerArm, [0.08, -0.22, -0.05]),
      leftHand: clampArm("leftHand", pose.leftHand, [0, 0, 0]),
      rightUpperArm: clampArm("rightUpperArm", pose.rightUpperArm, [REST_ARM_POSE.rightUpperArm.x, REST_ARM_POSE.rightUpperArm.y, REST_ARM_POSE.rightUpperArm.z]),
      rightLowerArm: clampArm("rightLowerArm", pose.rightLowerArm, [0.08, 0.22, 0.05]),
      rightHand: clampArm("rightHand", pose.rightHand, [0, 0, 0]),
      head: Array.isArray(pose.head) ? [clampVal(pose.head[0], -0.4, 0.4), clampVal(pose.head[1], -0.5, 0.5), clampVal(pose.head[2], -0.25, 0.25)] : [0, 0, 0],
      spineRoll: clampVal(pose.spineRoll || 0, -0.16, 0.16),
      bounceY: clampVal(pose.bounceY || 0, -0.18, 0.22),
      legSwing: clampVal(pose.legSwing || 0, 0, 0.48),
      spinYaw: clampVal(pose.spinYaw || 0, -Math.PI * 2, Math.PI * 2),
      winkRight: Boolean(pose.winkRight),
    },
  };
}

class CharacterActionLearnerClass {
  constructor() {
    this._learnedRecipes = new Map();
    this._learnedUI = new Map();
    this._initialized = false;
  }

  initialize(ctrl) {
    this._loadStoredRecipes();
    this._loadStoredUI();
    for (const [id, recipe] of Object.entries(PRESET_RECIPES)) {
      this._registerRecipeWithController(ctrl, id, sanitizeRecipe(id, recipe), false);
    }
    for (const [alias, target] of Object.entries(ALIAS_MAP)) {
      if (PRESET_RECIPES[target]) {
        this._registerRecipeWithController(ctrl, alias, sanitizeRecipe(alias, PRESET_RECIPES[target]), false);
      }
    }
    for (const [id, recipe] of this._learnedRecipes.entries()) {
      this._registerRecipeWithController(ctrl, id, recipe, false);
    }
    this._initialized = true;
  }

  _registerRecipeWithController(ctrl, id, recipe, persist = false) {
    ActionRegistry.register(
      {
        id,
        name: recipe.name || id,
        category: recipe.category || "custom",
        animation: "procedural_learned",
        duration: Math.round((recipe.duration || 2.2) * 1000),
        loop: false,
        priority: 5,
        enabled: true,
        parameters: { learned: true },
      },
      { forceUpdate: true }
    );
    ActionRegistry.registerExecutor(id, (params) => this.executeRecipe(ctrl, recipe, params));
    if (persist) {
      this._learnedRecipes.set(id, recipe);
      this._saveStoredRecipes();
    }
  }

  async executeRecipe(ctrl, recipe, params = {}) {
    if (Array.isArray(recipe.steps) && recipe.steps.length > 0) {
      for (const step of recipe.steps) {
        const stepId = typeof step === "string" ? step : step.action;
        const stepParams = typeof step === "object" ? step.params || step : {};
        if (stepId && stepId !== recipe.id) {
          await ctrl.executeAction(stepId, stepParams);
        }
      }
      return { success: true, action: recipe.id, learned: true, composite: true };
    }

    const duration = params.duration ? (params.duration > 20 ? params.duration / 1000 : params.duration) : recipe.duration || 2.3;
    const p = recipe.pose || {};
    const cycles = recipe.cycles || 2;
    const startYaw = ctrl._rootRotationTarget.y;

    if (recipe.emotion) EmotionEngine.setEmotion(recipe.emotion, { intensity: 0.85, duration: duration * 1000 });
    if (p.winkRight && ctrl._adapter) ctrl._adapter.setExpression("blinkRight", 1.0);

    return new Promise((resolve) => {
      ctrl._activeGesture = {
        name: recipe.id || "learned_action",
        elapsed: 0,
        duration,
        resolve: () => {
          ctrl._resetArmsToRest();
          ctrl._resetLegsToRest();
          ctrl._bodyTarget.y = 0;
          ctrl._bodyTarget.roll = 0;
          ctrl._rootPositionTarget.y = 0;
          ctrl._gestureOffset = { pitch: 0, yaw: 0, roll: 0 };
          ctrl._headTarget.set(0, 0, 0);
          if (p.spinYaw) ctrl._rootRotationTarget.y = 0;
          if (p.winkRight && ctrl._adapter) ctrl._adapter.setExpression("blinkRight", 0);
          resolve({ success: true, action: recipe.id, learned: true });
        },
        tick: (_delta, progress) => {
          const env = progress < 0.22 ? smoothStep01(progress / 0.22) : progress > 0.78 ? smoothStep01((1 - progress) / 0.22) : 1.0;
          const osc = cycles > 1 && progress >= 0.22 && progress <= 0.78
            ? Math.sin(((progress - 0.22) / 0.56) * Math.PI * 2 * cycles) * 0.14
            : 0;

          const lerpBone = (boneKey, targetArr, restEuler) => {
            if (!targetArr || !ctrl._targetArms[boneKey]) return;
            const clamped = BoneControlSystem.clampBoneEuler(boneKey, targetArr[0] + osc, targetArr[1], targetArr[2] + osc * 0.5, false);
            ctrl._targetArms[boneKey].set(
              restEuler.x + (clamped[0] - restEuler.x) * env,
              restEuler.y + (clamped[1] - restEuler.y) * env,
              restEuler.z + (clamped[2] - restEuler.z) * env
            );
          };

          lerpBone("leftUpperArm", p.leftUpperArm, REST_ARM_POSE.leftUpperArm);
          lerpBone("leftLowerArm", p.leftLowerArm, REST_ARM_POSE.leftLowerArm);
          lerpBone("leftHand", p.leftHand, REST_ARM_POSE.leftHand);
          lerpBone("rightUpperArm", p.rightUpperArm, REST_ARM_POSE.rightUpperArm);
          lerpBone("rightLowerArm", p.rightLowerArm, REST_ARM_POSE.rightLowerArm);
          lerpBone("rightHand", p.rightHand, REST_ARM_POSE.rightHand);

          if (p.head) {
            ctrl._gestureOffset.pitch = (p.head[0] + osc * 0.25) * env;
            ctrl._gestureOffset.yaw = (p.head[1] + osc * 0.3) * env;
            ctrl._gestureOffset.roll = (p.head[2] + osc * 0.2) * env;
          }
          if (p.spineRoll) ctrl._bodyTarget.roll = (p.spineRoll + osc * 0.35) * env;
          if (p.bounceY) {
            const bounceWave = Math.abs(Math.sin(progress * Math.PI * 2 * Math.max(1, cycles)));
            ctrl._rootPositionTarget.y = p.bounceY * bounceWave * env;
          }
          if (p.legSwing) {
            const legWave = Math.sin(progress * Math.PI * 2 * Math.max(2, cycles));
            ctrl._targetLegs.leftUpperLeg.x = -legWave * p.legSwing * env;
            ctrl._targetLegs.rightUpperLeg.x = legWave * p.legSwing * env;
            ctrl._targetLegs.leftLowerLeg.x = Math.max(0.03, Math.max(0, legWave * p.legSwing * 1.4)) * env;
            ctrl._targetLegs.rightLowerLeg.x = Math.max(0.03, Math.max(0, -legWave * p.legSwing * 1.4)) * env;
          }
          if (p.spinYaw) ctrl._rootRotationTarget.y = startYaw + p.spinYaw * smoothStep01(progress);
        },
      };
    });
  }

  deriveRecipeFromIntent(actionId, params = {}) {
    const cleanId = String(actionId || "").toLowerCase().trim().replace(/\s+/g, "_");
    if (PRESET_RECIPES[cleanId]) return sanitizeRecipe(cleanId, PRESET_RECIPES[cleanId]);
    if (ALIAS_MAP[cleanId] && PRESET_RECIPES[ALIAS_MAP[cleanId]]) return sanitizeRecipe(cleanId, PRESET_RECIPES[ALIAS_MAP[cleanId]]);
    if (this._learnedRecipes.has(cleanId)) return this._learnedRecipes.get(cleanId);

    if (params.pose || params.leftUpperArm || params.rightUpperArm || params.head || Array.isArray(params.steps)) {
      return sanitizeRecipe(cleanId, {
        name: params.name || cleanId,
        category: params.category || "custom",
        duration: params.duration || 2.4,
        emotion: params.emotion || EMOTIONS.HAPPY,
        cycles: params.cycles || 2,
        steps: params.steps || null,
        pose: params.pose || params,
      });
    }

    const text = `${cleanId} ${params.description || ""} ${params.name || ""}`.toLowerCase();
    if (text.includes("_and_") || text.includes("_while_")) {
      const tokens = cleanId.split(/_(?:and|while)_/).filter(Boolean);
      const validTokens = tokens.filter((t) => ActionRegistry.hasExecutor(t) || PRESET_RECIPES[t] || ALIAS_MAP[t]);
      if (validTokens.length >= 2) {
        return sanitizeRecipe(cleanId, {
          name: params.name || cleanId.replace(/_/g, " "),
          category: "composite",
          duration: 2.8,
          emotion: EMOTIONS.HAPPY,
          steps: validTokens,
        });
      }
    }

    for (const [key, rec] of Object.entries(PRESET_RECIPES)) {
      if (text.includes(key)) return sanitizeRecipe(cleanId, rec);
    }
    for (const [alias, target] of Object.entries(ALIAS_MAP)) {
      if (text.includes(alias) && PRESET_RECIPES[target]) return sanitizeRecipe(cleanId, PRESET_RECIPES[target]);
    }

    const hasExplicitDescription = Boolean(
      (params.description && String(params.description).trim().length > 2) ||
        (params.name && String(params.name).trim().length > 2) ||
        params.allowSynthesis === true
    );
    const hasGestureKeyword = /wave|salute|adab|namaste|bow|curtsy|clap|dance|jump|climb|sit|spin|twirl|stretch|thumbs|peace|heart|hug|kiss|wink|listen|point|raise|reach|inspect|bend|hand|arm|head|nod|shake|smile|laugh|cheer|celebrat|pose|greet|salam|dua|bhangra|nacho|ghoomo|jhuko/.test(text);
    if (!hasExplicitDescription && !hasGestureKeyword) return null;

    const useBothHands = /both|dono|double|open|hug|welcome|cheer|celebrat|dance/.test(text);
    const useLeft = /left|baye|bayein/.test(text) && !useBothHands;
    const isEnergetic = /fast|excited|jump|dance|energy|happy|cheer|party/.test(text);
    const isCalm = /calm|slow|sad|bow|respect|think|shy|wait|inspect|bend/.test(text);

    return sanitizeRecipe(cleanId, {
      name: params.name || cleanId,
      category: isEnergetic ? "movement" : "gesture",
      duration: isEnergetic ? 2.6 : 2.2,
      emotion: isEnergetic ? EMOTIONS.EXCITED : isCalm ? EMOTIONS.CURIOUS : EMOTIONS.HAPPY,
      cycles: isEnergetic ? 3 : 2,
      pose: {
        leftUpperArm: useBothHands || useLeft ? [0.22, -0.58, -0.35] : [REST_ARM_POSE.leftUpperArm.x, REST_ARM_POSE.leftUpperArm.y, REST_ARM_POSE.leftUpperArm.z],
        leftLowerArm: useBothHands || useLeft ? [0.1, -1.42, -0.14] : [0.08, -0.22, -0.05],
        rightUpperArm: !useLeft || useBothHands ? [0.22, 0.58, 0.35] : [REST_ARM_POSE.rightUpperArm.x, REST_ARM_POSE.rightUpperArm.y, REST_ARM_POSE.rightUpperArm.z],
        rightLowerArm: !useLeft || useBothHands ? [0.1, 1.42, 0.14] : [0.08, 0.22, 0.05],
        head: [isCalm ? 0.12 : -0.05, 0.06, -0.04],
        spineRoll: isEnergetic ? 0.05 : -0.03,
        bounceY: isEnergetic ? 0.045 : 0,
        legSwing: isEnergetic ? 0.24 : 0,
      },
    });
  }

  async learnAndExecute(ctrl, actionId, params = {}) {
    const cleanId = String(actionId || "custom_action").toLowerCase().trim().replace(/\s+/g, "_");
    const recipe = this.deriveRecipeFromIntent(cleanId, params);
    if (!recipe) return { success: false, learned: false, error: "unrecognized_action" };

    const adapter = ctrl._adapter;
    const hasBones = Boolean(adapter && (adapter.getHumanoidBone("rightUpperArm") || adapter.getHumanoidBone("head")));
    const validAngles = Object.values(recipe.pose).every((v) => (Array.isArray(v) ? v.every((n) => Number.isFinite(n)) : true));
    const confidence = (hasBones ? 0.55 : 0.35) + (validAngles ? 0.35 : 0) + (recipe.duration >= 0.6 ? 0.1 : 0);

    if (confidence >= 0.75) this._registerRecipeWithController(ctrl, cleanId, recipe, true);
    await this.executeRecipe(ctrl, recipe, params);
    return { success: true, learned: confidence >= 0.75, confidence: Number(confidence.toFixed(2)), actionId: cleanId, name: recipe.name };
  }

  getLearnedActions() { return Array.from(this._learnedRecipes.keys()); }

  learnUIElement(key, item) {
    if (!key || !item) return false;
    const normalizedKey = String(key).toLowerCase().trim();
    const record = {
      key: normalizedKey,
      selector: item.selector || null,
      xpath: item.xpath || null,
      text: item.text || normalizedKey,
      tagName: item.tagName || item.element || "button",
      learnedAt: Date.now(),
    };
    this._learnedUI.set(normalizedKey, record);
    this._saveStoredUI();
    return record;
  }

  getLearnedUIElements() { return Array.from(this._learnedUI.values()); }

  getLearnedUIElement(query) {
    if (!query) return null;
    const q = String(query).toLowerCase().trim();
    if (this._learnedUI.has(q)) return this._learnedUI.get(q);
    for (const [key, item] of this._learnedUI.entries()) {
      const text = String(item.text || "").toLowerCase();
      if (key.includes(q) || q.includes(key) || (text && (text.includes(q) || q.includes(text)))) return item;
    }
    return null;
  }

  _loadStoredRecipes() {
    try {
      const raw = localStorage.getItem(LEARNED_ACTIONS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        for (const [k, v] of Object.entries(parsed)) if (v && v.pose) this._learnedRecipes.set(k, sanitizeRecipe(k, v));
      }
    } catch { void 0; }
  }
  _saveStoredRecipes() {
    try { localStorage.setItem(LEARNED_ACTIONS_KEY, JSON.stringify(Object.fromEntries(this._learnedRecipes.entries()))); } catch { void 0; }
  }
  _loadStoredUI() {
    try {
      const raw = localStorage.getItem(LEARNED_UI_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        for (const [k, v] of Object.entries(parsed)) if (v) this._learnedUI.set(k, v);
      }
    } catch { void 0; }
  }
  _saveStoredUI() {
    try { localStorage.setItem(LEARNED_UI_KEY, JSON.stringify(Object.fromEntries(this._learnedUI.entries()))); } catch { void 0; }
  }
}

const CharacterActionLearner = new CharacterActionLearnerClass();
export default CharacterActionLearner;
