import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, WarningCircle } from "@phosphor-icons/react";
import { Loader } from "./Loader";

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  description = "Are you sure you want to perform this action? This action cannot be undone.",
  confirmText = "Delete",
  isDestructive = true,
  isLoading = false,
  children
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      } else if (e.key === "Enter" && !isLoading) {
        onConfirm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose, onConfirm]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="max-w-md w-full bg-surface-card border border-border rounded-[var(--radius-lg)] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            {isDestructive && (
              <span className="p-1 rounded bg-red-500/10 text-red-500 border border-red-500/20">
                <WarningCircle size={16} weight="fill" />
              </span>
            )}
            <h3 className="text-sm font-semibold text-text-primary tracking-tight">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <X size={14} />
          </button>
        </div>

        <p className="text-xs text-text-muted leading-relaxed">{description}</p>

        {children}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-[var(--radius-sm)] border border-border hover:bg-surface text-xs font-medium text-text-primary transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isDestructive
                ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
                : "bg-accent hover:bg-accent-hover text-white"
            }`}
          >
            {isLoading && <Loader size={14} className={isDestructive ? "text-red-500" : "text-white"} />}
            <span>{isLoading ? "Processing..." : confirmText}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ConfirmModal;
