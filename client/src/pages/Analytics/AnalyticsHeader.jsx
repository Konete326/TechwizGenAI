import { ArrowsClockwise, Users, User, ShieldCheck } from "@phosphor-icons/react";
import { Loader } from "@/components/ui/Loader";

export function AnalyticsHeader({
  isAdmin,
  userList,
  selectedUserId,
  onSelectUser,
  onRefresh,
  loading,
  targetUser
}) {
  const getScopeDescription = () => {
    if (!isAdmin) return "Your personal AI usage, token burn, and storage telemetry.";
    if (selectedUserId === "all") return "Platform-wide aggregated metrics across all active users.";
    return `Filtered telemetry for ${targetUser?.name || "Selected User"} (${targetUser?.email || ""}).`;
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-text-primary">Analytics & Telemetry</h1>
          {isAdmin && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/15 text-accent border border-accent/30 font-mono uppercase">
              <ShieldCheck size={12} weight="bold" />
              <span>Admin Mode</span>
            </span>
          )}
        </div>
        <p className="text-xs text-text-muted">{getScopeDescription()}</p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {isAdmin && (
          <div className="relative">
            <select
              value={selectedUserId}
              onChange={(e) => onSelectUser(e.target.value)}
              className="h-9 px-3 py-1.5 rounded-[var(--radius-sm)] bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-accent cursor-pointer pr-8 font-sans"
              aria-label="Filter Analytics by User"
            >
              <option value="all">All Users (Platform Total)</option>
              {userList.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 h-9 px-3 py-1.5 rounded-[var(--radius-sm)] bg-surface hover:bg-surface-elevated text-xs font-medium text-text-muted hover:text-text-primary border border-border transition-colors cursor-pointer disabled:opacity-50"
          title="Refresh analytics"
          aria-label="Refresh analytics data"
        >
          {loading ? <Loader size={14} className="text-accent" /> : <ArrowsClockwise size={14} />}
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
}

export default AnalyticsHeader;
