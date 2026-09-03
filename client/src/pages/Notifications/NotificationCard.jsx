import { CheckCircle, WarningCircle, Info, Trash, ArrowRight } from "@phosphor-icons/react";

export function NotificationCard({ notification, onRowClick, onRemove }) {
  const isSuccess = notification.type === "success";
  const isError = notification.type === "error";
  const dest = notification.href || notification.link;

  const borderClass = isSuccess
    ? "border-l-emerald-500"
    : isError
    ? "border-l-rose-500"
    : "border-l-blue-500";

  return (
    <div
      onClick={() => onRowClick(notification)}
      className={`relative group p-3.5 rounded-[var(--radius-md)] bg-surface-card border border-border hover:border-accent/40 transition-all border-l-4 ${borderClass} flex items-start justify-between gap-3.5 ${
        dest ? "cursor-pointer hover:bg-surface/60" : ""
      } ${!notification.readStatus ? "bg-surface/30 shadow-sm" : "opacity-80"}`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="mt-0.5 shrink-0">
          {isSuccess && <CheckCircle size={17} weight="fill" className="text-emerald-400" />}
          {isError && <WarningCircle size={17} weight="fill" className="text-rose-400" />}
          {!isSuccess && !isError && <Info size={17} weight="fill" className="text-blue-400" />}
        </div>

        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold text-text-primary truncate">{notification.title}</h4>
            {notification.userName && (
              <span className="text-[10px] text-accent font-mono bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20 truncate max-w-[120px]">
                {notification.userName}
              </span>
            )}
            {!notification.readStatus && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            )}
            {dest && (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.2 rounded bg-surface border border-border text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                Open <ArrowRight size={10} />
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted leading-relaxed">{notification.message}</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <span className="font-mono text-[10px] text-text-muted">{notification.timestamp}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(notification.id);
          }}
          className="p-1 rounded text-text-muted hover:text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer"
          title="Delete notification"
          aria-label="Delete notification"
        >
          <Trash size={13} />
        </button>
      </div>
    </div>
  );
}

export default NotificationCard;
