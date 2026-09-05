import { UserGear, ChartBar, FileText, GitFork, ArrowRight } from "@phosphor-icons/react";
import logoImg from "@/assets/logo.png";

const STARTER_PROMPTS = {
  general: [
    { title: "Distributed Consensus", prompt: "Explain distributed consensus algorithms like Raft and Paxos simply with examples." },
    { title: "Architecture Trends", prompt: "Analyze modern full-stack web architecture trends comparing SSR, ISR, and SPAs." },
    { title: "Product Roadmap", prompt: "Outline a comprehensive technical development roadmap for a high-scale SaaS platform." }
  ],
  architect: [
    { title: "Reactive Counter Sandbox", prompt: "Build an interactive reactive counter component in a standalone web sandbox." },
    { title: "Microservices Gateway", prompt: "Architect a scalable API Gateway with rate limiting, circuit breaker, and JWT auth." },
    { title: "Interactive Kanban Board", prompt: "Create an interactive Kanban task management board inside the web sandbox." }
  ],
  analyst: [
    { title: "Revenue Model Spreadsheet", prompt: "Generate an annual recurring revenue financial forecast spreadsheet in CSV format." },
    { title: "Cohort Retention Analysis", prompt: "Analyze SaaS monthly customer cohort retention metrics and identify churn drivers." },
    { title: "Unit Economics Breakdown", prompt: "Calculate CAC, LTV, and payback periods across multiple marketing channels." }
  ],
  writer: [
    { title: "Executive Project Proposal", prompt: "Generate an executive project proposal document with problem statement and milestones." },
    { title: "API Technical Documentation", prompt: "Draft comprehensive API developer documentation with endpoints, schemas, and codes." },
    { title: "Enterprise Security Whitepaper", prompt: "Author an executive enterprise cybersecurity policy whitepaper report in PDF format." }
  ],
  diagrammer: [
    { title: "OAuth2 Authorization Flow", prompt: "Design an OAuth2 authorization code grant flow sequence diagram in Mermaid format." },
    { title: "Order State Machine", prompt: "Map an e-commerce order lifecycle state machine diagram in Mermaid format." },
    { title: "Cloud Infrastructure Map", prompt: "Visualize a high-availability cloud architecture with VPC, load balancers, and RDS." }
  ]
};

const PERSONA_META = {
  general: { icon: null, badge: "General Assistant", subtitle: "Ask any question, code challenge, or analysis task" },
  architect: { icon: UserGear, badge: "Full-Stack Architect", subtitle: "Build interactive apps, sandboxes, and system blueprints" },
  analyst: { icon: ChartBar, badge: "Quantitative Analyst", subtitle: "Explore datasets, financial models, and structured metrics" },
  writer: { icon: FileText, badge: "Executive Specialist", subtitle: "Generate authoritative executive reports and documentation" },
  diagrammer: { icon: GitFork, badge: "Systems Diagrammer", subtitle: "Visualize system flows, sequence charts, and architectures" }
};

export function PersonaStarters({ persona = "general", onSelectStarter }) {
  const meta = PERSONA_META[persona] || PERSONA_META.general;
  const starters = STARTER_PROMPTS[persona] || STARTER_PROMPTS.general;
  const MetaIcon = meta.icon;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 flex flex-col items-center text-center animate-in fade-in duration-300">
      <div className="p-3.5 rounded-2xl bg-surface-card border border-border shadow-xl mb-3 flex items-center justify-center">
        <img src={logoImg} alt="Techwiz GenAI" className="w-8 h-8 object-contain" />
      </div>
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[11px] font-mono font-medium mb-2">
        {MetaIcon && <MetaIcon size={12} weight="bold" />}
        <span>{meta.badge}</span>
      </div>
      <h2 className="text-lg font-semibold text-text-primary mb-1">What would you like to build?</h2>
      <p className="text-xs text-text-muted max-w-md mb-6">{meta.subtitle}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left">
        {starters.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectStarter(item.prompt)}
            className="group p-3.5 rounded-xl bg-surface-card hover:bg-surface border border-border hover:border-accent/40 shadow-sm transition-all duration-150 flex flex-col justify-between cursor-pointer"
          >
            <div className="space-y-1.5 mb-3">
              <h3 className="text-xs font-semibold text-text-primary group-hover:text-accent transition-colors">
                {item.title}
              </h3>
              <p className="text-[11px] text-text-muted line-clamp-3 leading-relaxed">
                {item.prompt}
              </p>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-text-muted group-hover:text-accent transition-colors">
              <span>Start</span>
              <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default PersonaStarters;
