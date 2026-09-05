import { useState, useRef, useEffect } from "react";
import { Sparkle, CaretDown, Check, X } from "@phosphor-icons/react";
import { useToast } from "@/context/ToastContext";

export const MODEL_TIERS = [
  {
    id: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    tag: "Reasoning Pro",
    desc: "Next-gen flagship reasoning and multi-modal intelligence (Latest)."
  },
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    tag: "Balanced Pro",
    desc: "Optimized multi-modal reasoning and code generation."
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    tag: "High Accuracy",
    desc: "Balanced speed and deep reasoning across all modalities."
  },
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash Lite",
    tag: "Ultra Fast",
    desc: "Sub-second response latency for instant, dynamic answers."
  }
];

export function ModelSelector({ selectedModel, onSelectModel }) {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef(null);
  const toast = useToast();

  const [activeModel, setActiveModel] = useState(() => {
    return selectedModel || localStorage.getItem("selected_ai_model") || "gemini-3.7-flash";
  });

  useEffect(() => {
    if (selectedModel) setActiveModel(selectedModel);
  }, [selectedModel]);

  const currentTier = MODEL_TIERS.find((t) => t.id === activeModel) || MODEL_TIERS[0];

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSelect = (tier) => {
    setActiveModel(tier.id);
    if (typeof onSelectModel === "function") {
      onSelectModel(tier.id);
    }
    try {
      localStorage.setItem("selected_ai_model", tier.id);
    } catch {}
    toast.success(`Switched to ${tier.name}`);
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-elevated border border-border hover:border-accent/40 text-text-primary text-xs font-medium transition-all shadow-xs cursor-pointer"
        aria-expanded={isOpen}
        aria-label="Select AI Model"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <Sparkle size={13} weight="fill" className="text-purple-400 shrink-0" />
        <span className="truncate max-w-[80px] sm:max-w-[140px] font-semibold">
          {currentTier.name}
        </span>
        <span className="hidden md:inline-block text-[10px] px-1.5 py-0.2 rounded bg-surface-card border border-border text-text-muted font-mono">
          {currentTier.tag}
        </span>
        <CaretDown size={12} className="text-text-muted" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            ref={modalRef}
            className="w-full max-w-sm sm:max-w-md bg-surface-card dark:bg-zinc-950 border border-border dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden p-4 space-y-3 animate-in zoom-in-95 duration-150 select-none"
          >
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Intelligence Tier</h3>
                <p className="text-[11px] text-text-muted">Select reasoning model and performance</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                title="Close"
                aria-label="Close"
              >
                <X size={15} weight="bold" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-0.5">
              {MODEL_TIERS.map((tier) => {
                const isSelected = tier.id === activeModel;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => handleSelect(tier)}
                    className={`w-full flex items-start justify-between gap-3 p-3 rounded-xl text-left transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-accent/15 border-accent/40 text-text-primary shadow-xs"
                        : "border-transparent hover:bg-surface-elevated/70 text-text-muted hover:text-text-primary"
                    }`}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-text-primary">{tier.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium ${
                            isSelected
                              ? "bg-accent text-white"
                              : "bg-surface border border-border text-text-muted"
                          }`}
                        >
                          {tier.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted leading-relaxed">{tier.desc}</p>
                    </div>

                    <div className="pt-0.5 shrink-0">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-accent/20 border border-accent flex items-center justify-center text-accent">
                          <Check size={12} weight="bold" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-border" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ModelSelector;
