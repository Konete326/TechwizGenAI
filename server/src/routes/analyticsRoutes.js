import { Router } from "express";
import { verifyToken, isAdmin } from "../middleware/auth.js";
import { getMyAnalytics, getAdminAnalytics, getAdminUserList } from "../controllers/analyticsController.js";

const router = Router();

router.get("/me", verifyToken, getMyAnalytics);
router.get("/admin", verifyToken, isAdmin, getAdminAnalytics);
router.get("/admin/users", verifyToken, isAdmin, getAdminUserList);

export default router;
