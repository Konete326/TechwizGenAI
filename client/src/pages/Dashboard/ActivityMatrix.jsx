import { useNavigate } from "react-router-dom";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_LABELS = ["12a", "4a", "8a", "12p", "4p", "8p", "12a"];
const HOUR_SLOTS = 12;

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
  const hourlyMatrix = stats.hourlyMatrix || {};

  const maxHeat = Math.max(1, ...Object.values(hourlyMatrix));

  const getHeat = (dow, slot) => {
    const key = `${dow}_${slot}`;
    const val = hourlyMatrix[key] || 0;
    return Math.round((val / maxHeat) * 5);
  };

  const heatBg = (level) => {
    const levels = [
      "var(--surface)",
      "rgba(var(--accent-rgb),0.15)",
      "rgba(var(--accent-rgb),0.3)",
      "rgba(var(--accent-rgb),0.5)",
      "rgba(var(--accent-rgb),0.75)",
      "rgba(var(--accent-rgb),1)"
    ];
    return levels[Math.min(level, 5)];
  };

  const quickActions = [
    { label: "AI Studio", desc: "Launch multimodal reasoning", path: "/studio", icon: "sparkle" },
    { label: "Asset Library", desc: "Browse generated media", path: "/assets", icon: "folder" },
    { label: "Analytics", desc: "View token and storage telemetry", path: "/analytics", icon: "chart" }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5 text-[var(--text-primary)] font-semibold text-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Recent Activity</span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-medium">Live</span>
          </div>
          <div className="space-y-2">
            {recent.length === 0 ? (
              <p className="text-[11px] text-[var(--text-muted)] text-center py-4">No recent activity. Start a session.</p>
            ) : (
              recent.slice(0, 5).map((item) => {
                const isSession = item.type === "session";
                return (
                  <div
                    key={item.id}
                    onClick={() => navigate(isSession ? "/studio" : "/assets")}
                    className="group flex items-center justify-between p-2 rounded-lg hover:bg-[var(--surface)] border border-transparent hover:border-[var(--border)] transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
                        {item.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] shrink-0 ml-1">{formatTimeAgo(item.timestamp)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex flex-col items-center justify-between">
        <div className="w-full flex items-center gap-1.5 text-[var(--text-primary)] font-semibold text-xs mb-2">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>System Health</span>
        </div>
        <div className="my-auto py-2 w-full space-y-2">
          {[
            { label: "Inference Gateway", status: "Online (99.9%)" },
            { label: "MongoDB Cluster", status: "Connected" },
            { label: "Cloudinary CDN", status: "Active" },
            { label: "WebSocket Bridge", status: "Live" }
          ].map((srv) => (
            <div key={srv.label} className="flex justify-between py-1.5 border-b border-[var(--border)] last:border-0">
              <span className="text-[11px] text-[var(--text-muted)]">{srv.label}</span>
              <span className="text-[11px] font-mono text-emerald-500 font-semibold">{srv.status}</span>
            </div>
          ))}
        </div>
        <div className="w-full py-1.5 px-3 border border-[var(--border)] rounded-lg text-[11px] font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1 bg-[var(--surface)]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
          Operational
        </div>
      </div>

      <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-[var(--text-primary)] font-semibold text-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Activity Heatmap</span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-medium">Last 7 days</span>
          </div>

          <div className="space-y-1 pt-1">
            {[1, 2, 3, 4, 5, 6, 0].map((dow) => (
              <div key={dow} className="flex items-center gap-1">
                <span className="w-5 text-[9px] text-[var(--text-muted)]">{DOW_LABELS[dow]}</span>
                <div className="grid gap-0.5 flex-1" style={{ gridTemplateColumns: `repeat(${HOUR_SLOTS}, 1fr)` }}>
                  {Array.from({ length: HOUR_SLOTS }, (_, slot) => {
                    const heat = getHeat(dow === 0 ? 1 : dow + 1, slot);
                    return (
                      <div
                        key={slot}
                        className="h-2 rounded-[1px] hover:scale-125 transition"
                        style={{ background: heatBg(heat) }}
                        title={`${DOW_LABELS[dow]} ${slot * 2}h: ${hourlyMatrix[`${dow === 0 ? 1 : dow + 1}_${slot}`] || 0} gens`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between text-[8px] text-[var(--text-muted)] pl-6 mt-2 pt-1 border-t border-[var(--border)]">
            {HOUR_LABELS.map((l) => <span key={l}>{l}</span>)}
          </div>
          <div className="flex items-center justify-between text-[9px] text-[var(--text-muted)] mt-2">
            <span>Lower</span>
            <div className="flex items-center gap-0.5">
              {[0, 1, 2, 3, 4, 5].map((l) => (
                <div key={l} className="w-2 h-2 rounded-[1px]" style={{ background: heatBg(l) }} />
              ))}
            </div>
            <span>Higher</span>
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[var(--text-primary)] font-semibold text-xs mb-3">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span>Quick Actions</span>
          </div>
          <div className="space-y-1.5">
            {quickActions.map((act) => (
              <button
                key={act.path}
                type="button"
                onClick={() => navigate(act.path)}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[var(--surface)] transition group border border-transparent hover:border-[var(--border)] cursor-pointer"
              >
                <div className="flex items-start gap-2.5">
                  <ActionIcon name={act.icon} />
                  <div className="text-left">
                    <div className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{act.label}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{act.desc}</div>
                  </div>
                </div>
                <svg className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionIcon({ name }) {
  if (name === "sparkle") return (
    <svg className="w-3.5 h-3.5 text-[var(--accent)] mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" strokeLinejoin="round" />
    </svg>
  );
  if (name === "folder") return (
    <svg className="w-3.5 h-3.5 text-[var(--accent)] mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  return (
    <svg className="w-3.5 h-3.5 text-[var(--accent)] mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default ActivityMatrix;
