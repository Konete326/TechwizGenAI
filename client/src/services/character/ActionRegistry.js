/**
 * ActionRegistry — Standalone singleton service (no React dependencies).
 * Central registry for all Nisa character actions.
 * Supports: registration, validation, persistence, versioning, duplicate detection.
 */

const REGISTRY_KEY = "nisa_action_registry";
const REGISTRY_VERSION = 1;

const ACTION_CATEGORIES = ["idle", "gesture", "expression", "movement", "state", "custom"];

const ACTION_SCHEMA = {
  id: { type: "string", required: true },
  name: { type: "string", required: true },
  category: { type: "string", required: true, enum: ACTION_CATEGORIES },
  animation: { type: "string", required: false, nullable: true },
  duration: { type: "number", required: false },
  loop: { type: "boolean", required: false },
  priority: { type: "number", required: false },
  enabled: { type: "boolean", required: false },
  parameters: { type: "object", required: false },
};

/** Default actions registered on first load. Procedural actions supported by CharacterController have status "ready". */
const DEFAULT_ACTIONS = [
  { id: "idle",              name: "Idle",               category: "idle",       animation: null, duration: 0,    loop: true,  priority: 0,  enabled: true,  status: "ready", parameters: {} },
  { id: "blink",             name: "Blink",              category: "expression", animation: null, duration: 300,  loop: false, priority: 3,  enabled: true,  status: "ready", parameters: {} },
  { id: "smile",             name: "Smile",              category: "expression", animation: null, duration: 2000, loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "natural_smile",     name: "Natural Smile",      category: "expression", animation: null, duration: 2000, loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "wide_smile",        name: "Wide Smile",         category: "expression", animation: null, duration: 2200, loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "laugh",             name: "Laugh",              category: "expression", animation: null, duration: 2400, loop: false, priority: 5,  enabled: true,  status: "ready", parameters: {} },
  { id: "show_teeth",        name: "Show Teeth",         category: "expression", animation: null, duration: 2400, loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "teeth",             name: "Teeth",              category: "expression", animation: null, duration: 2400, loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "sad",               name: "Sad Face",           category: "expression", animation: null, duration: 2000, loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "excited",           name: "Excited",            category: "expression", animation: null, duration: 2600, loop: false, priority: 5,  enabled: true,  status: "ready", parameters: {} },
  { id: "disappointed",      name: "Disappointed",       category: "expression", animation: null, duration: 2400, loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "angry",             name: "Angry Face",         category: "expression", animation: null, duration: 2000, loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "surprised",         name: "Surprised Face",     category: "expression", animation: null, duration: 2000, loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "curious",           name: "Curious",            category: "expression", animation: null, duration: 2400, loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "confused",          name: "Confused",           category: "expression", animation: null, duration: 2400, loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "shy",               name: "Shy",                category: "expression", animation: null, duration: 2400, loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "playful",           name: "Playful",            category: "expression", animation: null, duration: 2400, loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "empathetic",        name: "Empathetic",         category: "expression", animation: null, duration: 2400, loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "mouth_open",        name: "Open Mouth",         category: "expression", animation: null, duration: 2000, loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "neutral",           name: "Neutral Face",       category: "expression", animation: null, duration: 500,  loop: false, priority: 2,  enabled: true,  status: "ready", parameters: {} },
  { id: "clap",              name: "Clap Hands",         category: "gesture",    animation: null, duration: 2700, loop: false, priority: 6,  enabled: true,  status: "ready", parameters: {} },
  { id: "clap_hands",        name: "Clap Hands",         category: "gesture",    animation: null, duration: 2700, loop: false, priority: 6,  enabled: true,  status: "ready", parameters: {} },
  { id: "clapping",          name: "Clapping",           category: "gesture",    animation: null, duration: 2700, loop: false, priority: 6,  enabled: true,  status: "ready", parameters: {} },
  { id: "wave",              name: "Wave Hand",          category: "gesture",    animation: null, duration: 2400, loop: false, priority: 5,  enabled: true,  status: "ready", parameters: { hand: "right" } },
  { id: "wave_right",        name: "Wave Right Hand",    category: "gesture",    animation: null, duration: 2400, loop: false, priority: 5,  enabled: true,  status: "ready", parameters: { hand: "right" } },
  { id: "wave_left",         name: "Wave Left Hand",     category: "gesture",    animation: null, duration: 2400, loop: false, priority: 5,  enabled: true,  status: "ready", parameters: { hand: "left" } },
  { id: "wave_both",         name: "Wave Both Hands",    category: "gesture",    animation: null, duration: 2600, loop: false, priority: 6,  enabled: true,  status: "ready", parameters: {} },
  { id: "both_hands_waving", name: "Both Hands Waving",  category: "gesture",    animation: null, duration: 2600, loop: false, priority: 6,  enabled: true,  status: "ready", parameters: {} },
  { id: "raise_both_hands",  name: "Raise Both Hands",   category: "gesture",    animation: null, duration: 1500, loop: false, priority: 5,  enabled: true,  status: "ready", parameters: {} },
  { id: "both_hands_raised", name: "Both Hands Raised",  category: "gesture",    animation: null, duration: 1500, loop: false, priority: 5,  enabled: true,  status: "ready", parameters: {} },
  { id: "lower_hands",       name: "Lower Hands",        category: "gesture",    animation: null, duration: 800,  loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "hands_lowered",     name: "Hands Lowered",      category: "gesture",    animation: null, duration: 800,  loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "adjust_hair",       name: "Adjust Hair",        category: "gesture",    animation: null, duration: 2500, loop: false, priority: 5,  enabled: true,  status: "ready", parameters: {} },
  { id: "hair_adjust",       name: "Hair Adjust",        category: "gesture",    animation: null, duration: 2500, loop: false, priority: 5,  enabled: true,  status: "ready", parameters: {} },
  { id: "nod",               name: "Nod",                category: "gesture",    animation: null, duration: 1400, loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "shake_head",        name: "Shake Head",         category: "gesture",    animation: null, duration: 1400, loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "greeting",          name: "Greeting",           category: "gesture",    animation: null, duration: 2600, loop: false, priority: 6,  enabled: true,  status: "ready", parameters: {} },
  { id: "turn_left",         name: "Turn Left",          category: "movement",   animation: null, duration: 800,  loop: false, priority: 3,  enabled: true,  status: "ready", parameters: {} },
  { id: "turn_right",        name: "Turn Right",         category: "movement",   animation: null, duration: 800,  loop: false, priority: 3,  enabled: true,  status: "ready", parameters: {} },
  { id: "look_left",         name: "Look Left",          category: "movement",   animation: null, duration: 800,  loop: false, priority: 3,  enabled: true,  status: "ready", parameters: {} },
  { id: "look_right",        name: "Look Right",         category: "movement",   animation: null, duration: 800,  loop: false, priority: 3,  enabled: true,  status: "ready", parameters: {} },
  { id: "look_up",           name: "Look Up",            category: "movement",   animation: null, duration: 600,  loop: false, priority: 3,  enabled: true,  status: "ready", parameters: {} },
  { id: "look_down",         name: "Look Down",          category: "movement",   animation: null, duration: 600,  loop: false, priority: 3,  enabled: true,  status: "ready", parameters: {} },
  { id: "look_at",           name: "Look At",            category: "movement",   animation: null, duration: 400,  loop: false, priority: 3,  enabled: true,  status: "ready", parameters: {} },
  { id: "move_left",         name: "Move Left",          category: "movement",   animation: null, duration: 700,  loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "move_right",        name: "Move Right",         category: "movement",   animation: null, duration: 700,  loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "move_forward",      name: "Move Forward",       category: "movement",   animation: null, duration: 850,  loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "come_closer",       name: "Come Closer",        category: "movement",   animation: null, duration: 850,  loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "come_forward",      name: "Come Forward",       category: "movement",   animation: null, duration: 850,  loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "move_backward",     name: "Move Backward",      category: "movement",   animation: null, duration: 900,  loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "step_back",         name: "Step Back",          category: "movement",   animation: null, duration: 900,  loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "move_away",         name: "Move Away",          category: "movement",   animation: null, duration: 900,  loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "turn_body_left",    name: "Turn Body Left",     category: "movement",   animation: null, duration: 750,  loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "turn_body_right",   name: "Turn Body Right",    category: "movement",   animation: null, duration: 750,  loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "turn_around",       name: "Turn Around",        category: "movement",   animation: null, duration: 900,  loop: false, priority: 5,  enabled: true,  status: "ready", parameters: {} },
  { id: "show_back",         name: "Show Back",          category: "movement",   animation: null, duration: 900,  loop: false, priority: 5,  enabled: true,  status: "ready", parameters: {} },
  { id: "face_camera",       name: "Face Camera",        category: "movement",   animation: null, duration: 750,  loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "turn_front",        name: "Turn Front",         category: "movement",   animation: null, duration: 750,  loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "walk",              name: "Walk",               category: "movement",   animation: null, duration: 3000, loop: false, priority: 5,  enabled: true,  status: "ready", parameters: {} },
  { id: "walk_to",           name: "Walk To Position",   category: "movement",   animation: null, duration: 3000, loop: false, priority: 5,  enabled: true,  status: "ready", parameters: {} },
  { id: "walk_forward",      name: "Walk Forward",       category: "movement",   animation: null, duration: 3000, loop: false, priority: 5,  enabled: true,  status: "ready", parameters: {} },
  { id: "lean_left",         name: "Lean Left",          category: "movement",   animation: null, duration: 700,  loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "lean_right",        name: "Lean Right",         category: "movement",   animation: null, duration: 700,  loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "center",            name: "Center",             category: "movement",   animation: null, duration: 600,  loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "return_to_center",  name: "Return To Center",   category: "movement",   animation: null, duration: 600,  loop: false, priority: 4,  enabled: true,  status: "ready", parameters: {} },
  { id: "return_to_original_position", name: "Return To Original Position", category: "movement", animation: null, duration: 750, loop: false, priority: 5, enabled: true, status: "ready", parameters: {} },
  { id: "stand_straight",    name: "Stand Straight",     category: "movement",   animation: null, duration: 750,  loop: false, priority: 5,  enabled: true,  status: "ready", parameters: {} },
  { id: "reset_pose",        name: "Reset Pose",         category: "movement",   animation: null, duration: 750,  loop: false, priority: 5,  enabled: true,  status: "ready", parameters: {} },
  { id: "handshake",         name: "Handshake",          category: "gesture",    animation: null, duration: 3000, loop: false, priority: 6,  enabled: true,  status: "ready", parameters: {} },
  { id: "handshake_greeting",name: "Handshake Greeting", category: "gesture",    animation: null, duration: 3000, loop: false, priority: 6,  enabled: true,  status: "ready", parameters: {} },
  { id: "extend_hand",       name: "Extend Hand",        category: "gesture",    animation: null, duration: 2400, loop: false, priority: 5,  enabled: true,  status: "ready", parameters: {} },
  { id: "reach_out",         name: "Reach Out",          category: "gesture",    animation: null, duration: 2400, loop: false, priority: 5,  enabled: true,  status: "ready", parameters: {} },
  { id: "raise_hand",        name: "Raise Hand",         category: "gesture",    animation: null, duration: 1800, loop: false, priority: 5,  enabled: true,  status: "ready", parameters: { hand: "right" } },
  { id: "raise_right_hand",  name: "Raise Right Hand",   category: "gesture",    animation: null, duration: 1800, loop: false, priority: 5,  enabled: true,  status: "ready", parameters: { hand: "right" } },
  { id: "raise_left_hand",   name: "Raise Left Hand",    category: "gesture",    animation: null, duration: 1800, loop: false, priority: 5,  enabled: true,  status: "ready", parameters: { hand: "left" } },
  { id: "point",             name: "Point",              category: "gesture",    animation: null, duration: 2800, loop: false, priority: 5,  enabled: true,  status: "ready", parameters: {} },
  { id: "point_left",        name: "Point Left",         category: "gesture",    animation: null, duration: 2800, loop: false, priority: 5,  enabled: true,  status: "ready", parameters: {} },
  { id: "point_right",       name: "Point Right",        category: "gesture",    animation: null, duration: 2800, loop: false, priority: 5,  enabled: true,  status: "ready", parameters: {} },
  { id: "point_up",          name: "Point Up",           category: "gesture",    animation: null, duration: 2800, loop: false, priority: 5,  enabled: true,  status: "ready", parameters: {} },
  { id: "point_down",        name: "Point Down",         category: "gesture",    animation: null, duration: 2800, loop: false, priority: 5,  enabled: true,  status: "ready", parameters: {} },
  { id: "point_at",          name: "Point At Target",    category: "gesture",    animation: null, duration: 2800, loop: false, priority: 5,  enabled: true,  status: "ready", parameters: {} },
  { id: "inspect_screen_component", name: "Inspect Screen Component", category: "gesture", animation: null, duration: 3200, loop: false, priority: 5, enabled: true, status: "ready", parameters: {} },
  { id: "look_at_component", name: "Look At Component",  category: "gesture",    animation: null, duration: 3200, loop: false, priority: 5,  enabled: true,  status: "ready", parameters: {} },
  { id: "thinking",          name: "Thinking",           category: "state",      animation: null, duration: 2500, loop: false, priority: 2,  enabled: true,  status: "ready", parameters: {} },
  { id: "listening",         name: "Listening",          category: "state",      animation: null, duration: 0,    loop: true,  priority: 2,  enabled: true,  status: "ready", parameters: {} },
  { id: "speaking",          name: "Speaking",           category: "state",      animation: null, duration: 0,    loop: true,  priority: 2,  enabled: true,  status: "ready", parameters: {} },
];

class ActionRegistryClass {
  constructor() {
    /** @type {Map<string, object>} */
    this._actions = new Map();
    /** @type {Array<{timestamp: number, type: string, actionId: string, detail?: string}>} */
    this._history = [];
    this._version = REGISTRY_VERSION;
    this._loaded = false;
    this._executors = new Map(); // id → async executor function
  }

  // ─── Initialisation ──────────────────────────────────────────────────────────

  /** Load persisted actions then seed defaults. Call once on app start. */
  initialize() {
    if (this._loaded) return this;
    this._loaded = true;
    this._loadFromStorage();
    this._seedDefaults();
    return this;
  }

  // ─── Validation ──────────────────────────────────────────────────────────────

  /**
   * Validate an action object against the schema.
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate(action) {
    const errors = [];
    if (!action || typeof action !== "object") {
      return { valid: false, errors: ["Action must be a non-null object"] };
    }
    for (const [field, rules] of Object.entries(ACTION_SCHEMA)) {
      const val = action[field];
      if (rules.required && (val === undefined || val === null)) {
        if (!(rules.nullable && val === null)) {
          // Only error if not nullable-null and value is truly missing
          if (val === undefined) {
            errors.push(`Missing required field: ${field}`);
            continue;
          }
        }
      }
      if (val !== undefined && val !== null) {
        if (rules.type && typeof val !== rules.type) {
          errors.push(`Field '${field}' must be type '${rules.type}', got '${typeof val}'`);
        }
        if (rules.enum && !rules.enum.includes(val)) {
          errors.push(`Field '${field}' must be one of [${rules.enum.join(", ")}], got '${val}'`);
        }
      }
    }
    return { valid: errors.length === 0, errors };
  }

  // ─── Registration ─────────────────────────────────────────────────────────────

  /**
   * Register a new action. Will NOT overwrite an existing action unless forceUpdate=true.
   * If animation is null, marks status as "pending".
   * @returns {{ success: boolean, action?: object, error?: string }}
   */
  register(actionDef, { forceUpdate = false } = {}) {
    const { valid, errors } = this.validate(actionDef);
    if (!valid) {
      return { success: false, error: `Validation failed: ${errors.join("; ")}` };
    }

    const id = actionDef.id;

    if (this._actions.has(id) && !forceUpdate) {
      return {
        success: false,
        error: `Action '${id}' already exists. Use forceUpdate=true to overwrite.`,
      };
    }

    const normalized = {
      id,
      name: actionDef.name,
      category: actionDef.category,
      animation: actionDef.animation ?? null,
      duration: actionDef.duration ?? 1000,
      loop: actionDef.loop ?? false,
      priority: actionDef.priority ?? 5,
      enabled: actionDef.enabled !== false,
      parameters: actionDef.parameters ?? {},
      status: actionDef.animation ? "ready" : "pending",
      registeredAt: actionDef.registeredAt || new Date().toISOString(),
      version: this._version,
    };

    const isUpdate = this._actions.has(id);
    this._actions.set(id, normalized);
    this._logHistory(isUpdate ? "updated" : "registered", id);
    this._persist();

    return { success: true, action: normalized };
  }

  /**
   * Mark an existing action as ready once its animation asset is confirmed available.
   */
  markReady(id, animationKey) {
    const action = this._actions.get(id);
    if (!action) return { success: false, error: `Action '${id}' not found` };
    const updated = { ...action, animation: animationKey, status: "ready" };
    this._actions.set(id, updated);
    this._logHistory("marked_ready", id, animationKey);
    this._persist();
    return { success: true, action: updated };
  }

  // ─── Lookup ───────────────────────────────────────────────────────────────────

  has(id) { return this._actions.has(id); }

  get(id) { return this._actions.get(id) ?? null; }

  getAll() { return Array.from(this._actions.values()); }

  getEnabled() { return this.getAll().filter((a) => a.enabled); }

  getByCategory(category) { return this.getAll().filter((a) => a.category === category); }

  getReady() { return this.getAll().filter((a) => a.status === "ready"); }

  getPending() { return this.getAll().filter((a) => a.status === "pending"); }

  // ─── Execution ────────────────────────────────────────────────────────────────

  /**
   * Register an executor function for an action id.
   * Executors are provided by CharacterController and are NOT persisted.
   * @param {string} id
   * @param {(params: object) => Promise<void>} fn
   */
  registerExecutor(id, fn) {
    this._executors.set(id, fn);
    const action = this._actions.get(id);
    if (action && action.status === "pending") {
      action.status = "ready";
      this._persist();
    }
  }

  hasExecutor(id) {
    return this._executors.has(id);
  }

  /**
   * Execute an action by id with optional parameters.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async execute(id, params = {}) {
    const action = this._actions.get(id);
    if (!action) return { success: false, error: `Action '${id}' not found` };
    if (!action.enabled) return { success: false, error: `Action '${id}' is disabled` };

    const executor = this._executors.get(id);
    if (!executor) {
      // Action is registered but no executor yet (CharacterController not mounted)
      return { success: false, error: `No executor registered for action '${id}'` };
    }

    try {
      await executor({ ...action.parameters, ...params });
      this._logHistory("executed", id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err?.message || "Execution error" };
    }
  }

  // ─── History ─────────────────────────────────────────────────────────────────

  getHistory(limit = 50) {
    return this._history.slice(-limit);
  }

  // ─── Persistence ─────────────────────────────────────────────────────────────

  _persist() {
    try {
      const data = {
        version: this._version,
        savedAt: new Date().toISOString(),
        actions: this.getAll(),
      };
      localStorage.setItem(REGISTRY_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn("[ActionRegistry] Failed to persist to localStorage:", err);
    }
  }

  _loadFromStorage() {
    try {
      const raw = localStorage.getItem(REGISTRY_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data?.actions) return;
      for (const action of data.actions) {
        // Restore but don't validate to avoid breaking saved actions on schema changes
        if (action?.id) this._actions.set(action.id, action);
      }
    } catch (err) {
      console.warn("[ActionRegistry] Failed to load from localStorage:", err);
    }
  }

  _seedDefaults() {
    for (const action of DEFAULT_ACTIONS) {
      const existing = this._actions.get(action.id);
      const normalized = {
        ...action,
        status: "ready",
        registeredAt: existing?.registeredAt || new Date().toISOString(),
        version: this._version,
      };
      this._actions.set(action.id, normalized);
    }
    this._persist();
  }

  _logHistory(type, actionId, detail) {
    this._history.push({ timestamp: Date.now(), type, actionId, detail });
    // Keep history bounded
    if (this._history.length > 200) this._history.splice(0, 50);
  }

  /** Wipe all non-default actions (for dev/testing) */
  reset() {
    this._actions.clear();
    this._history = [];
    localStorage.removeItem(REGISTRY_KEY);
    this._seedDefaults();
  }
}

// Export singleton
const ActionRegistry = new ActionRegistryClass();
export default ActionRegistry;
