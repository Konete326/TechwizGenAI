/**
 * AnimationManager — Manages Three.js AnimationMixer, loads/plays/stops VRMA clips.
 * Standalone service — holds a reference to the Three.js AnimationMixer set by CharacterRenderer.
 */

import * as THREE from "three";

class AnimationManagerClass {
  constructor() {
    /** @type {THREE.AnimationMixer | null} */
    this._mixer = null;
    /** @type {THREE.Object3D | null} */
    this._root = null;
    /** @type {Map<string, THREE.AnimationClip>} */
    this._clips = new Map();
    /** @type {Map<string, THREE.AnimationAction>} */
    this._actions = new Map();
    /** @type {Map<string, number>} priority of active actions */
    this._priorities = new Map();
  }

  /**
   * Must be called by CharacterRenderer after VRM is loaded.
   * @param {THREE.AnimationMixer} mixer
   * @param {THREE.Object3D} root
   */
  setMixer(mixer, root) {
    this._mixer = mixer;
    this._root = root;
  }

  /** Called each animation frame by CharacterRenderer. */
  update(delta) {
    this._mixer?.update(delta);
  }

  /**
   * Load a VRMA clip from URL and register it by name.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async load(name, url) {
    try {
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const { VRMAnimationLoaderPlugin } = await import("@pixiv/three-vrm-animation");
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
      const gltf = await new Promise((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
      });
      const vrmAnimation = gltf.userData.vrmAnimations?.[0];
      if (!vrmAnimation) {
        return { success: false, error: `No VRM animation found in: ${url}` };
      }
      // createAnimationClip requires a VRM instance — deferred until character is loaded
      this._clips.set(name, { vrmAnimation, url });
      return { success: true };
    } catch (err) {
      return { success: false, error: err?.message || "Failed to load animation" };
    }
  }

  /**
   * Register a clip directly (e.g. from a loaded VRM's built-in clips).
   */
  registerClip(name, clip) {
    this._clips.set(name, clip);
  }

  /**
   * Play an animation by name.
   * @param {string} name
   * @param {{ loop?: boolean, crossfadeDuration?: number, priority?: number }} opts
   */
  play(name, opts = {}) {
    if (!this._mixer) return;
    const clipOrObj = this._clips.get(name);
    if (!clipOrObj) return;

    // clipOrObj may be a plain THREE.AnimationClip or our { vrmAnimation, url } record
    const clip = clipOrObj instanceof THREE.AnimationClip ? clipOrObj : null;
    if (!clip) return; // VRMA clips require VRM binding — handled by CharacterController

    const priority = opts.priority ?? 5;
    const existingAction = this._actions.get(name);

    if (existingAction) {
      existingAction.reset().play();
      return;
    }

    const action = this._mixer.clipAction(clip);
    action.setLoop(opts.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    action.clampWhenFinished = !opts.loop;
    action.priority = priority;

    if (opts.crossfadeDuration && opts.crossfadeDuration > 0) {
      // Fade in new action while fading out others with lower priority
      this._crossfadeToAction(action, opts.crossfadeDuration);
    } else {
      action.reset().play();
    }

    this._actions.set(name, action);
    this._priorities.set(name, priority);
  }

  _crossfadeToAction(newAction, duration) {
    for (const [, existingAction] of this._actions) {
      existingAction.crossFadeTo(newAction, duration, true);
    }
    newAction.reset();
    newAction.play();
  }

  stop(name) {
    const action = this._actions.get(name);
    if (action) {
      action.stop();
      this._actions.delete(name);
      this._priorities.delete(name);
    }
  }

  stopAll() {
    for (const [name] of this._actions) this.stop(name);
  }

  isPlaying(name) {
    return this._actions.get(name)?.isRunning() ?? false;
  }

  getLoadedClipNames() {
    return Array.from(this._clips.keys());
  }

  dispose() {
    this.stopAll();
    this._mixer?.stopAllAction();
    this._clips.clear();
    this._actions.clear();
    this._priorities.clear();
    this._mixer = null;
    this._root = null;
  }
}

const AnimationManager = new AnimationManagerClass();
export default AnimationManager;
