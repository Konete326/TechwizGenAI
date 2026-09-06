import { ChatMessage } from "../models/ChatMessage.js";

const escapeRegex = (s) => (s ? s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "");

export async function purgeAssetFromChat(assetUrl, assetTitle, isAdmin = false) {
  if (!assetUrl && !assetTitle) return 0;
  const conditions = [];
  if (assetUrl) {
    conditions.push({ attachment: assetUrl });
    conditions.push({ images: assetUrl });
    conditions.push({ "documents.data": assetUrl });
    conditions.push({ text: { $regex: escapeRegex(assetUrl), $options: "i" } });
  }
  if (assetTitle) {
    conditions.push({ attachmentName: assetTitle });
    conditions.push({ "documents.name": assetTitle });
  }

  const messages = await ChatMessage.find({ $or: conditions });
  if (!messages.length) return 0;

  const notice = isAdmin ? "[Attachment was deleted by administrator]" : "[Attachment was deleted]";

  for (const msg of messages) {
    let changed = false;
    if (assetUrl && msg.attachment === assetUrl) {
      msg.attachment = null;
      msg.attachmentType = "none";
      msg.attachmentName = notice;
      msg.attachmentDeleted = true;
      changed = true;
    } else if (assetTitle && msg.attachmentName === assetTitle) {
      msg.attachment = null;
      msg.attachmentType = "none";
      msg.attachmentName = notice;
      msg.attachmentDeleted = true;
      changed = true;
    }

    if (assetUrl && Array.isArray(msg.images) && msg.images.includes(assetUrl)) {
      msg.images = msg.images.filter((i) => i !== assetUrl);
      msg.attachmentDeleted = true;
      changed = true;
    }

    if (Array.isArray(msg.documents)) {
      const beforeLen = msg.documents.length;
      msg.documents = msg.documents.filter((d) => (assetUrl ? d.data !== assetUrl : true) && (assetTitle ? d.name !== assetTitle : true));
      if (msg.documents.length !== beforeLen) {
        msg.attachmentDeleted = true;
        changed = true;
      }
    }

    if (assetUrl && msg.text?.includes(assetUrl)) {
      msg.text = msg.text.replaceAll(assetUrl, notice);
      msg.attachmentDeleted = true;
      changed = true;
    }

    if (msg.attachmentDeleted && !msg.text?.includes("[Attachment was deleted")) {
      msg.text = `${msg.text || ""}\n\n${notice}`.trim();
      changed = true;
    }

    if (changed) await msg.save();
  }

  return messages.length;
}

export default { purgeAssetFromChat };
