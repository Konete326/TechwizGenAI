import { useState } from "react";
import { X, ArrowSquareOut, Copy, Check, DownloadSimple, FilePdf, FileDoc, FileXls, FileCsv, FileText, Image } from "@phosphor-icons/react";
import { VITE_SERVER_URL } from "@/config/env";

export function AssetPreviewModal({ asset, onClose }) {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!asset) return null;

  const ext = (asset.format || "").toLowerCase();
  const imageFormats = ["png", "jpg", "jpeg", "webp", "gif", "svg"];
  const isImage = imageFormats.includes(ext) || asset.resourceType === "image";
  const isPdf = ext === "pdf";
  const resolveDocUrl = (rawUrl) => {
    if (!rawUrl) return "";
    if (rawUrl.includes("cloudinary.com") && rawUrl.includes("doc_") && rawUrl.endsWith(".pdf")) {
      const match = rawUrl.match(/(doc_\d+\.pdf)/);
      if (match) return `${VITE_SERVER_URL}/uploads/documents/${match[1]}`;
    }
    return rawUrl;
  };

  const currentUrl = resolveDocUrl(asset.url);
  const isLocal = Boolean(currentUrl?.includes("localhost") || currentUrl?.includes("127.0.0.1"));

  const previewUrl = isPdf
    ? currentUrl
    : (!isLocal && (ext === "docx" || ext === "xlsx" || ext === "xls")
      ? `https://docs.google.com/viewer?url=${encodeURIComponent(currentUrl)}&embedded=true`
      : currentUrl);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      return;
    }
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(currentUrl);
      const blob = await res.blob();
      const u = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), {
        href: u,
        download: asset.title || `asset-${Date.now()}.${ext || "file"}`
      });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(u);
    } catch {
      window.open(currentUrl, "_blank");
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "0 KB";
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(1)} KB`;
  };

  const renderIcon = () => {
    if (ext === "pdf") return <FilePdf size={16} weight="fill" className="text-rose-500" />;
    if (ext === "docx" || ext === "doc") return <FileDoc size={16} weight="fill" className="text-blue-500" />;
    if (ext === "xlsx" || ext === "xls") return <FileXls size={16} weight="fill" className="text-emerald-500" />;
    if (ext === "csv" || ext === "tsv") return <FileCsv size={16} weight="fill" className="text-teal-500" />;
    if (isImage) return <Image size={16} weight="fill" className="text-accent" />;
    return <FileText size={16} weight="fill" className="text-indigo-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/85 backdrop-blur flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-surface-card border border-border rounded-[var(--radius-md)] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface/50">
          <div className="flex items-center gap-2 overflow-hidden pr-2">
            <span className="p-1 rounded bg-surface border border-border shrink-0">{renderIcon()}</span>
            <span className="text-xs font-mono font-semibold text-accent uppercase">[{asset.format}]</span>
            <h3 className="text-xs font-semibold text-text-primary truncate">{asset.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto flex items-center justify-center bg-black/20 min-h-[300px]">
          {isImage && !imgError ? (
            <img
              src={asset.url}
              alt={asset.title}
              onError={() => setImgError(true)}
              className="max-h-[55vh] max-w-full object-contain rounded-[var(--radius-sm)] border border-border/40 shadow-lg"
            />
          ) : !isPdf && isLocal && (ext === "docx" || ext === "xlsx" || ext === "xls") ? (
            <div className="w-full h-[55vh] flex flex-col items-center justify-center p-6 text-center bg-surface-card rounded-[var(--radius-sm)] border border-border/40 space-y-3">
              <span className="p-4 rounded-2xl bg-surface border border-border">{renderIcon()}</span>
              <div className="space-y-1 max-w-sm">
                <h4 className="text-sm font-semibold text-text-primary">Binary File Ready</h4>
                <p className="text-xs text-text-muted">{asset.title} is compiled and ready for download.</p>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <DownloadSimple size={15} weight="bold" />
                <span>Download Document</span>
              </button>
            </div>
          ) : (
            <div className="w-full h-[55vh] flex flex-col rounded-[var(--radius-sm)] overflow-hidden border border-border/40 shadow-lg bg-white">
              <iframe
                src={previewUrl}
                title={asset.title}
                className="w-full h-full border-0 bg-white"
              />
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border bg-surface/40 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] font-mono">
            <div className="p-2 rounded bg-surface border border-border">
              <span className="text-text-muted block text-[10px]">File Size</span>
              <span className="text-text-primary font-medium">{formatSize(asset.bytes)}</span>
            </div>
            <div className="p-2 rounded bg-surface border border-border">
              <span className="text-text-muted block text-[10px]">Format</span>
              <span className="text-text-primary font-medium uppercase">{asset.format}</span>
            </div>
            <div className="p-2 rounded bg-surface border border-border col-span-2 sm:col-span-1">
              <span className="text-text-muted block text-[10px]">Uploaded</span>
              <span className="text-text-primary font-medium">{new Date(asset.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-surface hover:bg-surface-elevated text-xs font-medium text-text-muted hover:text-text-primary border border-border transition-colors btn-tactile cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>{copied ? "Link Copied" : "Copy Direct URL"}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-surface hover:bg-surface-elevated text-xs font-medium text-text-muted hover:text-text-primary border border-border transition-colors btn-tactile cursor-pointer"
              title="Download file"
            >
              <DownloadSimple size={14} weight="bold" />
              <span>Download</span>
            </button>

            <a
              href={asset.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm transition-colors btn-tactile"
            >
              <ArrowSquareOut size={14} weight="bold" />
              <span>Open in New Tab</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AssetPreviewModal;
