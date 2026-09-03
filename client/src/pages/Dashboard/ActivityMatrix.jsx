import { useNavigate } from "react-router-dom";
import { ChatCircleText, FileText, Image, Sparkle, ArrowRight, ShieldCheck } from "@phosphor-icons/react";

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

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return "Just now";
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
};

export function ActivityMatrix({ stats = {} }) {
  const navigate = useNavigate();
  const recent = Array.isArray(stats.recentActivity) ? stats.recentActivity : [];

  const actions = [
    { label: "AI Studio Chat", path: "/studio", desc: "Launch multimodal reasoning", icon: Sparkle },
    { label: "Asset Library", path: "/assets", desc: "Browse generated media & docs", icon: Image },
    { label: "Analytics Telemetry", path: "/analytics", desc: "View token & storage telemetry", icon: FileText }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
      <div className="relative lg:col-span-2 p-5 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-4">
        <CornerBracket />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChatCircleText size={18} className="text-accent" />
            <div className="text-base sm:text-lg font-bold font-mono tracking-tight text-text-primary">
              Recent Platform Activity
            </div>
          </div>
          <span className="text-[11px] font-mono text-text-muted">Live Stream</span>
        </div>

        <div className="space-y-2">
          {recent.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted">
              No recent activity recorded yet. Start a session in AI Studio.
            </div>
          ) : (
            recent.map((item) => {
              const isSession = item.type === "session";
              const isDoc = item.format === "pdf" || item.format === "docx" || item.format === "txt";
              return (
                <div
                  key={item.id}
                  onClick={() => navigate(isSession ? "/studio" : "/assets")}
                  className="group flex items-center justify-between p-2.5 rounded-[var(--radius-sm)] bg-surface hover:bg-surface/80 border border-border transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="p-1.5 rounded bg-surface-card border border-border text-accent shrink-0">
                      {isSession ? (
                        <ChatCircleText size={14} />
                      ) : isDoc ? (
                        <FileText size={14} className="text-indigo-400" />
                      ) : (
                        <Image size={14} className="text-emerald-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-text-primary truncate group-hover:text-accent transition-colors">
                        {item.title}
                      </p>
                      <p className="text-[10px] font-mono text-text-muted">
                        {isSession ? "Chat Session" : `Asset (${(item.format || "file").toUpperCase()})`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-text-muted">
                      {formatTimeAgo(item.timestamp)}
                    </span>
                    <ArrowRight size={12} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="relative p-5 rounded-[var(--radius-md)] bg-surface-card border border-border flex flex-col justify-between space-y-4">
        <CornerBracket />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-400" />
              <div className="text-base font-bold font-mono tracking-tight text-text-primary">
                System Health
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold">
              Operational
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-text-muted">Inference Gateway</span>
              <span className="font-mono text-emerald-400 font-semibold">Online (99.9%)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-text-muted">MongoDB Cluster</span>
              <span className="font-mono text-emerald-400 font-semibold">Connected</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-text-muted">Cloudinary CDN</span>
              <span className="font-mono text-emerald-400 font-semibold">Active</span>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          <span className="text-[11px] font-semibold text-text-primary block">Quick Navigation</span>
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.path}
                type="button"
                onClick={() => navigate(act.path)}
                className="w-full text-left p-2 rounded-[var(--radius-sm)] bg-surface hover:bg-accent/10 border border-border hover:border-accent/40 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon size={14} className="text-accent shrink-0" />
                  <span className="text-xs font-medium text-text-primary truncate">{act.label}</span>
                </div>
                <ArrowRight size={12} className="text-text-muted group-hover:text-accent shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ActivityMatrix;
