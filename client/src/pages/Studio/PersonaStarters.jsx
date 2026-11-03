import { Sparkle, Code, ChartBar, FileText, GitFork, ArrowRight, Lightbulb, Compass } from "@phosphor-icons/react";
import logoImg from "@/assets/logo.png";
import { ProviderIcon } from "./ModelSelector";

const QUICK_STARTERS = [
  {
    icon: Lightbulb,
    category: "Brainstorming",
    title: "System Architecture Trends",
    prompt: "Compare modern full-stack web architecture patterns: Serverless, Edge Functions, SSR, and micro-frontends with pros & cons.",
    color: "text-amber-400 bg-amber-400/10 border-amber-400/20"
  },
  {
    icon: Code,
    category: "Code & Engineering",
    title: "Interactive Sandbox App",
    prompt: "Build an interactive reactive component in a standalone web sandbox with live state management and clean styling.",
    color: "text-sky-400 bg-sky-400/10 border-sky-400/20"
  },
  {
    icon: ChartBar,
    category: "Data & Analytics",
    title: "Financial ARR Revenue Model",
    prompt: "Generate an annual recurring revenue (ARR) forecast financial model in structured CSV format with churn and LTV metrics.",
    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
  },
  {
    icon: FileText,
    category: "Technical Writing",
    title: "Executive Project Proposal",
    prompt: "Draft an authoritative executive project proposal document with problem statement, architecture deliverables, and roadmap.",
    color: "text-purple-400 bg-purple-400/10 border-purple-400/20"
  }
];

export function PersonaStarters({ persona = "general", onSelectStarter, selectedModel = "gemini-3.6-flash" }) {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 sm:py-16 flex flex-col items-center text-center animate-in fade-in duration-300">
      
      {/* Emblem & Branding */}
      <div className="relative mb-4 group">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-surface-card border border-border shadow-xl flex items-center justify-center p-3 relative z-10 transition-transform group-hover:scale-105 duration-200">
          <img src={logoImg} alt="Techwiz GenAI" className="w-full h-full object-contain" />
        </div>
        <div className="absolute inset-0 rounded-2xl bg-accent/20 blur-xl -z-0 scale-125 opacity-70 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Greeting Title */}
      <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-text-primary tracking-tight mb-2">
        What can I help you with today?
      </h1>
      <p className="text-xs sm:text-sm text-text-muted max-w-lg mb-8 leading-relaxed">
        Choose a prompt starter below, ask complex coding questions, generate artifacts, or chat naturally by voice with Nisa.
      </p>

      {/* 4-Card Starter Grid (LibreChat Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
        {QUICK_STARTERS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectStarter(item.prompt)}
              className="group p-3.5 sm:p-4 rounded-2xl bg-surface-card hover:bg-surface border border-border/80 hover:border-accent/40 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer"
            >
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between">
                  <div className={`p-1.5 rounded-lg border flex items-center justify-center ${item.color}`}>
                    <Icon size={15} weight="bold" />
                  </div>
                  <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                    {item.category}
                  </span>
                </div>

                <h3 className="text-xs sm:text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                  {item.title}
                </h3>
                <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">
                  {item.prompt}
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] font-mono font-medium text-text-muted group-hover:text-accent transition-colors mt-auto pt-1">
                <span>Try this prompt</span>
                <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PersonaStarters;
