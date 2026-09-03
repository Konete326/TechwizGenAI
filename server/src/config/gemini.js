import { GoogleGenAI } from "@google/genai";
import { env } from "./env.js";

export const geminiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
export default geminiClient;
