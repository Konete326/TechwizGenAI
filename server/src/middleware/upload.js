import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMime = /^(image\/(jpeg|png|webp)|application\/pdf|text\/plain|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/msword)$/i;
  const hasValidExt = /\.(jpe?g|png|webp|pdf|txt|docx|doc)$/i.test(file.originalname || "");
  if (allowedMime.test(file.mimetype) || hasValidExt) {
    cb(null, true);
  } else {
    const error = new Error("Invalid file type. Allowed formats: JPEG, PNG, WebP, PDF, TXT, DOCX.");
    error.statusCode = 400;
    cb(error, false);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter
});

export default upload;
