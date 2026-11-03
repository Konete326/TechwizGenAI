/**
 * VoiceSyncManager — Universal Real-Time Lip-Sync & Audio Synchronization Engine.
 *
 * Capabilities:
 * - Real-time acoustic analysis synchronized with actual Web Audio playback via AudioAnalysisBus.
 * - Dynamic formant & spectral centroid tracking mapping to VRM/GLTF mouth shapes (aa, ih, ou, ee, oh).
 * - Smooth exponential attack & release envelope (no jitter, no snapping).
 * - Noise-gated: silent pauses and audio completion immediately decay to neutral mouth.
 * - Interrupt-safe: sofort zero-damping on turn interruption.
 * - Gaze & auto-blink layered independently from lip movement.
 * - Independent of Gemini API: works with any streaming audio provider.
 */

import AudioAnalysisBus from "./AudioAnalysisBus.js";
import CharacterStateManager, { CHARACTER_STATES } from "./CharacterStateManager.js";
import CharacterRegistry from "./CharacterRegistry.js";

const MOUTH_PHONEMES = ["aa", "ih", "ou", "ee", "oh"];

// Attack & Decay speeds (units per second)
const ATTACK_SPEED = 18.0;
const DECAY_SPEED = 14.0;
const NOISE_GATE_THRESHOLD = 0.025;

class VoiceSyncManagerClass {
  constructor() {
    this._active = false;
    this._speaking = false;
    this._speechEnergy = 0; // 0.0 - 1.0 smoothed audio energy for layered gestures
    this._targetWeights = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
    this._currentWeights = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };

    this._blinkTimer = null;
    this._unsubState = null;

    this._onTurnComplete = this._handleTurnComplete.bind(this);
    this._onTurnInterrupted = this._handleTurnInterrupted.bind(this);
  }

  /**
   * Start listening to audio & state events.
   */
  start() {
    if (this._active) return;
    this._active = true;

    window.addEventListener("nisa:live:turn_complete", this._onTurnComplete);
    window.addEventListener("nisa:live:turn_interrupted", this._onTurnInterrupted);

    this._unsubState = CharacterStateManager.onStateChange((state) => {
      if (state === CHARACTER_STATES.IDLE || state === CHARACTER_STATES.LISTENING) {
        this._dampAllMouth(true);
      }
    });

    this._startAutoBlink();
  }

  stop() {
    if (!this._active) return;
    this._active = false;

    window.removeEventListener("nisa:live:turn_complete", this._onTurnComplete);
    window.removeEventListener("nisa:live:turn_interrupted", this._onTurnInterrupted);

    this._unsubState?.();
    this._stopAutoBlink();
    this._dampAllMouth(true);
  }

  /**
   * Called every animation frame by CharacterRenderer.
   * Samples live audio playback and drives the active character's mouth shapes.
   * @param {number} delta — seconds since last frame
   */
  update(delta) {
    if (!this._active) return;

    const adapter = CharacterRegistry.getActiveAdapter();
    const isAudioActive = AudioAnalysisBus.isActive();
    const metrics = AudioAnalysisBus.sample();

    const isAudible = isAudioActive && metrics.volume > NOISE_GATE_THRESHOLD;

    // Smooth speech energy (used by CharacterController for speech-cadence head gestures)
    const energyTarget = isAudible ? metrics.volume : 0;
    this._speechEnergy += (energyTarget - this._speechEnergy) * Math.min(1, delta * 12);

    if (isAudible) {
      if (!this._speaking) {
        this._speaking = true;
        CharacterStateManager.transition(CHARACTER_STATES.SPEAKING);
      }

      // Calculate target weight for each phoneme
      const dom = metrics.dominantPhoneme;
      const vol = Math.min(1.0, metrics.volume * 1.15);

      for (const p of MOUTH_PHONEMES) {
        if (p === dom) {
          this._targetWeights[p] = vol;
        } else if (p === "aa" && (dom === "oh" || dom === "ou")) {
          // Partial blend for open vowels
          this._targetWeights[p] = vol * 0.35;
        } else {
          this._targetWeights[p] = 0;
        }
      }
    } else {
      if (this._speaking && this._speechEnergy < 0.05) {
        this._speaking = false;
        if (CharacterStateManager.getState() === CHARACTER_STATES.SPEAKING) {
          CharacterStateManager.transition(CHARACTER_STATES.LISTENING);
        }
      }
      for (const p of MOUTH_PHONEMES) {
        this._targetWeights[p] = 0;
      }

      // If audio is inactive and weights have already decayed to neutral,
      // stop overriding phonemes so explicit facial actions (e.g. show_teeth, smile) persist!
      const alreadyNeutral = MOUTH_PHONEMES.every((p) => this._currentWeights[p] <= 0.001);
      if (alreadyNeutral && this._speechEnergy <= 0.001) {
        return;
      }
    }

    // Apply envelope interpolation and set to adapter
    for (const p of MOUTH_PHONEMES) {
      const cur = this._currentWeights[p];
      const tgt = this._targetWeights[p];
      const speed = tgt > cur ? ATTACK_SPEED : DECAY_SPEED;
      const next = cur + (tgt - cur) * Math.min(1, delta * speed);

      this._currentWeights[p] = Math.max(0, Math.min(1, next));

      if (adapter) {
        adapter.setExpression(p, this._currentWeights[p]);
      }
    }
  }

  /**
   * Current smoothed speech energy (0.0 to 1.0)
   * Consumed by CharacterController to add natural head cadence while speaking.
   */
  getSpeechEnergy() {
    return this._speechEnergy;
  }

  isSpeaking() {
    return this._speaking;
  }

  // ─── Interrupt & End-of-turn Handling ────────────────────────────────────────

  _handleTurnComplete() {
    this._dampAllMouth(false);
    CharacterStateManager.transition(CHARACTER_STATES.IDLE);
  }

  _handleTurnInterrupted() {
    // Immediate hard damp on interrupt
    this._dampAllMouth(true);
    CharacterStateManager.transition(CHARACTER_STATES.LISTENING);
  }

  _dampAllMouth(instant = false) {
    this._speaking = false;
    this._speechEnergy = 0;
    const adapter = CharacterRegistry.getActiveAdapter();

    for (const p of MOUTH_PHONEMES) {
      this._targetWeights[p] = 0;
      if (instant) {
        this._currentWeights[p] = 0;
        if (adapter) adapter.setExpression(p, 0);
      }
    }
  }

  // ─── Auto Blink Layer ────────────────────────────────────────────────────────

  _startAutoBlink() {
    const scheduleBlink = () => {
      const delay = 2200 + Math.random() * 4000;
      this._blinkTimer = setTimeout(() => {
        this._doBlink();
        scheduleBlink();
      }, delay);
    };
    scheduleBlink();
  }

  _stopAutoBlink() {
    clearTimeout(this._blinkTimer);
    this._blinkTimer = null;
  }

  _doBlink() {
    const adapter = CharacterRegistry.getActiveAdapter();
    if (!adapter) return;

    const available = adapter.getAvailableExpressions();
    const hasBlink = available.includes("blink");
    const hasLeft = available.includes("blinkLeft");
    const hasRight = available.includes("blinkRight");

    if (!hasBlink && !hasLeft && !hasRight) return;

    if (hasBlink) {
      adapter.setExpression("blink", 1.0);
      setTimeout(() => adapter.setExpression("blink", 0), 110);
    } else {
      if (hasLeft) adapter.setExpression("blinkLeft", 1.0);
      if (hasRight) adapter.setExpression("blinkRight", 1.0);
      setTimeout(() => {
        if (hasLeft) adapter.setExpression("blinkLeft", 0);
        if (hasRight) adapter.setExpression("blinkRight", 0);
      }, 110);
    }
  }

  dispose() {
    this.stop();
  }
}

const VoiceSyncManager = new VoiceSyncManagerClass();
export default VoiceSyncManager;
