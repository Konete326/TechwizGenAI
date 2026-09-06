import { Asset } from "../models/Asset.js";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUploader.js";
import { cloudinary } from "../config/cloudinary.js";
import { sanitizeText } from "../utils/validators.js";
import { purgeAssetFromChat } from "./assetChatSyncService.js";

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

export const autoPersistDocumentAsset = async (userId, { name, data, type }) => {
  if (!userId || !data || typeof data !== "string") return null;
  try {
    const raw = data.includes(",") ? data.split(",")[1] : data;
    const buffer = Buffer.from(raw, "base64");
    const uploaded = await uploadBufferToCloudinary(buffer);
    const title = sanitizeText(name || "Uploaded Document").slice(0, 100);
    const ext = (name ? name.split(".").pop().toLowerCase() : uploaded.format) || "bin";
    return await Asset.create({
      userId,
      title: title || "Uploaded Document",
      url: uploaded.url,
      publicId: uploaded.publicId,
      format: ext,
      bytes: uploaded.bytes || buffer.length
    });
  } catch {
    return null;
  }
};

export const fetchUserAssets = async (userId, query) => {
  const filter = { userId };
  if (query && typeof query === "string" && query.trim()) {
    filter.title = { $regex: escapeRegex(query.trim()), $options: "i" };
  }

  const assets = await Asset.find(filter).sort({ createdAt: -1 }).lean();
  return assets.map((a) => ({ ...a, ownerName: "Me" }));
};

export const fetchAdminAssets = async (query) => {
  const filter = {};
  if (query && typeof query === "string" && query.trim()) {
    filter.title = { $regex: escapeRegex(query.trim()), $options: "i" };
  }

  const assets = await Asset.find(filter)
    .populate("userId", "name email role")
    .sort({ createdAt: -1 })
    .lean();

  return assets.map((a) => ({
    ...a,
    ownerName: a.userId?.name || "Unknown User",
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
    await cloudinary.uploader.destroy(asset.publicId, { resource_type: "raw" }).catch(() => {});
  }

  await purgeAssetFromChat(asset.url, asset.title, isAdmin);
  await Asset.deleteOne({ _id: assetId });

  if (asset.publicId === `avatar_${user._id}`) {
    await User.findByIdAndUpdate(user._id, { profileImage: "" }).catch(() => {});
  }

  if (asset.userId && asset.userId.toString() !== user._id.toString()) {
    await Notification.create({
      userId: asset.userId,
      title: "Asset Removed by Admin",
      message: `"${asset.title}" was permanently removed by an administrator.`,
      type: "warning",
      href: "/assets"
    }).catch(() => {});
  }

  await Notification.create({
    userId: user._id,
    title: "Asset Deleted",
    message: `"${asset.title}" was removed from storage and chats.`,
    type: "success",
    href: "/assets"
  }).catch(() => {});

  return assetId;
};

export default { createUploadedAsset, autoPersistDocumentAsset, fetchUserAssets, fetchAdminAssets, removeAssetById };
