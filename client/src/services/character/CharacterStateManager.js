/**
 * CharacterStateManager — Manages the character's high-level state machine.
 * States: IDLE, SPEAKING, LISTENING, THINKING, GREETING, ANIMATING
 * Standalone service — no React dependencies.
 */

export const CHARACTER_STATES = {
  IDLE: "IDLE",
  SPEAKING: "SPEAKING",
  LISTENING: "LISTENING",
  THINKING: "THINKING",
  GREETING: "GREETING",
  ANIMATING: "ANIMATING",
};

/**
 * Valid transitions map: from → Set of allowed to-states.
 * Any state can transition to IDLE (fallback/reset).
 */
const VALID_TRANSITIONS = {
  [CHARACTER_STATES.IDLE]:      new Set([CHARACTER_STATES.SPEAKING, CHARACTER_STATES.LISTENING, CHARACTER_STATES.THINKING, CHARACTER_STATES.GREETING, CHARACTER_STATES.ANIMATING]),
  [CHARACTER_STATES.SPEAKING]:  new Set([CHARACTER_STATES.IDLE, CHARACTER_STATES.LISTENING, CHARACTER_STATES.ANIMATING]),
  [CHARACTER_STATES.LISTENING]: new Set([CHARACTER_STATES.IDLE, CHARACTER_STATES.SPEAKING, CHARACTER_STATES.THINKING]),
  [CHARACTER_STATES.THINKING]:  new Set([CHARACTER_STATES.IDLE, CHARACTER_STATES.SPEAKING, CHARACTER_STATES.LISTENING]),
  [CHARACTER_STATES.GREETING]:  new Set([CHARACTER_STATES.IDLE, CHARACTER_STATES.SPEAKING]),
  [CHARACTER_STATES.ANIMATING]: new Set([CHARACTER_STATES.IDLE, CHARACTER_STATES.SPEAKING, CHARACTER_STATES.LISTENING]),
};

class CharacterStateManagerClass {
  constructor() {
    this._state = CHARACTER_STATES.IDLE;
    /** @type {Array<(newState: string, prevState: string) => void>} */
    this._listeners = [];
  }

  getState() {
    return this._state;
  }

  canTransition(from, to) {
    const allowed = VALID_TRANSITIONS[from];
    return allowed ? allowed.has(to) : false;
  }

  /**
   * Transition to a new state.
   * @param {string} newState — one of CHARACTER_STATES values
   * @param {boolean} force — skip validation (for emergency resets)
   * @returns {{ success: boolean, error?: string, state: string }}
   */
  transition(newState, force = false) {
    if (!CHARACTER_STATES[newState]) {
      return { success: false, error: `Unknown state: ${newState}`, state: this._state };
    }
    if (this._state === newState) {
      return { success: true, state: this._state }; // already in state
    }
    if (!force && !this.canTransition(this._state, newState)) {
      return {
        success: false,
        error: `Cannot transition from ${this._state} to ${newState}`,
        state: this._state,
      };
    }
    const prev = this._state;
    this._state = newState;
    this._notify(newState, prev);
    return { success: true, state: this._state };
  }

  /** Force reset to IDLE — always succeeds */
  reset() {
    const prev = this._state;
    this._state = CHARACTER_STATES.IDLE;
    if (prev !== CHARACTER_STATES.IDLE) this._notify(CHARACTER_STATES.IDLE, prev);
  }

  /**
   * Subscribe to state changes.
   * @param {(newState: string, prevState: string) => void} cb
   * @returns {() => void} unsubscribe function
   */
  onStateChange(cb) {
    this._listeners.push(cb);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== cb);
    };
  }

  _notify(newState, prevState) {
    for (const cb of this._listeners) {
      try { cb(newState, prevState); } catch (_) {}
    }
  }
}

const CharacterStateManager = new CharacterStateManagerClass();
export default CharacterStateManager;
