export function prepareDocumentPayload(fileBase64, mimeType, fileName) {
  if (!fileBase64) return null;
  const rawData = fileBase64.includes(",") ? fileBase64.split(",")[1] : fileBase64;
  const lowerName = (fileName || "").toLowerCase();
  const effectiveMime = (mimeType || "").toLowerCase();

  if (effectiveMime === "application/pdf" || lowerName.endsWith(".pdf")) {
    return { inlineData: { data: rawData, mimeType: "application/pdf" } };
  }

  if (effectiveMime.startsWith("text/") || lowerName.endsWith(".txt") || lowerName.endsWith(".csv") || lowerName.endsWith(".json")) {
    const decoded = Buffer.from(rawData, "base64").toString("utf-8");
    return { text: `[ATTACHED DOCUMENT: ${fileName || "document.txt"}]\n${decoded}\n[END DOCUMENT]` };
  }

  if (effectiveMime.includes("wordprocessingml") || lowerName.endsWith(".docx") || lowerName.endsWith(".doc")) {
    let decoded = "";
    try {
      const buf = Buffer.from(rawData, "base64");
      decoded = buf.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
    } catch {}
    const textContent = decoded.length > 50 ? decoded.slice(0, 8000) : `[Binary DOCX document: ${fileName || "document.docx"}]`;
    return { text: `[ATTACHED DOCUMENT: ${fileName || "document.docx"}]\n${textContent}\n[END DOCUMENT]` };
  }

  return { text: `[ATTACHED DOCUMENT: ${fileName || "attachment"}]\n[END DOCUMENT]` };
}

export function buildUserParts(cleanPrompt, { imageBase64, attachmentType, attachmentName, attachmentData } = {}) {
  const parts = [];

  if (attachmentType === "document" && attachmentData) {
    let mime = "application/pdf";
    if (attachmentData.includes(";base64,")) {
      const match = attachmentData.match(/data:([^;]+);base64/);
      if (match) mime = match[1];
    } else if (attachmentName?.endsWith(".txt")) {
      mime = "text/plain";
    }
    const docPayload = prepareDocumentPayload(attachmentData, mime, attachmentName);
    if (docPayload) parts.push(docPayload);
  } else if (imageBase64 && typeof imageBase64 === "string" && imageBase64.includes(",")) {
    const [meta, raw] = imageBase64.split(",");
    const match = meta.match(/data:([^;]+);base64/);
    parts.push({ inlineData: { data: raw, mimeType: match ? match[1] : "image/jpeg" } });
  }

  parts.push({ text: cleanPrompt || "Analyze the attached content in detail." });
  return parts;
}

export default { prepareDocumentPayload, buildUserParts };
