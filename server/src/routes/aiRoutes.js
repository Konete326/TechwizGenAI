import { Router } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { Asset } from "../models/Asset.js";
import { cloudinary } from "../config/cloudinary.js";
import nvidiaImageService from "../services/nvidiaImageService.js";
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

const router = Router();

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(authHeader.split(" ")[1], env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
    } catch {}
  }
  next();
};

router.post("/generate-image", optionalAuth, async (req, res, next) => {
  try {
    const prompt = req.body?.prompt || req.query?.prompt || "";
    const result = await nvidiaImageService.generate(prompt);
    let finalUrl = result.url || result.imageUrl;

    if (finalUrl && finalUrl.startsWith("data:image/")) {
      try {
        const uploadRes = await cloudinary.uploader.upload(finalUrl, {
          folder: "generated_assets",
          resource_type: "image"
        });
        if (uploadRes?.secure_url) {
          finalUrl = uploadRes.secure_url;
          if (req.user?._id) {
            await Asset.create({
              userId: req.user._id,
              title: prompt.slice(0, 100).trim() || "Generated Image",
              url: finalUrl,
              publicId: uploadRes.public_id,
              format: uploadRes.format || "jpg",
              bytes: uploadRes.bytes || 0
            }).catch(() => {});
          }
        }
      } catch {}
    }

    return res.status(200).json({
      success: true,
      imageUrl: finalUrl,
      model: result.model || "flux.2-klein-4b"
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
