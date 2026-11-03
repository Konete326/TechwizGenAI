import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Sparkle, UserGear, ChartBar, FileText, GitFork, Check, X, CaretDown, Robot } from "@phosphor-icons/react";

export const PERSONA_CONFIGS = [
  { id: "general", label: "General", desc: "Polymath general assistant for reasoning & questions", icon: Sparkle },
  { id: "architect", label: "Full-Stack Architect", desc: "Builds full-stack apps, interactive sandboxes, and APIs", icon: UserGear },
  { id: "analyst", label: "Data Analyst", desc: "Analyzes datasets, financial ARR models, and metrics", icon: ChartBar },
  { id: "writer", label: "Executive Writer", desc: "Drafts formal proposals, whitepapers, and reports", icon: FileText },
  { id: "diagrammer", label: "Systems Diagrammer", desc: "Visualizes architectures, flows, and Mermaid charts", icon: GitFork }
];

export function PersonaSelector({ selectedPersona = "general", onSelectPersona, disabled = false, compact = false }) {
  const [open, setOpen] = useState(false);
  const modalRef = useRef(null);

  const active = PERSONA_CONFIGS.find((p) => p.id === selectedPersona) || PERSONA_CONFIGS[0];
  const ActiveIcon = active.icon;

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        data-nesa-target="persona_selector"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`group flex items-center gap-1.5 rounded-full bg-surface-card hover:bg-surface border border-border hover:border-accent/40 text-text-primary font-medium transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0 ${
          compact ? "h-7 px-2.5 text-[11px]" : "h-8 px-3 text-xs"
        }`}
        title={`Preset / Agent: ${active.label}`}
        aria-label={`Preset / Agent: ${active.label}`}
      >
        <ActiveIcon size={14} className="text-accent shrink-0" />
        <span className="truncate max-w-[110px]">{active.label}</span>
        <CaretDown size={11} className="text-text-muted group-hover:text-text-primary transition-transform duration-150" />
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={modalRef}
            className="w-full max-w-sm sm:max-w-md bg-surface-card dark:bg-zinc-950 border border-border dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden p-4 space-y-3 animate-in zoom-in-95 duration-150 select-none"
          >
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
                  <Robot size={16} weight="bold" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Agent Presets</h3>
                  <p className="text-[11px] text-text-muted">Choose specialized persona instructions</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
              >
                <X size={15} weight="bold" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {PERSONA_CONFIGS.map((p) => {
                const Icon = p.icon;
                const isSelected = p.id === active.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (onSelectPersona) onSelectPersona(p.id);
                      setOpen(false);
                    }}
                    className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-accent/10 border-accent/40 shadow-xs"
                        : "bg-surface/50 hover:bg-surface border-border/60 hover:border-border text-text-muted hover:text-text-primary"
                    }`}
                  >
                    <div className="mt-0.5 p-1.5 rounded-lg bg-surface border border-border text-accent shrink-0">
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${isSelected ? "text-accent" : "text-text-primary"}`}>
                          {p.label}
                        </span>
                        {isSelected && <Check size={13} weight="bold" className="text-accent" />}
                      </div>
                      <p className="text-[11px] text-text-muted mt-0.5 line-clamp-1">{p.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default PersonaSelector;
