import { Router } from "express";
import { generateEphemeralToken } from "../controllers/liveController.js";
import { verifyToken } from "../middleware/auth.js";
import { ClientApp } from "../models/ClientApp.js";

const router = Router();

router.post("/token", verifyToken, generateEphemeralToken);

router.post("/widget-token", async (req, res, next) => {
  const { clientId } = req.body;
  if (!clientId) return res.status(400).json({ success: false, message: "Missing clientId" });
  
  try {
    const app = await ClientApp.findOne({ clientId });
    if (!app) return res.status(401).json({ success: false, message: "Invalid clientId" });
    
    await generateEphemeralToken(req, res, next);
  } catch (err) {
    next(err);
  }
});

export default router;
