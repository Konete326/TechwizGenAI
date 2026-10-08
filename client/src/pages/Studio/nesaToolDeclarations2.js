export const NESA_TOOL_DECLARATIONS_2 = [
  {
    name: "getDashboardMetrics", behavior: "NON_BLOCKING",
    description: "Fetches live platform analytics and metrics including token usage, total generations, and active assets.",
    parameters: { type: "OBJECT", properties: {} }
  },
  {
    name: "disconnectCall",
    description: "Terminates the active voice call session immediately when the user requests to end or cut the call.",
    parameters: { type: "OBJECT", properties: {} }
  },
  {
    name: "submitStudioPrompt", behavior: "NON_BLOCKING",
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
    name: "exportCallSummary", behavior: "NON_BLOCKING",
    description: "Generates an executive PDF summary of the call or conversation and provides a download link.",
    parameters: { type: "OBJECT", properties: { title: { type: "STRING", description: "Title of report" } } }
  },
  {
    name: "generateImage", behavior: "NON_BLOCKING",
    description: "Generates an image via external visual engine. Provide a prompt describing the image.",
    parameters: { type: "OBJECT", properties: { prompt: { type: "STRING", description: "Detailed description of the image to generate" } }, required: ["prompt"] }
  },
  {
    name: "queryDocument", behavior: "NON_BLOCKING",
    description: "Searches and answers questions from the user's uploaded documents, PDFs, manuals, and files in the Assets library.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "The specific question or topic to search within the documents" },
        documentTitle: { type: "STRING", description: "Optional name or keyword of the specific document to inspect" }
      },
      required: ["query"]
    }
  }
];

