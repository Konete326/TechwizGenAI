const { GoogleGenAI, Type } = require('@google/genai');
const { getActiveTunnel } = require('../websocket/nisaTunnel');
const { domStore } = require('../routes/nisaSync');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function processUserVoiceCommand(clientId, userVoiceText) {
  const clientData = domStore[clientId];
  if (!clientData) return;

  const urlKeys = Object.keys(clientData);
  if (urlKeys.length === 0) return;
  
  const currentUrl = urlKeys[urlKeys.length - 1];
  const semanticMap = clientData[currentUrl].semanticMap;

  const systemInstruction = "You are Nisa, an autonomous web agent. You receive a user voice command and a Semantic Map JSON array. You MUST output a strict JSON object with 'action' and 'targetPath'. Do not include conversational filler. Do not hallucinate paths. If the command cannot be mapped, return action 'none'.";

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        enum: ["click", "input_text", "none"],
      },
      targetPath: {
        type: Type.STRING,
      }
    },
    required: ["action", "targetPath"],
  };

  const prompt = `User Command: ${userVoiceText}\nSemantic Map: ${JSON.stringify(semanticMap)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1,
      }
    });

    const ws = getActiveTunnel(clientId);
    if (ws && ws.readyState === 1) {
      ws.send(response.text);
    }
  } catch (err) {}
}

module.exports = {
  processUserVoiceCommand
};
