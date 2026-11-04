import CharacterController from "./CharacterController.js";
import ScreenTargetManager from "./ScreenTargetManager.js";
import EmotionEngine, { EMOTIONS } from "./EmotionEngine.js";
import { FRAME_STATES } from "./FrameAwareStates.js";

export function computeRelativeTargetVector(controller, targetElement, fallbackDir = "right") {
  const pos = controller.getOutsidePosition();
  const nishaCenterX = (pos.x || 200) + (pos.width || 250) * 0.5;
  const nishaChestY = (pos.y || 320) + (pos.height || 400) * 0.38;

  if (!targetElement || typeof targetElement.getBoundingClientRect !== "function") {
    return {
      direction: fallbackDir,
      relX: fallbackDir === "left" ? -0.65 : 0.65,
      relY: 0.15,
    };
  }

  const r = targetElement.getBoundingClientRect();
  const targetCenterX = r.left + r.width * 0.5;
  const targetCenterY = r.top + r.height * 0.5;

  const dx = targetCenterX - nishaCenterX;
  const dy = nishaChestY - targetCenterY;

  const relX = Math.max(-0.9, Math.min(0.9, dx / 260));
  const relY = Math.max(-0.8, Math.min(0.85, dy / 260));

  let direction = dx < 0 ? "left" : "right";
  if (Math.abs(dy) > Math.abs(dx) * 1.45) {
    direction = dy > 0 ? "up" : "down";
  }

  return { direction, relX, relY, rect: r };
}

export async function navigateToComponent(controller, queryOrKey, options = {}) {
  if (!controller.isOutsideFrame()) {
    await controller.exitFrameAndNavigate({ walkBottom: false });
  }

  const target = ScreenTargetManager.resolveTarget(queryOrKey);
  if (target.ambiguous || !target.label) {
    controller._setState(FRAME_STATES.OUTSIDE_FRAME);
    return {
      success: false,
      ambiguous: true,
      message:
        "Aap kis component ke baare mein pooch rahe hain? Barah-e-karam screen par us component ka naam batayein.",
      spokenExplanation:
        "Aap kis component ke baare mein pooch rahe hain? Barah-e-karam us component ka naam batayein taake main wahan ja sakoon.",
    };
  }

  if (target.element) {
    try {
      target.element.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    } catch {
      void 0;
    }
  }

  controller._currentTargetComponent = target;
  const screenPos = controller.calculateTargetScreenPosition(target.element);

  await controller.animateOutsideMove(
    { x: screenPos.x, y: screenPos.y, width: screenPos.width, height: screenPos.height },
    { speed: options.speed || "normal" }
  );

  controller._setState(FRAME_STATES.INTERACTING_WITH_TARGET, {
    target,
    position: { ...controller.getOutsidePosition() },
  });

  const rel = computeRelativeTargetVector(controller, target.element, screenPos.direction);
  CharacterController.setLookTarget(rel.relX, rel.relY);

  if (options.highlight !== false) {
    highlightElement(controller, target.element, options.duration ? options.duration * 1000 : 5500);
  }

  if (options.point !== false) {
    await CharacterController._execPoint({
      direction: rel.direction,
      x: rel.relX,
      y: rel.relY,
      duration: options.duration || 2.4,
    });
  } else {
    CharacterController.setLookTarget(0, 0);
  }

  controller._setState(FRAME_STATES.OUTSIDE_FRAME, {
    target,
    position: { ...controller.getOutsidePosition() },
  });

  return {
    success: true,
    target: target.label,
    direction: rel.direction,
    position: screenPos,
    purpose: target.purpose,
    spokenExplanation: `Dekho, yahan ${target.label} hai! ${target.purpose}`,
  };
}

export function highlightElement(controller, el, durationMs = 5500) {
  if (!el || typeof el.getBoundingClientRect !== "function") return;
  clearHighlight(controller);
  try {
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const origOutline = el.style.outline;
    const origBoxShadow = el.style.boxShadow;
    const origTransition = el.style.transition;

    el.style.transition = "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
    el.style.outline = "3px solid #10b981";
    el.style.boxShadow =
      "0 0 24px rgba(16, 185, 129, 0.65), 0 0 48px rgba(16, 185, 129, 0.25)";

    const emitSpotlight = () => {
      if (!el.isConnected) {
        clearHighlight(controller);
        return;
      }
      window.dispatchEvent(
        new CustomEvent("nesa:spotlight", {
          detail: {
            rect: el.getBoundingClientRect(),
            label: el.getAttribute("aria-label") || el.innerText?.slice(0, 30),
          },
        })
      );
    };

    window.addEventListener("scroll", emitSpotlight, true);
    window.addEventListener("resize", emitSpotlight);

    controller._activeHighlightElement = {
      el,
      origOutline,
      origBoxShadow,
      origTransition,
      cleanupListeners: () => {
        window.removeEventListener("scroll", emitSpotlight, true);
        window.removeEventListener("resize", emitSpotlight);
      },
    };
    controller._highlightTimer = setTimeout(() => {
      clearHighlight(controller);
    }, durationMs);
    emitSpotlight();
  } catch {
    void 0;
  }
}

export function clearHighlight(controller) {
  if (controller._highlightTimer) {
    clearTimeout(controller._highlightTimer);
    controller._highlightTimer = null;
  }
  if (controller._activeHighlightElement) {
    const { el, origOutline, origBoxShadow, origTransition, cleanupListeners } =
      controller._activeHighlightElement;
    try {
      cleanupListeners?.();
      el.style.outline = origOutline;
      el.style.boxShadow = origBoxShadow;
      el.style.transition = origTransition;
    } catch {
      void 0;
    }
    controller._activeHighlightElement = null;
  }
}

export async function clickComponent(controller, queryOrKey) {
  const target = ScreenTargetManager.resolveTarget(queryOrKey);
  if (target.ambiguous || !target.element) {
    return {
      success: false,
      ambiguous: true,
      message:
        "Mujhe wo button nahi mil raha jise aap click karwana chahte hain. Barah-e-karam button ka naam wazeh batayein.",
    };
  }

  const el = target.element;
  const tagName = el.tagName.toLowerCase();
  const isInteractive =
    tagName === "button" ||
    tagName === "a" ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    el.getAttribute("role") === "button" ||
    el.getAttribute("role") === "tab" ||
    el.hasAttribute("data-nesa-target") ||
    typeof el.onclick === "function";

  if (!isInteractive) {
    return {
      success: false,
      error: "target_not_clickable",
      message: `'${target.label}' koi clickable button ya control nahi hai.`,
    };
  }

  if (el.disabled || el.getAttribute("aria-disabled") === "true") {
    return {
      success: false,
      error: "target_disabled",
      message: `'${target.label}' is waqt disabled hai.`,
    };
  }

  const prevUrl = typeof window !== "undefined" ? window.location.href : "";
  await navigateToComponent(controller, queryOrKey, { duration: 1.15 });

  let interactionType = "click";
  try {
    if (tagName === "input" || tagName === "textarea") {
      el.focus();
      interactionType = "focus";
    } else {
      el.click();
    }
  } catch {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  }

  const nextUrl = typeof window !== "undefined" ? window.location.href : "";
  const routeChanged = prevUrl !== nextUrl;

  EmotionEngine.setEmotion(EMOTIONS.HAPPY, { intensity: 0.9, duration: 2000 });
  return {
    success: true,
    clicked: true,
    interactionType,
    routeChanged,
    target: target.label,
    spokenExplanation: `Maine '${target.label}' par click kar diya!`,
  };
}
