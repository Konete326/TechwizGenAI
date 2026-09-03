import {
  getUserNotifications,
  addUserNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  removeNotification,
  clearAllNotifications
} from "../services/notificationService.js";

export const getNotifications = async (req, res, next) => {
  try {
    const data = await getUserNotifications(req.user);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const createNotification = async (req, res, next) => {
  try {
    const { title, message, type = "info", href = "", targetRole = "user" } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: "Title and message are required" });
    }
    const resolvedTarget = req.user.role === "admin" ? targetRole : "user";
    const data = await addUserNotification({
      userId: req.user._id,
      title,
      message,
      type,
      href,
      targetRole: resolvedTarget
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const data = await markNotificationAsRead(req.user, req.params.id);
    return res.status(200).json({ success: true, message: "Notification marked as read", data });
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ success: false, message: error.message });
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    await markAllNotificationsAsRead(req.user);
    return res.status(200).json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const id = await removeNotification(req.user, req.params.id);
    return res.status(200).json({ success: true, message: "Notification removed successfully", id });
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ success: false, message: error.message });
    next(error);
  }
};

export const clearAll = async (req, res, next) => {
  try {
    await clearAllNotifications(req.user);
    return res.status(200).json({ success: true, message: "Notification history cleared successfully" });
  } catch (error) {
    next(error);
  }
};

export default {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAll
};
