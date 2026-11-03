import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Sparkle, Check, X, MagnifyingGlass, CaretDown, Cpu, SlidersHorizontal } from "@phosphor-icons/react";
import { useToast } from "@/context/ToastContext";

export const MODEL_TIERS = [
  // Google Gemini
  {
    id: "gemini-3.6-flash",
    provider: "google",
    providerName: "Google Gemini",
    name: "Gemini 3.6 Flash",
    tag: "Flagship Fast",
    badge: "Default",
    desc: "Optimized multimodal reasoning, ultra-fast latency, and code generation.",
    color: "from-sky-500 to-indigo-500"
  },
  {
    id: "gemini-3.5-flash",
    provider: "google",
    providerName: "Google Gemini",
    name: "Gemini 3.5 Flash",
    tag: "High Accuracy",
    desc: "Balanced speed and deep reasoning across all modalities and vision tasks.",
    color: "from-blue-500 to-indigo-600"
  },
  {
    id: "gemini-3.5-flash-lite",
    provider: "google",
    providerName: "Google Gemini",
    name: "Gemini 3.5 Flash Lite",
    tag: "Ultra Fast",
    desc: "Sub-second response latency for instant, dynamic answers and live tools.",
    color: "from-cyan-400 to-blue-500"
  },
  {
    id: "gemini-3.8-flash",
    provider: "google",
    providerName: "Google Gemini",
    name: "Gemini 3.8 Flash",
    tag: "High Capacity",
    desc: "State of the art multimodal reasoning, massive context depth, and agents.",
    color: "from-indigo-500 to-purple-600"
  },
  {
    id: "gemini-3.7-flash",
    provider: "google",
    providerName: "Google Gemini",
    name: "Gemini 3.7 Flash",
    tag: "Reasoning Pro",
    desc: "Next-gen flagship reasoning and hybrid multi-modal intelligence.",
    color: "from-purple-500 to-pink-500"
  },

  // OpenAI
  {
    id: "gpt-4o",
    provider: "openai",
    providerName: "OpenAI",
    name: "GPT-4o",
    tag: "Omni Pro",
    desc: "Flagship high-intelligence multimodal model for complex conversational tasks.",
    color: "from-emerald-500 to-teal-600"
  },
  {
    id: "gpt-4o-mini",
    provider: "openai",
    providerName: "OpenAI",
    name: "GPT-4o Mini",
    tag: "Fast & Light",
    desc: "Affordable, high-speed model for lightweight daily text, code, and vision.",
    color: "from-teal-400 to-emerald-500"
  },
  {
    id: "o1",
    provider: "openai",
    providerName: "OpenAI",
    name: "OpenAI o1",
    tag: "Deep Reasoner",
    desc: "Advanced reasoning model designed for complex STEM, math, and code architecture.",
    color: "from-emerald-600 to-green-700"
  },
  {
    id: "o3-mini",
    provider: "openai",
    providerName: "OpenAI",
    name: "OpenAI o3-mini",
    tag: "Fast Reasoner",
    desc: "Optimized high-speed reasoning model for coding, logic, and multi-step plans.",
    color: "from-teal-500 to-emerald-600"
  },
  {
    id: "gpt-5-preview",
    provider: "openai",
    providerName: "OpenAI",
    name: "GPT-5 Preview",
    tag: "Frontier",
    desc: "Next-gen autonomous AI capabilities with deep world models and zero-shot insight.",
    color: "from-emerald-500 to-cyan-500"
  },

  // Anthropic Claude
  {
    id: "claude-3-7-sonnet",
    provider: "anthropic",
    providerName: "Anthropic",
    name: "Claude 3.7 Sonnet",
    tag: "Hybrid Thinking",
    desc: "Anthropic's most intelligent model with configurable reasoning time and coding depth.",
    color: "from-amber-500 to-orange-600"
  },
  {
    id: "claude-3-5-sonnet",
    provider: "anthropic",
    providerName: "Anthropic",
    name: "Claude 3.5 Sonnet",
    tag: "State of Art",
    desc: "Industry-leading coding, analysis, nuanced prose, and visual understanding.",
    color: "from-orange-500 to-amber-600"
  },
  {
    id: "claude-3-5-haiku",
    provider: "anthropic",
    providerName: "Anthropic",
    name: "Claude 3.5 Haiku",
    tag: "Ultra Rapid",
    desc: "High-speed intelligence with instant time-to-first-token and agile reasoning.",
    color: "from-yellow-500 to-orange-500"
  },

  // DeepSeek & Open Source
  {
    id: "deepseek-r1",
    provider: "deepseek",
    providerName: "DeepSeek",
    name: "DeepSeek R1",
    tag: "Reasoning Open",
    desc: "Open-weights reasoning champion rivaling proprietary frontier models on math and code.",
    color: "from-cyan-500 to-blue-600"
  },
  {
    id: "deepseek-v3",
    provider: "deepseek",
    providerName: "DeepSeek",
    name: "DeepSeek V3",
    tag: "High Throughput",
    desc: "671B parameter Mixture-of-Experts architecture for general enterprise intelligence.",
    color: "from-sky-500 to-cyan-600"
  },
  {
    id: "groq-llama-3.3-70b",
    provider: "groq",
    providerName: "Groq",
    name: "Llama 3.3 70B (Groq)",
    tag: "500 T/s",
    desc: "Extreme inference speed powered by Groq LPUs for immediate streaming.",
    color: "from-red-500 to-orange-500"
  },
  {
    id: "mistral-large",
    provider: "mistral",
    providerName: "Mistral",
    name: "Mistral Large",
    tag: "European Frontier",
    desc: "Top-tier multilingual reasoning, agentic workflows, and code generation.",
    color: "from-orange-600 to-red-600"
  }
];

export function ProviderIcon({ provider, className = "w-4 h-4" }) {
  switch (provider) {
    case "google":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="url(#gemini-grad-icon)" />
          <defs>
            <linearGradient id="gemini-grad-icon" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38bdf8" />
              <stop offset="0.5" stopColor="#818cf8" />
              <stop offset="1" stopColor="#c084fc" />
            </linearGradient>
          </defs>
        </svg>
      );
    case "openai":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={`${className} text-emerald-400`}>
          <path d="M22.28 9.37a5.53 5.53 0 0 0-.47-4.47 5.63 5.63 0 0 0-3.86-2.73 5.69 5.69 0 0 0-4.88 1.15 5.57 5.57 0 0 0-4.22-.38 5.64 5.64 0 0 0-3.33 2.76 5.65 5.65 0 0 0-.82 4.67 5.6 5.6 0 0 0-2.4 3.65 5.68 5.68 0 0 0 .54 4.54 5.62 5.62 0 0 0 3.86 2.73 5.67 5.67 0 0 0 4.88-1.15 5.56 5.56 0 0 0 4.22.38 5.64 5.64 0 0 0 3.33-2.76 5.65 5.65 0 0 0 .82-4.67 5.6 5.6 0 0 0 2.4-3.65c.2-.76.22-1.57.07-2.34zm-8.8 11.23a4.08 4.08 0 0 1-2.92-1.32l.14-.08 4.8-2.77a.8.8 0 0 0 .4-.69v-5.69l1.71.99a.14.14 0 0 1 .08.1v5.52a4.12 4.12 0 0 1-4.21 3.94z" />
        </svg>
      );
    case "anthropic":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={`${className} text-amber-500`}>
          <path d="M13.83 3.5h3.42L24 20.5h-3.48l-1.95-4.46H11.5l-1.92 4.46H6.12L13.83 3.5zm2.04 9.68l-2.02-4.62-2.02 4.62h4.04zM5.53 10.3l1.83 3.9H3.72l1.81-3.9z" />
        </svg>
      );
    case "deepseek":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={`${className} text-cyan-400`}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16.93V17a1 1 0 0 0-2 0v1.93A8.001 8.001 0 0 1 4.07 13H6a1 1 0 0 0 0-2H4.07A8.001 8.001 0 0 1 11 4.07V6a1 1 0 0 0 2 0V4.07A8.001 8.001 0 0 1 19.93 11H18a1 1 0 0 0 0 2h1.93A8.001 8.001 0 0 1 13 18.93z" />
        </svg>
      );
    default:
      return <Cpu size={16} className={`${className} text-purple-400`} />;
  }
}

export function ModelSelector({ selectedModel, onSelectModel, compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const modalRef = useRef(null);
  const toast = useToast();

  const activeModel = selectedModel || "gemini-3.6-flash";
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
    if (typeof onSelectModel === "function") {
      onSelectModel(tier.id);
    }
    try {
      localStorage.setItem("selected_ai_model", tier.id);
    } catch (err) {
      console.error("Storage error:", err);
    }
    toast.success(`Active model: ${tier.name}`);
    setIsOpen(false);
  };

  const filteredModels = useMemo(() => {
    return MODEL_TIERS.filter((m) => {
      const matchCat =
        activeCategory === "all" ||
        (activeCategory === "google" && m.provider === "google") ||
        (activeCategory === "openai" && m.provider === "openai") ||
        (activeCategory === "anthropic" && m.provider === "anthropic") ||
        (activeCategory === "open" && (m.provider === "deepseek" || m.provider === "groq" || m.provider === "mistral"));

      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.providerName.toLowerCase().includes(q) ||
        m.tag.toLowerCase().includes(q) ||
        m.desc.toLowerCase().includes(q);

      return matchCat && matchSearch;
    });
  }, [activeCategory, search]);

  return (
    <>
      <button
        type="button"
        data-nesa-target="model_selector"
        onClick={() => setIsOpen(true)}
        className={`group flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-card hover:bg-surface border border-border hover:border-accent/40 text-text-primary text-xs font-medium transition-all shadow-xs cursor-pointer shrink-0 ${
          compact ? "h-7 px-2 text-[11px]" : "h-8"
        }`}
        aria-expanded={isOpen}
        aria-label={`Model: ${currentTier.name}`}
        title={`Active AI Model: ${currentTier.name} (${currentTier.providerName})`}
      >
        <div className="flex items-center gap-1.5 shrink-0">
          <ProviderIcon provider={currentTier.provider} className="w-4 h-4" />
          <span className="font-semibold truncate max-w-[140px] sm:max-w-[180px]">
            {currentTier.name}
          </span>
        </div>
        <span className="hidden xl:inline-block text-[10px] px-1.5 py-0.2 rounded-full bg-surface border border-border text-text-muted font-mono">
          {currentTier.tag}
        </span>
        <CaretDown size={12} weight="bold" className="text-text-muted group-hover:text-text-primary transition-transform duration-150" />
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            ref={modalRef}
            className="w-full max-w-xl bg-surface-card dark:bg-zinc-950 border border-border dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-150 select-none"
          >
            {/* Header */}
            <div className="p-4 border-b border-border/70 flex items-center justify-between shrink-0 bg-surface/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
                  <SlidersHorizontal size={17} weight="bold" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Select AI Model</h3>
                  <p className="text-[11px] text-text-muted">Choose provider and capabilities for this conversation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer"
                title="Close modal"
              >
                <X size={15} weight="bold" />
              </button>
            </div>

            {/* Search & Provider Tabs */}
            <div className="p-3 border-b border-border/60 bg-surface-base/30 space-y-2.5 shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border focus-within:border-accent transition-all">
                <MagnifyingGlass size={15} className="text-text-muted shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search models by name, tag, or provider..."
                  className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
                  autoFocus
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")} className="text-text-muted hover:text-text-primary">
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Provider Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
                {[
                  { id: "all", label: "All Models" },
                  { id: "google", label: "Google Gemini" },
                  { id: "openai", label: "OpenAI" },
                  { id: "anthropic", label: "Anthropic" },
                  { id: "open", label: "DeepSeek & Open" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategory(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 cursor-pointer ${
                      activeCategory === tab.id
                        ? "bg-accent text-white shadow-xs"
                        : "bg-surface text-text-muted hover:text-text-primary hover:bg-surface-elevated border border-border/60"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Model List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {filteredModels.length === 0 ? (
                <div className="py-12 text-center text-xs text-text-muted space-y-1">
                  <p className="font-semibold text-text-primary">No models found</p>
                  <p>Try searching for a different keyword or provider.</p>
                </div>
              ) : (
                filteredModels.map((tier) => {
                  const isSelected = tier.id === currentTier.id;
                  return (
                    <div
                      key={tier.id}
                      onClick={() => handleSelect(tier)}
                      className={`group flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-accent/10 border-accent/40 shadow-xs"
                          : "bg-surface/50 hover:bg-surface border-border/60 hover:border-border text-text-muted hover:text-text-primary"
                      }`}
                    >
                      <div className="mt-0.5 p-2 rounded-lg bg-surface-card border border-border/80 shadow-2xs shrink-0 flex items-center justify-center">
                        <ProviderIcon provider={tier.provider} className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold ${isSelected ? "text-accent" : "text-text-primary"}`}>
                            {tier.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface border border-border/70 text-text-muted">
                            {tier.providerName}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-accent/10 text-accent font-medium">
                            {tier.tag}
                          </span>
                          {tier.badge && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30">
                              {tier.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">
                          {tier.desc}
                        </p>
                      </div>

                      <div className="mt-1 shrink-0">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center shadow-xs">
                            <Check size={12} weight="bold" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-border/70 group-hover:border-accent/40 transition-colors" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border/70 bg-surface/30 flex items-center justify-between text-[11px] text-text-muted shrink-0">
              <span className="font-mono">
                {filteredModels.length} {filteredModels.length === 1 ? "model" : "models"} available
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 rounded-lg bg-surface border border-border hover:bg-surface-elevated text-text-primary font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default ModelSelector;
