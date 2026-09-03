import { getDashboardTelemetry } from "../services/dashboardDataService.js";

export const getDashboardStats = async (req, res, next) => {
  try {
    const data = await getDashboardTelemetry(req.user);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export default { getDashboardStats };
