import { useEffect, useState } from "react";
import CameraFramingManager, { FRAMING_MODES } from "../../services/character/CameraFramingManager.js";
import FrameAwareCharacterController, { FRAME_STATES } from "../../services/character/FrameAwareCharacterController.js";
import ActionRegistry from "../../services/character/ActionRegistry.js";
import EmotionEngine, { EMOTIONS } from "../../services/character/EmotionEngine.js";

function computeResponsiveOutsideSize() {
  const vw = typeof window !== "undefined" ? window.innerWidth || 1280 : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight || 800 : 800;
  const width = Math.round(Math.min(290, Math.max(200, vw * 0.21)));
  const height = Math.round(Math.min(460, Math.max(320, vh * 0.54)));
  return { width, height, vw, vh };
}

function resolveSafeOutsidePosition(rawPos) {
  const { width: defW, height: defH, vw, vh } = computeResponsiveOutsideSize();
  const safeW = Number.isFinite(rawPos?.width) && rawPos.width >= 120 ? Math.round(rawPos.width) : defW;
  const safeH = Number.isFinite(rawPos?.height) && rawPos.height >= 180 ? Math.round(rawPos.height) : defH;
  const rawX = Number.isFinite(rawPos?.x) ? rawPos.x : Math.max(24, vw - safeW - 390);
  const rawY = Number.isFinite(rawPos?.y) ? rawPos.y : Math.max(24, vh - safeH - 6);
  const safeX = Math.round(Math.max(12, Math.min(Math.max(12, vw - safeW - 12), rawX)));
  const safeY = Math.round(Math.max(12, Math.min(Math.max(12, vh - safeH), rawY)));
  return { x: safeX, y: safeY, width: safeW, height: safeH };
}

function getOrCreateOutsidePresenter() {
  if (typeof document === "undefined") return null;
  let el = document.getElementById("nisa-outside-presenter");
  if (!el) {
    el = document.createElement("div");
    el.id = "nisa-outside-presenter";
    el.style.cssText = [
      "position:fixed",
      "z-index:9999",
      "pointer-events:none",
      "display:none",
      "will-change:left,top,width,height",
      "filter:drop-shadow(0 18px 32px rgba(0,0,0,0.55))",
      "overflow:visible",
    ].join(";");
    document.body.appendChild(el);
  }
  return el;
}

export function useFrameAwarePresentation({ containerRef, canvasRef, rendererRef, cameraRef, adapterRef }) {
  const [frameState, setFrameState] = useState(FrameAwareCharacterController.getState());

  useEffect(() => {
    const initialCanvas = canvasRef.current;
    const initialContainer = containerRef.current;

    const updateRect = () => {
      if (FrameAwareCharacterController.isOutsideFrame()) {
        const presenter = document.getElementById("nisa-outside-presenter");
        const currentPos = FrameAwareCharacterController.getOutsidePosition();
        const safePos = resolveSafeOutsidePosition(currentPos);
        FrameAwareCharacterController.setOutsidePosition(safePos);
        if (presenter && presenter.style.display !== "none") {
          presenter.style.left = `${safePos.x}px`;
          presenter.style.top = `${safePos.y}px`;
          presenter.style.width = `${safePos.width}px`;
          presenter.style.height = `${safePos.height}px`;
        }
        const renderer = rendererRef.current;
        const camera = cameraRef.current;
        if (renderer && camera) {
          renderer.setSize(safePos.width, safePos.height);
          camera.aspect = safePos.width / Math.max(1, safePos.height);
          camera.updateProjectionMatrix();
        }
      } else if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 20 && rect.height > 20) {
          FrameAwareCharacterController.setFrameRect(rect);
        }
      }
    };

    updateRect();
    window.addEventListener("resize", updateRect);

    const handleContinuousMove = (e) => {
      if (!FrameAwareCharacterController.isOutsideFrame()) return;
      const presenter = document.getElementById("nisa-outside-presenter");
      if (!presenter || presenter.style.display === "none") return;
      const safePos = resolveSafeOutsidePosition(
        e?.detail || FrameAwareCharacterController.getOutsidePosition()
      );
      if (e?.detail?.immediate) {
        presenter.style.transition = "none";
      }
      presenter.style.left = `${safePos.x}px`;
      presenter.style.top = `${safePos.y}px`;
      presenter.style.width = `${safePos.width}px`;
      presenter.style.height = `${safePos.height}px`;
    };
    window.addEventListener("nisa:frame_move", handleContinuousMove);

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let elemStartX = 0;
    let elemStartY = 0;
    let velocityHistory = [];
    let throwRafId = null;

    const stopThrowSimulation = () => {
      if (throwRafId) {
        cancelAnimationFrame(throwRafId);
        throwRafId = null;
      }
    };

    const handlePresenterPointerDown = (e) => {
      if (!FrameAwareCharacterController.isOutsideFrame()) return;
      const presenter = document.getElementById("nisa-outside-presenter");
      if (!presenter) return;
      stopThrowSimulation();
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      const curPos = FrameAwareCharacterController.getOutsidePosition();
      elemStartX = curPos.x;
      elemStartY = curPos.y;
      velocityHistory = [{ time: performance.now(), x: e.clientX, y: e.clientY }];
      presenter.style.cursor = "grabbing";
      presenter.style.transition = "none";
    };

    const handleWindowPointerMove = (e) => {
      if (!isDragging) return;
      const presenter = document.getElementById("nisa-outside-presenter");
      if (!presenter) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      const curPos = FrameAwareCharacterController.getOutsidePosition();
      const safeW = curPos.width || 240;
      const safeH = curPos.height || 400;
      const nextX = Math.round(Math.max(8, Math.min(window.innerWidth - safeW - 8, elemStartX + dx)));
      const nextY = Math.round(Math.max(8, Math.min(window.innerHeight - safeH, elemStartY + dy)));

      presenter.style.left = `${nextX}px`;
      presenter.style.top = `${nextY}px`;
      FrameAwareCharacterController.setOutsidePosition({ x: nextX, y: nextY, width: safeW, height: safeH });

      const now = performance.now();
      velocityHistory.push({ time: now, x: e.clientX, y: e.clientY });
      if (velocityHistory.length > 6) velocityHistory.shift();
    };

    const handleWindowPointerUp = () => {
      if (!isDragging) return;
      isDragging = false;
      const presenter = document.getElementById("nisa-outside-presenter");
      if (!presenter) return;
      presenter.style.cursor = "grab";

      let vx = 0;
      let vy = 0;
      if (velocityHistory.length >= 2) {
        const first = velocityHistory[0];
        const last = velocityHistory[velocityHistory.length - 1];
        const dt = Math.max(0.016, (last.time - first.time) / 1000);
        vx = Math.max(-2400, Math.min(2400, (last.x - first.x) / dt));
        vy = Math.max(-2400, Math.min(2400, (last.y - first.y) / dt));
      }

      const curPos = FrameAwareCharacterController.getOutsidePosition();
      const safeW = curPos.width || 240;
      const safeH = curPos.height || 400;
      let posX = curPos.x;
      let posY = curPos.y;
      const groundFloor = Math.max(24, window.innerHeight - safeH - 6);

      const releaseSpeed = Math.hypot(vx, vy);
      if (releaseSpeed < 140) {
        presenter.style.transition = "top 0.45s cubic-bezier(0.25, 1, 0.5, 1)";
        presenter.style.top = `${groundFloor}px`;
        FrameAwareCharacterController.setOutsidePosition({ x: posX, y: groundFloor, width: safeW, height: safeH });
        return;
      }

      let lastTime = performance.now();
      let bouncedWall = false;

      const physicsTick = (now) => {
        const delta = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;

        posX += vx * delta;
        posY += vy * delta;
        vy += 2200 * delta;
        vx *= 0.985;

        if (posX <= 8) {
          posX = 8;
          vx = -vx * 0.55;
          bouncedWall = true;
        } else if (posX >= window.innerWidth - safeW - 8) {
          posX = window.innerWidth - safeW - 8;
          vx = -vx * 0.55;
          bouncedWall = true;
        }

        if (posY <= 8) {
          posY = 8;
          vy = -vy * 0.4;
          bouncedWall = true;
        }

        if (posY >= groundFloor) {
          posY = groundFloor;
          stopThrowSimulation();
          presenter.style.left = `${Math.round(posX)}px`;
          presenter.style.top = `${Math.round(posY)}px`;
          FrameAwareCharacterController.setOutsidePosition({ x: Math.round(posX), y: Math.round(posY), width: safeW, height: safeH });

          if (bouncedWall || Math.abs(vy) > 360) {
            EmotionEngine.setEmotion(EMOTIONS.SAD, { intensity: 1.0, duration: 4500 });
            ActionRegistry.execute("hurt_impact", { duration: 2200 }).catch(() => {});
            setTimeout(() => {
              ActionRegistry.execute("standup", { duration: 3200 }).catch(() => {});
            }, 2300);
          }
          return;
        }

        presenter.style.left = `${Math.round(posX)}px`;
        presenter.style.top = `${Math.round(posY)}px`;
        FrameAwareCharacterController.setOutsidePosition({ x: Math.round(posX), y: Math.round(posY), width: safeW, height: safeH });
        throwRafId = requestAnimationFrame(physicsTick);
      };

      throwRafId = requestAnimationFrame(physicsTick);
    };

    const presenterEl = getOrCreateOutsidePresenter();
    if (presenterEl) {
      presenterEl.addEventListener("pointerdown", handlePresenterPointerDown);
    }
    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);

    const unsub = FrameAwareCharacterController.onStateChange((evt) => {
      setFrameState(evt.state);
      const presenter = getOrCreateOutsidePresenter();
      const canvas = canvasRef.current;
      const container = containerRef.current;
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      if (!presenter || !canvas || !container || !renderer || !camera) return;

      if (evt.state === FRAME_STATES.PREPARING_EXIT) {
        const rect = container.getBoundingClientRect();
        if (rect.width > 20 && rect.height > 20) {
          FrameAwareCharacterController.setFrameRect(rect);
        }
        const fRect = FrameAwareCharacterController.getFrameRect();
        const startW = Math.max(180, Math.round(fRect.width || 340));
        const startH = Math.max(240, Math.round(fRect.height || 520));
        presenter.style.transition = "none";
        presenter.style.display = "block";
        presenter.style.left = `${Math.round(fRect.left || 24)}px`;
        presenter.style.top = `${Math.round(fRect.top || 24)}px`;
        presenter.style.width = `${startW}px`;
        presenter.style.height = `${startH}px`;
        if (canvas.parentElement !== presenter) {
          presenter.appendChild(canvas);
        }
        canvas.style.display = "block";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        renderer.setSize(startW, startH);
        camera.aspect = startW / Math.max(1, startH);
        camera.updateProjectionMatrix();
        if (adapterRef.current) {
          CameraFramingManager.setMode(FRAMING_MODES.FULL_BODY);
          CameraFramingManager.applyFraming(adapterRef.current, camera, camera.aspect, true);
        }
        void presenter.offsetWidth;
        presenter.style.transition =
          "left 0.85s cubic-bezier(0.22, 1, 0.36, 1), top 0.85s cubic-bezier(0.22, 1, 0.36, 1), width 0.65s cubic-bezier(0.22, 1, 0.36, 1), height 0.65s cubic-bezier(0.22, 1, 0.36, 1)";
      } else if (
        evt.state === FRAME_STATES.EXITING_FRAME ||
        evt.state === FRAME_STATES.OUTSIDE_FRAME ||
        evt.state === FRAME_STATES.NAVIGATING_TO_TARGET ||
        evt.state === FRAME_STATES.INTERACTING_WITH_TARGET
      ) {
        const rawPos = evt.position || FrameAwareCharacterController.getOutsidePosition();
        const safePos = resolveSafeOutsidePosition(rawPos);
        FrameAwareCharacterController.setOutsidePosition(safePos);

        presenter.style.display = "block";
        if (canvas.parentElement !== presenter) {
          presenter.appendChild(canvas);
        }
        canvas.style.display = "block";
        canvas.style.width = "100%";
        canvas.style.height = "100%";

        if (evt.state === FRAME_STATES.OUTSIDE_FRAME) {
          presenter.style.pointerEvents = "auto";
          presenter.style.cursor = "grab";
        } else {
          presenter.style.pointerEvents = "none";
          presenter.style.cursor = "default";
        }

        void presenter.offsetWidth;
        presenter.style.left = `${safePos.x}px`;
        presenter.style.top = `${safePos.y}px`;
        presenter.style.width = `${safePos.width}px`;
        presenter.style.height = `${safePos.height}px`;

        renderer.setSize(safePos.width, safePos.height);
        camera.aspect = safePos.width / Math.max(1, safePos.height);
        camera.updateProjectionMatrix();

        if (adapterRef.current) {
          CameraFramingManager.setMode(FRAMING_MODES.FULL_BODY);
          CameraFramingManager.applyFraming(
            adapterRef.current,
            camera,
            camera.aspect,
            evt.state === FRAME_STATES.EXITING_FRAME
          );
        }
      } else if (evt.state === FRAME_STATES.RETURNING_TO_FRAME) {
        const rect = container.getBoundingClientRect();
        if (rect.width > 20 && rect.height > 20) {
          FrameAwareCharacterController.setFrameRect(rect);
        }
        const fRect = FrameAwareCharacterController.getFrameRect();
        const targetW = Math.max(200, Math.round(fRect.width || 340));
        const targetH = Math.max(260, Math.round(fRect.height || 520));
        presenter.style.display = "block";
        presenter.style.transition =
          "left 0.85s cubic-bezier(0.22, 1, 0.36, 1), top 0.85s cubic-bezier(0.22, 1, 0.36, 1), width 0.75s cubic-bezier(0.22, 1, 0.36, 1), height 0.75s cubic-bezier(0.22, 1, 0.36, 1)";
        void presenter.offsetWidth;
        presenter.style.left = `${Math.round(fRect.left || 24)}px`;
        presenter.style.top = `${Math.round(fRect.top || 24)}px`;
        presenter.style.width = `${targetW}px`;
        presenter.style.height = `${targetH}px`;
      } else if (evt.state === FRAME_STATES.ENTERING_FRAME) {
        const fRect = FrameAwareCharacterController.getFrameRect();
        const targetW = Math.max(200, Math.round(fRect.width || 340));
        const targetH = Math.max(260, Math.round(fRect.height || 520));
        presenter.style.left = `${Math.round(fRect.left || 24)}px`;
        presenter.style.top = `${Math.round(fRect.top || 24)}px`;
        presenter.style.width = `${targetW}px`;
        presenter.style.height = `${targetH}px`;
        renderer.setSize(targetW, targetH);
        camera.aspect = targetW / Math.max(1, targetH);
        camera.updateProjectionMatrix();
        if (adapterRef.current) {
          CameraFramingManager.setMode(FRAMING_MODES.HEAD_AND_SHOULDERS);
          CameraFramingManager.applyFraming(adapterRef.current, camera, camera.aspect, false);
        }
      } else if (evt.state === FRAME_STATES.RESTORING_NORMAL_VIEW || evt.state === FRAME_STATES.IN_FRAME) {
        if (canvas.parentElement !== container) {
          container.insertBefore(canvas, container.firstChild);
        }
        presenter.style.display = "none";
        const w = Math.max(200, container.clientWidth || 340);
        const h = Math.max(200, container.clientHeight || 520);
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        if (adapterRef.current) {
          CameraFramingManager.setMode(FRAMING_MODES.HEAD_AND_SHOULDERS);
          CameraFramingManager.applyFraming(adapterRef.current, camera, camera.aspect, false);
        }
      }
    });

    return () => {
      stopThrowSimulation();
      if (presenterEl) presenterEl.removeEventListener("pointerdown", handlePresenterPointerDown);
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("nisa:frame_move", handleContinuousMove);
      unsub();
      const presenter = typeof document !== "undefined" ? document.getElementById("nisa-outside-presenter") : null;
      if (initialCanvas && initialContainer && initialCanvas.parentElement !== initialContainer) {
        try {
          initialContainer.insertBefore(initialCanvas, initialContainer.firstChild);
        } catch {
          void 0;
        }
      }
      if (presenter) {
        presenter.style.display = "none";
      }
      FrameAwareCharacterController.resetImmediate();
    };
  }, [containerRef, canvasRef, rendererRef, cameraRef, adapterRef]);

  return frameState;
}
