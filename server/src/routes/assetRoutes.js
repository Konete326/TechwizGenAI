import { Router } from "express";
import { uploadAsset, getAssets, deleteAsset } from "../controllers/assetController.js";
import { verifyToken } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.post("/", verifyToken, upload.single("file"), uploadAsset);
router.post("/upload", verifyToken, upload.single("file"), uploadAsset);
router.get("/", verifyToken, getAssets);
router.delete("/:id", verifyToken, deleteAsset);

export default router;
