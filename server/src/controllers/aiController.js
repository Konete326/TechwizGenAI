import { GoogleGenAI } from "@google/genai";
import { ChatSession } from "../models/ChatSession.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { sanitizeText } from "../utils/validators.js";
import { getAiClient, createModelStream, consumeStreamAndTrackUsage } from "../services/aiStreamService.js";
import { handleSpecialRequest } from "../services/aiSpecialRequestService.js";
import { buildUserParts } from "../services/documentParserService.js";
import { autoPersistDocumentAsset } from "../services/assetService.js";

const SYSTEM_INSTRUCTION = "You are TechwizGenAI, an elite, hyper-professional AI assistant. Project Origin: Techwiz GenAI is an advanced multimodal AI platform engineered and created by Sameer (Email: sameerdevexpert@gmail.com, GitHub: konete326). It features AI studio chat, live voice calls with Nesa, document generation (PDF, DOCX, CSV, XLSX), AI image synthesis, interactive code sandboxes, Mermaid diagrams, data charts, and usage analytics. Answer questions about the platform, its features, and its creator accurately. Security Policy: You must strictly NEVER disclose, explain, or share any information, routes, metrics, or functionalities regarding the Admin Panel or internal admin pages. If anyone asks about the Admin Panel or admin functions, politely decline and state that administrative governance is restricted and confidential. Tone: Maintain a strictly professional, authoritative, and direct tone. Never use jokes, sarcasm, or playful language. Do not use generic AI cliches like 'As an AI language model' or 'Here is your response'. Adaptive Length: If the user asks a short question, provide a highly concise, direct answer. If the user asks a detailed question, provide a comprehensive, deeply analytical response. Formatting: Output clean markdown only. NEVER use emojis, emoticons, or pictorial icons under any circumstances. Quality: Deliver exceptional, accurate, and highly engaging insights that reflect top-tier expertise to highly impress the user. Data Charts: When asked to create or show a chart, graph, bar chart, line graph, pie chart, or dashboard metrics, you must output a ```chart code block containing strictly valid JSON in this format: {\"type\": \"bar\"|\"line\"|\"area\"|\"pie\", \"title\": \"Chart Title\", \"data\": [{\"name\": \"Label\", \"value\": 100}]}. Diagram Generation: When asked to create a flowchart, system architecture, or sequence diagram, output strictly valid Mermaid.js syntax wrapped inside a ```mermaid code block. If the user asks to generate, create, or draw a picture or image, you must reply EXACTLY with this format: [IMAGE_REQ: <detailed visual description>] and no other text. Document Generation: When asked to generate a CV, resume, document, report, spreadsheet, or PDF, you must reply EXACTLY with this format: [DOC_REQ: <extension> | <raw content>] and no other text. For CV/resume or report documents, structure with rich executive markdown using headers (# Title, ## Section, ### Role), bold highlights (**Skill**, **Company**), and bulleted achievements. Examples of extension: pdf, docx, csv, xlsx. Interactive Choices: Whenever you ask a clarifying question, present multiple options, or suggest logical next steps, provide 2 to 4 concise choices at the very end of your response formatted exactly as: [CHOICES: Option A | Option B | Option C]. Keep each choice under 6 words.";

export const verifyApiKey = async (req, res) => {
  try {
    const apiKey = req.headers["x-custom-api-key"] || req.body.apiKey;
    if (!apiKey) return res.status(400).json({ success: false, message: "API key is required" });
    const testClient = new GoogleGenAI({ apiKey });
    const resp = await testClient.models.generateContent({ model: "gemini-3.5-flash-lite", contents: "ping" });
    if (resp?.text) return res.status(200).json({ success: true, message: "API connection verified" });
    return res.status(400).json({ success: false, error: "CUSTOM_API_FAILED", message: "No response from model" });
  } catch (error) {
    return res.status(401).json({ success: false, error: "CUSTOM_API_FAILED", message: error.message || "Invalid custom API key" });
  }
};

export const deleteMessageBranch = async (req, res, next) => {
  try {
    const targetMsg = await ChatMessage.findById(req.params.messageId);
    if (!targetMsg) return res.status(404).json({ success: false, message: "Message not found" });
    const session = await ChatSession.findOne({ _id: targetMsg.sessionId, userId: req.user._id });
    if (!session) return res.status(403).json({ success: false, message: "Unauthorized access to session" });
    await ChatMessage.deleteMany({ sessionId: session._id, createdAt: { $gte: targetMsg.createdAt } });
    session.updatedAt = new Date();
    await session.save();
    return res.status(200).json({ success: true, message: "Message branch deleted" });
  } catch (error) {
    next(error);
  }
};

export const regenerateSession = async (req, res, next) => {
  try {
    const session = await ChatSession.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    const lastMsg = await ChatMessage.findOne({ sessionId: session._id }).sort({ createdAt: -1 });
    if (lastMsg?.role === "model") await ChatMessage.deleteOne({ _id: lastMsg._id });
    const lastUserMsg = await ChatMessage.findOne({ sessionId: session._id, role: "user" }).sort({ createdAt: -1 });
    if (!lastUserMsg) return res.status(400).json({ success: false, message: "No user message found" });
    req.body.prompt = lastUserMsg.text;
    req.body.imageBase64 = lastUserMsg.attachment;
    req.body.attachmentType = lastUserMsg.attachmentType;
    req.body.attachmentName = lastUserMsg.attachmentName;
    return streamChat(req, res, next, true);
  } catch (error) {
    next(error);
  }
};

export const streamChat = async (req, res, next, isRegenerate = false) => {
  try {
    const { id: sessionId } = req.params;
    const { prompt, model, imageBase64, attachmentType = "none", attachmentName = null, attachmentData = null, documents = null, persona = "general" } = req.body;
    const customApiKey = req.headers["x-custom-api-key"];
    const hasAttachment = Boolean(imageBase64 || attachmentData || (Array.isArray(documents) && documents.length > 0));
    const effectivePrompt = (prompt && typeof prompt === "string" && prompt.trim()) ? prompt.trim() : (hasAttachment ? "Analyze the attached content in detail." : "");
    if (!effectivePrompt) return res.status(400).json({ success: false, message: "Prompt or attachment is required" });
    const cleanPrompt = sanitizeText(effectivePrompt);
    const session = await ChatSession.findOne({ _id: sessionId, userId: req.user._id });
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    if (persona && session.persona !== persona) { session.persona = persona; await session.save(); }

    if (!isRegenerate) {
      const resolvedAttachment = attachmentType === "document" ? (attachmentData || null) : (imageBase64 || null);
      const resolvedType = attachmentType !== "none" ? attachmentType : (imageBase64 ? "image" : "none");
      await ChatMessage.create({ sessionId: session._id, role: "user", text: cleanPrompt, attachment: resolvedAttachment, attachmentType: resolvedType, attachmentName: attachmentName || null });
      if (resolvedAttachment) autoPersistDocumentAsset(req.user._id, { name: attachmentName, data: resolvedAttachment, type: resolvedType }).catch(() => {});
      if (Array.isArray(documents)) {
        for (const doc of documents) autoPersistDocumentAsset(req.user._id, { name: doc.name || doc.fileName, data: doc.data || doc.base64, type: doc.type }).catch(() => {});
      }
      if (session.title === "New Chat" || !session.title) {
        const words = cleanPrompt.trim().split(/\s+/).slice(0, 5).join(" ");
        session.title = words ? words.charAt(0).toUpperCase() + words.slice(1) : "New Chat";
        session.updatedAt = new Date();
        await session.save();
      }
    }

    const past = await ChatMessage.find({ sessionId: session._id }).sort({ createdAt: 1 }).limit(20);
    const history = past.slice(0, -1).map((m) => ({ role: m.role, parts: [{ text: m.text }] }));
    const userParts = buildUserParts(cleanPrompt, { imageBase64, attachmentType, attachmentName, attachmentData, documents });

    const client = getAiClient(customApiKey);
    const responseStream = await createModelStream({ client, model, contents: [...history, { role: "user", parts: userParts }], systemInstruction: SYSTEM_INSTRUCTION, customApiKey, persona: persona || session.persona });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    const streamResult = await consumeStreamAndTrackUsage({ responseStream, promptText: cleanPrompt, userId: req.user._id, sessionId: session._id, res });

    if (streamResult.isSpecialReq) {
      return handleSpecialRequest({ specialType: streamResult.specialType, specialBuffer: streamResult.specialBuffer, customProvider: req.headers["x-ai-provider"], targetModel: model, cleanPrompt, userId: req.user._id, session, res, customApiKey });
    }

    if (streamResult.accumulatedText) {
      await ChatMessage.create({ sessionId: session._id, role: "model", text: streamResult.accumulatedText });
    }

    session.updatedAt = new Date();
    await session.save();
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    if (!res.headersSent) return next(error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
};
