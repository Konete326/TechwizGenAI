import express from "express";
import { verifyToken, isAdmin } from "../middleware/auth.js";
import { getUsers, toggleStatus } from "../controllers/adminUserController.js";

const router = express.Router();

router.use(verifyToken, isAdmin);

router.get("/users", getUsers);
router.patch("/users/:id/status", toggleStatus);

export default router;
