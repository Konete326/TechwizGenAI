import { getAllUsersWithMetrics, toggleUserStatus } from "../services/adminUserService.js";

export const getUsers = async (req, res, next) => {
  try {
    const users = await getAllUsersWithMetrics();
    return res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

export const toggleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedUser = await toggleUserStatus(id);
    return res.status(200).json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

export default { getUsers, toggleStatus };
