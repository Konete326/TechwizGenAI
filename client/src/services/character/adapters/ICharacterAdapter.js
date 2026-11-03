/**
 * ICharacterAdapter — Universal Character Adapter Interface.
 * Defines the contract that all 3D character formats (VRM 1.0, VRM 0.x, GLTF Humanoid, Realistic Humans) must fulfill.
 */

export class ICharacterAdapter {
  constructor(characterId, metadata = {}) {
    this.characterId = characterId;
    this.metadata = metadata;
    /** @type {THREE.Object3D | null} */
    this.root = null;
    /** @type {object | null} CharacterCapabilityProfile */
    this.profile = null;
  }

  /**
   * Load the 3D model from URL.
   * @param {string} modelUrl
   * @param {(pct: number) => void} onProgress
   * @returns {Promise<THREE.Object3D>} The root 3D object to add to the scene
   */
  async load(modelUrl, onProgress) {
    throw new Error("ICharacterAdapter.load() must be implemented");
  }

  /**
   * Inspect character and generate full capability profile (bones, expressions, gestures).
   * @returns {object} CharacterCapabilityProfile
   */
  inspectCapabilities() {
    throw new Error("ICharacterAdapter.inspectCapabilities() must be implemented");
  }

  /**
   * Retrieve a humanoid bone node by standard semantic bone name
   * (e.g. 'head', 'neck', 'chest', 'spine', 'hips', 'leftHand', 'rightHand', etc.)
   * @param {string} boneName
   * @returns {THREE.Object3D | null}
   */
  getHumanoidBone(boneName) {
    throw new Error("ICharacterAdapter.getHumanoidBone() must be implemented");
  }

  /**
   * Set facial expression weight (0.0 to 1.0)
   * @param {string} expressionName — standard names: 'happy', 'blink', 'aa', 'oh', 'ee', 'ih', 'ou', 'neutral', 'sad', 'angry'
   * @param {number} intensity
   */
  setExpression(expressionName, intensity = 1.0) {
    throw new Error("ICharacterAdapter.setExpression() must be implemented");
  }

  /**
   * Get current intensity of an expression.
   * @param {string} expressionName
   * @returns {number}
   */
  getExpression(expressionName) {
    return 0;
  }

  /**
   * List all verified available expressions on this character.
   * @returns {string[]}
   */
  getAvailableExpressions() {
    return [];
  }

  /**
   * Reset all expressions to neutral (0)
   */
  resetExpressions() {
    // optional default
  }

  /**
   * Calculate video-call camera framing parameters based on this character's proportions.
   * @param {"HEAD_AND_SHOULDERS" | "BUST" | "CLOSE_UP" | "FULL_BODY"} mode
   * @param {number} aspect — canvas width / height
   * @returns {{ cameraPosition: [number, number, number], target: [number, number, number], fov: number }}
   */
  getCameraFraming(mode = "HEAD_AND_SHOULDERS", aspect = 1.0) {
    throw new Error("ICharacterAdapter.getCameraFraming() must be implemented");
  }

  /**
   * Called every animation frame.
   * @param {number} delta — seconds since last frame
   */
  update(delta) {
    // optional per-frame hook
  }

  /**
   * Dispose all GPU and CPU resources used by this character.
   */
  dispose() {
    this.root = null;
    this.profile = null;
  }
}
