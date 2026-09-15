import { GoogleGenAI } from "@google/genai";
import { Asset } from "../models/Asset.js";
import { env } from "../config/env.js";

const DOC_FORMATS = ["pdf", "doc", "docx", "txt", "csv", "xlsx", "xls", "md", "rtf", "odt"];

const isDocAsset = (asset) => DOC_FORMATS.includes((asset.format || "").toLowerCase());

const fetchDocText = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch document from storage");
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/pdf") || ct.includes("octet-stream")) {
    const buf = await res.arrayBuffer();
    return Buffer.from(buf).toString("base64");
  }
  return await res.text();
};

const buildPrompt = (query, content, title, isBase64) => {
  if (isBase64) {
    return `You are a document analysis engine. The document "${title}" is provided as base64 PDF data below.\nBase64: ${content.slice(0, 12000)}\n\nUser Query: ${query}\n\nRespond with ONLY this JSON (no markdown):\n{"answer":"<direct answer under 40 words>","snippet":"<exact 1-sentence quote from document>","pageRef":"<page or section if identifiable>"}`;
  }
  return `You are a document analysis engine. The document "${title}" contains:\n\n${content.slice(0, 14000)}\n\nUser Query: ${query}\n\nRespond with ONLY this JSON (no markdown):\n{"answer":"<direct answer under 40 words>","snippet":"<exact 1-sentence quote from document>","pageRef":"<page or section if identifiable>"}`;
};

export const queryDocumentContent = async ({ query, assetId, userId, documentTitle }) => {
  let asset = null;

  if (assetId) {
    asset = await Asset.findOne({ _id: assetId, userId });
  } else if (documentTitle) {
    const kw = documentTitle.toLowerCase();
    const candidates = await Asset.find({ userId }).sort({ createdAt: -1 }).limit(40);
    asset = candidates.find((a) => (a.title || "").toLowerCase().includes(kw) && isDocAsset(a)) || null;
  }

  if (!asset) {
    const candidates = await Asset.find({ userId }).sort({ createdAt: -1 }).limit(40);
    asset = candidates.find(isDocAsset) || candidates[0];
  }

  if (!asset) throw new Error("No document assets found for this account");

  const isPdf = (asset.format || "").toLowerCase() === "pdf";
  const rawContent = await fetchDocText(asset.url);

  const prompt = buildPrompt(query, rawContent, asset.title, isPdf);

  const apiKey = (env.GEMINI_BACKEND_KEYS && env.GEMINI_BACKEND_KEYS[0]) || env.GEMINI_API_KEY;
  const client = new GoogleGenAI({ apiKey });
  const models = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-2.0-flash"];
  let parsed = null;

  for (const model of models) {
    try {
      const result = await client.models.generateContent({ model, contents: prompt });
      const text = (typeof result.text === "function" ? result.text() : result.text) || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) { parsed = JSON.parse(jsonMatch[0]); break; }
    } catch (err) {
      const msg = String(err?.message || ""), status = err?.status || 0;
      if (status === 404 || msg.includes("404") || status === 503 || msg.includes("503")) continue;
      throw err;
    }
  }

  if (!parsed) parsed = { answer: "Could not extract a clear answer from the document.", snippet: "", pageRef: "" };

  return {
    answer: parsed.answer || "",
    snippet: parsed.snippet || "",
    pageRef: parsed.pageRef || "",
    sourceTitle: asset.title,
    assetId: asset._id
  };
};

export default { queryDocumentContent };
