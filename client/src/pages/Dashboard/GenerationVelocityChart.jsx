import { Sparkle, HardDrives } from "@phosphor-icons/react";

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

export function GenerationVelocityChart({ stats = {} }) {
  const timeline = Array.isArray(stats.velocityTimeline) ? stats.velocityTimeline : [];
  const maxCount = Math.max(...timeline.map((t) => t.count), 5);
  const total7DayGens = timeline.reduce((sum, t) => sum + t.count, 0);

  const mbStorage = Number(((stats.totalStorageBytes || 0) / (1024 * 1024)).toFixed(2));
  const storageQuotaMb = 500;
  const storagePercent = Math.min(100, Math.round((mbStorage / storageQuotaMb) * 100));

  const totalMedia = (stats.imageCount || 0) + (stats.documentCount || 0) || 1;
  const imgPercent = Math.round(((stats.imageCount || 0) / totalMedia) * 100);
  const docPercent = 100 - imgPercent;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
      <div className="relative lg:col-span-2 p-5 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-4">
        <CornerBracket />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkle size={18} className="text-accent" />
              <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-text-primary">
                {total7DayGens.toLocaleString()} Generations
              </div>
            </div>
            <p className="text-xs text-text-muted">7-day continuous generation velocity</p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-text-muted text-[11px] font-mono">
              <span className="w-2 h-2 rounded-xs bg-accent inline-block" /> Live Pipeline
            </span>
          </div>
        </div>

        <div className="h-52 w-full flex items-end justify-between gap-2 pt-4 px-2">
          {timeline.map((col) => {
            const heightPct = Math.max(8, Math.round((col.count / maxCount) * 100));
            const dayLabel = col.date ? col.date.slice(5) : "-";
            return (
              <div key={col.date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                <div className="w-full max-w-[34px] flex flex-col justify-end h-40 bg-surface/40 rounded-xs overflow-hidden">
                  <div
                    className="w-full bg-accent hover:bg-accent-hover transition-all duration-300 rounded-t-xs"
                    style={{ height: `${heightPct}%` }}
                    title={`${col.count} generations on ${col.date}`}
                  />
                </div>
                <div className="text-center">
                  <span className="block text-[10px] font-mono font-medium text-text-primary">
                    {col.count}
                  </span>
                  <span className="block text-[9px] font-mono text-text-muted">
                    {dayLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative p-5 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-4">
        <CornerBracket />

        <div>
          <div className="flex items-center gap-2">
            <HardDrives size={18} className="text-accent" />
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-text-primary">
              {mbStorage} MB / {storageQuotaMb} MB
            </div>
          </div>
          <p className="text-xs text-text-muted">Cloudinary persistent asset quota</p>
        </div>

        <div className="p-3 rounded-[var(--radius-sm)] bg-surface border border-border flex items-center justify-between text-xs">
          <span className="text-text-muted text-[11px]">Storage Allocation</span>
          <span className="font-mono font-semibold text-accent text-[11px]">{storagePercent}% Utilized</span>
        </div>

        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-text-primary text-[11px]">Synthesized Images</span>
              <span className="font-mono text-text-muted text-[11px]">
                {stats.imageCount || 0} files ({imgPercent}%)
              </span>
            </div>
            <div className="relative h-2 w-full bg-surface rounded-full overflow-hidden border border-border/60">
              <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${imgPercent}%` }} />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-text-primary text-[11px]">Parsed & Built Documents</span>
              <span className="font-mono text-text-muted text-[11px]">
                {stats.documentCount || 0} files ({docPercent}%)
              </span>
            </div>
            <div className="relative h-2 w-full bg-surface rounded-full overflow-hidden border border-border/60">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${docPercent}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GenerationVelocityChart;
