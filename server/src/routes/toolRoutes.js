import { Router } from "express";
import { executeTool } from "../controllers/toolController.js";
import { verifyToken } from "../middleware/auth.js";

const router = Router();

router.use(verifyToken);
router.post("/execute", executeTool);
router.post("/:toolName", executeTool);

export default router;
