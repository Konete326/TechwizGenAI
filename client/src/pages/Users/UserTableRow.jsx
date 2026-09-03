import { Eye, ShieldCheck } from "@phosphor-icons/react";

export function UserTableRow({ user, onSelect }) {
  const isSuspended = user.status === "suspended";
  const isAdmin = user.role === "admin";
  const initial = user.name ? user.name[0].toUpperCase() : "U";

  return (
    <tr className="hover:bg-surface/50 transition-colors group">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/40 text-accent font-semibold text-[11px] flex items-center justify-center shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-text-primary block truncate">{user.name}</span>
            <span className="font-mono text-[10px] text-text-muted block truncate">{user.email}</span>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <span
          className={`inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded border ${
            isAdmin
              ? "bg-purple-500/10 text-purple-400 border-purple-500/20 font-semibold"
              : "bg-surface text-text-muted border-border"
          }`}
        >
          {isAdmin && <ShieldCheck size={11} />} {user.role}
        </span>
      </td>
      <td className="py-3 px-4">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
            isSuspended
              ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
              : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
          }`}
        >
          {user.status || "active"}
        </span>
      </td>
      <td className="py-3 px-4 font-mono text-[11px] text-text-primary font-medium">
        {user.generationCount ?? 0}
      </td>
      <td className="py-3 px-4 font-mono text-[11px] text-text-muted">
        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}
      </td>
      <td className="py-3 px-4 text-right">
        <button
          type="button"
          onClick={() => onSelect(user)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-sm)] border border-border hover:border-accent text-text-muted hover:text-accent font-medium text-xs transition-colors btn-tactile cursor-pointer"
        >
          <Eye size={13} />
          <span>Manage</span>
        </button>
      </td>
    </tr>
  );
}

export default UserTableRow;
