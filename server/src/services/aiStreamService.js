import { GoogleGenAI } from "@google/genai";
import { geminiClient, getNextBackendKey, createGenAiClient } from "../config/gemini.js";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { getPersonaInstruction } from "../config/aiPersonas.js";

export const getAiClient = (customApiKey) => {
  return customApiKey ? new GoogleGenAI({ apiKey: customApiKey }) : geminiClient;
};

export const createModelStream = async ({ client, model, contents, systemInstruction, customApiKey, persona }) => {
  const primaryModel = model || env.PRIMARY_BACKEND_MODEL || "gemini-3.8-flash";
  const personaSuffix = persona ? ` ${getPersonaInstruction(persona)}` : "";
  const finalInstruction = `${systemInstruction || ""}${personaSuffix}`.trim();
  const config = {
    systemInstruction: finalInstruction,
    thinkingConfig: { thinkingBudget: 0 }
  };

  if (customApiKey) {
    return await client.models.generateContentStream({ model: primaryModel, contents, config });
  }

  const keys = env.GEMINI_BACKEND_KEYS || [env.GEMINI_API_KEY];
  let lastErr = null;

  for (let attempt = 0; attempt < keys.length; attempt++) {
    const key = attempt === 0 ? undefined : getNextBackendKey();
    const activeClient = key ? createGenAiClient(key) : client;
    try {
      return await activeClient.models.generateContentStream({ model: primaryModel, contents, config });
    } catch (err) {
      lastErr = err;
      const status = err?.status || err?.statusCode || (err?.message && err.message.includes("429") ? 429 : 0);
      const isQuota = status === 429 || (err?.message && (err.message.includes("RESOURCE_EXHAUSTED") || err.message.includes("quota") || err.message.includes("rate")));
      if (isQuota && keys.length > 1) {
        continue;
      }
      try {
        return await activeClient.models.generateContentStream({ model: env.FALLBACK_BACKEND_MODEL || "gemini-3.7-flash", contents, config });
      } catch (fallbackErr) {
        lastErr = fallbackErr;
      }
    }
  }

  throw lastErr;
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
