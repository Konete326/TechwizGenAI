import { useState } from "react";

const PERIODS = ["7D", "14D", "30D"];

export function GenerationVelocityChart({ stats = {} }) {
  const [period, setPeriod] = useState("30D");
  const fullTimeline = Array.isArray(stats.velocityTimeline) ? stats.velocityTimeline : [];

  const sliceMap = { "7D": 7, "14D": 14, "30D": 30 };
  const timeline = fullTimeline.slice(-sliceMap[period]);

  const maxCount = Math.max(...timeline.map((t) => t.count), 1);
  const total = timeline.reduce((s, t) => s + t.count, 0);

  const mbStorage = Number(((stats.totalStorageBytes || 0) / (1024 * 1024)).toFixed(1));
  const storageQuota = 500;
  const storagePercent = Math.min(100, Math.round((mbStorage / storageQuota) * 100));
  const totalMedia = (stats.imageCount || 0) + (stats.documentCount || 0) || 1;
  const imgPct = Math.round(((stats.imageCount || 0) / totalMedia) * 100);
  const docPct = 100 - imgPct;

  const [tooltip, setTooltip] = useState(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full">
      <div className="lg:col-span-8 bg-[var(--surface-card)] border border-[var(--border)] rounded-xl p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <div className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {total.toLocaleString()}
            </div>
            <div className="text-xs text-[var(--text-muted)] font-normal">
              Total AI generations in last {sliceMap[period]} days
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] inline-block" />
                <span>Generations</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="relative inline-flex p-0.5 bg-[var(--surface)] rounded-lg text-[11px] border border-[var(--border)]">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 rounded-md font-medium transition text-[11px] ${period === p
                    ? "bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm font-semibold"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-500">
              <span>{stats.genDelta || "+0%"}</span>
              <span className="text-[var(--text-muted)] text-[10px]">vs prior period</span>
            </div>
          </div>
        </div>

        <div className="relative pt-6 pb-2">
          <div className="absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none opacity-40">
            {[100, 75, 50, 25, 0].map((v) => (
              <div key={v} className="border-b border-dashed border-[var(--border)] w-full flex justify-end">
                <span className="text-[10px] -mt-2 text-[var(--text-muted)] pr-1">
                  {v > 0 ? Math.round((v / 100) * maxCount) : "0"}
                </span>
              </div>
            ))}
          </div>

          <div className="relative h-52 flex items-end justify-between px-1 gap-px z-10">
            {timeline.map((col, i) => {
              const pct = Math.max(6, Math.round((col.count / maxCount) * 100));
              const label = col.date ? col.date.slice(5) : "-";
              return (
                <div
                  key={col.date || i}
                  className="flex-1 flex flex-col justify-end items-center cursor-pointer group"
                  onMouseEnter={(e) => setTooltip({ text: `${label}: ${col.count} gens`, x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setTooltip(null)}
                  onMouseMove={(e) => setTooltip((t) => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                >
                  <div className="w-full flex flex-col justify-end" style={{ height: "100%" }}>
                    <div
                      className="w-full rounded-t transition-all duration-200 group-hover:opacity-80"
                      style={{
                        height: `${pct}%`,
                        background: col.count === 0
                          ? "var(--surface)"
                          : "linear-gradient(to top, rgba(var(--accent-rgb),0.9), rgba(var(--accent-rgb),0.6))"
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-3 pt-2 px-1 border-t border-[var(--border)]">
            {timeline.length > 0 && (
              <>
                <span>{timeline[0]?.date?.slice(5)}</span>
                <span>{timeline[Math.floor(timeline.length / 4)]?.date?.slice(5)}</span>
                <span>{timeline[Math.floor(timeline.length / 2)]?.date?.slice(5)}</span>
                <span>{timeline[Math.floor((timeline.length * 3) / 4)]?.date?.slice(5)}</span>
                <span>{timeline[timeline.length - 1]?.date?.slice(5)}</span>
              </>
            )}
          </div>
        </div>

        {tooltip && (
          <div
            className="fixed z-50 pointer-events-none bg-[var(--surface-card)] border border-[var(--border)] text-[var(--text-primary)] text-[11px] font-medium py-1 px-2.5 rounded-md shadow-xl"
            style={{ left: tooltip.x, top: tooltip.y - 36, transform: "translateX(-50%)" }}
          >
            {tooltip.text}
          </div>
        )}
      </div>

      <div className="lg:col-span-4 bg-[var(--surface-card)] border border-[var(--border)] rounded-xl p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                {mbStorage} MB
              </div>
              <div className="text-xs text-[var(--text-muted)] font-normal mt-0.5">
                Cloud storage of {storageQuota} MB quota
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-500">
              <span>{storagePercent}% used</span>
            </div>
          </div>

          <div className="relative mt-8 pt-4 pb-2">
            <div className="h-40 flex items-end justify-between px-1 gap-1.5">
              {[imgPct, docPct, Math.min(storagePercent + 10, 100), storagePercent, Math.max(imgPct - 10, 5),
                docPct + 5, imgPct + 15, Math.min(storagePercent + 5, 100), docPct - 5, imgPct, storagePercent + 3, docPct + 8].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center group cursor-pointer">
                  <div
                    className="w-full rounded-sm transition-opacity group-hover:opacity-70"
                    style={{
                      height: `${Math.max(8, Math.min(h, 100))}%`,
                      backgroundImage: `linear-gradient(to bottom, rgba(var(--accent-rgb),0.6) 60%, transparent 40%)`,
                      backgroundSize: "100% 6px",
                      backgroundRepeat: "repeat-y"
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-3 pt-2 border-t border-[var(--border)]">
              <span>Images</span>
              <span>Docs</span>
              <span>Assets</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 mt-4">
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[var(--text-primary)] font-medium">Synthesized Images</span>
              <span className="text-[var(--text-muted)] font-semibold">{stats.imageCount || 0}</span>
            </div>
            <div className="h-1.5 w-full bg-[var(--surface)] rounded-full overflow-hidden border border-[var(--border)]">
              <div className="h-full bg-[var(--accent)] rounded-full transition-all duration-300" style={{ width: `${imgPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[var(--text-primary)] font-medium">Generated Documents</span>
              <span className="text-[var(--text-muted)] font-semibold">{stats.documentCount || 0}</span>
            </div>
            <div className="h-1.5 w-full bg-[var(--surface)] rounded-full overflow-hidden border border-[var(--border)]">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${docPct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GenerationVelocityChart;
