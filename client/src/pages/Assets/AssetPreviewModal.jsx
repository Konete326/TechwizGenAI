import { X, ArrowSquareOut, Copy, Check } from "@phosphor-icons/react";
import { useState } from "react";

export function AssetPreviewModal({ asset, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!asset) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(asset.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      return;
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "0 KB";
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(1)} KB`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/85 backdrop-blur flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-surface-card border border-border rounded-[var(--radius-md)] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface/50">
          <div className="flex items-center gap-2 overflow-hidden pr-2">
            <span className="text-xs font-mono font-semibold text-accent uppercase">[{asset.format}]</span>
            <h3 className="text-xs font-semibold text-text-primary truncate">{asset.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto flex items-center justify-center bg-black/20">
          <img
            src={asset.url}
            alt={asset.title}
            className="max-h-[55vh] max-w-full object-contain rounded-[var(--radius-sm)] border border-border/40 shadow-lg"
          />
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

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-surface hover:bg-surface-elevated text-xs font-medium text-text-muted hover:text-text-primary border border-border transition-colors btn-tactile"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>{copied ? "Link Copied" : "Copy Direct URL"}</span>
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
