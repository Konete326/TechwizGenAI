import { cloudinary } from "../config/cloudinary.js";

export const uploadBufferToCloudinary = (buffer, folder = "techwiz_genai") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format || "webp",
            bytes: result.bytes || buffer.length
          });
        }
      }
    );

    uploadStream.end(buffer);
  });
};

export default uploadBufferToCloudinary;
