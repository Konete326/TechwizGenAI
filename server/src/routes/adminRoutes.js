import express from "express";
import { verifyToken, isAdmin } from "../middleware/auth.js";
import { getUsers, updateUserStatus } from "../controllers/adminController.js";

const router = express.Router();

router.use(verifyToken, isAdmin);

router.get("/users", getUsers);
router.patch("/users/:id/status", updateUserStatus);

export default router;
