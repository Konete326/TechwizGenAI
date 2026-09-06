import express from "express";
import { verifyToken, isAdmin } from "../middleware/auth.js";
import { getUsers, updateUserStatus } from "../controllers/adminController.js";
import { getAdminAssets } from "../controllers/assetController.js";

const router = express.Router();

router.use(verifyToken, isAdmin);

router.get("/users", getUsers);
router.patch("/users/:id/status", updateUserStatus);
router.get("/assets", getAdminAssets);

export default router;
