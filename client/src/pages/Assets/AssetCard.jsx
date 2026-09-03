import { useState } from "react";
import { Copy, Check, Trash, Eye } from "@phosphor-icons/react";

function CornerBracket() {
  return (
    <>
      <span className="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-border-corner pointer-events-none" />
      <span className="absolute top-1 right-1 w-1.5 h-1.5 border-t border-r border-border-corner pointer-events-none" />
      <span className="absolute bottom-1 left-1 w-1.5 h-1.5 border-b border-l border-border-corner pointer-events-none" />
      <span className="absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r border-border-corner pointer-events-none" />
    </>
  );
}

export function AssetCard({ asset, onPreview, onDelete }) {
  const [copied, setCopied] = useState(false);

  const formatSize = (bytes) => {
    if (!bytes) return "0 KB";
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
  };

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(asset.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      return;
    }
  };

  return (
    <div className="relative group rounded-[var(--radius-md)] bg-surface-card border border-border hover:border-accent/50 transition-all duration-200 overflow-hidden flex flex-col">
      <CornerBracket />

      <div
        onClick={() => onPreview(asset)}
        className="relative h-40 bg-surface/50 overflow-hidden cursor-pointer flex items-center justify-center group/img"
      >
        <img
          src={asset.url}
          alt={asset.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <span className="p-2 rounded-full bg-background/80 text-text-primary backdrop-blur">
            <Eye size={16} />
          </span>
        </div>
        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-background/80 backdrop-blur text-[10px] font-mono font-semibold text-text-primary uppercase border border-border/50">
          {asset.format}
        </span>
      </div>

      <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="text-xs font-semibold text-text-primary truncate" title={asset.title}>
            {asset.title}
          </h4>
          <div className="flex items-center justify-between text-[11px] font-mono text-text-muted mt-1">
            <span>{formatSize(asset.bytes)}</span>
            <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50 gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1 py-1 rounded-[var(--radius-sm)] bg-surface hover:bg-surface-elevated text-[11px] font-medium text-text-muted hover:text-text-primary border border-border transition-colors btn-tactile cursor-pointer"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            <span>{copied ? "Copied" : "Copy Link"}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(asset);
            }}
            className="p-1.5 rounded-[var(--radius-sm)] border border-border text-text-muted hover:text-rose-400 hover:border-rose-500/50 hover:bg-rose-950/20 transition-colors btn-tactile cursor-pointer"
            title="Delete asset"
            aria-label="Delete asset"
          >
            <Trash size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssetCard;
