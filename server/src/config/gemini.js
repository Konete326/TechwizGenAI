import { GoogleGenAI } from "@google/genai";
import { env } from "./env.js";

let currentKeyIndex = 0;

export const getNextBackendKey = () => {
  const keys = env.GEMINI_BACKEND_KEYS || [env.GEMINI_API_KEY];
  if (!keys.length) return env.GEMINI_API_KEY;
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;
  return keys[currentKeyIndex];
};

export const getCurrentBackendKey = () => {
  const keys = env.GEMINI_BACKEND_KEYS || [env.GEMINI_API_KEY];
  if (!keys.length) return env.GEMINI_API_KEY;
  return keys[currentKeyIndex % keys.length];
};

export const createGenAiClient = (apiKey) => new GoogleGenAI({ apiKey: apiKey || getCurrentBackendKey() });

export const geminiClient = createGenAiClient();
export default geminiClient;
