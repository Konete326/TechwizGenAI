import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BellSlash, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useNotifications } from "@/context/ToastContext";
import { NotificationCard } from "./NotificationCard";
import { NotificationSidebar } from "./NotificationSidebar";

const ITEMS_PER_PAGE = 5;

export function Notifications() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const {
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
    removeNotification,
    clearNotifications,
  } = useNotifications();

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === "unread") return !n.readStatus;
      if (filter === "success") return n.type === "success";
      if (filter === "error") return n.type === "error";
      if (filter === "info") return n.type === "info";
      return true;
    });
  }, [notifications, filter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const handleRowClick = (n) => {
    markAsRead(n.id);
    const dest = n.href || n.link;
    if (dest) {
      navigate(dest);
    }
  };

  const counts = {
    all: notifications.length,
    unread: unreadCount,
    success: notifications.filter((n) => n.type === "success").length,
    error: notifications.filter((n) => n.type === "error").length,
  };

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="pb-3 border-b border-border/60">
        <h2 className="text-xl font-bold tracking-tight text-text-primary">Notification History</h2>
        <p className="text-xs text-text-muted mt-0.5">Audit log of real-time platform system events, generation alerts, and account activity.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        <NotificationSidebar
          filter={filter}
          onFilterChange={(f) => {
            setFilter(f);
            setCurrentPage(1);
          }}
          counts={counts}
          unreadCount={unreadCount}
          markAllAsRead={markAllAsRead}
          clearNotifications={clearNotifications}
          hasNotifications={notifications.length > 0}
        />

        <div className="lg:col-span-2 space-y-3">
          {paginated.length === 0 ? (
            <div className="relative p-12 rounded-[var(--radius-md)] bg-surface-card border border-border text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center text-text-muted mx-auto">
                <BellSlash size={22} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-text-primary">No notifications found</h3>
                <p className="text-xs text-text-muted">There are no records matching your selected filter criteria.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {paginated.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  onRowClick={handleRowClick}
                  onRemove={removeNotification}
                />
              ))}
            </div>
          )}

          {filtered.length > 0 && (
            <div className="p-3 rounded-[var(--radius-md)] bg-surface-card border border-border flex items-center justify-between text-xs">
              <span className="font-mono text-[11px] text-text-muted">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-[var(--radius-sm)] bg-surface border border-border text-text-muted hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Previous page"
                >
                  <CaretLeft size={14} />
                </button>

                <span className="font-mono text-[11px] px-2 text-text-primary font-medium">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-[var(--radius-sm)] bg-surface border border-border text-text-muted hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Next page"
                >
                  <CaretRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Notifications;
