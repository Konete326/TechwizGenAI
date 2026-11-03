/**
 * ScreenTargetManager — Spatial UI Screen Awareness & Component Inspector.
 *
 * Capabilities:
 * - Maps browser DOM elements to normalized screen coordinates [-1.0, 1.0].
 * - Determines spatial direction (left, right, top, bottom, center).
 * - Identifies targets by explicit key, CSS selector, data-nesa-target, accessible name, or fuzzy match.
 * - Coordinates gaze tracking and procedural arm pointing toward UI components.
 * - Generates clear component purpose explanations for conversational AI.
 */

import CharacterController from "./CharacterController.js";

export const KNOWN_UI_COMPONENTS = {
  sidebar: {
    selectors: ['[data-nesa-target="sidebar"]', "aside", 'nav[aria-label="Main"]', '[data-nesa-target="nav_dashboard"]'],
    label: "Main Navigation Sidebar",
    purpose: "Provides quick navigation across Dashboard, Studio, Workspace, Assets, Analytics, and Settings.",
    defaultSide: "left"
  },
  model_selector: {
    selectors: ['button[title*="Active AI Model"]', '[data-nesa-target="model_selector"]', 'button:has(span:contains("Gemini"))'],
    label: "AI Model Selector",
    purpose: "Allows seamless switching between Google Gemini, OpenAI GPT-4o, Anthropic Claude, and DeepSeek models.",
    defaultSide: "center"
  },
  call_nisa_btn: {
    selectors: ['button[title*="Call Nisa"]', '[data-nesa-target="call_nisa_btn"]'],
    label: "Call Nisa Button",
    purpose: "Connects you to a real-time 3D voice call companion with spatial awareness and interactive avatar capabilities.",
    defaultSide: "right"
  },
  chat_input: {
    selectors: ['textarea[placeholder*="Ask anything"]', 'textarea[placeholder*="message"]', '[data-nesa-target="chat_input"]', "form textarea"],
    label: "Chat Prompt Input",
    purpose: "Where you enter prompts, attach documents, capture voice notes, and request code generation or artifacts.",
    defaultSide: "bottom"
  },
  chat_canvas: {
    selectors: ['[data-nesa-target="chat_canvas"]', "main .overflow-y-auto", "main div:has(h1)"],
    label: "Conversation Canvas",
    purpose: "Displays interactive messages, formatted code snippets with copy buttons, and deep reasoning steps.",
    defaultSide: "center"
  },
  new_chat_btn: {
    selectors: ['button[title*="New Chat"]', 'button:has-text("New chat")', '[data-nesa-target="new_chat_btn"]'],
    label: "New Chat Button",
    purpose: "Initializes a clean conversation session while archiving previous chats in your history.",
    defaultSide: "left"
  },
  clear_chat_btn: {
    selectors: ['button[title*="Clear Conversation"]', '[data-nesa-target="clear_chat_btn"]'],
    label: "Clear Conversation Button",
    purpose: "Clears message history from the active chat view with a safe confirmation step.",
    defaultSide: "right"
  },
  export_chat_btn: {
    selectors: ['button[title*="Export Conversation"]', '[data-nesa-target="export_chat_btn"]'],
    label: "Export Conversation Button",
    purpose: "Exports the complete conversation transcript as a clean text file for local documentation.",
    defaultSide: "right"
  },
  persona_selector: {
    selectors: ['button[title*="Preset"]', '[data-nesa-target="persona_selector"]'],
    label: "Persona & System Preset Selector",
    purpose: "Customizes AI behavior with specialized domain personas like Code Architect, Data Analyst, or Content Creator.",
    defaultSide: "right"
  },
  theme_toggle: {
    selectors: ['button[title*="Toggle theme"]', '[data-nesa-target="theme_toggle"]'],
    label: "Theme Toggle Button",
    purpose: "Switches application appearance between dark mode and light mode.",
    defaultSide: "top"
  },
  notifications_btn: {
    selectors: ['button[title*="Notifications"]', '[data-nesa-target="notifications_btn"]'],
    label: "Notifications Center",
    purpose: "Displays system alerts, usage milestones, and project background updates.",
    defaultSide: "top"
  },
  storage_widget: {
    selectors: ['a[title*="Storage"]', '[data-nesa-target="storage_widget"]', 'a[href*="/assets"]'],
    label: "Storage Usage Indicator",
    purpose: "Displays your current Cloudinary and file asset consumption against your platform quota.",
    defaultSide: "left"
  }
};

class ScreenTargetManagerClass {
  /**
   * Resolve a target query or identifier into an element and normalized screen coordinates.
   * @param {string} queryOrKey - e.g. "sidebar", "chat_input", "left", "this component"
   * @returns {{ element: HTMLElement | null, normX: number, normY: number, direction: string, label: string, purpose: string }}
   */
  resolveTarget(queryOrKey = "") {
    const q = String(queryOrKey).toLowerCase().trim();

    // 1. Check direct key match in known components
    for (const [key, comp] of Object.entries(KNOWN_UI_COMPONENTS)) {
      if (q === key || q.includes(key.replace(/_/g, " ")) || key.replace(/_/g, " ").includes(q)) {
        const el = this._findElement(comp.selectors);
        if (el) {
          const coords = this._getElementCoords(el);
          return {
            element: el,
            normX: coords.x,
            normY: coords.y,
            direction: this._determineDirection(coords.x, coords.y),
            label: comp.label,
            purpose: comp.purpose
          };
        }
      }
    }

    // 2. Dynamic scan of visible interactive elements matching query text / aria-label / title / placeholder
    if (q && q !== "this component" && q !== "component" && q !== "here" && q !== "yahan" && q !== "ye") {
      const candidates = document.querySelectorAll("button, a, input, textarea, [role='button'], [data-nesa-target]");
      for (const el of candidates) {
        const text = (el.innerText || "").toLowerCase();
        const aria = (el.getAttribute("aria-label") || "").toLowerCase();
        const title = (el.getAttribute("title") || "").toLowerCase();
        const placeholder = (el.getAttribute("placeholder") || "").toLowerCase();
        const name = (el.getAttribute("name") || "").toLowerCase();
        if (text.includes(q) || aria.includes(q) || title.includes(q) || placeholder.includes(q) || name.includes(q)) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const coords = this._getElementCoords(el);
            const label = el.getAttribute("aria-label") || el.getAttribute("title") || el.innerText?.slice(0, 35) || el.placeholder || q;
            const dir = this._determineDirection(coords.x, coords.y);
            return {
              element: el,
              normX: coords.x,
              normY: coords.y,
              direction: dir,
              label,
              purpose: `This is the '${label}' element, located in the ${dir} area of your screen.`
            };
          }
        }
      }
    }

    // 3. Generic directional resolution (left, right, top, bottom, center)
    if (q.includes("left") || q.includes("bayein") || q.includes("bayen")) {
      return { element: null, normX: -0.75, normY: 0.0, direction: "left", label: "Left UI Area", purpose: "The left panel contains navigation and chat history." };
    }
    if (q.includes("right") || q.includes("dayein") || q.includes("dayen")) {
      return { element: null, normX: 0.75, normY: 0.0, direction: "right", label: "Right UI Area", purpose: "The right side houses action toolbars, controls, and active panels." };
    }
    if (q.includes("top") || q.includes("upper") || q.includes("upar")) {
      return { element: null, normX: 0.0, normY: -0.70, direction: "top", label: "Top Header Bar", purpose: "The top bar provides global search, model switching, and account settings." };
    }
    if (q.includes("bottom") || q.includes("down") || q.includes("neeche")) {
      return { element: null, normX: 0.0, normY: 0.70, direction: "bottom", label: "Bottom Input Area", purpose: "The bottom dock hosts the conversational input box and tool controls." };
    }
    if (q.includes("center") || q.includes("beech") || q.includes("middle")) {
      return { element: null, normX: 0.0, normY: 0.0, direction: "center", label: "Central Canvas", purpose: "The central workspace where conversation, diagrams, and documents appear." };
    }

    // 4. Fallback to active/focused or hovered element
    const active = document.activeElement;
    if (active && active !== document.body && active.tagName !== "BODY") {
      const coords = this._getElementCoords(active);
      const label = active.getAttribute("aria-label") || active.getAttribute("title") || active.innerText?.slice(0, 30) || "Active Element";
      return {
        element: active,
        normX: coords.x,
        normY: coords.y,
        direction: this._determineDirection(coords.x, coords.y),
        label,
        purpose: `This is the currently active UI control: ${label}.`
      };
    }

    // 5. If ambiguous or unidentifiable, report ambiguous instead of guessing
    return {
      element: null,
      normX: 0,
      normY: 0,
      direction: "center",
      label: null,
      ambiguous: true,
      purpose: null
    };
  }

  /**
   * Execute look-and-explain interaction.
   * 1. Directs head and gaze toward the element.
   * 2. Points toward the component if appropriate.
   * 3. Highlights the DOM element if present.
   * 4. Returns structured explanation.
   */
  async inspectAndExplain(queryOrKey, options = {}) {
    const target = this.resolveTarget(queryOrKey);
    const durationSec = options.duration ? (options.duration > 20 ? options.duration / 1000 : options.duration) : 2.8;
    const durationMs = durationSec * 1000;

    if (target.ambiguous || !target.label) {
      return {
        success: false,
        ambiguous: true,
        message: "Aap kis component ke baare mein pooch rahe hain? Barah-e-karam screen par us component ka naam ya taraf batayein (jaise 'sidebar', 'chat input', 'model selector', ya 'search bar').",
        spokenExplanation: "Aap kis component ke baare mein pooch rahe hain? Barah-e-karam us component ka naam ya taraf wazeh karein taake main dekh sakoon."
      };
    }

    // Optional visual highlight spotlight on DOM element
    if (target.element) {
      try {
        target.element.scrollIntoView({ behavior: "smooth", block: "nearest" });
        const origOutline = target.element.style.outline;
        const origBoxShadow = target.element.style.boxShadow;
        target.element.style.outline = "2px solid #10b981";
        target.element.style.boxShadow = "0 0 16px rgba(16, 185, 129, 0.4)";
        setTimeout(() => {
          target.element.style.outline = origOutline;
          target.element.style.boxShadow = origBoxShadow;
        }, durationMs);
      } catch (_) {}
    }

    // Command CharacterController to look and point toward target coordinates
    if (CharacterController.isInitialized()) {
      await CharacterController.lookAndPointAt(target.normX, target.normY, {
        duration: durationSec,
        point: options.point !== false
      });
    }

    return {
      success: true,
      target: target.label,
      direction: target.direction,
      normX: target.normX,
      normY: target.normY,
      purpose: target.purpose,
      spokenExplanation: `Main dekh rahi hoon — ye ${target.direction} side par ${target.label} hai. ${target.purpose}`
    };
  }

  _findElement(selectors) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch (_) {}
    }
    return null;
  }

  _getElementCoords(el) {
    if (!el || typeof el.getBoundingClientRect !== "function") {
      return { x: 0, y: 0 };
    }
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const normX = (cx / Math.max(1, window.innerWidth)) * 2 - 1;
    const normY = (cy / Math.max(1, window.innerHeight)) * 2 - 1;
    return {
      x: Math.max(-1.0, Math.min(1.0, normX)),
      y: Math.max(-1.0, Math.min(1.0, normY))
    };
  }

  _determineDirection(normX, normY) {
    if (normX < -0.35) return "left";
    if (normX > 0.35) return "right";
    if (normY < -0.35) return "top";
    if (normY > 0.35) return "bottom";
    return "center";
  }
}

const ScreenTargetManager = new ScreenTargetManagerClass();
export default ScreenTargetManager;
