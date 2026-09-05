import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Sparkle, UserGear, ChartBar, FileText, GitFork, Check, X } from "@phosphor-icons/react";

const PERSONA_CONFIGS = [
  { id: "general", label: "General", desc: "Polymath general assistant", icon: Sparkle },
  { id: "architect", label: "Architect", desc: "Full-stack apps and sandboxes", icon: UserGear },
  { id: "analyst", label: "Data Analyst", desc: "Quantitative tables and CSV", icon: ChartBar },
  { id: "writer", label: "Executive Writer", desc: "Formal PDF and DOCX reports", icon: FileText },
  { id: "diagrammer", label: "Diagrammer", desc: "System flows and Mermaid charts", icon: GitFork }
];

export function PersonaSelector({ selectedPersona = "general", onSelectPersona, disabled = false }) {
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
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-elevated text-text-primary text-xs font-medium transition-all disabled:opacity-50 cursor-pointer shadow-xs"
        title="Select AI Persona"
        aria-label="Select AI Persona"
      >
        <ActiveIcon size={14} className="text-accent shrink-0" />
        <span className="max-w-[70px] sm:max-w-[100px] truncate">{active.label}</span>
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={modalRef}
            className="w-full max-w-sm sm:max-w-md bg-surface-card dark:bg-zinc-950 border border-border dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden p-4 space-y-3 animate-in zoom-in-95 duration-150 select-none"
          >
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Domain Personas</h3>
                <p className="text-[11px] text-text-muted">Choose specialized domain instructions</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                title="Close"
                aria-label="Close"
              >
                <X size={15} weight="bold" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-0.5">
              {PERSONA_CONFIGS.map((item) => {
                const Icon = item.icon;
                const isSelected = item.id === selectedPersona;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectPersona(item.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-accent/15 border-accent/40 text-text-primary shadow-xs"
                        : "border-transparent hover:bg-surface-elevated/70 text-text-muted hover:text-text-primary"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isSelected ? "bg-accent/20 text-accent" : "bg-surface text-text-muted"
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-primary">{item.label}</span>
                        {isSelected && <Check size={14} className="text-accent" weight="bold" />}
                      </div>
                      <p className="text-[11px] text-text-muted leading-relaxed mt-0.5">{item.desc}</p>
                    </div>
                  </button>
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
