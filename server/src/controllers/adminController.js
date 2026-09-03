import { User } from "../models/User.js";
import { ChatSession } from "../models/ChatSession.js";
import { Asset } from "../models/Asset.js";

export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    const userStats = await Promise.all(
      users.map(async (user) => {
        const [genCount, assetCount] = await Promise.all([
          ChatSession.countDocuments({ userId: user._id }),
          Asset.countDocuments({ userId: user._id })
        ]);

        return {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status || "active",
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          profileImage: user.profileImage || "",
          generationCount: genCount,
          assetCount: assetCount
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: userStats
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'active' or 'suspended'"
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.role === "admin" && status === "suspended") {
      return res.status(400).json({
        success: false,
        message: "Cannot suspend administrator accounts"
      });
    }

    user.status = status;
    await user.save({ validateModifiedOnly: true });

    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    next(error);
  }
};

export default { getUsers, updateUserStatus };
