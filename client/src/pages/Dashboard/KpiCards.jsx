import { TrendUp, Sparkle, ChatCircleText, HardDrives, Users } from "@phosphor-icons/react";

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

export function KpiCards({ stats = {} }) {
  const mbStorage = ((stats.totalStorageBytes || 0) / (1024 * 1024)).toFixed(2);
  const totalGens = stats.totalGenerations || 0;
  const activeSess = stats.activeSessions || 0;
  const assetCount = stats.totalAssetCount || 0;
  const isAdmin = Boolean(stats.isAdmin);

  const cards = [
    {
      label: "AI Generations",
      value: totalGens.toLocaleString(),
      delta: "+100%",
      sublabel: "Completed AI responses",
      icon: Sparkle,
      type: "sparkline"
    },
    {
      label: "Active Sessions",
      value: activeSess.toLocaleString(),
      delta: "Live",
      sublabel: "Conversational threads",
      icon: ChatCircleText,
      type: "bars"
    },
    {
      label: "Cloud Storage",
      value: `${mbStorage} MB`,
      delta: `${assetCount} files`,
      sublabel: `${stats.imageCount || 0} images, ${stats.documentCount || 0} docs`,
      icon: HardDrives,
      type: "progress"
    },
    {
      label: isAdmin ? "Platform Users" : "Tokens Consumed",
      value: isAdmin ? (stats.totalUsers || 1).toLocaleString() : (stats.totalUsers || 0).toLocaleString(),
      delta: isAdmin ? "Active" : "Telemetry",
      sublabel: isAdmin ? "Registered user accounts" : "Prompt and completion tokens",
      icon: Users,
      type: "sparkline"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {cards.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.label}
            className="relative p-4 rounded-[var(--radius-md)] bg-surface-card border border-border hover:border-accent/40 transition-colors space-y-3"
          >
            <CornerBracket />

            <div className="flex items-center justify-between text-xs text-text-muted">
              <div className="flex items-center gap-1.5">
                <Icon size={14} className="text-accent" />
                <span className="font-medium uppercase tracking-wider text-[10px]">{kpi.label}</span>
              </div>
              <span className="inline-flex items-center gap-0.5 font-mono text-[11px] font-semibold text-emerald-500">
                <TrendUp size={11} weight="bold" />
                <span>{kpi.delta}</span>
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold font-mono tracking-tight text-text-primary">
                {kpi.value}
              </div>

              {kpi.type === "sparkline" && (
                <svg className="w-16 h-6 text-emerald-500" viewBox="0 0 64 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M0 20 Q16 18 24 12 T48 10 T64 4" />
                </svg>
              )}

              {kpi.type === "bars" && (
                <div className="flex items-end gap-1 h-6">
                  <div className="w-1.5 h-2 bg-accent/40 rounded-xs" />
                  <div className="w-1.5 h-3 bg-accent/60 rounded-xs" />
                  <div className="w-1.5 h-4 bg-accent/80 rounded-xs" />
                  <div className="w-1.5 h-6 bg-accent rounded-xs" />
                </div>
              )}

              {kpi.type === "progress" && (
                <div className="w-16 h-2 bg-surface rounded-full overflow-hidden border border-border">
                  <div className="h-full bg-accent rounded-full w-[70%]" />
                </div>
              )}
            </div>

            <div className="text-[11px] font-mono text-text-muted truncate">{kpi.sublabel}</div>
          </div>
        );
      })}
    </div>
  );
}

export default KpiCards;
