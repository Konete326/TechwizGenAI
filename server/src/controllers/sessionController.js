import { ChatSession } from "../models/ChatSession.js";
import { ChatMessage } from "../models/ChatMessage.js";

const VALID_PERSONAS = ["general", "architect", "analyst", "writer", "diagrammer"];

export const createSession = async (req, res, next) => {
  try {
    const { persona = "general" } = req.body || {};
    const safePersona = VALID_PERSONAS.includes(persona) ? persona : "general";
    const session = await ChatSession.create({
      userId: req.user._id,
      title: "New Chat",
      persona: safePersona,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return res.status(201).json({
      success: true,
      data: {
        id: session._id.toString(),
        title: session.title,
        persona: session.persona,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getSessions = async (req, res, next) => {
  try {
    const sessions = await ChatSession.find({ userId: req.user._id }).sort({ updatedAt: -1 }).limit(50);
    return res.status(200).json({
      success: true,
      data: sessions.map((s) => ({
        id: s._id.toString(),
        title: s.title,
        persona: s.persona || "general",
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

export const getSessionMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await ChatSession.findOne({ _id: id, userId: req.user._id });
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    const messages = await ChatMessage.find({ sessionId: id }).sort({ createdAt: 1 }).limit(100);
    return res.status(200).json({
      success: true,
      data: messages.map((m) => ({
        id: m._id.toString(),
        role: m.role,
        text: m.text,
        attachment: m.attachment || null,
        createdAt: m.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await ChatSession.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    await ChatMessage.deleteMany({ sessionId: id });
    return res.status(200).json({ success: true, message: "Session deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const renameSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, persona } = req.body;
    const updates = { updatedAt: new Date() };
    if (title && typeof title === "string" && title.trim()) updates.title = title.trim();
    if (persona && VALID_PERSONAS.includes(persona)) updates.persona = persona;
    const session = await ChatSession.findOneAndUpdate({ _id: id, userId: req.user._id }, updates, { new: true });
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    return res.status(200).json({
      success: true,
      data: {
        id: session._id.toString(),
        title: session.title,
        persona: session.persona || "general",
        updatedAt: session.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

export default { createSession, getSessions, getSessionMessages, deleteSession, renameSession };
