import { X, ShieldCheck, UserCheck, UserMinus, Calendar, Clock, Sparkle, HardDrive } from "@phosphor-icons/react";
import { Loader } from "@/components/ui/Loader";

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

export function UserProfileModal({
  isOpen,
  onClose,
  user,
  onStatusChange,
  isUpdating
}) {
  if (!isOpen || !user) return null;

  const isSuspended = user.status === "suspended";
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const activityDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const activityHeights = [40, 75, 55, 90, 60, 30, 80];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative max-w-lg w-full bg-surface-card border border-border rounded-[var(--radius-lg)] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        <CornerBracket />

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            {user.profileImage ? (
              <img src={user.profileImage} alt={user.name} className="w-12 h-12 rounded-full object-cover border border-border" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-accent/20 border border-accent/40 text-accent font-bold text-sm flex items-center justify-center">
                {initials}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-text-primary tracking-tight">{user.name}</h3>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                    isSuspended
                      ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                      : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                  }`}
                >
                  {user.status || "active"}
                </span>
              </div>
              <p className="text-xs font-mono text-text-muted">{user.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isUpdating}
            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-[var(--radius-sm)] bg-surface border border-border/70 space-y-1">
            <span className="text-[10px] font-mono text-text-muted uppercase flex items-center gap-1.5">
              <Sparkle size={12} className="text-accent" /> AI Generations
            </span>
            <div className="text-lg font-bold font-mono text-text-primary">
              {user.generationCount ?? 0}
            </div>
          </div>
          <div className="p-3 rounded-[var(--radius-sm)] bg-surface border border-border/70 space-y-1">
            <span className="text-[10px] font-mono text-text-muted uppercase flex items-center gap-1.5">
              <HardDrive size={12} className="text-blue-400" /> Cloud Assets
            </span>
            <div className="text-lg font-bold font-mono text-text-primary">
              {user.assetCount ?? 0}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-medium text-text-primary">Weekly Request Activity</span>
          <div className="p-3 rounded-[var(--radius-sm)] bg-surface border border-border/70">
            <div className="h-20 flex items-end justify-between gap-2 pt-2">
              {activityDays.map((day, idx) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div
                    className="w-full max-w-[18px] bg-accent/70 hover:bg-accent rounded-xs transition-all"
                    style={{ height: `${activityHeights[idx]}%` }}
                  />
                  <span className="text-[9px] font-mono text-text-muted">{day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-text-muted pt-2 border-t border-border/60">
          <span className="flex items-center gap-1">
            <Calendar size={13} /> Registered: {new Date(user.createdAt).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={13} /> Last Login: {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}
          </span>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isUpdating}
            className="px-3.5 py-1.5 rounded-[var(--radius-sm)] border border-border hover:bg-surface text-xs font-medium text-text-primary transition-colors cursor-pointer"
          >
            Close
          </button>

          {user.role !== "admin" && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onStatusChange(user.id, isSuspended ? "active" : "suspended")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold shadow-sm transition-colors btn-tactile cursor-pointer disabled:opacity-50 ${
                isSuspended
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-rose-600 hover:bg-rose-500 text-white"
              }`}
            >
              {isUpdating ? (
                <Loader size={13} className="text-white" />
              ) : isSuspended ? (
                <UserCheck size={14} weight="bold" />
              ) : (
                <UserMinus size={14} weight="bold" />
              )}
              <span>{isUpdating ? "Updating..." : isSuspended ? "Activate Account" : "Suspend Account"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserProfileModal;
