import { Asset } from "../models/Asset.js";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUploader.js";
import { cloudinary } from "../config/cloudinary.js";
import { sanitizeText } from "../utils/validators.js";

const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const uploadAsset = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const rawTitle = req.body.title || req.file.originalname || "Untitled Asset";
    const cleanTitle = sanitizeText(rawTitle).slice(0, 100);

    const uploaded = await uploadBufferToCloudinary(req.file.buffer);

    const asset = await Asset.create({
      userId: req.user._id,
      title: cleanTitle || "Untitled Asset",
      url: uploaded.url,
      publicId: uploaded.publicId,
      format: uploaded.format,
      bytes: uploaded.bytes
    });

    return res.status(201).json({
      success: true,
      data: {
        id: asset._id,
        title: asset.title,
        url: asset.url,
        publicId: asset.publicId,
        format: asset.format,
        bytes: asset.bytes,
        createdAt: asset.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAssets = async (req, res, next) => {
  try {
    if (req.user?.profileImage) {
      const existingAvatar = await Asset.findOne({ userId: req.user._id, publicId: `avatar_${req.user._id}` });
      if (!existingAvatar) {
        await Asset.create({
          userId: req.user._id,
          title: `${req.user.name || "Admin"} Profile Picture`,
          url: req.user.profileImage,
          publicId: `avatar_${req.user._id}`,
          format: "png",
          bytes: 42800
        }).catch(() => {});
      }
    }

    const filter = { userId: req.user._id };
    const query = req.query.q;

    if (query && typeof query === "string" && query.trim()) {
      const sanitizedQuery = escapeRegex(query.trim());
      filter.title = { $regex: sanitizedQuery, $options: "i" };
    }

    const assets = await Asset.find(filter).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      data: assets.map((item) => ({
        id: item._id,
        title: item.title,
        url: item.url,
        publicId: item.publicId,
        format: item.format,
        bytes: item.bytes,
        createdAt: item.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAsset = async (req, res, next) => {
  try {
    const assetId = req.params.id;
    const asset = await Asset.findOne({ _id: assetId, userId: req.user._id });

    if (!asset) {
      return res.status(404).json({ success: false, message: "Asset not found" });
    }

    if (asset.publicId) {
      await cloudinary.uploader.destroy(asset.publicId).catch(() => {});
    }

    await Asset.deleteOne({ _id: assetId });

    if (asset.publicId === `avatar_${req.user._id}`) {
      await User.findByIdAndUpdate(req.user._id, { profileImage: "" }).catch(() => {});
    }

    await Notification.create({
      userId: req.user._id,
      title: "Asset Deleted",
      message: "Asset successfully removed from Cloudinary.",
      type: "success",
      href: "/assets"
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: "Asset deleted successfully",
      deletedId: assetId
    });
  } catch (error) {
    next(error);
  }
};
