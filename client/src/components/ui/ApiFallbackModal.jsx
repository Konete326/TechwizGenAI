import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { WarningCircle, X, ArrowCounterClockwise } from "@phosphor-icons/react";
import { useToast } from "@/context/ToastContext";

export function ApiFallbackModal() {
  const [isOpen, setIsOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const handleApiKeyFailed = () => {
      setIsOpen(true);
    };

    window.addEventListener("api_key_failed", handleApiKeyFailed);
    return () => window.removeEventListener("api_key_failed", handleApiKeyFailed);
  }, []);

  const handleRevert = () => {
    localStorage.removeItem("custom_ai_provider");
    localStorage.removeItem("custom_api_key");
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent("api_key_reverted"));
    toast.info("Reverted to system default Gemini API");
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="max-w-md w-full bg-surface-card border border-rose-800/40 rounded-[var(--radius-lg)] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <WarningCircle size={18} weight="bold" />
            </span>
            <h3 className="text-sm font-bold tracking-tight text-text-primary">API Connection Failed</h3>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-text-muted hover:text-text-primary p-1 rounded transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-text-muted leading-relaxed">
          Your custom API key is not responding or has exceeded its quota. Would you like to revert to the system default API?
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-3.5 py-1.5 rounded-[var(--radius-sm)] border border-border text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRevert}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-[var(--radius-sm)] bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm transition-colors btn-tactile cursor-pointer"
          >
            <ArrowCounterClockwise size={13} weight="bold" />
            <span>Revert to Default</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ApiFallbackModal;
