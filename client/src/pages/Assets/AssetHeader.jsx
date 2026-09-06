import { ImageSquare, UploadSimple, ShieldCheck } from "@phosphor-icons/react";

export function AssetHeader({ totalCount, onOpenUpload, isAdmin }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-[var(--radius-sm)] bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
          <ImageSquare size={20} weight="fill" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-text-primary tracking-tight">Media & Asset Storage</h2>
            <span className="px-2 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-accent text-[11px] font-mono font-semibold">
              {totalCount} {totalCount === 1 ? "asset" : "assets"}
            </span>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-semibold">
                <ShieldCheck size={12} weight="fill" />
                <span>All Users & Admin</span>
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            {isAdmin
              ? "Global media management across all registered users and administrators"
              : "High-performance Cloudinary media library"}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenUpload}
        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-sm)] bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm transition-colors btn-tactile w-fit"
      >
        <UploadSimple size={14} weight="bold" />
        <span>Upload Asset</span>
      </button>
    </div>
  );
}

export default AssetHeader;
