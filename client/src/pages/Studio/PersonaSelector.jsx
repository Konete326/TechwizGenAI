import { useState, useRef, useEffect } from "react";
import { Sparkle, UserGear, ChartBar, FileText, GitFork, CaretDown, Check } from "@phosphor-icons/react";

const PERSONA_CONFIGS = [
  { id: "general", label: "General", desc: "Polymath general assistant", icon: Sparkle },
  { id: "architect", label: "Architect", desc: "Full-stack apps and sandboxes", icon: UserGear },
  { id: "analyst", label: "Data Analyst", desc: "Quantitative tables and CSV", icon: ChartBar },
  { id: "writer", label: "Executive Writer", desc: "Formal PDF and DOCX reports", icon: FileText },
  { id: "diagrammer", label: "Diagrammer", desc: "System flows and Mermaid charts", icon: GitFork }
];

export function PersonaSelector({ selectedPersona = "general", onSelectPersona, disabled = false }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const active = PERSONA_CONFIGS.find((p) => p.id === selectedPersona) || PERSONA_CONFIGS[0];
  const ActiveIcon = active.icon;

  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800/80 text-zinc-300 hover:text-zinc-100 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
        title="Select AI Persona"
      >
        <ActiveIcon size={14} className="text-accent" />
        <span className="max-w-[100px] truncate">{active.label}</span>
        <CaretDown size={11} className={`text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-md p-1.5 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            Domain Persona
          </div>
          <div className="space-y-0.5 mt-1">
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
                  className={`w-full flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                    isSelected ? "bg-accent/15 text-zinc-100" : "hover:bg-zinc-800/60 text-zinc-300"
                  }`}
                >
                  <Icon size={16} className={`mt-0.5 shrink-0 ${isSelected ? "text-accent" : "text-zinc-400"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{item.label}</span>
                      {isSelected && <Check size={12} className="text-accent" weight="bold" />}
                    </div>
                    <p className="text-[11px] text-zinc-500 truncate leading-tight mt-0.5">{item.desc}</p>
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

export default PersonaSelector;
