import { Cpu, Files } from "@phosphor-icons/react";

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

export function ModelDistributionCard({ stats = {} }) {
  const models = Array.isArray(stats.modelDistribution) ? stats.modelDistribution : [];
  const totalAssets = stats.totalAssetCount || 0;
  const imageCount = stats.imageCount || 0;
  const docCount = stats.documentCount || 0;

  const categories = [
    { label: "Synthesized Images", count: imageCount, color: "text-accent", bar: "bg-accent" },
    { label: "Parsed & Generated Docs", count: docCount, color: "text-indigo-400", bar: "bg-indigo-500" },
    { label: "Active Chat Sessions", count: stats.activeSessions || 0, color: "text-sky-400", bar: "bg-sky-400" },
    { label: "Total Assets Cataloged", count: totalAssets, color: "text-purple-400", bar: "bg-purple-400" }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
      <div className="relative p-5 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-4">
        <CornerBracket />

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Cpu size={18} className="text-accent" />
              <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-text-primary">
                Model Distribution
              </div>
            </div>
            <p className="text-xs text-text-muted">Inference compute breakdown</p>
          </div>
          <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-accent">
            Google GenAI
          </span>
        </div>

        <div className="space-y-3 pt-1">
          {models.map((m) => (
            <div key={m.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${m.color} shrink-0`} />
                  <span className="text-text-primary font-medium text-[11px]">{m.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-text-muted">{m.share} calls</span>
                  <span className="font-semibold text-text-primary w-8 text-right">{m.percent}%</span>
                </div>
              </div>
              <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden border border-border/60">
                <div className={`h-full ${m.color} rounded-full transition-all duration-300`} style={{ width: `${m.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative p-5 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-4">
        <CornerBracket />

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Files size={18} className="text-accent" />
              <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-text-primary">
                Asset Distribution
              </div>
            </div>
            <p className="text-xs text-text-muted">Multi-modal asset classification</p>
          </div>
          <span className="font-mono text-[11px] font-semibold text-text-muted">
            {totalAssets} Total Files
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          {categories.map((c) => (
            <div key={c.label} className="p-3 rounded-[var(--radius-sm)] bg-surface border border-border space-y-1.5">
              <span className="text-[11px] text-text-muted block truncate">{c.label}</span>
              <div className="flex items-baseline justify-between">
                <span className={`font-mono text-xl font-bold ${c.color}`}>{c.count.toLocaleString()}</span>
                <span className="text-[10px] font-mono text-text-muted">Items</span>
              </div>
              <div className="h-1 w-full bg-surface-card rounded-full overflow-hidden">
                <div className={`h-full ${c.bar} rounded-full`} style={{ width: `${Math.min(100, (c.count / Math.max(totalAssets, 1)) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ModelDistributionCard;
