export const NESA_TOOL_DECLARATIONS = [
  {
    name: "navigatePage",
    description: "Navigate to a specific platform route or view such as assets, analytics, dashboard, studio, or settings.",
    parameters: { type: "OBJECT", properties: { route: { type: "STRING", description: "Target route like /assets, /analytics, /dashboard, /studio, /settings" } }, required: ["route"] }
  },
  {
    name: "spotlightElement",
    description: "Highlight or spotlight an on-screen UI element with guidance text.",
    parameters: { type: "OBJECT", properties: { targetKey: { type: "STRING", description: "Identifier for target element" }, label: { type: "STRING", description: "Short guidance text" } }, required: ["targetKey"] }
  },
  {
    name: "repositionWidget",
    description: "Change the layout position or minimize the floating Nesa voice interface.",
    parameters: { type: "OBJECT", properties: { position: { type: "STRING", description: "Target dock: top-left, top-right, bottom-left, bottom-right, minimize, maximize" } }, required: ["position"] }
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
    parameters: { type: "OBJECT", properties: { reason: { type: "STRING", description: "Optional dismissal reason" } } }
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
    parameters: { type: "OBJECT", properties: { prompt: { type: "STRING", description: "The full user prompt to submit" }, autoSubmit: { type: "BOOLEAN", description: "True to trigger generation" } }, required: ["prompt"] }
  },
  {
    name: "deleteAsset",
    description: "Deletes an asset or file. Provide the asset title or id if known, or deletes the target asset.",
    parameters: { type: "OBJECT", properties: { assetId: { type: "STRING" }, title: { type: "STRING" } } }
  },
  {
    name: "deleteSession",
    description: "Deletes the active or specified chat session.",
    parameters: { type: "OBJECT", properties: { sessionId: { type: "STRING" } } }
  },
  {
    name: "toggleWorkspaceControl",
    description: "Toggles workspace interface controls such as dark or light theme or sidebar collapse.",
    parameters: { type: "OBJECT", properties: { control: { type: "STRING", description: "theme, sidebar" } }, required: ["control"] }
  },
  {
    name: "previewAsset",
    description: "Opens an asset preview modal to view a document, image, or media asset.",
    parameters: { type: "OBJECT", properties: { query: { type: "STRING", description: "Name or format of asset to view" } } }
  },
  {
    name: "switchSession",
    description: "Switches to an existing chat session by title or topic.",
    parameters: { type: "OBJECT", properties: { query: { type: "STRING", description: "Title or topic of chat session" } }, required: ["query"] }
  },
  {
    name: "exportCallSummary",
    description: "Generates an executive PDF summary of the call or conversation and provides a download link.",
    parameters: { type: "OBJECT", properties: { title: { type: "STRING", description: "Title of report" } } }
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
