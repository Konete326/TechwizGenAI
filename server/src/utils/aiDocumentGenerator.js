import fs from "fs";
import path from "path";
import { cloudinary } from "../config/cloudinary.js";
import { Asset } from "../models/Asset.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { env } from "../config/env.js";
import { generateDocumentBuffer } from "./documentBuilders.js";

export async function generateDocument(extension, rawContent, userId) {
  const ext = (extension || "txt").toLowerCase().trim();
  const buffer = await generateDocumentBuffer(ext, rawContent);

  const uploadDir = path.join(process.cwd(), "uploads", "documents");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const filename = `doc_${Date.now()}.${ext}`;
  const localFilePath = path.join(uploadDir, filename);
  fs.writeFileSync(localFilePath, buffer);

  const serverBase = env.SERVER_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${env.PORT || 5000}`);
  const localUrl = `${serverBase}/uploads/documents/${filename}`;
  let finalUrl = localUrl;

  try {
    const isRaw = ext === "pdf" || ext === "docx" || ext === "xlsx" || ext === "xls";
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "techwiz_docs",
          resource_type: isRaw ? "raw" : "auto",
          public_id: filename
        },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(buffer);
    }).catch(() => null);

    if (uploadResult?.secure_url) {
      finalUrl = uploadResult.secure_url;
    }

    await Asset.create({
      userId,
      title: `Generated Document (${ext.toUpperCase()})`,
      url: finalUrl,
      publicId: uploadResult?.public_id || filename,
      format: ext,
      bytes: uploadResult?.bytes || buffer.length
    }).catch(() => {});
  } catch {
    await Asset.create({
      userId,
      title: `Generated Document (${ext.toUpperCase()})`,
      url: localUrl,
      publicId: filename,
      format: ext,
      bytes: buffer.length
    }).catch(() => {});
  }

  return finalUrl;
}

export async function processAiDocumentRequest({ docReqBuffer, userId, session, res }) {
  try {
    const match = docReqBuffer.match(/\[DOC_REQ:\s*([a-zA-Z0-9]+)\s*\|\s*([\s\S]+?)\]/);
    const extension = match ? match[1].toLowerCase().trim() : "pdf";
    const rawContent = match ? match[2].trim() : docReqBuffer;

    const documentUrl = await generateDocument(extension, rawContent, userId);
    const artifactTag = `[ARTIFACT: ${extension} | ${documentUrl}]`;

    await ChatMessage.create({ sessionId: session._id, role: "model", text: artifactTag });
    session.updatedAt = new Date();
    await session.save();

    res.write(`data: ${JSON.stringify({ text: artifactTag })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: "DOC_GENERATION_FAILED", message: err.message })}\n\n`);
    res.end();
  }
}

export default generateDocument;
