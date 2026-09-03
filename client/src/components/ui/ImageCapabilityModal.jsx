import { useState, useEffect } from "react";
import { WarningCircle, X } from "@phosphor-icons/react";

export function ImageCapabilityModal({ isOpen: propIsOpen, onClose: propOnClose }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleTrigger = () => setIsOpen(true);
    window.addEventListener("image_capability_failed", handleTrigger);
    return () => window.removeEventListener("image_capability_failed", handleTrigger);
  }, []);

  const open = propIsOpen !== undefined ? propIsOpen : isOpen;
  const handleClose = () => {
    setIsOpen(false);
    if (propOnClose) propOnClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-50 duration-150">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface-card p-6 shadow-xl relative animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500 shrink-0 border border-amber-500/20">
            <WarningCircle size={24} weight="fill" />
          </div>
          <div className="space-y-1.5 flex-1 pr-4">
            <h3 className="text-sm font-semibold text-text-primary">
              Model Limitation
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              The currently selected AI model or your custom API provider does not support image generation. Please switch to a superior default model.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImageCapabilityModal;
