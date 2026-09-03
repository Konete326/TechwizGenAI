import { useState } from "react";
import { ChartBar } from "@phosphor-icons/react";

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

export function UsageChart({ timeline = [] }) {
  const [hoveredDay, setHoveredDay] = useState(null);

  const maxTokens = Math.max(...timeline.map((d) => d.tokens || 0), 100);

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length < 3) return dateStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const m = months[parseInt(parts[1], 10) - 1] || parts[1];
    return `${m} ${parts[2]}`;
  };

  return (
    <div className="relative p-5 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-4 w-full">
      <CornerBracket />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChartBar size={18} className="text-accent" />
          <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
            7-Day Token Velocity
          </h3>
        </div>
        <span className="text-[11px] font-mono text-text-muted">
          Peak: {maxTokens.toLocaleString()} tokens
        </span>
      </div>

      <div className="h-48 w-full flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-border/60">
        {timeline.map((item, idx) => {
          const heightPercent = Math.max(Math.round(((item.tokens || 0) / maxTokens) * 100), 4);
          const isHovered = hoveredDay?.date === item.date;

          return (
            <div
              key={item.date || idx}
              onMouseEnter={() => setHoveredDay(item)}
              onMouseLeave={() => setHoveredDay(null)}
              className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
            >
              {isHovered && (
                <div className="absolute -top-10 z-20 px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-[10px] font-mono text-white shadow-xl pointer-events-none whitespace-nowrap">
                  <span className="block font-semibold">{formatDateLabel(item.date)}</span>
                  <span className="text-accent">{(item.tokens || 0).toLocaleString()} tokens</span>
                </div>
              )}

              <div className="w-full max-w-[48px] bg-surface rounded-t-md overflow-hidden flex items-end h-full">
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full transition-all duration-300 rounded-t-sm ${
                    isHovered
                      ? "bg-accent shadow-lg shadow-accent/20"
                      : "bg-zinc-700 hover:bg-zinc-600"
                  }`}
                />
              </div>

              <span className="text-[10px] font-mono text-text-muted mt-2 truncate w-full text-center">
                {formatDateLabel(item.date)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-text-muted pt-1">
        <span>Window: Last 7 calendar days</span>
        <span>Standard pricing applied: $0.10/M In, $0.40/M Out</span>
      </div>
    </div>
  );
}

export default UsageChart;
