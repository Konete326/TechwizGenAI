import { getUserMetrics, getAdminPlatformMetrics } from "../services/analyticsService.js";
import { User } from "../models/User.js";

export const getMyAnalytics = async (req, res, next) => {
  try {
    const data = await getUserMetrics(req.user._id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getAdminAnalytics = async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (userId && userId !== "all") {
      const data = await getUserMetrics(userId);
      return res.status(200).json({ success: true, scope: "user", data });
    }
    const data = await getAdminPlatformMetrics();
    res.status(200).json({ success: true, scope: "platform", data });
  } catch (err) {
    next(err);
  }
};

export const getAdminUserList = async (req, res, next) => {
  try {
    const users = await User.find({ status: "active" })
      .sort({ totalTokensUsed: -1 })
      .select("_id name email totalTokensUsed role");
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

export default { getMyAnalytics, getAdminAnalytics, getAdminUserList };
