import { GoogleGenAI } from "@google/genai";
import { geminiClient } from "../config/gemini.js";
import { User } from "../models/User.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { getPersonaInstruction } from "../config/aiPersonas.js";

export const getAiClient = (customApiKey) => {
  return customApiKey ? new GoogleGenAI({ apiKey: customApiKey }) : geminiClient;
};

export const createModelStream = async ({ client, model, contents, systemInstruction, customApiKey, persona }) => {
  const primaryModel = model || "gemini-3.8-flash";
  const personaSuffix = persona ? ` ${getPersonaInstruction(persona)}` : "";
  const finalInstruction = `${systemInstruction || ""}${personaSuffix}`.trim();
  try {
    return await client.models.generateContentStream({ model: primaryModel, contents, config: { systemInstruction: finalInstruction } });
  } catch (apiErr) {
    if (customApiKey) throw apiErr;
    try {
      return await client.models.generateContentStream({ model: "gemini-3.8-flash", contents, config: { systemInstruction: finalInstruction } });
    } catch {
      return await client.models.generateContentStream({ model: "gemini-3.7-flash", contents, config: { systemInstruction: finalInstruction } });
    }
  }
};

export const consumeStreamAndTrackUsage = async ({ responseStream, promptText, userId, sessionId, res }) => {
  let isSpecialReq = false;
  let specialType = "";
  let specialBuffer = "";
  let accumulatedText = "";
  const tokens = { prompt: 0, completion: 0, total: 0 };

  for await (const chunk of responseStream) {
    if (chunk.usageMetadata) {
      tokens.prompt = chunk.usageMetadata.promptTokenCount || tokens.prompt;
      tokens.completion = chunk.usageMetadata.candidatesTokenCount || tokens.completion;
      tokens.total = chunk.usageMetadata.totalTokenCount || tokens.total;
    }
    const chunkText = chunk.text || "";
    if (!chunkText) continue;

    if (!isSpecialReq) {
      if (chunkText.includes("[DOC_REQ:") || specialBuffer.includes("[DOC_REQ:")) {
        isSpecialReq = true;
        specialType = "doc";
        specialBuffer += chunkText;
        continue;
      }
      if (chunkText.includes("[IMAGE_REQ:") || specialBuffer.includes("[IMAGE_REQ:")) {
        isSpecialReq = true;
        specialType = "image";
        specialBuffer += chunkText;
        continue;
      }
      if (accumulatedText.length === 0 && (chunkText.trim().startsWith("[") || specialBuffer.length > 0)) {
        specialBuffer += chunkText;
        if (specialBuffer.length > 30) {
          accumulatedText += specialBuffer;
          res.write(`data: ${JSON.stringify({ text: specialBuffer })}\n\n`);
          specialBuffer = "";
        }
        continue;
      }
    }

    if (isSpecialReq) {
      specialBuffer += chunkText;
      continue;
    }

    accumulatedText += chunkText;
    res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
  }

  if (tokens.total > 0) {
    await User.findByIdAndUpdate(userId, { $inc: { totalTokensUsed: tokens.total } }).catch(() => {});
  }

  return { isSpecialReq, specialType, specialBuffer, accumulatedText, tokens };
};

export default { getAiClient, createModelStream, consumeStreamAndTrackUsage };
