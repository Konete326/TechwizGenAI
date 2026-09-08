import nvidiaImageService from "../services/nvidiaImageService.js";
import { cloudinary } from "../config/cloudinary.js";
import { Asset } from "../models/Asset.js";
import { ChatMessage } from "../models/ChatMessage.js";

export async function generateAndSaveAiImage(promptDesc, userId) {
  const cleanDesc = (promptDesc || "").trim() || "Creative AI Artwork";
  const nimResult = await nvidiaImageService.generate(cleanDesc);
  const rawUrl = nimResult?.url || nimResult?.imageUrl;
  if (!rawUrl) {
    throw new Error("NVIDIA NIM returned no image data");
  }

  let buffer = null;
  if (rawUrl.startsWith("data:image/")) {
    const base64Data = rawUrl.split(",")[1];
    buffer = Buffer.from(base64Data, "base64");
  } else if (rawUrl.startsWith("http")) {
    const resp = await fetch(rawUrl);
    if (resp.ok) {
      const ab = await resp.arrayBuffer();
      buffer = Buffer.from(ab);
    }
  }

  if (!buffer) {
    throw new Error("Failed to process generated image buffer");
  }

  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "techwiz_ai_generated" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });

  const secureUrl = uploadResult.secure_url || uploadResult.url;
  await Asset.create({
    userId,
    title: cleanDesc.slice(0, 100),
    url: secureUrl,
    publicId: uploadResult.public_id,
    format: uploadResult.format || "jpg",
    bytes: uploadResult.bytes || buffer.length
  }).catch(() => {});

  return secureUrl;
}

export async function processAiImageRequest({ imageReqBuffer, customProvider, targetModel, cleanPrompt, userId, session, res }) {
  if (customProvider || targetModel === "gemini-1.5-flash-8b") {
    res.write(`data: ${JSON.stringify({ error: "IMAGE_NOT_SUPPORTED" })}\n\n`);
    return res.end();
  }
  try {
    const descMatch = imageReqBuffer.match(/\[IMAGE_REQ:\s*([^\]]+)\]/i);
    const promptDesc = descMatch ? descMatch[1].trim() : cleanPrompt;
    const secureUrl = await generateAndSaveAiImage(promptDesc, userId);
    const markdownResult = `![Generated Image](${secureUrl})`;
    await ChatMessage.create({ sessionId: session._id, role: "model", text: markdownResult });
    session.updatedAt = new Date();
    await session.save();
    res.write(`data: ${JSON.stringify({ text: markdownResult })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err?.message || "IMAGE_GENERATION_FAILED" })}\n\n`);
    res.end();
  }
}

export default { generateAndSaveAiImage, processAiImageRequest };
