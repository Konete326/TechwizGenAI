/**
 * EmotionEngine — Emotional Intelligence & Expression Layer for Nisha 3D Avatar.
 *
 * Capabilities:
 * - 13 Distinct Emotional States:
 *   Happy, Excited, Sad, Disappointed, Angry, Surprised, Curious, Confused,
 *   Shy, Thinking, Neutral, Playful, Empathetic.
 * - Multi-layer isolation: Expressions blend seamlessly with lip-sync visemes without clobbering.
 * - Smooth transition easing (damped lerp) prevents abrupt facial popping.
 * - Structured metadata handling ({ emotion, intensity, reason, suggested_gesture, duration }).
 * - Contextual text sentiment analyzer derives emotion automatically from spoken conversation.
 * - Head and posture micro-attitudes synchronized with active emotion.
 */

import * as THREE from "three";
import CharacterRegistry from "./CharacterRegistry.js";

export const EMOTIONS = {
  NEUTRAL:      "neutral",
  HAPPY:        "happy",
  EXCITED:      "excited",
  SAD:          "sad",
  DISAPPOINTED: "disappointed",
  ANGRY:        "angry",
  SURPRISED:    "surprised",
  CURIOUS:      "curious",
  CONFUSED:     "confused",
  SHY:          "shy",
  THINKING:     "thinking",
  PLAYFUL:      "playful",
  EMPATHETIC:   "empathetic",
};

/**
 * Compound profile for each emotion:
 * - blendshapes: mapping of VRM expression -> target weight (0 to 1)
 * - headPosture: { pitch, yaw, roll } attitude bias
 * - defaultDuration: ms before easing back to neutral
 */
const EMOTION_PROFILES = {
  [EMOTIONS.NEUTRAL]: {
    blendshapes: { happy: 0, sad: 0, angry: 0, surprised: 0, relaxed: 0, ee: 0, aa: 0 },
    headPosture: { pitch: 0, yaw: 0, roll: 0 },
    defaultDuration: 0,
  },
  [EMOTIONS.HAPPY]: {
    blendshapes: { happy: 0.85, relaxed: 0.35 },
    headPosture: { pitch: -0.02, yaw: 0, roll: -0.02 },
    defaultDuration: 3000,
  },
  [EMOTIONS.EXCITED]: {
    blendshapes: { happy: 0.95, ee: 0.35, surprised: 0.20 },
    headPosture: { pitch: -0.04, yaw: 0.02, roll: -0.03 },
    defaultDuration: 3200,
  },
  [EMOTIONS.SAD]: {
    blendshapes: { sad: 0.85, relaxed: 0.20 },
    headPosture: { pitch: 0.08, yaw: -0.02, roll: 0.03 },
    defaultDuration: 3500,
  },
  [EMOTIONS.DISAPPOINTED]: {
    blendshapes: { sad: 0.65, relaxed: 0.40 },
    headPosture: { pitch: 0.09, yaw: 0.03, roll: 0.04 },
    defaultDuration: 3200,
  },
  [EMOTIONS.ANGRY]: {
    blendshapes: { angry: 0.85 },
    headPosture: { pitch: 0.03, yaw: 0, roll: 0 },
    defaultDuration: 2800,
  },
  [EMOTIONS.SURPRISED]: {
    blendshapes: { surprised: 0.90, aa: 0.18 },
    headPosture: { pitch: -0.05, yaw: 0, roll: 0.02 },
    defaultDuration: 2600,
  },
  [EMOTIONS.CURIOUS]: {
    blendshapes: { relaxed: 0.50, happy: 0.25 },
    headPosture: { pitch: -0.03, yaw: 0.06, roll: -0.07 }, // inquisitive head tilt
    defaultDuration: 3000,
  },
  [EMOTIONS.CONFUSED]: {
    blendshapes: { surprised: 0.30, sad: 0.25 },
    headPosture: { pitch: -0.02, yaw: -0.06, roll: 0.08 }, // puzzled head tilt
    defaultDuration: 3000,
  },
  [EMOTIONS.SHY]: {
    blendshapes: { relaxed: 0.60, happy: 0.30 },
    headPosture: { pitch: 0.06, yaw: 0.08, roll: -0.05 }, // eyes modestly downcast
    defaultDuration: 3000,
  },
  [EMOTIONS.THINKING]: {
    blendshapes: { relaxed: 0.55 },
    headPosture: { pitch: -0.08, yaw: 0.12, roll: 0.04 }, // contemplative upward tilt
    defaultDuration: 3200,
  },
  [EMOTIONS.PLAYFUL]: {
    blendshapes: { happy: 0.90, relaxed: 0.40 },
    headPosture: { pitch: -0.03, yaw: -0.04, roll: -0.06 },
    defaultDuration: 3000,
  },
  [EMOTIONS.EMPATHETIC]: {
    blendshapes: { relaxed: 0.60, sad: 0.20 },
    headPosture: { pitch: 0.03, yaw: 0, roll: 0.02 },
    defaultDuration: 3400,
  },
};

class EmotionEngineClass {
  constructor() {
    this._currentEmotion = EMOTIONS.NEUTRAL;
    this._intensity = 1.0;
    this._reason = "";
    this._suggestedGesture = null;

    // Smoothed blendshape weights (current vs target)
    this._currentWeights = {
      happy: 0, sad: 0, angry: 0, surprised: 0, relaxed: 0, ee: 0, aa: 0
    };
    this._targetWeights = {
      happy: 0, sad: 0, angry: 0, surprised: 0, relaxed: 0, ee: 0, aa: 0
    };

    // Smoothed head attitude offset
    this._currentHeadOffset = { pitch: 0, yaw: 0, roll: 0 };
    this._targetHeadOffset = { pitch: 0, yaw: 0, roll: 0 };

    this._timer = null;
    this._active = false;
  }

  // ─── Emotion Application ───────────────────────────────────────────────────

  /**
   * Set the active emotion with structured metadata.
   * @param {string} emotionName
   * @param {object} options
   * @param {number} [options.intensity=0.8] 0.0 to 1.0
   * @param {number} [options.duration] duration in ms before returning to neutral (0 = persistent)
   * @param {string} [options.reason]
   * @param {string} [options.suggested_gesture]
   * @returns {{ success: boolean, emotion: string }}
   */
  setEmotion(emotionName, options = {}) {
    const raw = String(emotionName || "").toLowerCase().trim();
    const emotion = EMOTION_PROFILES[raw] ? raw : this._resolveAlias(raw);

    const profile = EMOTION_PROFILES[emotion] || EMOTION_PROFILES[EMOTIONS.NEUTRAL];
    const intensity = THREE.MathUtils.clamp(
      typeof options.intensity === "number" ? options.intensity : 0.85,
      0.1,
      1.0
    );
    const duration = typeof options.duration === "number"
      ? options.duration
      : profile.defaultDuration;

    this._currentEmotion = emotion;
    this._intensity = intensity;
    this._reason = options.reason || "";
    this._suggestedGesture = options.suggested_gesture || null;

    // Set target weights scaled by intensity
    for (const key of Object.keys(this._targetWeights)) {
      this._targetWeights[key] = (profile.blendshapes[key] || 0) * intensity;
    }

    // Set target head attitude
    this._targetHeadOffset.pitch = (profile.headPosture.pitch || 0) * intensity;
    this._targetHeadOffset.yaw   = (profile.headPosture.yaw || 0) * intensity;
    this._targetHeadOffset.roll  = (profile.headPosture.roll || 0) * intensity;

    this._active = emotion !== EMOTIONS.NEUTRAL;

    // Trigger auto-reset timer if duration is positive
    if (this._timer) clearTimeout(this._timer);
    if (duration > 0 && emotion !== EMOTIONS.NEUTRAL) {
      this._timer = setTimeout(() => {
        this.resetToNeutral();
      }, duration);
    }

    return {
      success: true,
      emotion,
      intensity,
      reason: this._reason,
      suggested_gesture: this._suggestedGesture,
    };
  }

  /**
   * Reset emotional state smoothly back to neutral.
   */
  resetToNeutral() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this._currentEmotion = EMOTIONS.NEUTRAL;
    this._intensity = 1.0;
    this._reason = "";
    this._suggestedGesture = null;

    for (const key of Object.keys(this._targetWeights)) {
      this._targetWeights[key] = 0;
    }
    this._targetHeadOffset = { pitch: 0, yaw: 0, roll: 0 };
    this._active = false;
  }

  getCurrentEmotion() {
    return {
      emotion: this._currentEmotion,
      intensity: this._intensity,
      reason: this._reason,
      suggested_gesture: this._suggestedGesture,
      active: this._active,
    };
  }

  getHeadOffset() {
    return this._currentHeadOffset;
  }

  // ─── Frame Update Loop ─────────────────────────────────────────────────────

  /**
   * Updates smooth lerping of blendshapes and pushes them to active character adapter.
   * Called every frame in CharacterController render loop.
   * @param {number} delta
   * @param {import("./adapters/ICharacterAdapter.js").ICharacterAdapter} adapter
   */
  update(delta, adapter) {
    if (!adapter) return;

    // Responsive smooth lerp factor (~250ms transition time, framerate independent)
    const lerpFactor = Math.min(1.0, delta * 8.5);

    // 1. Lerp expression weights
    for (const key of Object.keys(this._targetWeights)) {
      const tgt = this._targetWeights[key];
      const cur = this._currentWeights[key];
      const next = cur + (tgt - cur) * lerpFactor;
      this._currentWeights[key] = Math.abs(tgt - next) < 0.001 ? tgt : next;

      // Apply to adapter only if value changed or non-zero
      if (Math.abs(this._currentWeights[key]) > 0.001 || tgt > 0) {
        adapter.setExpression(key, this._currentWeights[key]);
      }
    }

    // 2. Lerp head attitude
    this._currentHeadOffset.pitch += (this._targetHeadOffset.pitch - this._currentHeadOffset.pitch) * lerpFactor;
    this._currentHeadOffset.yaw   += (this._targetHeadOffset.yaw   - this._currentHeadOffset.yaw)   * lerpFactor;
    this._currentHeadOffset.roll  += (this._targetHeadOffset.roll  - this._currentHeadOffset.roll)  * lerpFactor;
  }

  // ─── Contextual Sentiment Analyzer ──────────────────────────────────────────

  /**
   * Automatically infer emotion from conversation transcript or system turns.
   * Enables natural facial reactions even when Gemini does not call expressEmotion tool.
   * @param {string} text
   * @returns {string|null} detected emotion or null
   */
  analyzeConversationContext(text) {
    if (!text || typeof text !== "string") return null;
    const lower = text.toLowerCase();

    // 1. Excited / Celebration
    if (/\b(mubarak|congratulations|congrats|awesome|shandar|zabardast|amazing|yay|hooray|excellent)\b/i.test(lower)) {
      this.setEmotion(EMOTIONS.EXCITED, { duration: 3200, intensity: 0.9, reason: "celebratory context" });
      return EMOTIONS.EXCITED;
    }

    // 2. Humor / Playful / Laugh
    if (/\b(haha|hehe|lol|lmao|joke|latifa|mazah|funny|hasna|hilarious|rofl)\b/i.test(lower)) {
      this.setEmotion(EMOTIONS.PLAYFUL, { duration: 3000, intensity: 0.85, reason: "humorous context" });
      return EMOTIONS.PLAYFUL;
    }

    // 3. Sad / Disappointment / Sympathy
    if (/\b(afsos|sad|upset|sorry|bad news|rona|dard|gam|dukhi|crying|unfortunate|disappointed)\b/i.test(lower)) {
      this.setEmotion(EMOTIONS.EMPATHETIC, { duration: 3500, intensity: 0.8, reason: "sympathetic context" });
      return EMOTIONS.EMPATHETIC;
    }

    // 4. Curious / Questioning
    if (/\b(kyun|why|kaise|how|kya|what|where|kahan|really|sach mein|tell me|explain)\b/i.test(lower)) {
      this.setEmotion(EMOTIONS.CURIOUS, { duration: 2800, intensity: 0.7, reason: "inquisitive context" });
      return EMOTIONS.CURIOUS;
    }

    // 5. Thinking / Processing
    if (/\b(soch|think|let me check|dekhne do|hmmm|ponder|calculate|analyze)\b/i.test(lower)) {
      this.setEmotion(EMOTIONS.THINKING, { duration: 3000, intensity: 0.75, reason: "thinking context" });
      return EMOTIONS.THINKING;
    }

    // 6. Happy / Warm Greeting
    if (/\b(salam|hello|hi|welcome|shukriya|thanks|thank you|khushi|great|good)\b/i.test(lower)) {
      this.setEmotion(EMOTIONS.HAPPY, { duration: 2800, intensity: 0.75, reason: "pleasant greeting context" });
      return EMOTIONS.HAPPY;
    }

    return null;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  _resolveAlias(alias) {
    switch (alias) {
      case "joy":
      case "glad":
      case "cheerful":
        return EMOTIONS.HAPPY;
      case "thrilled":
      case "ecstatic":
        return EMOTIONS.EXCITED;
      case "sorrow":
      case "unhappy":
      case "grief":
        return EMOTIONS.SAD;
      case "letdown":
        return EMOTIONS.DISAPPOINTED;
      case "furious":
      case "annoyed":
        return EMOTIONS.ANGRY;
      case "shocked":
      case "amazed":
      case "astonished":
        return EMOTIONS.SURPRISED;
      case "inquisitive":
      case "interested":
        return EMOTIONS.CURIOUS;
      case "puzzled":
      case "perplexed":
        return EMOTIONS.CONFUSED;
      case "bashful":
      case "timid":
        return EMOTIONS.SHY;
      case "thoughtful":
      case "contemplative":
      case "pondering":
        return EMOTIONS.THINKING;
      case "teasing":
      case "mischievous":
        return EMOTIONS.PLAYFUL;
      case "compassionate":
      case "caring":
      case "sympathy":
        return EMOTIONS.EMPATHETIC;
      default:
        return EMOTIONS.NEUTRAL;
    }
  }

  dispose() {
    this.resetToNeutral();
  }
}

const EmotionEngine = new EmotionEngineClass();
export default EmotionEngine;
