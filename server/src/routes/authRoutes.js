import { Router } from "express";
import { register, login, getMe, updateProfile } from "../controllers/authController.js";
import { verifyToken } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", verifyToken, getMe);
router.put("/profile", verifyToken, updateProfile);

export default router;
