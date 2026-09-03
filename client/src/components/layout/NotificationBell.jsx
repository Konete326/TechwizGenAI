import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Checks, ArrowRight } from "@phosphor-icons/react";
import { useNotifications } from "@/context/ToastContext";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const recentNotifications = notifications.slice(0, 5);

  const handleNotificationClick = (n) => {
    markAsRead(n.id);
    setIsOpen(false);
    navigate(n.href || n.link || "/dashboard");
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-[var(--radius-sm)] text-text-muted hover:text-text-primary hover:bg-surface border border-border transition-colors cursor-pointer"
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="w-2 h-2 rounded-full bg-blue-500 absolute top-1.5 right-1.5 ring-2 ring-background" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-[var(--radius-md)] bg-surface-card border border-border shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border bg-surface/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-primary">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-semibold">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] text-accent hover:text-accent-hover font-medium flex items-center gap-1 cursor-pointer"
              >
                <Checks size={13} />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-border/60">
            {recentNotifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">
                No new notifications
              </div>
            ) : (
              recentNotifications.map((n) => {
                const isSuccess = n.type === "success";
                const isError = n.type === "error";

                const borderClass = isSuccess
                  ? "border-l-emerald-500"
                  : isError
                  ? "border-l-rose-500"
                  : "border-l-blue-500";

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`group px-3.5 py-2.5 hover:bg-surface/80 transition-colors border-l-2 ${borderClass} cursor-pointer ${
                      !n.readStatus ? "bg-surface/30" : "opacity-75"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-semibold text-text-primary truncate">
                          {n.title}
                        </span>
                        <ArrowRight size={11} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                      <span className="text-[10px] font-mono text-text-muted shrink-0">
                        {n.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed line-clamp-2">
                      {n.message}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2 border-t border-border bg-surface/30">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate("/notifications");
              }}
              className="w-full py-1.5 text-center text-xs font-medium text-text-muted hover:text-text-primary hover:bg-surface rounded transition-colors cursor-pointer"
            >
              View all history
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
