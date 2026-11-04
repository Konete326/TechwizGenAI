import * as THREE from "three";

export const FRAMING_MODES = {
  HEAD_AND_SHOULDERS: "HEAD_AND_SHOULDERS",
  BUST: "BUST",
  CLOSE_UP: "CLOSE_UP",
  FULL_BODY: "FULL_BODY",
};

class CameraFramingManagerClass {
  constructor() {
    this._mode = FRAMING_MODES.HEAD_AND_SHOULDERS;
    this._currentPosition = new THREE.Vector3(0, 1.4, 1.25);
    this._currentTarget = new THREE.Vector3(0, 1.32, 0);
    this._targetPosition = new THREE.Vector3(0, 1.4, 1.25);
    this._targetLookAt = new THREE.Vector3(0, 1.32, 0);
    this._fov = 28;
  }

  setMode(mode) {
    if (FRAMING_MODES[mode]) {
      this._mode = mode;
    }
  }

  getMode() {
    return this._mode;
  }

  applyFraming(adapter, camera, aspect = 1.0, immediate = false) {
    if (!adapter || !camera) return;

    const safeAspect = Number.isFinite(aspect) && aspect > 0.1 ? aspect : 0.65;
    const framing = adapter.getCameraFraming(this._mode, safeAspect);

    this._targetPosition.set(
      framing.cameraPosition[0],
      framing.cameraPosition[1],
      framing.cameraPosition[2]
    );
    this._targetLookAt.set(
      framing.target[0],
      framing.target[1],
      framing.target[2]
    );
    this._fov = framing.fov;

    if (immediate) {
      this._currentPosition.copy(this._targetPosition);
      this._currentTarget.copy(this._targetLookAt);
      camera.position.copy(this._currentPosition);
      camera.fov = this._fov;
      camera.lookAt(this._currentTarget);
      camera.updateProjectionMatrix();
    }
  }

  update(camera, delta) {
    if (!camera) return;

    const factor = Math.min(1, delta * 6.5);
    this._currentPosition.lerp(this._targetPosition, factor);
    this._currentTarget.lerp(this._targetLookAt, factor);

    camera.position.copy(this._currentPosition);
    camera.lookAt(this._currentTarget);

    if (Math.abs(camera.fov - this._fov) > 0.08) {
      camera.fov += (this._fov - camera.fov) * factor;
      camera.updateProjectionMatrix();
    }
  }
}

const CameraFramingManager = new CameraFramingManagerClass();
export default CameraFramingManager;
