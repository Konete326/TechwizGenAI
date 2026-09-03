import { TrendUp, TrendDown } from "@phosphor-icons/react";

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

export function KpiCards({ kpis = [] }) {
  if (!kpis.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {kpis.map((kpi) => {
        const isUp = kpi.isPositive;
        return (
          <div
            key={kpi.label}
            className="relative p-4 rounded-[var(--radius-md)] bg-surface-card border border-border hover:border-accent/40 transition-colors space-y-3"
          >
            <CornerBracket />

            <div className="flex items-center justify-between text-xs text-text-muted">
              <span className="font-medium uppercase tracking-wider text-[10px]">{kpi.label}</span>
              <span
                className={`inline-flex items-center gap-0.5 font-mono text-[11px] font-semibold ${
                  isUp ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {isUp ? <TrendUp size={12} weight="bold" /> : <TrendDown size={12} weight="bold" />}
                <span>{kpi.delta}</span>
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold font-mono tracking-tight text-text-primary">
                {kpi.value}
              </div>

              {kpi.type === "sparkline-up" && (
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

              {kpi.type === "sparkline-down" && (
                <svg className="w-16 h-6 text-rose-500" viewBox="0 0 64 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M0 6 Q16 8 28 14 T48 16 T64 20" />
                </svg>
              )}

              {kpi.type === "progress" && (
                <div className="w-16 h-2 bg-surface rounded-full overflow-hidden border border-border">
                  <div className="h-full bg-accent rounded-full w-[65%]" />
                </div>
              )}
            </div>

            <div className="text-[11px] font-mono text-text-muted">{kpi.sublabel}</div>
          </div>
        );
      })}
    </div>
  );
}

export default KpiCards;
