import { GoogleGenAI } from "@google/genai";
import { geminiClient } from "../config/gemini.js";
import { ChatSession } from "../models/ChatSession.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { sanitizeText } from "../utils/validators.js";

export const verifyApiKey = async (req, res) => {
  try {
    const apiKey = req.headers["x-custom-api-key"] || req.body.apiKey;
    if (!apiKey) return res.status(400).json({ success: false, message: "API key is required" });
    const testClient = new GoogleGenAI({ apiKey });
    const resp = await testClient.models.generateContent({ model: "gemini-2.5-flash", contents: "ping" });
    if (resp && resp.text) return res.status(200).json({ success: true, message: "API connection verified" });
    return res.status(400).json({ success: false, error: "CUSTOM_API_FAILED", message: "No response from model" });
  } catch (error) {
    return res.status(401).json({ success: false, error: "CUSTOM_API_FAILED", message: error.message || "Invalid custom API key" });
  }
};

export const editMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    if (!text || typeof text !== "string") return res.status(400).json({ success: false, message: "Text is required" });

    const targetMsg = await ChatMessage.findById(messageId);
    if (!targetMsg || targetMsg.role !== "user") return res.status(404).json({ success: false, message: "User message not found" });

    const session = await ChatSession.findOne({ _id: targetMsg.sessionId, userId: req.user._id });
    if (!session) return res.status(403).json({ success: false, message: "Unauthorized" });

    targetMsg.text = sanitizeText(text);
    await targetMsg.save();

    await ChatMessage.deleteMany({ sessionId: session._id, createdAt: { $gt: targetMsg.createdAt } });
    session.updatedAt = new Date();
    await session.save();

    return res.status(200).json({
      success: true,
      data: { sessionId: session._id.toString(), messageId: targetMsg._id.toString(), text: targetMsg.text }
    });
  } catch (error) {
    next(error);
  }
};

export const regenerateSession = async (req, res, next) => {
  try {
    const { id: sessionId } = req.params;
    const session = await ChatSession.findOne({ _id: sessionId, userId: req.user._id });
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    const lastMsg = await ChatMessage.findOne({ sessionId: session._id }).sort({ createdAt: -1 });
    if (lastMsg && lastMsg.role === "model") {
      await ChatMessage.deleteOne({ _id: lastMsg._id });
    }

    const lastUserMsg = await ChatMessage.findOne({ sessionId: session._id, role: "user" }).sort({ createdAt: -1 });
    if (!lastUserMsg) return res.status(400).json({ success: false, message: "No user message found" });

    req.body.prompt = lastUserMsg.text;
    req.body.imageBase64 = lastUserMsg.attachment;
    return streamChat(req, res, next, true);
  } catch (error) {
    next(error);
  }
};

export const streamChat = async (req, res, next, isRegenerate = false) => {
  try {
    const { id: sessionId } = req.params;
    const { prompt, model, imageBase64 } = req.body;
    const customApiKey = req.headers["x-custom-api-key"];

    const effectivePrompt = (prompt && typeof prompt === "string" && prompt.trim())
      ? prompt.trim()
      : (imageBase64 ? "Describe this image in detail and highlight key aspects." : "");
    if (!effectivePrompt) return res.status(400).json({ success: false, message: "Prompt or image is required" });
    const cleanPrompt = sanitizeText(effectivePrompt);

    const session = await ChatSession.findOne({ _id: sessionId, userId: req.user._id });
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    if (!isRegenerate) {
      await ChatMessage.create({
        sessionId: session._id,
        role: "user",
        text: cleanPrompt,
        attachment: imageBase64 || null
      });

      if (session.title === "New Chat" || !session.title) {
        const words = cleanPrompt.trim().split(/\s+/).slice(0, 5).join(" ");
        session.title = words ? words.charAt(0).toUpperCase() + words.slice(1) : "New Chat";
        session.updatedAt = new Date();
        await session.save();
      }
    }

    const pastMessages = await ChatMessage.find({ sessionId: session._id }).sort({ createdAt: 1 }).limit(20);
    const historyContents = pastMessages.slice(0, -1).map((m) => ({ role: m.role, parts: [{ text: m.text }] }));

    const userParts = [{ text: cleanPrompt }];
    if (imageBase64 && typeof imageBase64 === "string" && imageBase64.includes(",")) {
      const [meta, rawData] = imageBase64.split(",");
      const match = meta.match(/data:([^;]+);base64/);
      userParts.push({ inlineData: { data: rawData, mimeType: match ? match[1] : "image/jpeg" } });
    }

    const contents = [...historyContents, { role: "user", parts: userParts }];
    const targetModel = model || "gemini-3.7-flash";
    const client = customApiKey ? new GoogleGenAI({ apiKey: customApiKey }) : geminiClient;

    let responseStream;
    try {
      responseStream = await client.models.generateContentStream({ model: targetModel, contents });
    } catch (apiErr) {
      if (customApiKey) {
        return res.status(401).json({
          success: false,
          error: "CUSTOM_API_FAILED",
          message: apiErr.message || "Custom API key authentication failed or exceeded quota."
        });
      }
      try {
        responseStream = await client.models.generateContentStream({ model: "gemini-2.5-flash", contents });
      } catch (fallbackErr) {
        return next(fallbackErr);
      }
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    let accumulatedText = "";
    try {
      for await (const chunk of responseStream) {
        const chunkText = chunk.text || "";
        if (chunkText) {
          accumulatedText += chunkText;
          res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
        }
      }
    } catch (err) {
      if (customApiKey) {
        res.write(`data: ${JSON.stringify({ error: "CUSTOM_API_FAILED", message: err.message })}\n\n`);
        return res.end();
      }
      accumulatedText = "Unable to connect to AI engine. Please verify network and API key.";
      res.write(`data: ${JSON.stringify({ text: accumulatedText })}\n\n`);
    }

    if (accumulatedText) {
      await ChatMessage.create({ sessionId: session._id, role: "model", text: accumulatedText });
      session.updatedAt = new Date();
      if (session.title === "New Chat") {
        const words = cleanPrompt.trim().split(/\s+/).slice(0, 3).join(" ");
        session.title = words ? words.charAt(0).toUpperCase() + words.slice(1) : "New Chat";
      }
      await session.save();
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    if (!res.headersSent) return next(error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
};
