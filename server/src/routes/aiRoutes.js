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
  editMessage
} from "../controllers/aiController.js";
import { verifyToken } from "../middleware/auth.js";

const router = Router();

router.use(verifyToken);

router.post("/verify", verifyApiKey);
router.post("/sessions", createSession);
router.get("/sessions", getSessions);
router.get("/sessions/:id/messages", getSessionMessages);
router.delete("/sessions/:id", deleteSession);
router.patch("/sessions/:id", renameSession);
router.post("/sessions/:id/stream", streamChat);
router.post("/sessions/:id/regenerate", regenerateSession);
router.put("/messages/:messageId", editMessage);

export default router;
