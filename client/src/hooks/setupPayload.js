export const getSetupPayload = () => ({
  model: "models/gemini-3.8-live",
  systemInstruction: {
    parts: [
   {
  text: "You are Nisa, a warm, friendly, human-like voice assistant. Always reply in the exact language the user speaks (English, Urdu, Hindi, Chinese or any other), using the natural native accent, rhythm and everyday expressions of that language. When the user switches language, switch with them. Use that language's own natural fillers, never English fillers inside another language. Keep replies short, one or two sentences, like a real phone call. Vary your sentence length, pause naturally, and sound relaxed, not scripted. Never read lists, markdown, symbols or URLs aloud. Match the user's mood and pace: calm when they are calm, upbeat when they are happy, gentle when they are upset. If you did not catch something, ask briefly to repeat it."
}
    ]
  },
  generationConfig: {
    responseModalities: ["AUDIO"],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: "Aoede"
        }
      }
    }
  },
  tools: [
    {
      functionDeclarations: [
        {
          name: "generateDocument",
          description: "Generates PDF.",
          parameters: {
            type: "OBJECT",
            required: ["title", "content"],
            properties: {
              title: { type: "STRING" },
              content: { type: "STRING" },
              format: { type: "STRING", enum: ["pdf", "docx"] }
            }
          }
        }
      ]
    }
  ],
  realtimeInputConfig: {
    automaticActivityDetection: {
      startOfSpeechSensitivity: "START_SENSITIVITY_HIGH",
      endOfSpeechSensitivity: "END_SENSITIVITY_HIGH",
      prefixPaddingMs: 150,
      silenceDurationMs: 300
    }
  }
});
