import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMime = /^image\/(jpeg|png|webp)$/i;
  if (allowedMime.test(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
    error.statusCode = 400;
    cb(error, false);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter
});

export default upload;
