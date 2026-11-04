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
import FrameAwareCharacterController, { FRAME_STATES } from "../../services/character/FrameAwareCharacterController.js";
import NishaSDK from "../../services/character/NishaSDKRuntime.js";
import { useFrameAwarePresentation } from "./useFrameAwarePresentation.js";
import { CharacterRendererStatus } from "./CharacterRendererStatus.jsx";

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
    status: "loading",
    progress: 0,
    characterName: "Nisa",
    error: null,
    gpuInfo: "",
  });

  const frameState = useFrameAwarePresentation({
    containerRef,
    canvasRef,
    rendererRef,
    cameraRef,
    adapterRef,
  });

  useEffect(() => {
    CharacterController.setIsSpeaking(Boolean(isSpeaking));
    if (isSpeaking) {
      CharacterStateManager.transition(CHARACTER_STATES.SPEAKING);
    } else {
      CharacterStateManager.transition(CHARACTER_STATES.LISTENING);
    }
  }, [isSpeaking]);

  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    CharacterController.setLookTarget(x, -y);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let isDisposed = false;

    const hwReport = HardwareDiagnostics.checkCapabilities();
    if (!hwReport.webglAvailable) {
      queueMicrotask(() => {
        setLoadState({
          status: "webgl_unavailable",
          progress: 0,
          characterName: "Nisa",
          error: hwReport.diagnosticMessage,
          gpuInfo: hwReport.renderer,
        });
      });
      return;
    }

    ActionRegistry.initialize();
    CharacterRegistry.initialize();

    window.__CharacterController = CharacterController;
    window.__GeminiCharacterBridge = GeminiCharacterBridge;
    window.__HardwareDiagnostics = HardwareDiagnostics;
    window.__EmotionEngine = EmotionEngine;
    window.__IdleBehaviorManager = IdleBehaviorManager;
    window.__FrameAwareCharacterController = FrameAwareCharacterController;
    NishaSDK.init({ characterId: characterId || "nisa" });

    if (characterId) {
      CharacterRegistry.setActiveCharacter(characterId);
    }

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
      queueMicrotask(() => {
        setLoadState({
          status: "webgl_unavailable",
          progress: 0,
          characterName: "Nisa",
          error: `Could not create WebGL context: ${err.message}`,
          gpuInfo: hwReport.renderer,
        });
      });
      return;
    }

    renderer.setPixelRatio(hwReport.recommendedPixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = false;
    rendererRef.current = renderer;

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

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    const camera = new THREE.PerspectiveCamera(28, aspect, 0.1, 20);
    camera.position.set(0, 1.42, 1.45);
    camera.lookAt(0, 1.38, 0);
    cameraRef.current = camera;

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

    const bottomBounceLight = new THREE.DirectionalLight(0xfff3e6, 0.40);
    bottomBounceLight.position.set(0, 0.3, 1.4);
    bottomBounceLight.target.position.set(0, 1.25, 0);
    scene.add(bottomBounceLight);
    scene.add(bottomBounceLight.target);

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

      if (adapterRef.current) {
        try {
          scene.remove(adapterRef.current.root);
          adapterRef.current.dispose();
        } catch {
          void 0;
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
            await adapter.load(charDef.fallbackUrl, onProgress);
            loadSucceeded = true;
          } else {
            throw err;
          }
        }

        if (isDisposed || !loadSucceeded) return;

        scene.add(adapter.root);
        adapterRef.current = adapter;

        CharacterRegistry.onboardCharacter(adapter);
        CharacterController.setAdapter(adapter);
        FrameAwareCharacterController.bindSceneContext(adapter, camera);
        if (adapter.vrm) {
          ExpressionManager.setVRM(adapter.vrm);
        }

        const mixer = new THREE.AnimationMixer(adapter.root);
        AnimationManager.setMixer(mixer, adapter.root);
        VoiceSyncManager.start();

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
      } catch (err) {
        if (isDisposed) return;
        setLoadState({
          status: "error",
          progress: 0,
          characterName: charDef.name,
          error: err?.message || "Failed to load character model.",
          gpuInfo: hwReport.renderer,
        });
      }
    };

    loadActiveCharacter(CharacterRegistry.getActiveCharacter()?.id || "nisa");

    const unsubSwitch = CharacterRegistry.onCharacterSwitch((newId) => {
      loadActiveCharacter(newId);
    });

    let lastTime = performance.now();

    const animate = (currentTime) => {
      rafRef.current = requestAnimationFrame(animate);
      if (!isVisibleRef.current && !FrameAwareCharacterController.isOutsideFrame()) return;

      const now = currentTime || performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      HardwareDiagnostics.tick(now);
      VoiceSyncManager.update(delta);
      CharacterController.update(delta);

      if (adapterRef.current) {
        CameraFramingManager.applyFraming(adapterRef.current, camera, camera.aspect, false);
        FrameAwareCharacterController.updateLandmarks(adapterRef.current, camera);
      }
      CameraFramingManager.update(camera, delta);
      AnimationManager.update(delta);

      renderer.render(scene, camera);
    };

    animate(performance.now());

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      if (FrameAwareCharacterController.isOutsideFrame()) return;
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

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );
    observerRef.current.observe(container);

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

  const isOutside = frameState !== FRAME_STATES.IN_FRAME;

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden bg-zinc-950 ${className}`}
      style={{
        boxShadow: isOutside ? "inset 0 0 48px rgba(0,0,0,0.88)" : "none",
      }}
      onMouseMove={handleMouseMove}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block" }}
      />

      {!isOutside && (
        <CharacterRendererStatus loadState={loadState} onFallbackToVoice={onFallbackToVoice} />
      )}

      {loadState.status === "loaded" && !isOutside && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-transparent to-zinc-950/90 pointer-events-none" />
          <div className="absolute inset-0 bg-zinc-950/20 pointer-events-none" />
        </>
      )}
    </div>
  );
}

export default CharacterRenderer;
