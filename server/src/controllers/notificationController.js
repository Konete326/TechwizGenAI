import { Notification } from "../models/Notification.js";

export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const formatted = notifications.map((n) => ({
      id: n._id.toString(),
      title: n.title,
      message: n.message,
      type: n.type,
      href: n.href,
      link: n.href,
      isRead: n.isRead,
      readStatus: n.isRead,
      createdAt: n.createdAt
    }));

    return res.status(200).json({
      success: true,
      data: formatted
    });
  } catch (error) {
    next(error);
  }
};

export const createNotification = async (req, res, next) => {
  try {
    const { title, message, type = "info", href = "" } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required"
      });
    }

    const newNotif = await Notification.create({
      userId: req.user._id,
      title: title.trim(),
      message: message.trim(),
      type: ["success", "error", "info"].includes(type) ? type : "info",
      href: href || ""
    });

    return res.status(201).json({
      success: true,
      data: {
        id: newNotif._id.toString(),
        title: newNotif.title,
        message: newNotif.message,
        type: newNotif.type,
        href: newNotif.href,
        link: newNotif.href,
        isRead: newNotif.isRead,
        readStatus: newNotif.isRead,
        createdAt: newNotif.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notif = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notif) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: {
        id: notif._id.toString(),
        isRead: notif.isRead,
        readStatus: notif.isRead
      }
    });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read"
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    const removed = await Notification.findOneAndDelete({
      _id: id,
      userId: req.user._id
    });

    if (!removed) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification removed successfully",
      id
    });
  } catch (error) {
    next(error);
  }
};

export const clearAll = async (req, res, next) => {
  try {
    await Notification.deleteMany({ userId: req.user._id });

    return res.status(200).json({
      success: true,
      message: "Notification history cleared successfully"
    });
  } catch (error) {
    next(error);
  }
};
