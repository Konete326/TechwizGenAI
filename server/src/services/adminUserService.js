import { User } from "../models/User.js";
import { ChatSession } from "../models/ChatSession.js";
import { Asset } from "../models/Asset.js";

export const getAllUsersWithMetrics = async () => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  const metrics = await Promise.all(
    users.map(async (user) => {
      const [sessionCount, assetCount] = await Promise.all([
        ChatSession.countDocuments({ userId: user._id }),
        Asset.countDocuments({ userId: user._id })
      ]);
      return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status || "active",
        totalTokensUsed: user.totalTokensUsed || 0,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        profileImage: user.profileImage || "",
        sessionCount,
        assetCount
      };
    })
  );
  return metrics;
};

export const toggleUserStatus = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  if (user.role === "admin" && user.status === "active") {
    const error = new Error("Admin accounts cannot be suspended");
    error.statusCode = 400;
    throw error;
  }
  const nextStatus = user.status === "suspended" ? "active" : "suspended";
  user.status = nextStatus;
  await user.save();
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    totalTokensUsed: user.totalTokensUsed || 0
  };
};

export default { getAllUsersWithMetrics, toggleUserStatus };
