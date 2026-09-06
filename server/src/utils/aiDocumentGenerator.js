import { Asset } from "../models/Asset.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { generateDocumentBuffer } from "./documentBuilders.js";

const MIME_TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv",
  txt: "text/plain"
};

export async function generateDocument(extension, rawContent, userId) {
  const ext = (extension || "txt").toLowerCase().trim();
  const buffer = await generateDocumentBuffer(ext, rawContent);
  const filename = `doc_${Date.now()}.${ext}`;
  const mimeType = MIME_TYPES[ext] || "application/octet-stream";
  const finalUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

  if (userId) {
    await Asset.create({
      userId,
      title: `Generated Document (${ext.toUpperCase()})`,
      url: finalUrl,
      publicId: filename,
      format: ext,
      bytes: buffer.length
    }).catch(() => {});
  }

  return { url: finalUrl, filename, mimeType, size: buffer.length };
}

export async function processAiDocumentRequest({ docReqBuffer, userId, session, res }) {
  try {
    const match = docReqBuffer.match(/\[DOC_REQ:\s*([a-zA-Z0-9]+)\s*\|\s*([\s\S]+?)\]/);
    const extension = match ? match[1].toLowerCase().trim() : "pdf";
    const raw = match ? match[2] : docReqBuffer;
    const cleanContent = raw.replace(/^\[DOC_REQ:[^|]*\|\s*/i, "").replace(/\]\s*$/, "").trim();

    const docResult = await generateDocument(extension, cleanContent, userId);
    const docUrl = docResult?.url || docResult;
    const artifactTag = `[ARTIFACT: ${extension} | ${docUrl}]`;

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
