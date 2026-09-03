import { User } from "../models/User.js";
import { Asset } from "../models/Asset.js";
import { Notification } from "../models/Notification.js";
import { sanitizeText } from "../utils/validators.js";

export const updateUserProfile = async (userId, { name, profileImage }) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (name && typeof name === "string") {
    user.name = sanitizeText(name);
  }

  if (profileImage !== undefined && typeof profileImage === "string") {
    user.profileImage = profileImage;
    if (profileImage.trim()) {
      await Asset.findOneAndUpdate(
        { userId: user._id, publicId: `avatar_${user._id}` },
        {
          userId: user._id,
          title: `${user.name} Profile Picture`,
          url: profileImage,
          publicId: `avatar_${user._id}`,
          format: "png",
          bytes: Math.round(profileImage.length * 0.75),
          createdAt: new Date()
        },
        { upsert: true, new: true }
      ).catch(() => {});
    } else {
      await Asset.deleteOne({ userId: user._id, publicId: `avatar_${user._id}` }).catch(() => {});
    }
  }

  await user.save({ validateModifiedOnly: true });

  await Notification.create({
    userId: user._id,
    title: "Profile Updated",
    message: "User account details updated successfully.",
    type: "info",
    href: "/profile"
  }).catch(() => {});

  return user;
};

export default { updateUserProfile };
