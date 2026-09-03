import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
import { getDashboardStats } from "../controllers/dashboardController.js";

const router = Router();

router.get("/stats", verifyToken, getDashboardStats);

export default router;
