import nvidiaImageService from "../services/nvidiaImageService.js";
import { cloudinary } from "../config/cloudinary.js";
import { Asset } from "../models/Asset.js";
import { ChatMessage } from "../models/ChatMessage.js";

async function fetchProImageBuffer(cleanDesc) {
  const encoded = encodeURIComponent(cleanDesc);
  const models = ["flux-pro", "flux-realism", "flux"];
  for (const m of models) {
    try {
      const url = `https://image.pollinations.ai/prompt/${encoded}?model=${m}&width=1024&height=1024&enhance=true&nologo=true`;
      const res = await fetch(url);
      if (res.ok) {
        const ab = await res.arrayBuffer();
        if (ab.byteLength > 1000) return Buffer.from(ab);
      }
    } catch {}
  }
  throw new Error("Pro image generation failed");
}

export async function generateAndSaveAiImage(promptDesc, userId) {
  const cleanDesc = (promptDesc || "").trim() || "Creative AI Artwork";
  let buffer = null;

  try {
    const nimResult = await nvidiaImageService.generate(cleanDesc);
    const rawUrl = nimResult?.url || nimResult?.imageUrl;
    if (rawUrl && rawUrl.startsWith("data:image/")) {
      const base64Data = rawUrl.split(",")[1];
      buffer = Buffer.from(base64Data, "base64");
    } else if (rawUrl && rawUrl.startsWith("http")) {
      const resp = await fetch(rawUrl);
      if (resp.ok) {
        const ab = await resp.arrayBuffer();
        buffer = Buffer.from(ab);
      }
    }
  } catch {}

  if (!buffer) {
    buffer = await fetchProImageBuffer(cleanDesc);
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
  } catch {
    res.write(`data: ${JSON.stringify({ error: "IMAGE_NOT_SUPPORTED" })}\n\n`);
    res.end();
  }
}
