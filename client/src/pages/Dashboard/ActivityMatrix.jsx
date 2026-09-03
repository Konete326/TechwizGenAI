import { Users, Plus, ArrowSquareOut, Clock, ChartBar } from "@phosphor-icons/react";
import logoImg from "@/assets/logo.png";

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

const days = ["M", "T", "W", "T", "F", "S", "S"];

const intensityColors = {
  1: "bg-accent/15",
  2: "bg-accent/40",
  3: "bg-accent/70",
  4: "bg-accent",
};

export function ActivityMatrix({
  trafficBars = [],
  heatmap = [],
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      <div className="relative p-4 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-3">
        <CornerBracket />
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-text-primary text-[11px]">Traffic Sources</span>
          <ChartBar size={14} className="text-text-muted" />
        </div>
        <div className="space-y-2 pt-1">
          {trafficBars.map((item) => (
            <div key={item.channel} className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-text-muted">{item.channel}</span>
                <span className="font-mono text-text-primary font-medium">{item.pct}%</span>
              </div>
              <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden border border-border/60">
                <div className="h-full bg-accent rounded-full" style={{ width: `${item.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative p-4 rounded-[var(--radius-md)] bg-surface-card border border-border flex flex-col justify-between space-y-3">
        <CornerBracket />
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-text-primary text-[11px]">Team</span>
          <Users size={14} className="text-text-muted" />
        </div>
        <div className="text-center py-2 space-y-2">
          <div className="flex justify-center -space-x-2">
            <img src={logoImg} alt="TG" className="w-7 h-7 rounded-full object-contain bg-surface border-2 border-surface-card" />
            <div className="w-7 h-7 rounded-full bg-blue-400 text-white flex items-center justify-center text-[10px] font-bold border-2 border-surface-card">
              AI
            </div>
            <div className="w-7 h-7 rounded-full bg-zinc-600 text-white flex items-center justify-center text-[10px] font-bold border-2 border-surface-card">
              SH
            </div>
          </div>
          <p className="text-xs font-medium text-text-muted">No Team Members</p>
        </div>
        <button
          type="button"
          className="w-full py-1.5 px-3 rounded-[var(--radius-sm)] border border-border hover:border-accent hover:bg-accent/10 text-text-primary hover:text-accent text-xs font-medium flex items-center justify-center gap-1.5 transition-colors btn-tactile cursor-pointer"
        >
          <Plus size={12} weight="bold" />
          <span>Invite Members</span>
        </button>
      </div>

      <div className="relative p-4 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-3">
        <CornerBracket />
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-text-primary text-[11px]">Sales by Hour</span>
          <Clock size={14} className="text-text-muted" />
        </div>
        <div className="space-y-1 pt-1">
          {heatmap.map((row, rIdx) => (
            <div key={rIdx} className="flex items-center gap-1">
              <span className="w-2.5 text-[8px] font-mono text-text-muted">{days[rIdx]}</span>
              <div className="flex-1 grid grid-cols-12 gap-0.5 sm:grid-cols-24">
                {row.map((val, cIdx) => (
                  <div
                    key={cIdx}
                    className={`h-2.5 rounded-xs ${intensityColors[val] || "bg-accent/15"} transition-opacity hover:opacity-80`}
                    title={`Day ${days[rIdx]} hour ${cIdx}:00`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-[9px] text-text-muted pt-1 border-t border-border/50 font-mono">
          <span>Lower</span>
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-xs bg-accent/15" />
            <span className="w-2 h-2 rounded-xs bg-accent/40" />
            <span className="w-2 h-2 rounded-xs bg-accent/70" />
            <span className="w-2 h-2 rounded-xs bg-accent" />
          </div>
          <span>Higher</span>
        </div>
      </div>

      <div className="relative p-4 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-3">
        <CornerBracket />
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-text-primary text-[11px]">Quick Actions</span>
          <ArrowSquareOut size={14} className="text-text-muted" />
        </div>
        <div className="space-y-1.5 pt-1">
          <button
            type="button"
            className="w-full text-left p-2 rounded-[var(--radius-sm)] bg-surface hover:bg-accent/10 text-xs font-medium text-text-primary border border-border hover:border-accent/40 transition-colors flex items-center justify-between group btn-tactile cursor-pointer"
          >
            <span>+ Add Campaign</span>
            <span className="text-text-muted group-hover:text-accent font-mono text-xs">{">"}</span>
          </button>
          <button
            type="button"
            className="w-full text-left p-2 rounded-[var(--radius-sm)] bg-surface hover:bg-accent/10 text-xs font-medium text-text-primary border border-border hover:border-accent/40 transition-colors flex items-center justify-between group btn-tactile cursor-pointer"
          >
            <span>Review unfulfilled</span>
            <span className="text-text-muted group-hover:text-accent font-mono text-xs">{">"}</span>
          </button>
          <button
            type="button"
            className="w-full text-left p-2 rounded-[var(--radius-sm)] bg-surface hover:bg-accent/10 text-xs font-medium text-text-primary border border-border hover:border-accent/40 transition-colors flex items-center justify-between group btn-tactile cursor-pointer"
          >
            <span>Workspace settings</span>
            <span className="text-text-muted group-hover:text-accent font-mono text-xs">{">"}</span>
          </button>
          <button
            type="button"
            className="w-full text-left p-2 rounded-[var(--radius-sm)] bg-surface hover:bg-accent/10 text-xs font-medium text-text-primary border border-border hover:border-accent/40 transition-colors flex items-center justify-between group btn-tactile cursor-pointer"
          >
            <span>Export sales</span>
            <span className="text-text-muted group-hover:text-accent font-mono text-xs">{">"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ActivityMatrix;
