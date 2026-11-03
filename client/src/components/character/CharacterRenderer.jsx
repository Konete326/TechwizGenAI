/**
 * CharacterRenderer — Professional Character Rendering Engine.
 *
 * Capabilities:
 * - High-fidelity Three.js WebGL2/WebGL pipeline with ACES Filmic Tone Mapping and SRGB Color Space.
 * - Hardware and GPU diagnostics: detects GPU tier, handles WebGL context loss, provides voice-only fallback.
 * - Dynamic Video-Call Camera Framing: accurately accounts for hair top and humanoid landmarks with safe headroom.
 * - Real skeletal kinematics, procedural hand gestures, and real-time audio-synchronized lip-sync.
 * - Memory leak prevention, texture anisotropic filtering, and complete WebGL disposal on unmount.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

import ActionRegistry from "../../services/character/ActionRegistry.js";
import ExpressionManager from "../../services/character/ExpressionManager.js";
import AnimationManager from "../../services/character/AnimationManager.js";
import CharacterController from "../../services/character/CharacterController.js";
import VoiceSyncManager from "../../services/character/VoiceSyncManager.js";
import CharacterStateManager, { CHARACTER_STATES } from "../../services/character/CharacterStateManager.js";
import CameraFramingManager from "../../services/character/CameraFramingManager.js";
import CharacterRegistry from "../../services/character/CharacterRegistry.js";
import HardwareDiagnostics from "../../services/character/HardwareDiagnostics.js";
import GeminiCharacterBridge from "../../services/character/GeminiCharacterBridge.js";
import EmotionEngine from "../../services/character/EmotionEngine.js";
import IdleBehaviorManager from "../../services/character/IdleBehaviorManager.js";

export function CharacterRenderer({ isSpeaking, characterId, onFallbackToVoice, className = "" }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const adapterRef = useRef(null);
  const rafRef = useRef(null);
  const observerRef = useRef(null);
  const isVisibleRef = useRef(true);

  const [loadState, setLoadState] = useState({
    status: "loading", // "loading" | "loaded" | "error" | "webgl_unavailable" | "context_lost"
    progress: 0,
    characterName: "Nisa",
    error: null,
    gpuInfo: "",
  });

  // ─── Sync external isSpeaking prop → CharacterStateManager ────────────────
  useEffect(() => {
    CharacterController.setIsSpeaking(Boolean(isSpeaking));
    if (isSpeaking) {
      CharacterStateManager.transition(CHARACTER_STATES.SPEAKING);
    } else {
      CharacterStateManager.transition(CHARACTER_STATES.LISTENING);
    }
  }, [isSpeaking]);

  // ─── Interactive Mouse Head/Eye Tracking ─────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    CharacterController.setLookTarget(x, -y);
  }, []);

  // ─── Main Scene & Character Pipeline ─────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let isDisposed = false;

    // 1. Hardware & GPU Diagnostic Check
    const hwReport = HardwareDiagnostics.checkCapabilities();
    if (!hwReport.webglAvailable) {
      setLoadState({
        status: "webgl_unavailable",
        progress: 0,
        characterName: "Nisa",
        error: hwReport.diagnosticMessage,
        gpuInfo: hwReport.renderer,
      });
      return;
    }

    // 2. Initialize registries
    ActionRegistry.initialize();
    CharacterRegistry.initialize();

    // Expose for runtime inspection & automated diagnostic testing
    window.__CharacterController = CharacterController;
    window.__GeminiCharacterBridge = GeminiCharacterBridge;
    window.__HardwareDiagnostics = HardwareDiagnostics;
    window.__EmotionEngine = EmotionEngine;
    window.__IdleBehaviorManager = IdleBehaviorManager;

    if (characterId) {
      CharacterRegistry.setActiveCharacter(characterId);
    }

    // 3. Set up Three.js Renderer with Enhanced Visual Fidelity
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      });
    } catch (err) {
      setLoadState({
        status: "webgl_unavailable",
        progress: 0,
        characterName: "Nisa",
        error: `Could not create WebGL context: ${err.message}`,
        gpuInfo: hwReport.renderer,
      });
      return;
    }

    // Use optimal pixel ratio based on detected hardware (supports Retina/2.0 without blur)
    renderer.setPixelRatio(hwReport.recommendedPixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);

    // Film-quality color grading: ACES Filmic tone mapping + SRGB color space
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = false;
    rendererRef.current = renderer;

    // 4. WebGL Context Loss Handlers
    const handleContextLost = (e) => {
      e.preventDefault();
      cancelAnimationFrame(rafRef.current);
      setLoadState((prev) => ({
        ...prev,
        status: "context_lost",
        error: "WebGL graphics context was reset by the system.",
      }));
    };

    const handleContextRestored = () => {
      window.location.reload();
    };

    canvas.addEventListener("webglcontextlost", handleContextLost, false);
    canvas.addEventListener("webglcontextrestored", handleContextRestored, false);

    // 5. Set up Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 6. Set up Camera (Vertical FOV: 28deg for portrait telephoto compression)
    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    const camera = new THREE.PerspectiveCamera(28, aspect, 0.1, 20);
    camera.position.set(0, 1.42, 1.45);
    camera.lookAt(0, 1.38, 0);
    cameraRef.current = camera;

    // 7. Studio Portrait Lighting Setup (Clean, balanced anime portrait lighting)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.70);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffaf2, 1.15);
    keyLight.position.set(1.0, 2.2, 1.8);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe6efff, 0.45);
    fillLight.position.set(-1.5, 1.5, 1.2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffeedd, 0.35);
    rimLight.position.set(0, 2.0, -1.8);
    scene.add(rimLight);

    // Lower bounce fill light to eliminate dark shadows in bottom torso/chest area
    const bottomBounceLight = new THREE.DirectionalLight(0xfff3e6, 0.40);
    bottomBounceLight.position.set(0, 0.3, 1.4);
    bottomBounceLight.target.position.set(0, 1.25, 0);
    scene.add(bottomBounceLight);
    scene.add(bottomBounceLight.target);

    // 8. Character Loader Subroutine
    const loadActiveCharacter = async (charId) => {
      const charDef = CharacterRegistry.getCharacter(charId) || CharacterRegistry.getActiveCharacter();
      if (!charDef) {
        setLoadState({
          status: "error",
          progress: 0,
          characterName: "Unknown",
          error: `Character '${charId}' is not registered.`,
          gpuInfo: hwReport.renderer,
        });
        return;
      }

      setLoadState({
        status: "loading",
        progress: 10,
        characterName: charDef.name,
        error: null,
        gpuInfo: hwReport.renderer,
      });

      // Detach and clean up any previously loaded character
      if (adapterRef.current) {
        try {
          scene.remove(adapterRef.current.root);
          adapterRef.current.dispose();
        } catch (e) {
          console.warn("[CharacterRenderer] Error disposing previous character:", e);
        }
        adapterRef.current = null;
      }

      const adapter = CharacterRegistry.getAdapter(charDef.id);
      if (!adapter) {
        setLoadState({
          status: "error",
          progress: 0,
          characterName: charDef.name,
          error: `Could not create adapter for character '${charDef.id}'.`,
          gpuInfo: hwReport.renderer,
        });
        return;
      }

      const onProgress = (pct) => {
        if (!isDisposed) {
          setLoadState((prev) => ({ ...prev, progress: pct }));
        }
      };

      try {
        let loadSucceeded = false;
        try {
          await adapter.load(charDef.modelUrl, onProgress);
          loadSucceeded = true;
        } catch (err) {
          if (charDef.fallbackUrl) {
            console.warn(`[CharacterRenderer] Primary URL ${charDef.modelUrl} failed, trying fallback ${charDef.fallbackUrl}...`, err);
            await adapter.load(charDef.fallbackUrl, onProgress);
            loadSucceeded = true;
          } else {
            throw err;
          }
        }

        if (isDisposed || !loadSucceeded) return;

        // Add root node to Three.js scene
        scene.add(adapter.root);
        adapterRef.current = adapter;

        // Onboard character capabilities (rig inspection, expressions, phonemes)
        CharacterRegistry.onboardCharacter(adapter);

        // Connect character controller and expression manager
        CharacterController.setAdapter(adapter);
        if (adapter.vrm) {
          ExpressionManager.setVRM(adapter.vrm);
        }

        const mixer = new THREE.AnimationMixer(adapter.root);
        AnimationManager.setMixer(mixer, adapter.root);

        // Activate real-time audio sync
        VoiceSyncManager.start();

        // Apply dynamic video-call framing (headroom safe calculation)
        const currentAspect = container.clientWidth / Math.max(1, container.clientHeight);
        CameraFramingManager.setMode(charDef.framingMode || "HEAD_AND_SHOULDERS");
        CameraFramingManager.applyFraming(adapter, camera, currentAspect, true);

        setLoadState({
          status: "loaded",
          progress: 100,
          characterName: charDef.name,
          error: null,
          gpuInfo: hwReport.renderer,
        });

        CharacterRegistry.markCharacterLoaded(charDef.id);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("character:ready", { detail: { characterId: charDef.id } }));
        }

        console.log(`[CharacterRenderer] '${charDef.name}' successfully loaded and onboarded.`);
      } catch (err) {
        if (isDisposed) return;
        console.error(`[CharacterRenderer] Failed to load character '${charDef.name}':`, err);
        setLoadState({
          status: "error",
          progress: 0,
          characterName: charDef.name,
          error: err?.message || "Failed to load character model.",
          gpuInfo: hwReport.renderer,
        });
      }
    };

    // Load initial active character
    loadActiveCharacter(CharacterRegistry.getActiveCharacter()?.id || "nisa");

    // 9. Subscribe to runtime character switching
    const unsubSwitch = CharacterRegistry.onCharacterSwitch((newId) => {
      loadActiveCharacter(newId);
    });

    // 10. Animation & Render Loop
    let lastTime = performance.now();

    const animate = (currentTime) => {
      rafRef.current = requestAnimationFrame(animate);
      if (!isVisibleRef.current) return;

      const now = currentTime || performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Update hardware frame diagnostics
      HardwareDiagnostics.tick(now);

      // Update real-time audio lip-sync
      VoiceSyncManager.update(delta);

      // Update skeletal, body, arm & head kinematics (and updates adapter spring bones & expressions once)
      CharacterController.update(delta);

      // Smooth camera framing update
      CameraFramingManager.update(camera, delta);

      // Update animation mixer clips
      AnimationManager.update(delta);

      // Render Three.js frame
      renderer.render(scene, camera);
    };

    animate(performance.now());

    // 11. Resize Handling
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      if (adapterRef.current) {
        CameraFramingManager.applyFraming(adapterRef.current, camera, camera.aspect, false);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 12. Visibility Observer (pauses rendering when offscreen)
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );
    observerRef.current.observe(container);

    // 13. Cleanup on Unmount
    return () => {
      isDisposed = true;
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      resizeObserver.disconnect();
      observerRef.current?.disconnect();
      unsubSwitch();

      VoiceSyncManager.stop();
      AnimationManager.dispose();
      CharacterController.dispose();
      ExpressionManager.dispose();

      if (adapterRef.current) {
        scene.remove(adapterRef.current.root);
        adapterRef.current.dispose();
        adapterRef.current = null;
      }

      CharacterRegistry.markCharacterUnloaded(characterId || "nisa");

      scene.clear();
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [characterId]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden bg-zinc-950 ${className}`}
      onMouseMove={handleMouseMove}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block" }}
      />

      {/* Loading Overlay */}
      {loadState.status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/90 pointer-events-none z-20">
          <div className="w-10 h-10 rounded-full border-2 border-zinc-700 border-t-accent animate-spin" />
          <span className="text-xs text-zinc-400 font-mono">
            Loading {loadState.characterName}
            {loadState.progress > 0 ? ` ${loadState.progress}%` : "…"}
          </span>
        </div>
      )}

      {/* WebGL Unavailable / Fallback Overlay */}
      {(loadState.status === "webgl_unavailable" || loadState.status === "context_lost") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/95 p-6 z-30 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xl font-bold">
            ⚡
          </div>
          <span className="text-sm font-semibold text-zinc-200">
            {loadState.status === "context_lost" ? "3D Graphics Reset" : "Voice-Only Mode Recommended"}
          </span>
          <span className="text-xs text-zinc-400 max-w-[280px] leading-relaxed">
            {loadState.error || "3D hardware acceleration is currently restricted on this device."}
          </span>
          <div className="flex items-center gap-2 mt-2">
            {onFallbackToVoice && (
              <button
                type="button"
                onClick={onFallbackToVoice}
                className="px-3.5 py-1.5 rounded-lg bg-accent text-zinc-950 text-xs font-medium hover:bg-accent/90 transition-colors shadow"
              >
                Switch to Voice Mode
              </button>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-medium hover:bg-zinc-700 border border-zinc-700 transition-colors"
            >
              Retry 3D
            </button>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {loadState.status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-950/90 p-4 pointer-events-none z-20">
          <span className="text-rose-400 text-xs font-semibold">⚠ Avatar Load Failed</span>
          <span className="text-zinc-500 text-[10px] text-center leading-relaxed max-w-[240px] break-words">
            {loadState.error}
          </span>
        </div>
      )}

      {/* Subtle Cinematic Vignette Overlays matching video style */}
      {loadState.status === "loaded" && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-transparent to-zinc-950/90 pointer-events-none" />
          <div className="absolute inset-0 bg-zinc-950/20 pointer-events-none" />
        </>
      )}
    </div>
  );
}

export default CharacterRenderer;
