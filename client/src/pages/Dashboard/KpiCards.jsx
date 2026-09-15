export function KpiCards({ stats = {} }) {
  const totalGens = stats.totalGenerations || 0;
  const activeSess = stats.activeSessions || 0;
  const mbStorage = ((stats.totalStorageBytes || 0) / (1024 * 1024)).toFixed(1);
  const isAdmin = Boolean(stats.isAdmin);
  const fourthVal = isAdmin ? (stats.totalUsers || 0) : (stats.totalUsers || 0);
  const fourthLabel = isAdmin ? "Platform Users" : "Tokens Used";
  const fourthSub = isAdmin ? "Registered accounts" : "Prompt + completion tokens";

  const bars5 = [40, 55, 70, 85, 100];
  const bars5Rev = [100, 85, 70, 55, 40];

  const cards = [
    {
      id: "gen", icon: "sparkle", label: "AI Generations", value: totalGens.toLocaleString(),
      delta: stats.genDelta || "+0%", trend: "up", sub: "Completed AI responses",
      bars: bars5, color: "emerald"
    },
    {
      id: "sess", icon: "chat", label: "Active Sessions", value: activeSess.toLocaleString(),
      delta: "Live", trend: "up", sub: "Conversational threads",
      bars: [30, 50, 45, 70, 60], color: "emerald"
    },
    {
      id: "storage", icon: "storage", label: "Cloud Storage", value: `${mbStorage} MB`,
      delta: `${stats.totalAssetCount || 0} files`, trend: "up", sub: `${stats.imageCount || 0} images - ${stats.documentCount || 0} docs`,
      bars: [20, 35, 50, 65, 80], color: "emerald"
    },
    {
      id: "users", icon: "users", label: fourthLabel, value: fourthVal.toLocaleString(),
      delta: isAdmin ? "All Time" : "Telemetry", trend: "up", sub: fourthSub,
      bars: bars5Rev, color: "emerald"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {cards.map((kpi, idx) => (
        <KpiCard key={kpi.id} kpi={kpi} delay={idx * 40} />
      ))}
    </div>
  );
}

function KpiCard({ kpi, delay }) {
  return (
    <article
      className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl p-5 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group cursor-default"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div>
        <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[11px] font-medium mb-2">
          <KpiIcon name={kpi.icon} />
          <span>{kpi.label}</span>
        </div>
        <div className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {kpi.value}
        </div>
      </div>
      <div className="flex items-end justify-between mt-4">
        <div className="flex items-center gap-1 text-[11px] font-medium">
          <span className="font-bold text-emerald-500">{kpi.delta}</span>
          <span className="text-[var(--text-muted)] text-[10px]">{kpi.sub}</span>
        </div>
        <div className="flex items-end gap-[3px] h-6">
          {kpi.bars.map((h, i) => (
            <div
              key={i}
              className="w-1 rounded-t transition-all duration-200"
              style={{
                height: `${(h / 100) * 24}px`,
                background: `rgba(var(--accent-rgb), ${0.3 + (h / 100) * 0.7})`
              }}
            />
          ))}
        </div>
      </div>
    </article>
  );
}

function KpiIcon({ name }) {
  if (name === "sparkle") return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" strokeLinejoin="round" />
    </svg>
  );
  if (name === "chat") return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (name === "storage") return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default KpiCards;
