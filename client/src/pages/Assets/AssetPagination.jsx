import { CaretLeft, CaretRight } from "@phosphor-icons/react";

export function AssetPagination({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPageChange
}) {
  if (totalItems <= 4) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/60">
      <p className="text-xs font-mono text-text-muted">
        Showing {totalItems === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} assets
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-[var(--radius-sm)] bg-surface border border-border text-text-muted hover:text-text-primary hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Previous page"
          aria-label="Previous page"
        >
          <CaretLeft size={14} />
        </button>

        <span className="text-xs font-mono px-3 py-1 rounded bg-surface border border-border text-text-primary">
          Page {currentPage} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-[var(--radius-sm)] bg-surface border border-border text-text-muted hover:text-text-primary hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Next page"
          aria-label="Next page"
        >
          <CaretRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default AssetPagination;
