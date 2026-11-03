/**
 * adapterFactory — Creates the correct ICharacterAdapter instance based on character metadata or file extension.
 */

import { VRMCharacterAdapter } from "./VRMCharacterAdapter.js";
import { GLTFHumanoidAdapter } from "./GLTFHumanoidAdapter.js";

export function createCharacterAdapter(characterDef) {
  const { id, type, modelUrl, metadata = {} } = characterDef;

  // Explicit type check
  if (type === "VRM" || type === "VRM_1" || type === "VRM_0") {
    return new VRMCharacterAdapter(id, metadata);
  }
  if (type === "GLTF" || type === "GLB" || type === "HUMANOID") {
    return new GLTFHumanoidAdapter(id, metadata);
  }

  // Fallback to URL extension
  const urlLower = String(modelUrl || "").toLowerCase();
  if (urlLower.endsWith(".vrm")) {
    return new VRMCharacterAdapter(id, metadata);
  }
  if (urlLower.endsWith(".gltf") || urlLower.endsWith(".glb")) {
    return new GLTFHumanoidAdapter(id, metadata);
  }

  // Default to VRM adapter
  return new VRMCharacterAdapter(id, metadata);
}
