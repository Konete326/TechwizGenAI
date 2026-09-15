import { GoogleGenAI } from "@google/genai";
import { geminiClient, getNextBackendKey, createGenAiClient } from "../config/gemini.js";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { getPersonaInstruction } from "../config/aiPersonas.js";

export const getAiClient = (customApiKey) => customApiKey ? new GoogleGenAI({ apiKey: customApiKey }) : geminiClient;

export const createModelStream = async ({ client, model, contents, systemInstruction, customApiKey, persona }) => {
  const primaryModel = model || env.PRIMARY_BACKEND_MODEL || "gemini-3.6-flash";
  const personaSuffix = persona ? ` ${getPersonaInstruction(persona)}` : "";
  const config = { systemInstruction: `${systemInstruction || ""}${personaSuffix}`.trim(), thinkingConfig: { thinkingBudget: 0 } };

  if (customApiKey) {
    try { return await client.models.generateContentStream({ model: primaryModel, contents, config }); }
    catch { return await client.models.generateContentStream({ model: "gemini-3.6-flash", contents, config }); }
  }

  const modelQueue = Array.from(new Set([primaryModel, env.PRIMARY_BACKEND_MODEL, env.FALLBACK_BACKEND_MODEL, "gemini-3.6-flash", "gemini-3.5-flash"])).filter(Boolean);
  const keys = env.GEMINI_BACKEND_KEYS || [env.GEMINI_API_KEY];
  let lastErr = null;

  for (const targetModel of modelQueue) {
    for (let attempt = 0; attempt < keys.length; attempt++) {
      const key = attempt === 0 ? undefined : getNextBackendKey(), activeClient = key ? createGenAiClient(key) : client;
      try {
        return await activeClient.models.generateContentStream({ model: targetModel, contents, config });
      } catch (err) {
        lastErr = err;
        const msg = String(err?.message || ""), status = err?.status || err?.statusCode || 0;
        if (status === 503 || msg.includes("503") || msg.includes("UNAVAILABLE") || status === 404 || msg.includes("404")) break;
      }
    }
  }
  throw lastErr;
};

export const consumeStreamAndTrackUsage = async ({ responseStream, promptText, userId, sessionId, res }) => {
  let isSpecialReq = false, specialType = "", specialBuffer = "", accumulatedText = "";
  const tokens = { prompt: 0, completion: 0, total: 0 };

  try {
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
          isSpecialReq = true; specialType = "doc"; specialBuffer += chunkText; continue;
        }
        if (chunkText.includes("[IMAGE_REQ:") || specialBuffer.includes("[IMAGE_REQ:")) {
          isSpecialReq = true; specialType = "image"; specialBuffer += chunkText; continue;
        }
        if (accumulatedText.length === 0 && (chunkText.trim().startsWith("[") || specialBuffer.length > 0)) {
          specialBuffer += chunkText;
          if (specialBuffer.length > 12) {
            accumulatedText += specialBuffer;
            res.write(`data: ${JSON.stringify({ text: specialBuffer })}\n\n`);
            specialBuffer = "";
          }
          continue;
        }
      }

      if (isSpecialReq) { specialBuffer += chunkText; continue; }
      accumulatedText += chunkText;
      res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
    }
  } catch (err) {
    if (!accumulatedText) throw err;
  }

  if (!isSpecialReq && specialBuffer.length > 0) {
    accumulatedText += specialBuffer;
    res.write(`data: ${JSON.stringify({ text: specialBuffer })}\n\n`);
    specialBuffer = "";
  }

  if (tokens.total > 0) await User.findByIdAndUpdate(userId, { $inc: { totalTokensUsed: tokens.total } }).catch(() => {});
  return { isSpecialReq, specialType, specialBuffer, accumulatedText, tokens };
};

export default { getAiClient, createModelStream, consumeStreamAndTrackUsage };
