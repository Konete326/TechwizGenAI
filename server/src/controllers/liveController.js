import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env.js";

export const generateEphemeralToken = async (req, res, next) => {
  try {
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const response = await ai.authTokens.create({
      liveConnectConstraints: {
        model: "gemini-3.8-live"
      },
      expireTime: "1800s",
      newSessionExpireTime: "60s"
    });
    return res.status(200).json({ success: true, token: response.token });
  } catch (error) {
    return next(error);
  }
};
