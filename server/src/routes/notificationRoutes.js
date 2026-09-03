import { Router } from "express";
import {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAll
} from "../controllers/notificationController.js";
import { verifyToken } from "../middleware/auth.js";

const router = Router();

router.use(verifyToken);

router.get("/", getNotifications);
router.post("/", createNotification);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);
router.delete("/", clearAll);

export default router;
