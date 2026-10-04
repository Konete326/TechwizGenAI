import { Router } from "express";
import { generateEphemeralToken } from "../controllers/liveController.js";
import { verifyToken } from "../middleware/auth.js";

const router = Router();

router.use(verifyToken);
router.post("/token", generateEphemeralToken);

export default router;
