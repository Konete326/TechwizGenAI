export const NESA_TOOL_DECLARATIONS = [
  {
    name: "navigatePage",
    description: "Navigate to a specific platform route or view such as assets, analytics, dashboard, studio, or settings.",
    parameters: {
      type: "OBJECT",
      properties: {
        route: { type: "STRING", description: "Target route like /assets, /analytics, /dashboard, /studio, /settings" }
      },
      required: ["route"]
    }
  },
  {
    name: "spotlightElement",
    description: "Highlight or spotlight an on-screen UI element with guidance text.",
    parameters: {
      type: "OBJECT",
      properties: {
        targetKey: { type: "STRING", description: "Identifier or selector for target element (e.g. upload_btn, theme_toggle, new_chat)" },
        label: { type: "STRING", description: "Short guidance text to show near the arrow" }
      },
      required: ["targetKey"]
    }
  },
  {
    name: "repositionWidget",
    description: "Change the layout position or minimize the floating Nesa voice interface.",
    parameters: {
      type: "OBJECT",
      properties: {
        position: { type: "STRING", description: "Target dock: top-left, top-right, bottom-left, bottom-right, minimize, maximize" }
      },
      required: ["position"]
    }
  },
  {
    name: "openDynamicModal",
    description: "Trigger and open a dynamic modal dialog in the application.",
    parameters: {
      type: "OBJECT",
      properties: {
        modalType: { type: "STRING", description: "upload_asset, text_note, translation, input_prompt, logout_confirm" },
        title: { type: "STRING", description: "Modal title" },
        content: { type: "STRING", description: "Rich text explanation, Urdu translation, or prompt details" },
        inputPlaceholder: { type: "STRING", description: "Placeholder text for input field" }
      },
      required: ["modalType"]
    }
  },
  {
    name: "closeModal",
    description: "Dismiss or close any active modal popup or dynamic dialog.",
    parameters: {
      type: "OBJECT",
      properties: {
        reason: { type: "STRING", description: "Optional dismissal reason" }
      }
    }
  },
  {
    name: "executeLogout",
    description: "Terminates user session, clears auth tokens, and redirects to login page. Only invoke AFTER user explicitly confirms the logout warning.",
    parameters: { type: "OBJECT", properties: {} }
  },
  {
    name: "getDashboardMetrics",
    description: "Fetches live platform analytics and metrics including token usage, total generations, and active assets.",
    parameters: { type: "OBJECT", properties: {} }
  },
  {
    name: "disconnectCall",
    description: "Terminates the active voice call session immediately when the user requests to end or cut the call (e.g. 'call cut kar do', 'bye', 'disconnect').",
    parameters: { type: "OBJECT", properties: {} }
  },
  {
    name: "submitStudioPrompt",
    description: "Executes a query directly in the Studio chat canvas. Use this when the user asks to generate a graph, write code, or run a query in the chat.",
    parameters: {
      type: "OBJECT",
      properties: {
        prompt: { type: "STRING", description: "The full user prompt to submit" },
        autoSubmit: { type: "BOOLEAN", description: "True to immediately trigger generation" }
      },
      required: ["prompt"]
    }
  },
  {
    name: "deleteAsset",
    description: "Deletes an asset or file. Provide the asset title or id if known, or deletes the target asset.",
    parameters: {
      type: "OBJECT",
      properties: {
        assetId: { type: "STRING" },
        title: { type: "STRING" }
      }
    }
  },
  {
    name: "deleteSession",
    description: "Deletes the active or specified chat session.",
    parameters: {
      type: "OBJECT",
      properties: { sessionId: { type: "STRING" } }
    }
  }
];

export function formatToolResponse(id, name, result) {
  return {
    toolResponse: {
      functionResponses: [
        {
          response: { output: result },
          id,
          name
        }
      ]
    }
  };
}

export default { NESA_TOOL_DECLARATIONS, formatToolResponse };
