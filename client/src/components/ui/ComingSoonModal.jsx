import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Sparkle } from "@phosphor-icons/react";

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

export function ComingSoonModal({ isOpen, onClose, title = "Feature Coming Soon", description }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" || e.key === "Enter") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative max-w-sm w-full bg-surface-card border border-border rounded-[var(--radius-lg)] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-center">
        <CornerBracket />

        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X size={15} />
        </button>

        <div className="w-12 h-12 rounded-full bg-accent/15 border border-accent/30 text-accent flex items-center justify-center mx-auto shadow-sm">
          <Sparkle size={24} weight="fill" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-text-primary tracking-tight">{title}</h3>
          <p className="text-xs text-text-muted leading-relaxed">
            {description || "Google Single Sign-On (OAuth 2.0) is currently undergoing security compliance and will be available in the upcoming system release."}
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-[var(--radius-sm)] bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm transition-colors btn-tactile cursor-pointer"
          >
            Understood
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ComingSoonModal;
