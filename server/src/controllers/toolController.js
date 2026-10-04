import PDFDocument from "pdfkit";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUploader.js";
import { Asset } from "../models/Asset.js";

export const executeTool = async (req, res, next) => {
  try {
    const toolName = req.params.toolName || req.body.toolName || req.path.split("/").pop();
    const args = req.body;

    if (toolName === "generateDocument" || toolName === "execute") {
      const { title = "Generated Document", content = "No content provided.", format = "pdf" } = args;

      const doc = new PDFDocument();
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));

      const promise = new Promise((resolve, reject) => {
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);
      });

      doc.fontSize(22).font("Helvetica-Bold").text(title, { align: "center" });
      doc.moveDown();
      doc.fontSize(12).font("Helvetica").text(content);
      doc.end();

      const buffer = await promise;
      const uploaded = await uploadBufferToCloudinary(buffer);

      const asset = await Asset.create({
        userId: req.user._id,
        title,
        url: uploaded.url,
        publicId: uploaded.publicId,
        format: "pdf",
        bytes: uploaded.bytes || buffer.length
      });

      return res.status(200).json({
        success: true,
        assetUrl: asset.url,
        assetId: asset._id,
        message: `Document successfully created and saved.`
      });
    }

    return res.status(400).json({ success: false, error: `Tool ${toolName} not supported.` });
  } catch (error) {
    return next(error);
  }
};
