import XLSX from "xlsx";
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from "docx";
import PDFDocument from "pdfkit";

export function buildPdfDocument(title, content) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.rect(40, 40, doc.page.width - 80, 4).fill("#4f46e5");
    const mainTitle = (title || "Executive Document").trim();
    doc.fillColor("#0f172a").fontSize(18).font("Helvetica-Bold").text(mainTitle, 40, 52, { width: doc.page.width - 160 });
    const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    doc.fillColor("#64748b").fontSize(9).font("Helvetica").text(dateStr, doc.page.width - 150, 56, { align: "right", width: 110 });
    doc.moveTo(40, 80).lineTo(doc.page.width - 40, 80).strokeColor("#e2e8f0").lineWidth(1).stroke();
    doc.y = 95;

    const lines = (content || "").split("\n");
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) {
        doc.moveDown(0.3);
        continue;
      }
      if (line.startsWith("# ")) {
        doc.moveDown(0.5).fillColor("#0f172a").fontSize(14).font("Helvetica-Bold").text(line.slice(2));
      } else if (line.startsWith("## ")) {
        doc.moveDown(0.4).fillColor("#4f46e5").fontSize(11).font("Helvetica-Bold").text(line.slice(3));
      } else if (line.startsWith("### ")) {
        doc.moveDown(0.3).fillColor("#334155").fontSize(10).font("Helvetica-Bold").text(line.slice(4));
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        doc.fillColor("#334155").fontSize(9).font("Helvetica").text(`*  ${line.slice(2).replace(/\*\*/g, "")}`, { indent: 10, lineGap: 2 });
      } else {
        doc.fillColor("#334155").fontSize(9).font("Helvetica").text(line.replace(/\*\*/g, ""), { lineGap: 2 });
      }
    }

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.moveTo(40, doc.page.height - 35).lineTo(doc.page.width - 40, doc.page.height - 35).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
      doc.fillColor("#94a3b8").fontSize(8).font("Helvetica").text("Techwiz GenAI - Confidential", 40, doc.page.height - 26);
      doc.text(`Page ${i + 1} of ${range.count}`, doc.page.width - 120, doc.page.height - 26, { align: "right", width: 80 });
    }

    doc.end();
  });
}

export async function generateDocumentBuffer(extension, rawContent) {
  const ext = (extension || "txt").toLowerCase().trim();
  const content = (rawContent || "").trim();

  if (ext === "csv") return Buffer.from(content, "utf-8");

  if (ext === "xlsx") {
    const rows = content.split("\n").map((line) => line.split(",").map((c) => c.trim()));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  }

  if (ext === "docx") {
    const lines = content.split("\n");
    const paragraphs = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("# ")) {
        return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: trimmed.slice(2), bold: true, size: 30, color: "0F172A" })] });
      }
      if (trimmed.startsWith("## ")) {
        return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: trimmed.slice(3), bold: true, size: 24, color: "4F46E5" })] });
      }
      if (trimmed.startsWith("### ")) {
        return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: trimmed.slice(4), bold: true, size: 20, color: "334155" })] });
      }
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        return new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: trimmed.slice(2), size: 20, color: "334155" })] });
      }
      return new Paragraph({ children: [new TextRun({ text: line, size: 20, color: "334155" })] });
    });
    const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });
    return await Packer.toBuffer(doc);
  }

  if (ext === "pdf") {
    const firstLine = content.split("\n")[0] || "";
    const title = firstLine.startsWith("# ") ? firstLine.slice(2).trim() : "Executive Document";
    return await buildPdfDocument(title, content);
  }

  return Buffer.from(content, "utf-8");
}

export default { buildPdfDocument, generateDocumentBuffer };
