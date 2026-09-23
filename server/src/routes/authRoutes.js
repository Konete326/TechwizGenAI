import { Router } from "express";
import { register, login, getMe, updateProfile } from "../controllers/authController.js";
import { setup2FA, verify2FA, disable2FA, validateLogin2FA, forgotPassword, resetPassword } from "../controllers/auth2faController.js";
import { verifyToken } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", verifyToken, getMe);
router.put("/profile", verifyToken, updateProfile);

router.post("/2fa/setup", verifyToken, setup2FA);
router.post("/2fa/verify", verifyToken, verify2FA);
router.post("/2fa/disable", verifyToken, disable2FA);
router.post("/2fa/validate", validateLogin2FA);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
