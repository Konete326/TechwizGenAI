export function prepareDocumentPayload(fileBase64, mimeType, fileName) {
  if (!fileBase64) return null;
  const rawData = fileBase64.includes(",") ? fileBase64.split(",")[1] : fileBase64;
  const lowerName = (fileName || "").toLowerCase();
  const effectiveMime = (mimeType || "").toLowerCase();

  if (effectiveMime === "application/pdf" || lowerName.endsWith(".pdf")) {
    return { inlineData: { data: rawData, mimeType: "application/pdf" } };
  }

  if (lowerName.endsWith(".csv") || effectiveMime === "text/csv") {
    const decoded = Buffer.from(rawData, "base64").toString("utf-8");
    const lines = decoded.split(/\r?\n/).filter(Boolean);
    const rowCount = lines.length;
    const colCount = lines[0] ? lines[0].split(",").length : 0;
    const header = lines[0] || "";
    const meta = `[METADATA: Rows=${rowCount}, Columns=${colCount}, Header=${header}]`;
    return { text: `[ATTACHED DOCUMENT: ${fileName || "data.csv"} (text/csv)]\n${meta}\n${decoded}\n[END DOCUMENT]` };
  }

  if (effectiveMime.startsWith("text/") || lowerName.endsWith(".txt") || lowerName.endsWith(".json")) {
    const decoded = Buffer.from(rawData, "base64").toString("utf-8");
    return { text: `[ATTACHED DOCUMENT: ${fileName || "document.txt"} (${effectiveMime || "text/plain"})]\n${decoded}\n[END DOCUMENT]` };
  }

  if (effectiveMime.includes("wordprocessingml") || lowerName.endsWith(".docx") || lowerName.endsWith(".doc")) {
    let decoded = "";
    try {
      const buf = Buffer.from(rawData, "base64");
      decoded = buf.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
    } catch {}
    const textContent = decoded.length > 50 ? decoded.slice(0, 12000) : `[Binary DOCX document: ${fileName || "document.docx"}]`;
    return { text: `[ATTACHED DOCUMENT: ${fileName || "document.docx"} (${effectiveMime || "application/docx"})]\n${textContent}\n[END DOCUMENT]` };
  }

  return { text: `[ATTACHED DOCUMENT: ${fileName || "attachment"} (${effectiveMime || "application/octet-stream"})]\n[END DOCUMENT]` };
}

export function buildUserParts(cleanPrompt, { imageBase64, attachmentType, attachmentName, attachmentData, documents, attachments } = {}) {
  const parts = [];
  const docList = Array.isArray(documents) ? documents : (Array.isArray(attachments) ? attachments : []);

  if (docList.length > 0) {
    for (const doc of docList) {
      const base64 = doc.data || doc.fileBase64 || doc.base64;
      const mime = doc.mimeType || doc.type || "application/octet-stream";
      const name = doc.fileName || doc.name || "document";
      const payload = prepareDocumentPayload(base64, mime, name);
      if (payload) parts.push(payload);
    }
  } else if (attachmentType === "document" && attachmentData) {
    let mime = "application/pdf";
    if (attachmentData.includes(";base64,")) {
      const match = attachmentData.match(/data:([^;]+);base64/);
      if (match) mime = match[1];
    } else if (attachmentName?.endsWith(".txt")) {
      mime = "text/plain";
    } else if (attachmentName?.endsWith(".csv")) {
      mime = "text/csv";
    }
    const docPayload = prepareDocumentPayload(attachmentData, mime, attachmentName);
    if (docPayload) parts.push(docPayload);
  }

  if (imageBase64 && typeof imageBase64 === "string" && imageBase64.includes(",")) {
    const [meta, raw] = imageBase64.split(",");
    const match = meta.match(/data:([^;]+);base64/);
    parts.push({ inlineData: { data: raw, mimeType: match ? match[1] : "image/jpeg" } });
  }

  parts.push({ text: cleanPrompt || "Analyze the attached content in detail." });
  return parts;
}

export default { prepareDocumentPayload, buildUserParts };
