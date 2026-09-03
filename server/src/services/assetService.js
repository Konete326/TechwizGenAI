import { Asset } from "../models/Asset.js";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUploader.js";
import { cloudinary } from "../config/cloudinary.js";
import { sanitizeText } from "../utils/validators.js";

const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const createUploadedAsset = async (user, file, title) => {
  const rawTitle = title || file.originalname || "Untitled Asset";
  const cleanTitle = sanitizeText(rawTitle).slice(0, 100);
  const uploaded = await uploadBufferToCloudinary(file.buffer);

  return await Asset.create({
    userId: user._id,
    title: cleanTitle || "Untitled Asset",
    url: uploaded.url,
    publicId: uploaded.publicId,
    format: (uploaded.format && uploaded.format !== "bin") ? uploaded.format : (file.originalname ? file.originalname.split(".").pop().toLowerCase() : "bin"),
    bytes: uploaded.bytes
  });
};

export const fetchUserAssets = async (user, query) => {
  const isAdmin = user?.role === "admin";
  if (!isAdmin && user?.profileImage) {
    const existingAvatar = await Asset.findOne({ userId: user._id, publicId: `avatar_${user._id}` });
    if (!existingAvatar) {
      await Asset.create({
        userId: user._id,
        title: `${user.name || "User"} Profile Picture`,
        url: user.profileImage,
        publicId: `avatar_${user._id}`,
        format: "png",
        bytes: 42800
      }).catch(() => {});
    }
  }

  const filter = isAdmin ? {} : { userId: user._id };
  if (query && typeof query === "string" && query.trim()) {
    filter.title = { $regex: escapeRegex(query.trim()), $options: "i" };
  }

  const assets = await Asset.find(filter)
    .populate("userId", "name email role")
    .sort({ createdAt: -1 })
    .lean();

  return assets.map((a) => ({
    ...a,
    ownerName: a.userId?.name || "System",
    ownerEmail: a.userId?.email || ""
  }));
};

export const removeAssetById = async (user, assetId) => {
  const isAdmin = user?.role === "admin";
  const filter = isAdmin ? { _id: assetId } : { _id: assetId, userId: user._id };
  const asset = await Asset.findOne(filter);
  if (!asset) {
    const err = new Error("Asset not found");
    err.statusCode = 404;
    throw err;
  }

  if (asset.publicId) {
    await cloudinary.uploader.destroy(asset.publicId).catch(() => {});
  }

  await Asset.deleteOne({ _id: assetId });

  if (asset.publicId === `avatar_${user._id}`) {
    await User.findByIdAndUpdate(user._id, { profileImage: "" }).catch(() => {});
  }

  await Notification.create({
    userId: user._id,
    title: "Asset Deleted",
    message: "Asset successfully removed from Cloudinary.",
    type: "success",
    href: "/assets"
  }).catch(() => {});

  return assetId;
};

export default { createUploadedAsset, fetchUserAssets, removeAssetById };
