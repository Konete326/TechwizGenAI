export function ModelDistributionCard({ stats = {} }) {
  const models = Array.isArray(stats.modelDistribution) ? stats.modelDistribution : [];
  const totalGens = stats.totalGenerations || 1;
  const totalAssets = stats.totalAssetCount || 0;
  const imageCount = stats.imageCount || 0;
  const docCount = stats.documentCount || 0;
  const sessions = stats.activeSessions || 0;

  const funnelStages = [
    { label: "Total Sessions", value: sessions, pct: 100 },
    { label: "Generated Responses", value: totalGens, pct: sessions > 0 ? Math.min(100, Math.round((totalGens / sessions) * 100)) : 0 },
    { label: "Saved as Assets", value: totalAssets, pct: totalGens > 0 ? Math.min(100, Math.round((totalAssets / totalGens) * 100)) : 0 },
    { label: "Media Files", value: imageCount, pct: totalAssets > 0 ? Math.min(100, Math.round((imageCount / totalAssets) * 100)) : 0 }
  ];

  const modelColors = ["bg-[var(--accent)]", "bg-indigo-500", "bg-sky-400", "bg-purple-400"];
  const modelBg = ["rgba(var(--accent-rgb),0.85)", "rgba(99,102,241,0.85)", "rgba(56,189,248,0.85)", "rgba(196,181,253,0.85)"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full">
      <div className="lg:col-span-7 bg-[var(--surface-card)] border border-[var(--border)] rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {sessions.toLocaleString()}
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              Session to asset conversion pipeline - Last 30 days
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-500">
            <span>+{totalGens > 0 ? Math.round((totalGens / Math.max(sessions, 1)) * 100) : 0}%</span>
            <span className="text-[var(--text-muted)] text-[10px]">gen rate</span>
          </div>
        </div>

        <div className="relative pt-4 pb-2">
          <div className="grid grid-cols-4 text-center font-bold text-[var(--text-primary)] text-xs mb-3">
            {funnelStages.map((s) => (
              <div key={s.label}>{s.value.toLocaleString()}</div>
            ))}
          </div>

          <div className="relative h-40 w-full">
            <svg className="w-full h-full" viewBox="0 0 700 160" preserveAspectRatio="none">
              <defs>
                <linearGradient id="funnel1" x1="0%" x2="100%" y1="0%" y2="0%">
                  <stop offset="0%" stopColor="rgba(var(--accent-rgb),0.3)" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="rgba(var(--accent-rgb),0.6)" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="funnel2" x1="0%" x2="100%" y1="0%" y2="0%">
                  <stop offset="0%" stopColor="rgba(var(--accent-rgb),0.6)" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="rgba(var(--accent-rgb),0.8)" stopOpacity="0.85" />
                </linearGradient>
                <linearGradient id="funnel3" x1="0%" x2="100%" y1="0%" y2="0%">
                  <stop offset="0%" stopColor="rgba(var(--accent-rgb),0.8)" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="rgba(var(--accent-rgb),1)" stopOpacity="0.95" />
                </linearGradient>
              </defs>
              <path className="transition-opacity hover:opacity-80 cursor-pointer"
                d="M 0 10 C 85 10, 95 36, 185 36 L 185 124 C 95 124, 85 150, 0 150 Z"
                fill="url(#funnel1)" />
              <path className="transition-opacity hover:opacity-80 cursor-pointer"
                d="M 185 36 C 265 36, 280 60, 365 60 L 365 100 C 280 100, 265 124, 185 124 Z"
                fill="url(#funnel2)" />
              <path className="transition-opacity hover:opacity-80 cursor-pointer"
                d="M 365 60 C 455 60, 465 72, 550 72 L 550 88 C 465 88, 455 100, 365 100 Z"
                fill="url(#funnel3)" />
              <path className="transition-opacity hover:opacity-80 cursor-pointer"
                d="M 550 72 L 700 72 L 700 88 L 550 88 Z"
                fill="rgba(var(--accent-rgb),1)" />
              <line x1="185" x2="185" y1="0" y2="160" stroke="var(--surface-card)" strokeOpacity="0.5" strokeWidth="2" />
              <line x1="365" x2="365" y1="0" y2="160" stroke="var(--surface-card)" strokeOpacity="0.5" strokeWidth="2" />
              <line x1="550" x2="550" y1="0" y2="160" stroke="var(--surface-card)" strokeOpacity="0.5" strokeWidth="2" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-around pointer-events-none">
              {funnelStages.map((s) => (
                <span key={s.label} className="bg-[var(--surface-card)] border border-[var(--border)] text-[var(--text-primary)] px-2 py-0.5 rounded-full shadow text-[11px] font-bold">
                  {s.pct}%
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 text-center text-[11px] text-[var(--text-muted)] mt-2 font-medium">
            {funnelStages.map((s) => (
              <span key={s.label}>{s.label}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-5 bg-[var(--surface-card)] border border-[var(--border)] rounded-xl p-6 shadow-sm flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {totalGens.toLocaleString()}
            </div>
            <div className="text-xs text-[var(--text-muted)]">Total AI generations breakdown</div>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-500">
            <span>Google GenAI</span>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 items-center pt-4 my-auto">
          <div className="col-span-5 flex justify-center">
            <div className="relative w-32 h-32 rounded-full overflow-hidden border border-[var(--border)] shadow-inner">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <defs>
                  {models.map((m, i) => (
                    <pattern key={i} id={`hp${i}`} patternUnits="userSpaceOnUse" width={4 + i} height={4 + i} patternTransform={`rotate(${45 + i * 30} 0 0)`}>
                      <line x1="0" x2="0" y1="0" y2={4 + i} stroke={modelBg[i]} strokeWidth="1.4" />
                    </pattern>
                  ))}
                </defs>
                {models.reduce((acc, m, i) => {
                  const prev = acc.offset;
                  const dash = (m.percent / 100) * 157;
                  acc.elements.push(
                    <circle key={i} cx="50" cy="50" r="25" fill="transparent"
                      stroke={`url(#hp${i})`} strokeWidth="50"
                      strokeDasharray={`${dash} 157`}
                      strokeDashoffset={-prev}
                      className="hover:opacity-80 transition-opacity duration-150 cursor-pointer"
                    />
                  );
                  acc.offset += dash;
                  return acc;
                }, { elements: [], offset: 0 }).elements}
              </svg>
            </div>
          </div>
          <div className="col-span-7 space-y-2.5 text-[11px]">
            {models.map((m, i) => (
              <div key={m.name} className="flex items-center justify-between group cursor-pointer hover:text-[var(--text-primary)]">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-sm inline-block ${modelColors[i]}`} />
                  <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] font-medium truncate max-w-[100px]">{m.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--text-primary)]">{m.percent}%</span>
                  <span className="text-[var(--text-muted)]">{m.share}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModelDistributionCard;
