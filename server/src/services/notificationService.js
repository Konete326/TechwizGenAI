import { Notification } from "../models/Notification.js";

export const getUserNotifications = async (user, limit = 50) => {
  const isAdmin = user?.role === "admin";
  const filter = isAdmin
    ? {}
    : { userId: user._id, targetRole: { $ne: "admin" } };

  const notifications = await Notification.find(filter)
    .populate("userId", "name email role")
    .sort({ createdAt: -1 })
    .limit(limit);

  return notifications.map((n) => ({
    id: n._id.toString(),
    title: n.title,
    message: n.message,
    type: n.type,
    href: n.href,
    link: n.href,
    targetRole: n.targetRole || "user",
    userName: n.userId?.name || "System",
    userEmail: n.userId?.email || "",
    isRead: n.isRead,
    readStatus: n.isRead,
    createdAt: n.createdAt
  }));
};

export const addUserNotification = async ({ userId, title, message, type = "info", href = "", targetRole = "user" }) => {
  const newNotif = await Notification.create({
    userId,
    title: title.trim(),
    message: message.trim(),
    type: ["success", "error", "info"].includes(type) ? type : "info",
    href: href || "",
    targetRole: ["user", "admin", "all"].includes(targetRole) ? targetRole : "user"
  });

  return {
    id: newNotif._id.toString(),
    title: newNotif.title,
    message: newNotif.message,
    type: newNotif.type,
    href: newNotif.href,
    link: newNotif.href,
    targetRole: newNotif.targetRole,
    isRead: newNotif.isRead,
    readStatus: newNotif.isRead,
    createdAt: newNotif.createdAt
  };
};

export const markNotificationAsRead = async (user, id) => {
  const filter = user?.role === "admin" ? { _id: id } : { _id: id, userId: user._id };
  const notif = await Notification.findOneAndUpdate(filter, { $set: { isRead: true } }, { new: true });
  if (!notif) {
    const err = new Error("Notification not found");
    err.statusCode = 404;
    throw err;
  }
  return { id: notif._id.toString(), isRead: notif.isRead, readStatus: notif.isRead };
};

export const markAllNotificationsAsRead = async (user) => {
  const filter = user?.role === "admin" ? { isRead: false } : { userId: user._id, isRead: false };
  await Notification.updateMany(filter, { $set: { isRead: true } });
};

export const removeNotification = async (user, id) => {
  const filter = user?.role === "admin" ? { _id: id } : { _id: id, userId: user._id };
  const removed = await Notification.findOneAndDelete(filter);
  if (!removed) {
    const err = new Error("Notification not found");
    err.statusCode = 404;
    throw err;
  }
  return id;
};

export const clearAllNotifications = async (user) => {
  const filter = user?.role === "admin" ? {} : { userId: user._id };
  await Notification.deleteMany(filter);
};

export default {
  getUserNotifications,
  addUserNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  removeNotification,
  clearAllNotifications
};
