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

export function ConversionAndTraffic({
  funnelSteps = [],
  totalOrdersDisplay = "1,842",
  trafficSources = [],
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
      <div className="relative p-5 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-4">
        <CornerBracket />

        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-text-primary">
              7.8%
            </div>
            <p className="text-xs text-text-muted">Overall purchase rate</p>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono">
            {funnelSteps.map((step) => (
              <span
                key={step.step}
                className="px-2 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-accent font-semibold"
              >
                {step.rate}
              </span>
            ))}
          </div>
        </div>

        <div className="w-full h-24 relative overflow-hidden rounded-[var(--radius-sm)] bg-surface/50 border border-border/40 flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 400 90" preserveAspectRatio="none">
            <defs>
              <linearGradient id="funnelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.7" />
                <stop offset="35%" stopColor="var(--accent)" stopOpacity="0.5" />
                <stop offset="70%" stopColor="var(--accent)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.15" />
              </linearGradient>
            </defs>
            <path
              d="M0,10 C100,10 120,30 200,40 C280,50 300,65 400,75 L400,90 L0,90 Z"
              fill="url(#funnelGrad)"
            />
            <path
              d="M0,10 C100,10 120,30 200,40 C280,50 300,65 400,75"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2.5"
            />
          </svg>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {funnelSteps.map((item, idx) => (
            <div key={item.step} className="p-2 rounded bg-surface border border-border/60 space-y-1">
              <span className="text-[10px] text-text-muted block truncate">{item.step}</span>
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-xs font-semibold text-text-primary">{item.count}</span>
                <span className="font-mono text-[10px] text-accent font-medium">{item.rate}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative p-5 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-4">
        <CornerBracket />

        <div className="flex items-start justify-between">
          <div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-text-primary">
              {totalOrdersDisplay}
            </div>
            <p className="text-xs text-text-muted">Total orders distribution</p>
          </div>

          <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="15.5" className="text-surface stroke-current" strokeWidth="4" fill="none" />
              <circle
                cx="20"
                cy="20"
                r="15.5"
                className="text-accent stroke-current"
                strokeWidth="4"
                strokeDasharray="65 100"
                strokeDashoffset="0"
                strokeLinecap="round"
                fill="none"
              />
              <circle
                cx="20"
                cy="20"
                r="10.5"
                className="text-zinc-600 stroke-current"
                strokeWidth="2"
                strokeDasharray="40 100"
                fill="none"
              />
            </svg>
            <span className="absolute text-[11px] font-mono font-bold text-text-primary">65%</span>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          {trafficSources.map((source) => (
            <div key={source.name} className="flex items-center justify-between text-xs py-0.5">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${source.color} shrink-0`} />
                <span className="text-text-muted text-[11px]">{source.name}</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="text-text-muted">{source.count?.toLocaleString()}</span>
                <span className="font-semibold text-text-primary w-12 text-right">{source.percent}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ConversionAndTraffic;
