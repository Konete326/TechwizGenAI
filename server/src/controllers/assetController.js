import { createUploadedAsset, fetchUserAssets, fetchAdminAssets, removeAssetById } from "../services/assetService.js";

export const uploadAsset = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const asset = await createUploadedAsset(req.user, req.file, req.body.title);

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
    const userId = req.user._id || req.user.id;
    const assets = await fetchUserAssets(userId, req.query.q);

    return res.status(200).json({
      success: true,
      data: assets.map((item) => ({
        id: item._id,
        title: item.title,
        url: item.url,
        publicId: item.publicId,
        format: item.format,
        bytes: item.bytes,
        createdAt: item.createdAt,
        ownerName: item.ownerName
      }))
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminAssets = async (req, res, next) => {
  try {
    const assets = await fetchAdminAssets(req.query.q);

    return res.status(200).json({
      success: true,
      data: assets.map((item) => ({
        id: item._id,
        title: item.title,
        url: item.url,
        publicId: item.publicId,
        format: item.format,
        bytes: item.bytes,
        createdAt: item.createdAt,
        ownerName: item.ownerName,
        ownerEmail: item.ownerEmail
      }))
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAsset = async (req, res, next) => {
  try {
    const deletedId = await removeAssetById(req.user, req.params.id);

    return res.status(200).json({
      success: true,
      message: "Asset deleted successfully",
      deletedId
    });
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ success: false, message: error.message });
    next(error);
  }
};

export default { uploadAsset, getAssets, getAdminAssets, deleteAsset };
