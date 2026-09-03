import { Funnel, Checks, Trash, CheckCircle, WarningCircle } from "@phosphor-icons/react";

export function NotificationSidebar({
  filter,
  onFilterChange,
  counts,
  unreadCount,
  markAllAsRead,
  clearNotifications,
  hasNotifications
}) {
  return (
    <div className="relative p-5 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-4 h-fit">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Funnel size={16} className="text-accent" />
        <h3 className="text-sm font-semibold text-text-primary">Overview & Filters</h3>
      </div>

      <div className="space-y-1.5 text-xs">
        <button
          type="button"
          onClick={() => onFilterChange("ALL")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
            filter === "ALL" ? "bg-accent/15 text-accent font-semibold border border-accent/30" : "text-text-muted hover:bg-surface"
          }`}
        >
          <span>All Notifications</span>
          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-surface border border-border">{counts.all}</span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("unread")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
            filter === "unread" ? "bg-accent/15 text-accent font-semibold border border-accent/30" : "text-text-muted hover:bg-surface"
          }`}
        >
          <span>Unread Alerts</span>
          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 font-semibold">{counts.unread}</span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("success")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
            filter === "success" ? "bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30" : "text-text-muted hover:bg-surface"
          }`}
        >
          <span className="flex items-center gap-1.5"><CheckCircle size={14} /> Success</span>
          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-surface border border-border">{counts.success}</span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("error")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
            filter === "error" ? "bg-rose-500/15 text-rose-400 font-semibold border border-rose-500/30" : "text-text-muted hover:bg-surface"
          }`}
        >
          <span className="flex items-center gap-1.5"><WarningCircle size={14} /> System Alerts</span>
          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-surface border border-border">{counts.error}</span>
        </button>
      </div>

      <div className="pt-3 border-t border-border space-y-2">
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] bg-surface border border-border text-xs font-semibold text-text-primary hover:border-accent transition-colors cursor-pointer"
          >
            <Checks size={14} />
            <span>Mark all as read</span>
          </button>
        )}

        {hasNotifications && (
          <button
            type="button"
            onClick={clearNotifications}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] bg-rose-950/20 border border-rose-800/40 text-rose-400 hover:bg-rose-950/40 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Trash size={14} />
            <span>Clear History</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default NotificationSidebar;
