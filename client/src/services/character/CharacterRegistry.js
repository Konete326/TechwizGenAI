/**
 * CharacterRegistry — Central management for all registered characters in the application.
 * Manages character definitions, capability profiles, adapter instantiation, and active character switching.
 * Persists character capability profiles to localStorage and is ready for server-side MongoDB sync.
 */

import { createCharacterAdapter } from "./adapters/adapterFactory.js";

const PROFILES_STORAGE_KEY = "nisa_character_profiles";
const REGISTRY_STORAGE_KEY = "nisa_character_registry";
const PROFILES_VERSION = 1;

/** Default seeded character (Nisa) */
const DEFAULT_CHARACTERS = [
  {
    id: "nisa",
    name: "Nisa",
    description: "Primary AI Voice Assistant Avatar",
    type: "VRM",
    modelUrl: "/models/nisa.vrm",
    framingMode: "HEAD_AND_SHOULDERS",
    active: true,
    metadata: {
      gender: "female",
      voiceStyle: "warm",
      defaultExpression: "neutral"
    }
  }
];

class CharacterRegistryClass {
  constructor() {
    /** @type {Map<string, object>} */
    this._characters = new Map();
    /** @type {Map<string, object>} Cached capability profiles */
    this._profiles = new Map();
    /** @type {Map<string, import("./adapters/ICharacterAdapter.js").ICharacterAdapter>} */
    this._adapters = new Map();
    this._activeCharacterId = "nisa";
    this._listeners = [];
    this._initialized = false;
    this._loadedCharacters = new Set();
    this._loadWaiters = new Map();
  }

  initialize() {
    if (this._initialized) return this;
    this._initialized = true;

    this._loadFromStorage();
    this._seedDefaults();
    return this;
  }

  // ─── Registration & Onboarding Pipeline ──────────────────────────────────────

  /**
   * Register a new character definition.
   * @param {object} characterDef
   * @returns {{ success: boolean, character?: object, error?: string }}
   */
  registerCharacter(characterDef) {
    if (!characterDef?.id || !characterDef?.modelUrl) {
      return { success: false, error: "Character definition requires 'id' and 'modelUrl'" };
    }

    const id = characterDef.id.toLowerCase();
    const existing = this._characters.get(id);

    const character = {
      id,
      name: characterDef.name || id,
      description: characterDef.description || "",
      type: characterDef.type || "VRM",
      modelUrl: characterDef.modelUrl,
      fallbackUrl: characterDef.fallbackUrl || null,
      framingMode: characterDef.framingMode || "HEAD_AND_SHOULDERS",
      active: characterDef.active ?? (existing ? existing.active : false),
      metadata: characterDef.metadata || {},
      registeredAt: existing?.registeredAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this._characters.set(id, character);
    this._persist();

    return { success: true, character };
  }

  /**
   * Onboard a character using its adapter:
   * 1. Inspect skeleton and humanoid rig
   * 2. Detect available expressions & phonemes
   * 3. Generate capability profile
   * 4. Cache capability profile
   */
  onboardCharacter(adapter) {
    const profile = adapter.inspectCapabilities();
    profile.version = PROFILES_VERSION;
    profile.onboardedAt = new Date().toISOString();

    this._profiles.set(adapter.characterId, profile);
    this._saveProfiles();

    this.markCharacterLoaded(adapter.characterId);
    return profile;
  }

  // ─── Character Readiness & Preloading ────────────────────────────────────────

  /**
   * Mark a character as fully loaded and ready in memory.
   * Resolves any pending callers waiting for this character.
   * @param {string} id
   */
  markCharacterLoaded(id) {
    const charId = (id || this._activeCharacterId).toLowerCase();
    this._loadedCharacters.add(charId);
    if (this._loadWaiters.has(charId)) {
      const waiters = this._loadWaiters.get(charId);
      this._loadWaiters.delete(charId);
      waiters.forEach((resolve) => {
        try { resolve(true); } catch (_) {}
      });
    }
  }

  /**
   * Mark a character as unloaded (e.g. on unmount or context loss).
   * @param {string} id
   */
  markCharacterUnloaded(id) {
    const charId = (id || this._activeCharacterId).toLowerCase();
    this._loadedCharacters.delete(charId);
  }

  /**
   * Check if a character is currently loaded and ready in the 3D scene.
   * @param {string} id
   * @returns {boolean}
   */
  isCharacterLoaded(id) {
    const charId = (id || this._activeCharacterId).toLowerCase();
    return this._loadedCharacters.has(charId);
  }

  /**
   * Wait for a character to finish loading and initialize in the 3D scene.
   * Resolves immediately if already loaded.
   * @param {string} id
   * @param {number} timeoutMs
   * @returns {Promise<boolean>}
   */
  waitForCharacter(id = "nisa", timeoutMs = 8000) {
    const charId = id.toLowerCase();
    if (this.isCharacterLoaded(charId)) {
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      let timer = null;
      const onDone = (res) => {
        if (timer) clearTimeout(timer);
        resolve(res);
      };
      if (!this._loadWaiters.has(charId)) {
        this._loadWaiters.set(charId, []);
      }
      this._loadWaiters.get(charId).push(onDone);
      timer = setTimeout(() => {
        const waiters = this._loadWaiters.get(charId) || [];
        const idx = waiters.indexOf(onDone);
        if (idx !== -1) waiters.splice(idx, 1);
        resolve(false);
      }, timeoutMs);
    });
  }

  /**
   * Preload a character's model file into the browser HTTP cache ahead of time.
   * Can be called on app start or during idle moments.
   * @param {string} id
   */
  async preloadCharacter(id = "nisa") {
    const charDef = this.getCharacter(id) || this.getActiveCharacter();
    if (!charDef || typeof window === "undefined" || typeof fetch === "undefined") return;
    try {
      const urls = [charDef.modelUrl, charDef.fallbackUrl].filter(Boolean);
      for (const url of urls) {
        try {
          await fetch(url, { mode: "cors", cache: "force-cache" });
          break;
        } catch (_) {}
      }
    } catch (_) {}
  }

  // ─── Adapter Management ──────────────────────────────────────────────────────

  /**
   * Get or create an adapter for a character.
   * @param {string} characterId
   */
  getAdapter(characterId) {
    const id = characterId.toLowerCase();
    let adapter = this._adapters.get(id);
    if (!adapter) {
      const def = this._characters.get(id);
      if (!def) return null;
      adapter = createCharacterAdapter(def);
      this._adapters.set(id, adapter);
    }
    return adapter;
  }

  // ─── Character Lookup ────────────────────────────────────────────────────────

  getCharacter(id) {
    return this._characters.get(id.toLowerCase()) || null;
  }

  getAllCharacters() {
    return Array.from(this._characters.values());
  }

  getActiveCharacter() {
    return this.getCharacter(this._activeCharacterId) || this.getAllCharacters()[0] || null;
  }

  getActiveAdapter() {
    const active = this.getActiveCharacter();
    return active ? this.getAdapter(active.id) : null;
  }

  getCapabilityProfile(id) {
    return this._profiles.get(id.toLowerCase()) || null;
  }

  // ─── Character Switching ─────────────────────────────────────────────────────

  /**
   * Switch the active character. Dispatches notification to listeners.
   * @param {string} id
   * @returns {{ success: boolean, activeCharacter?: object, error?: string }}
   */
  setActiveCharacter(id) {
    const charId = id.toLowerCase();
    if (!this._characters.has(charId)) {
      return { success: false, error: `Character '${charId}' is not registered` };
    }

    const prevId = this._activeCharacterId;
    if (prevId === charId) {
      return { success: true, activeCharacter: this.getCharacter(charId) };
    }

    // Mark previous inactive, new active
    const prev = this._characters.get(prevId);
    if (prev) prev.active = false;

    const current = this._characters.get(charId);
    current.active = true;
    this._activeCharacterId = charId;

    this._persist();
    this._notifySwitch(charId, prevId);

    return { success: true, activeCharacter: current };
  }

  /**
   * Subscribe to character switch events.
   * @param {(newCharacterId: string, prevCharacterId: string) => void} cb
   * @returns {() => void} unsubscribe
   */
  onCharacterSwitch(cb) {
    this._listeners.push(cb);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== cb);
    };
  }

  _notifySwitch(newId, prevId) {
    for (const cb of this._listeners) {
      try { cb(newId, prevId); } catch (_) {}
    }
  }

  // ─── Storage & Persistence ───────────────────────────────────────────────────

  _persist() {
    try {
      const data = {
        activeId: this._activeCharacterId,
        characters: this.getAllCharacters()
      };
      localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  _saveProfiles() {
    try {
      const data = {
        version: PROFILES_VERSION,
        profiles: Object.fromEntries(this._profiles.entries())
      };
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  _loadFromStorage() {
    try {
      const rawReg = localStorage.getItem(REGISTRY_STORAGE_KEY);
      if (rawReg) {
        const data = JSON.parse(rawReg);
        if (data.characters) {
          for (const c of data.characters) this._characters.set(c.id, c);
        }
        if (data.activeId) this._activeCharacterId = data.activeId;
      }

      const rawProf = localStorage.getItem(PROFILES_STORAGE_KEY);
      if (rawProf) {
        const data = JSON.parse(rawProf);
        if (data.profiles) {
          for (const [k, v] of Object.entries(data.profiles)) this._profiles.set(k, v);
        }
      }
    } catch (_) {}
  }

  _seedDefaults() {
    for (const c of DEFAULT_CHARACTERS) {
      if (!this._characters.has(c.id)) {
        this._characters.set(c.id, { ...c });
      }
    }
    if (!this._activeCharacterId) this._activeCharacterId = "nisa";
    this._persist();
  }
}

const CharacterRegistry = new CharacterRegistryClass();
export default CharacterRegistry;
