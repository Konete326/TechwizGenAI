/**
 * IdleBehaviorManager — Autonomous Idle Life & Micro-Behavior Subsystem.
 *
 * Implements:
 * - Natural human eye blinking with variable Poisson/Gaussian intervals and double-blinks.
 * - Organic breathing cycle (chest, spine, and chin micro-sway).
 * - Multi-state autonomous idle scheduler:
 *   IDLE -> LOOK_AROUND -> THINKING_GLANCE -> HAIR_ADJUST -> CURIOUS_TILT -> SOFT_SMILE -> SHOULDER_SHIFT
 * - Weighted random selection with cooldowns to prevent repetition.
 * - Strict safety: yields immediately when assistant speaks or an explicit user action executes.
 * - All movements calibrated to stay 100% visible inside the video-call viewport.
 */

import * as THREE from "three";
import EmotionEngine, { EMOTIONS } from "./EmotionEngine.js";

export const IDLE_STATES = {
  REST:             "IDLE_REST",
  LOOK_AROUND:      "IDLE_LOOK_AROUND",
  THINKING_GLANCE:  "IDLE_THINKING_GLANCE",
  HAIR_ADJUST:      "IDLE_HAIR_ADJUST",
  CURIOUS_TILT:     "IDLE_CURIOUS_TILT",
  SOFT_SMILE:       "IDLE_SOFT_SMILE",
  SHOULDER_SHIFT:   "IDLE_SHOULDER_SHIFT",
};

class IdleBehaviorManagerClass {
  constructor() {
    this._currentState = IDLE_STATES.REST;
    this._stateElapsed = 0;
    this._stateDuration = 0;

    // Cooldown timers for autonomous behaviors (in seconds)
    this._cooldowns = {
      [IDLE_STATES.LOOK_AROUND]: 0,
      [IDLE_STATES.THINKING_GLANCE]: 0,
      [IDLE_STATES.HAIR_ADJUST]: 0,
      [IDLE_STATES.CURIOUS_TILT]: 0,
      [IDLE_STATES.SOFT_SMILE]: 0,
      [IDLE_STATES.SHOULDER_SHIFT]: 0,
    };

    // Blinking subsystem
    this._nextBlinkTime = 3.0;
    this._blinkTimer = 0;
    this._isBlinking = false;
    this._blinkProgress = 0;
    this._doubleBlinkPending = false;

    // Organic breathing subsystem
    this._breathTime = 0;
    this._breathOffset = { pitch: 0, spineRoll: 0, chestFlex: 0 };

    // Autonomous offsets
    this._idleHeadOffset = { pitch: 0, yaw: 0, roll: 0 };
    this._targetHeadOffset = { pitch: 0, yaw: 0, roll: 0 };

    // Hair adjust arm override ({ active, progress, arms })
    this._armOverride = null;

    // Time until next autonomous action trigger
    this._actionCountdown = 5.0;
    this._enabled = true;
  }

  setEnabled(val) {
    this._enabled = Boolean(val);
    if (!this._enabled) {
      this._resetOffsets();
    }
  }

  // ─── Main Update Loop (Called Every Frame) ─────────────────────────────────

  update(delta, { adapter, isSpeaking, hasActiveAction, characterController }) {
    if (!this._enabled || !adapter) return;

    // Advance cooldowns
    for (const key of Object.keys(this._cooldowns)) {
      if (this._cooldowns[key] > 0) {
        this._cooldowns[key] = Math.max(0, this._cooldowns[key] - delta);
      }
    }

    // 1. Organic Breathing (Always runs gently in background)
    this._updateBreathing(delta, adapter);

    // 2. Micro-Blinking (Always runs, unless custom eyes-closed gesture active)
    this._updateBlinking(delta, adapter, hasActiveAction);

    // If assistant is speaking or executing an explicit requested action, yield autonomous idle actions
    if (isSpeaking || hasActiveAction) {
      this._resetOffsets();
      this._actionCountdown = 4.0; // delay next idle action after speaking
      return;
    }

    // 3. Update active autonomous idle state
    if (this._currentState !== IDLE_STATES.REST) {
      this._stateElapsed += delta;
      if (this._stateElapsed >= this._stateDuration) {
        this._returnToRest();
      }
    } else {
      // 4. Autonomous Scheduler Countdown
      this._actionCountdown -= delta;
      if (this._actionCountdown <= 0) {
        this._triggerNextAutonomousAction(characterController);
        this._actionCountdown = 6.0 + Math.random() * 5.0; // 6 to 11s interval
      }
    }

    // 5. Lerp head offsets smoothly
    const lerpFactor = Math.min(1.0, delta * 8.5);
    this._idleHeadOffset.pitch += (this._targetHeadOffset.pitch - this._idleHeadOffset.pitch) * lerpFactor;
    this._idleHeadOffset.yaw   += (this._targetHeadOffset.yaw   - this._idleHeadOffset.yaw)   * lerpFactor;
    this._idleHeadOffset.roll  += (this._targetHeadOffset.roll  - this._idleHeadOffset.roll)  * lerpFactor;

    // 6. Hair adjust arm kinematics if active
    if (this._armOverride) {
      this._updateHairAdjust(delta, characterController);
    }
  }

  getHeadOffset() {
    return {
      pitch: this._idleHeadOffset.pitch + this._breathOffset.pitch,
      yaw:   this._idleHeadOffset.yaw,
      roll:  this._idleHeadOffset.roll  + this._breathOffset.spineRoll,
    };
  }

  getCurrentState() {
    return this._currentState;
  }

  // ─── Organic Breathing Subsystem ───────────────────────────────────────────

  _updateBreathing(delta, adapter) {
    this._breathTime += delta;
    // Human resting respiration: ~0.22 Hz (13-14 breaths per minute)
    const breathCycle = Math.sin(this._breathTime * 1.38);
    const microSway   = Math.sin(this._breathTime * 0.72);

    this._breathOffset.pitch = breathCycle * 0.010;
    this._breathOffset.spineRoll = microSway * 0.006;
    this._breathOffset.chestFlex = (breathCycle * 0.5 + 0.5) * 0.012;

    // Apply subtle chest expansion to chest bone if available
    const chest = adapter.getHumanoidBone?.("chest") || adapter.getHumanoidBone?.("upperChest");
    if (chest) {
      chest.rotation.x = this._breathOffset.chestFlex;
    }
  }

  // ─── Micro-Blinking Subsystem ──────────────────────────────────────────────

  _updateBlinking(delta, adapter, hasActiveAction) {
    this._blinkTimer += delta;

    if (!this._isBlinking) {
      if (this._blinkTimer >= this._nextBlinkTime && !hasActiveAction) {
        this._isBlinking = true;
        this._blinkProgress = 0;
        this._blinkTimer = 0;
        // 18% probability of double-blink
        this._doubleBlinkPending = Math.random() < 0.18;
      }
    } else {
      this._blinkProgress += delta * 7.5; // ~135ms total blink cycle
      if (this._blinkProgress < 1.0) {
        // Bell curve closing and reopening
        const blinkValue = Math.sin(this._blinkProgress * Math.PI);
        adapter.setExpression?.("blink", blinkValue);
      } else {
        adapter.setExpression?.("blink", 0);
        this._isBlinking = false;
        this._blinkProgress = 0;

        if (this._doubleBlinkPending) {
          this._doubleBlinkPending = false;
          this._nextBlinkTime = 0.15; // Quick second blink
        } else {
          // Next natural blink in 2.6 to 5.2 seconds
          this._nextBlinkTime = 2.6 + Math.random() * 2.6;
        }
      }
    }
  }

  // ─── Autonomous Action Scheduler ───────────────────────────────────────────

  _triggerNextAutonomousAction(characterController) {
    // Weighted selection pool
    const candidates = [
      { state: IDLE_STATES.LOOK_AROUND,     weight: 25, minCooldown: 14 },
      { state: IDLE_STATES.CURIOUS_TILT,    weight: 22, minCooldown: 16 },
      { state: IDLE_STATES.SOFT_SMILE,      weight: 25, minCooldown: 18 },
      { state: IDLE_STATES.THINKING_GLANCE, weight: 18, minCooldown: 20 },
      { state: IDLE_STATES.HAIR_ADJUST,     weight: 12, minCooldown: 28 }, // rarer, high fidelity
      { state: IDLE_STATES.SHOULDER_SHIFT,  weight: 15, minCooldown: 18 },
    ];

    // Filter out states currently in cooldown
    const available = candidates.filter((c) => (this._cooldowns[c.state] || 0) <= 0);
    if (available.length === 0) return;

    // Weighted random pick
    const totalWeight = available.reduce((acc, c) => acc + c.weight, 0);
    let rand = Math.random() * totalWeight;
    let chosen = available[0];

    for (const item of available) {
      if (rand < item.weight) {
        chosen = item;
        break;
      }
      rand -= item.weight;
    }

    // Set cooldown
    this._cooldowns[chosen.state] = chosen.minCooldown;
    this._executeIdleState(chosen.state, characterController);
  }

  _executeIdleState(state, characterController) {
    this._currentState = state;
    this._stateElapsed = 0;

    switch (state) {
      case IDLE_STATES.LOOK_AROUND: {
        // Glance slightly left or right (random), then return
        const dir = Math.random() < 0.5 ? 1 : -1;
        this._targetHeadOffset.yaw = dir * 0.16;
        this._targetHeadOffset.pitch = -0.02;
        this._targetHeadOffset.roll = dir * -0.03;
        this._stateDuration = 2.2;
        break;
      }

      case IDLE_STATES.CURIOUS_TILT: {
        // Inquisitive head tilt with relaxed friendly expression
        const dir = Math.random() < 0.5 ? 1 : -1;
        this._targetHeadOffset.roll = dir * 0.08;
        this._targetHeadOffset.pitch = -0.04;
        this._targetHeadOffset.yaw = dir * -0.04;
        this._stateDuration = 2.4;
        EmotionEngine.setEmotion(EMOTIONS.CURIOUS, { intensity: 0.45, duration: 2200 });
        break;
      }

      case IDLE_STATES.SOFT_SMILE: {
        // Soft, serene smile
        this._targetHeadOffset.pitch = -0.02;
        this._targetHeadOffset.roll = -0.02;
        this._stateDuration = 2.5;
        EmotionEngine.setEmotion(EMOTIONS.HAPPY, { intensity: 0.40, duration: 2400 });
        break;
      }

      case IDLE_STATES.THINKING_GLANCE: {
        // Glance upward thoughtfully
        this._targetHeadOffset.pitch = -0.12;
        this._targetHeadOffset.yaw = 0.08;
        this._targetHeadOffset.roll = 0.03;
        this._stateDuration = 2.0;
        break;
      }

      case IDLE_STATES.HAIR_ADJUST: {
        // Right hand smoothly reaches up to brush/adjust hair at side of head
        this._stateDuration = 2.6;
        this._targetHeadOffset.roll = -0.06; // tilt head slightly into hand
        this._targetHeadOffset.pitch = -0.02;

        if (characterController) {
          characterController.startHairAdjustGesture({ duration: 2.6 });
        }
        break;
      }

      case IDLE_STATES.SHOULDER_SHIFT: {
        // Natural subtle posture adjustment
        this._targetHeadOffset.pitch = 0.04;
        this._targetHeadOffset.yaw = 0.05;
        this._stateDuration = 1.8;
        break;
      }

      default:
        this._returnToRest();
    }
  }

  _returnToRest() {
    this._currentState = IDLE_STATES.REST;
    this._stateElapsed = 0;
    this._stateDuration = 0;
    this._resetOffsets();
  }

  _resetOffsets() {
    this._targetHeadOffset.pitch = 0;
    this._targetHeadOffset.yaw = 0;
    this._targetHeadOffset.roll = 0;
  }

  dispose() {
    this._returnToRest();
  }
}

const IdleBehaviorManager = new IdleBehaviorManagerClass();
export default IdleBehaviorManager;
