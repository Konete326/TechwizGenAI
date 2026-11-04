import * as THREE from "three";
import ActionRegistry from "./ActionRegistry.js";
import AnimationManager from "./AnimationManager.js";
import CharacterRegistry from "./CharacterRegistry.js";

const LOCOMOTION_KEY = "locomotion";
const SPEED_TO_CLIP = {
  slow: { name: "walk", fallback: "walk", timeScale: 0.85 },
  normal: { name: "walk", fallback: "walk", timeScale: 1 },
  quick: { name: "jog", fallback: "jog", timeScale: 1 },
  fast: { name: "run", fallback: "run", timeScale: 1 },
  run: { name: "run", fallback: "run", timeScale: 1 },
};

function baseUrl() {
  const base = typeof import.meta !== "undefined" && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL : "/";
  return `${base}animations/`;
}

function activeAdapter() {
  return CharacterRegistry.getActiveAdapter();
}

class BVHActionLibraryClass {
  constructor() {
    this._manifest = null;
    this._manifestPromise = null;
    this._rawClips = new Map();
    this._built = new WeakMap();
    this._hipsRest = new WeakMap();
    this._baseUrl = baseUrl();
  }

  setBaseUrl(url) {
    this._baseUrl = url.endsWith("/") ? url : `${url}/`;
    this._manifest = null;
    this._manifestPromise = null;
    this._rawClips.clear();
  }

  async loadManifest() {
    if (this._manifest) return this._manifest;
    if (!this._manifestPromise) {
      this._manifestPromise = fetch(`${this._baseUrl}manifest.json`)
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          this._manifest = json?.clips || [];
          return this._manifest;
        })
        .catch(() => {
          this._manifestPromise = null;
          return [];
        });
    }
    return this._manifestPromise;
  }

  async initialize() {
    const clips = await this.loadManifest();
    for (const entry of clips) this._registerAction(entry);
    return clips.length;
  }

  getClipNames() {
    return (this._manifest || []).map((c) => c.name);
  }

  has(name) {
    return Boolean(this._manifest?.some((c) => c.name === name));
  }

  _registerAction(entry) {
    const previous = ActionRegistry.getExecutor(entry.name);
    const fallback = previous && !previous.__bvh ? previous : previous?.__fallback || null;
    ActionRegistry.register(
      {
        id: entry.name,
        name: entry.name.replace(/_/g, " "),
        category: entry.category,
        animation: `bvh:${entry.name}`,
        duration: Math.round(entry.duration * 1000),
        loop: Boolean(entry.loop),
        priority: 5,
        enabled: true,
      },
      { forceUpdate: true }
    );
    const executor = async (params = {}) => {
      const result = await this.play(entry.name, params);
      if (!result.success && fallback) return fallback(params);
      if (!result.success) throw new Error(result.error || "bvh_clip_failed");
      return result;
    };
    executor.__bvh = true;
    executor.__fallback = fallback;
    ActionRegistry.registerExecutor(entry.name, executor);
  }

  async _fetchRaw(name) {
    if (this._rawClips.has(name)) return this._rawClips.get(name);
    const promise = fetch(`${this._baseUrl}${name}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`clip_${name}_http_${res.status}`);
        return res.json();
      })
      .catch((err) => {
        this._rawClips.delete(name);
        throw err;
      });
    this._rawClips.set(name, promise);
    return promise;
  }

  _hipsRestPosition(adapter, hipsNode) {
    let rest = this._hipsRest.get(adapter);
    if (!rest) {
      rest = hipsNode.position.clone();
      this._hipsRest.set(adapter, rest);
    }
    return rest;
  }

  _build(adapter, raw) {
    const flip = adapter.vrm?.meta?.metaVersion === "0";
    const tracks = [];
    const times = Float32Array.from(raw.times);
    const rotZ = new THREE.Quaternion(0, 0, 1, 0);
    const tempQ = new THREE.Quaternion();
    for (const [bone, q] of Object.entries(raw.bones)) {
      const node = adapter.getHumanoidBone(bone);
      if (!node) continue;
      const isUpperLeg = bone === "leftUpperLeg" || bone === "rightUpperLeg";
      const values = new Float32Array(q.length);
      for (let i = 0; i < q.length; i += 4) {
        tempQ.set(q[i], q[i + 1], q[i + 2], q[i + 3]);
        if (isUpperLeg && Math.abs(tempQ.z) > 0.7) {
          tempQ.multiply(rotZ);
        }
        values[i] = flip ? -tempQ.x : tempQ.x;
        values[i + 1] = tempQ.y;
        values[i + 2] = flip ? -tempQ.z : tempQ.z;
        values[i + 3] = tempQ.w;
      }
      tracks.push(new THREE.QuaternionKeyframeTrack(`${node.name}.quaternion`, times, values));
    }
    const hips = adapter.getHumanoidBone("hips");
    if (hips && raw.hipsY) {
      const rest = this._hipsRestPosition(adapter, hips);
      const values = new Float32Array(raw.hipsY.length * 3);
      for (let i = 0; i < raw.hipsY.length; i++) {
        values[i * 3] = rest.x;
        values[i * 3 + 1] = rest.y * (1 + raw.hipsY[i]);
        values[i * 3 + 2] = rest.z;
      }
      tracks.push(new THREE.VectorKeyframeTrack(`${hips.name}.position`, times, values));
    }
    return new THREE.AnimationClip(raw.name, raw.duration, tracks);
  }

  async getClip(name, adapter = activeAdapter()) {
    if (!adapter) return null;
    let perAdapter = this._built.get(adapter);
    if (!perAdapter) {
      perAdapter = new Map();
      this._built.set(adapter, perAdapter);
    }
    if (perAdapter.has(name)) return perAdapter.get(name);
    const raw = await this._fetchRaw(name);
    const clip = this._build(adapter, raw);
    perAdapter.set(name, clip);
    return clip;
  }

  async play(name, params = {}) {
    try {
      await this.loadManifest();
      const entry = this._manifest?.find((c) => c.name === name);
      if (!entry) return { success: false, error: "clip_not_found" };
      const clip = await this.getClip(name);
      if (!clip || clip.tracks.length === 0) return { success: false, error: "rig_incompatible" };
      const blend = Number.isFinite(params.blendDuration) ? params.blendDuration : 0.25;
      const fadeIn = params.fadeIn ?? blend;
      const fadeOut = params.fadeOut ?? blend;
      let timeScale = Number(params.speedScale ?? params.timeScale ?? 1);
      if (params.duration && clip.duration > 0 && !params.loop) {
        const reqSec = params.duration > 20 ? params.duration / 1000 : params.duration;
        if (reqSec > 0.4) {
          timeScale = Math.min(2.5, Math.max(0.5, clip.duration / reqSec));
        }
      }
      timeScale = Math.min(2.5, Math.max(0.4, timeScale));
      const loop = Boolean(params.loop ?? false) && Boolean(entry.loop);
      const playing = AnimationManager.playClip(clip, {
        key: name,
        loop,
        timeScale,
        fadeIn,
        fadeOut,
      });
      if (loop && params.duration) {
        const ms = params.duration > 20 ? params.duration : params.duration * 1000;
        setTimeout(() => AnimationManager.stopClip(name, fadeOut), ms);
      }
      return await playing;
    } catch (err) {
      return { success: false, error: err?.message || "bvh_play_failed" };
    }
  }

  stop(name, fade = 0.3) {
    AnimationManager.stopClip(name, fade);
  }

  beginLocomotion(speed = "normal") {
    const choice = SPEED_TO_CLIP[String(speed).toLowerCase()] || SPEED_TO_CLIP.normal;
    const clipName = this.has(choice.name) ? choice.name : choice.fallback || choice.name;
    const handle = {
      ended: false,
      end: () => {
        handle.ended = true;
        AnimationManager.stopClip(LOCOMOTION_KEY, 0.35);
      },
    };
    this.getClip(clipName)
      .then((clip) => {
        if (handle.ended || !clip || clip.tracks.length === 0) return;
        AnimationManager.playClip(clip, {
          key: LOCOMOTION_KEY,
          loop: true,
          timeScale: choice.timeScale,
          fadeIn: 0.3,
          fadeOut: 0.35,
        });
      })
      .catch(() => {});
    return handle;
  }
}

const BVHActionLibrary = new BVHActionLibraryClass();
export default BVHActionLibrary;
