/**
 * ExpressionManager — Wraps VRM BlendShape / Expression API.
 * Only operates on expressions that actually exist on the loaded VRM model.
 * Standalone service — no React dependencies.
 */

class ExpressionManagerClass {
  constructor() {
    /** @type {import("@pixiv/three-vrm").VRM | null} */
    this._vrm = null;
    /** @type {Set<string>} Available expression names confirmed on this VRM */
    this._available = new Set();
  }

  /**
   * Called by CharacterRenderer once VRM is loaded.
   * @param {import("@pixiv/three-vrm").VRM} vrm
   */
  setVRM(vrm) {
    this._vrm = vrm;
    this._available.clear();

    // VRM 1.0 uses expressionManager
    const em = vrm.expressionManager;
    if (em) {
      if (em.expressionMap) {
        if (em.expressionMap instanceof Map) {
          for (const key of em.expressionMap.keys()) this._available.add(key);
        } else if (typeof em.expressionMap === "object") {
          for (const key of Object.keys(em.expressionMap)) this._available.add(key);
        }
      }
      const candidateNames = [
        "happy", "angry", "sad", "surprised", "relaxed",
        "aa", "ih", "ou", "ee", "oh", // mouth shapes
        "blink", "blinkLeft", "blinkRight",
        "lookUp", "lookDown", "lookLeft", "lookRight",
        "neutral",
      ];
      for (const name of candidateNames) {
        const expr = em.getExpression?.(name);
        if (expr != null) {
          this._available.add(name);
        }
      }
    }

    // VRM 0.x uses blendShapeProxy
    const bsp = vrm.blendShapeProxy;
    if (bsp && bsp.blendShapeGroups) {
      for (const group of bsp.blendShapeGroups) {
        if (group.name) this._available.add(group.name.toLowerCase());
      }
    }
  }

  /** Returns array of available expression names on the current VRM. */
  getAvailable() {
    return Array.from(this._available);
  }

  hasExpression(name) {
    return this._available.has(name);
  }

  /**
   * Set an expression weight (0.0–1.0).
   * Silently skips if the expression doesn't exist on this VRM.
   */
  setExpression(name, intensity = 1.0) {
    if (!this._vrm || !this._available.has(name)) return;

    const em = this._vrm.expressionManager;
    if (em?.setValue) {
      em.setValue(name, Math.max(0, Math.min(1, intensity)));
      return;
    }

    // VRM 0.x fallback
    const bsp = this._vrm.blendShapeProxy;
    if (bsp?.setValue) {
      bsp.setValue(name, Math.max(0, Math.min(1, intensity)));
    }
  }

  /**
   * Smoothly blend to an expression over a duration.
   * Returns a cancel function.
   */
  blendTo(name, targetIntensity, durationMs = 300) {
    if (!this._available.has(name)) return () => {};
    const startTime = performance.now();
    const startIntensity = this._getCurrentValue(name);
    let rafId;

    const animate = (now) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease in-out
      this.setExpression(name, startIntensity + (targetIntensity - startIntensity) * eased);
      if (t < 1) rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }

  /** Clear all expressions back to 0 */
  clearAll() {
    for (const name of this._available) {
      this.setExpression(name, 0);
    }
    // Update VRM expression manager
    this._vrm?.expressionManager?.update?.();
  }

  /** Update must be called each frame by CharacterRenderer */
  update() {
    this._vrm?.expressionManager?.update?.();
  }

  _getCurrentValue(name) {
    try {
      return this._vrm?.expressionManager?.getValue?.(name) ?? 0;
    } catch (_) { return 0; }
  }

  dispose() {
    this._vrm = null;
    this._available.clear();
  }
}

const ExpressionManager = new ExpressionManagerClass();
export default ExpressionManager;
