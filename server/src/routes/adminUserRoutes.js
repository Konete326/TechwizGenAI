import express from "express";
import { verifyToken, isAdmin } from "../middleware/auth.js";
import { getUsers, toggleStatus } from "../controllers/adminUserController.js";
import { getAdminAssets } from "../controllers/assetController.js";

const router = express.Router();

router.use(verifyToken, isAdmin);

router.get("/users", getUsers);
router.patch("/users/:id/status", toggleStatus);
router.get("/assets", getAdminAssets);

export default router;
