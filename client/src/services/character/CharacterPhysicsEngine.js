const GRAVITY_PX_S2 = 1680;
const STEP_UP_MAX_PX = 95;
const JUMP_MAX_HEIGHT_PX = 360;

class CharacterPhysicsEngineClass {
  constructor() {
    this._surfaces = [];
    this._obstacles = [];
    this._activeSurface = null;
    this._velocity = { vx: 0, vy: 0 };
    this._isGrounded = true;
    this._isAirborne = false;
    this._lastScanAt = 0;
  }

  scanScreenEnvironment(force = false) {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return { surfaces: [], obstacles: [], groundY: 794 };
    }
    const now = performance.now();
    if (!force && now - this._lastScanAt < 250 && this._surfaces.length > 0) {
      return {
        surfaces: this._surfaces,
        obstacles: this._obstacles,
        groundY: (window.innerHeight || 800) - 6,
      };
    }
    this._lastScanAt = now;

    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 800;
    const groundY = vh - 6;
    const surfaces = [
      {
        id: "viewport_ground",
        type: "ground",
        left: 12,
        right: vw - 12,
        top: groundY,
        bottom: vh,
        width: vw - 24,
        height: 6,
        isClimbable: true,
        element: null,
      },
    ];
    const obstacles = [];

    const callWidget = document.getElementById("nesa-call-widget");
    if (callWidget) {
      const r = callWidget.getBoundingClientRect();
      if (r.width > 40 && r.height > 40) {
        obstacles.push({
          id: "call_portal",
          type: "call_portal",
          left: Math.round(r.left),
          right: Math.round(r.right),
          top: Math.round(r.top),
          bottom: Math.round(r.bottom),
          width: Math.round(r.width),
          height: Math.round(r.height),
          element: callWidget,
        });
        if (r.top > 180 && r.width >= 140) {
          surfaces.push({
            id: "call_portal_roof",
            type: "platform",
            left: Math.round(r.left),
            right: Math.round(r.right),
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            width: Math.round(r.width),
            height: Math.round(r.height),
            isClimbable: true,
            element: callWidget,
          });
        }
      }
    }

    const selectors = [
      "[data-nesa-target]",
      "aside",
      "header",
      "nav",
      "form",
      "[role='region']",
      "[role='dialog']",
      ".rounded-2xl",
      ".rounded-xl",
    ].join(",");

    let nodes;
    try {
      nodes = Array.from(document.querySelectorAll(selectors)).slice(0, 60);
    } catch {
      nodes = [];
    }

    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      if (!el || el.id === "nisa-outside-presenter" || el.id === "nesa-call-widget") continue;
      const r = el.getBoundingClientRect();
      if (r.width < 110 || r.height < 32) continue;
      if (r.bottom < 40 || r.top > vh - 20 || r.right < 20 || r.left > vw - 20) continue;

      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity || "1") < 0.15) {
        continue;
      }

      const targetKey = el.getAttribute("data-nesa-target") || el.id || `surface_${i}`;
      const isPlatform = r.width >= 120 && r.top >= 160 && r.top <= vh - 45;
      if (isPlatform) {
        surfaces.push({
          id: targetKey,
          type: "component_surface",
          left: Math.round(r.left),
          right: Math.round(r.right),
          top: Math.round(r.top),
          bottom: Math.round(r.bottom),
          width: Math.round(r.width),
          height: Math.round(r.height),
          isClimbable: groundY - r.top <= JUMP_MAX_HEIGHT_PX,
          element: el,
        });
      }
    }

    this._surfaces = surfaces;
    this._obstacles = obstacles;
    return { surfaces, obstacles, groundY };
  }

  getGroundPosition(charWidth = 240, charHeight = 400, preferredX = null) {
    const vw = typeof window !== "undefined" ? window.innerWidth || 1280 : 1280;
    const vh = typeof window !== "undefined" ? window.innerHeight || 800 : 800;
    const groundTop = Math.max(16, vh - charHeight - 6);
    const defaultX = Math.max(24, vw - charWidth - 390);
    const rawX = Number.isFinite(preferredX) ? preferredX : defaultX;
    const safeX = this.resolveObstacleFreeX(rawX, groundTop, charWidth, charHeight);
    return {
      x: Math.round(safeX),
      y: Math.round(groundTop),
      width: Math.round(charWidth),
      height: Math.round(charHeight),
    };
  }

  resolveObstacleFreeX(desiredX, desiredY, charWidth = 240, charHeight = 400) {
    const vw = typeof window !== "undefined" ? window.innerWidth || 1280 : 1280;
    const minX = 16;
    const maxX = Math.max(minX, vw - charWidth - 16);
    let x = Math.max(minX, Math.min(maxX, desiredX));

    this.scanScreenEnvironment(false);
    const portal = this._obstacles.find((o) => o.type === "call_portal");
    if (!portal) return x;

    const charBottom = desiredY + charHeight;
    const verticalOverlap = desiredY < portal.bottom - 12 && charBottom > portal.top + 12;
    if (!verticalOverlap) return x;

    const charRight = x + charWidth;
    const horizontalOverlap = charRight > portal.left + 16 && x < portal.right - 16;
    if (!horizontalOverlap) return x;

    const leftCandidate = portal.left - charWidth - 18;
    const rightCandidate = portal.right + 18;

    if (leftCandidate >= minX) {
      return leftCandidate;
    }
    if (rightCandidate <= maxX) {
      return rightCandidate;
    }
    return x;
  }

  findLandingSurfaceForElement(element, charWidth = 240, charHeight = 400) {
    const vw = typeof window !== "undefined" ? window.innerWidth || 1280 : 1280;
    const vh = typeof window !== "undefined" ? window.innerHeight || 800 : 800;
    if (!element || typeof element.getBoundingClientRect !== "function") {
      return {
        canStandOnTop: false,
        ...this.getGroundPosition(charWidth, charHeight),
      };
    }

    const r = element.getBoundingClientRect();
    const topLandingY = Math.round(r.top - charHeight + 14);
    const canStandOnTop = topLandingY >= 12 && r.width >= 90 && r.top <= vh - 40;

    if (canStandOnTop) {
      const centerX = r.left + r.width * 0.5 - charWidth * 0.5;
      const clampedX = Math.round(Math.max(12, Math.min(vw - charWidth - 12, centerX)));
      return {
        canStandOnTop: true,
        surfaceType: r.top > vh - charHeight - STEP_UP_MAX_PX ? "step_up" : "jump_climb",
        x: clampedX,
        y: topLandingY,
        width: Math.round(charWidth),
        height: Math.round(charHeight),
        surfaceRect: r,
      };
    }

    const besideX =
      r.left > vw * 0.5
        ? Math.max(16, r.left - charWidth - 16)
        : Math.min(vw - charWidth - 16, r.right + 16);
    const groundPos = this.getGroundPosition(charWidth, charHeight, besideX);
    return {
      canStandOnTop: false,
      surfaceType: "ground_beside",
      ...groundPos,
      surfaceRect: r,
    };
  }

  computeJumpTrajectory(startPos, endPos, durationSec = 1.15) {
    const sx = Number(startPos?.x) || 100;
    const sy = Number(startPos?.y) || 350;
    const ex = Number.isFinite(endPos?.x) ? endPos.x : sx;
    const ey = Number.isFinite(endPos?.y) ? endPos.y : sy;
    const apexLift = Math.max(75, Math.min(180, Math.abs(sy - ey) * 0.55 + 85));
    const peakY = Math.max(12, Math.min(sy, ey) - apexLift);

    return {
      startX: sx,
      startY: sy,
      endX: ex,
      endY: ey,
      peakY,
      durationSec: Math.max(0.65, Math.min(2.2, durationSec)),
      gravity: GRAVITY_PX_S2,
      sampleAt(progress) {
        const t = Math.max(0, Math.min(1, progress));
        const smoothT = t * t * (3 - 2 * t);
        const x = sx + (ex - sx) * smoothT;
        const linearY = sy + (ey - sy) * smoothT;
        const arcOffset = Math.sin(t * Math.PI) * apexLift;
        const y = Math.max(12, linearY - arcOffset);
        return { x: Math.round(x), y: Math.round(y) };
      },
    };
  }
}

const CharacterPhysicsEngine = new CharacterPhysicsEngineClass();
export default CharacterPhysicsEngine;
