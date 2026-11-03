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
  },
  {
    name: "executeCharacterAction",
    description: "Request the 3D character (Nisa) to perform a physical action, spatial movement, or gesture. Actions: move_forward, move_backward, step_back, come_closer, move_away, move_left, move_right, turn_body_left, turn_body_right, turn_around, show_back, face_camera, walk, walk_to, handshake, handshake_greeting, extend_hand, reach_out, clap, wave (right/left/both), point (left/right/up/down), raise_hand, lower_hands, return_to_center, stand_straight, reset_pose, nod, shake_head, adjust_hair, smile, wide_smile, show_teeth, laugh, thinking, greeting.",
    parameters: {
      type: "OBJECT",
      properties: {
        actionId: {
          type: "STRING",
          description: "Action identifier to execute (e.g. handshake, move_forward, move_backward, turn_around, face_camera, walk, point_left, point_right, return_to_center, stand_straight, show_teeth, laugh, wave, clap)."
        },
        parameters: {
          type: "OBJECT",
          description: "Optional action parameters (e.g. { direction: 'left' } for point, { z: 0.6 } for walk, { intensity: 0.9 } for smile/teeth)."
        }
      },
      required: ["actionId"]
    }
  },
  {
    name: "inspectScreenComponent",
    description: "Look at and explain an on-screen UI component when the user asks 'yahan dekho, ye component kya hai', 'look here', or asks about a UI element. Nisha identifies the component, turns her head and gaze toward its position, points towards it, and explains its purpose.",
    parameters: {
      type: "OBJECT",
      properties: {
        target: {
          type: "STRING",
          description: "Name, direction, or description of the UI component to inspect (e.g. 'sidebar', 'model_selector', 'chat_input', 'call_nisa_btn', 'left', 'right', 'top', 'bottom', 'center', 'this component')."
        }
      },
      required: ["target"]
    }
  },
  {
    name: "expressEmotion",
    description: "Express a genuine emotional reaction matching conversational context on the 3D avatar (Happy, Excited, Sad, Disappointed, Angry, Surprised, Curious, Confused, Shy, Thinking, Neutral, Playful, Empathetic).",
    parameters: {
      type: "OBJECT",
      properties: {
        emotion: {
          type: "STRING",
          description: "The emotion to express: happy, excited, sad, disappointed, angry, surprised, curious, confused, shy, thinking, neutral, playful, empathetic."
        },
        intensity: {
          type: "NUMBER",
          description: "Emotional intensity from 0.1 to 1.0 (default: 0.85)."
        },
        reason: {
          type: "STRING",
          description: "Brief conversational reason for this emotional reaction."
        },
        suggested_gesture: {
          type: "STRING",
          description: "Optional accompanying physical gesture to trigger alongside emotion (e.g. smile, nod, laugh, head_tilt)."
        },
        duration: {
          type: "NUMBER",
          description: "Duration in milliseconds to hold the emotion before gently easing back to neutral (default: 2800)."
        }
      },
      required: ["emotion"]
    }
  },
  {
    name: "switchCharacter",
    description: "Switch the active 3D avatar/character in the application (e.g. to another registered character profile).",
    parameters: {
      type: "OBJECT",
      properties: {
        characterId: {
          type: "STRING",
          description: "The unique ID of the character to activate (e.g. 'nisa')."
        }
      },
      required: ["characterId"]
    }
  }
];
