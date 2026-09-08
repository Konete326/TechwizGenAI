import { Router } from "express";
import {
  createSession,
  getSessions,
  getSessionMessages,
  deleteSession,
  renameSession
} from "../controllers/sessionController.js";
import {
  streamChat,
  verifyApiKey,
  regenerateSession,
  deleteMessageBranch
} from "../controllers/aiController.js";
import { verifyToken } from "../middleware/auth.js";

import nvidiaImageService from "../services/nvidiaImageService.js";

const router = Router();

router.post("/generate-image", async (req, res, next) => {
  try {
    const prompt = req.body?.prompt || req.query?.prompt || "";
    const result = await nvidiaImageService.generate(prompt);
    return res.status(200).json({
      success: true,
      imageUrl: result.url || result.imageUrl,
      model: result.model
    });
  } catch (err) {
    return next(err);
  }
});

router.use(verifyToken);

router.post("/verify", verifyApiKey);
router.post("/sessions", createSession);
router.get("/sessions", getSessions);
router.get("/sessions/:id/messages", getSessionMessages);
router.delete("/sessions/:id", deleteSession);
router.patch("/sessions/:id", renameSession);
router.post("/sessions/:id/stream", streamChat);
router.post("/sessions/:id/regenerate", regenerateSession);
router.delete("/messages/:messageId", deleteMessageBranch);

export default router;
