import { useState, useRef, useEffect } from "react";
import { Sparkle, CaretDown, Check } from "@phosphor-icons/react";
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
  const dropdownRef = useRef(null);
  const toast = useToast();

  const [activeModel, setActiveModel] = useState(() => {
    return selectedModel || localStorage.getItem("selected_ai_model") || "gemini-3.7-flash";
  });

  useEffect(() => {
    if (selectedModel) setActiveModel(selectedModel);
  }, [selectedModel]);

  const currentTier = MODEL_TIERS.find((t) => t.id === activeModel) || MODEL_TIERS[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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
    <div ref={dropdownRef} className="relative z-50">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-elevated border border-border hover:border-accent/40 text-text-primary text-xs font-medium transition-all shadow-xs cursor-pointer"
        aria-expanded={isOpen}
        aria-label="Select AI Model"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <Sparkle size={13} weight="fill" className="text-purple-400 shrink-0" />
        <span className="truncate max-w-[120px] sm:max-w-[160px] font-semibold">
          {currentTier.name}
        </span>
        <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.2 rounded bg-surface-card border border-border text-text-muted font-mono">
          {currentTier.tag}
        </span>
        <CaretDown
          size={12}
          className={`text-text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl bg-surface-card dark:bg-zinc-900 bg-white border border-border dark:border-zinc-800 shadow-2xl p-1.5 space-y-1 animate-in fade-in-50 zoom-in-95 duration-150 z-50 opacity-100"
          style={{ backgroundColor: "var(--surface-card, #121215)" }}
        >
          <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-text-muted border-b border-border/60">
            Select Intelligence Tier
          </div>

          <div className="space-y-0.5 pt-1">
            {MODEL_TIERS.map((tier) => {
              const isSelected = tier.id === activeModel;
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => handleSelect(tier)}
                  className={`w-full flex items-start justify-between gap-2.5 p-2.5 rounded-lg text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-accent/15 border border-accent/40 text-text-primary font-medium"
                      : "hover:bg-surface-elevated/80 text-text-muted hover:text-text-primary border border-transparent"
                  }`}
                >
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-text-primary">
                        {tier.name}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                          isSelected
                            ? "bg-accent text-white"
                            : "bg-surface border border-border text-text-muted"
                        }`}
                      >
                        {tier.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-tight line-clamp-2">
                      {tier.desc}
                    </p>
                  </div>

                  <div className="pt-0.5 shrink-0">
                    {isSelected ? (
                      <Check size={14} weight="bold" className="text-accent" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-border/80" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ModelSelector;
