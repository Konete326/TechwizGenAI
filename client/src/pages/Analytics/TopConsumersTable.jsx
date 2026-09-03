import { Trophy, User, ShieldCheck } from "@phosphor-icons/react";

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

export function TopConsumersTable({ consumers = [], onSelectUser }) {
  if (!consumers.length) return null;

  return (
    <div className="relative p-5 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-4 w-full">
      <CornerBracket />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-amber-400" />
          <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
            Top Token Consumers (Platform)
          </h3>
        </div>
        <span className="text-[11px] font-mono text-text-muted">Top 5 active accounts</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-border/80 text-text-muted text-[11px]">
              <th className="pb-2.5 font-medium">User</th>
              <th className="pb-2.5 font-medium">Role</th>
              <th className="pb-2.5 font-medium text-right">Tokens Used</th>
              <th className="pb-2.5 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {consumers.map((c) => (
              <tr key={c._id} className="hover:bg-surface/50 transition-colors">
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-surface border border-border text-text-muted">
                      <User size={13} />
                    </span>
                    <div className="min-w-0">
                      <span className="font-semibold text-text-primary block truncate font-sans text-xs">{c.name}</span>
                      <span className="text-[10px] text-text-muted block truncate">{c.email}</span>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 pr-3">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    c.role === "admin" ? "bg-accent/15 text-accent border border-accent/30" : "bg-surface text-text-muted border border-border"
                  }`}>
                    {c.role}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-right font-bold text-text-primary">
                  {(c.totalTokensUsed || 0).toLocaleString()}
                </td>
                <td className="py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => onSelectUser(c._id)}
                    className="px-2 py-1 rounded bg-surface hover:bg-surface-elevated text-[11px] text-accent border border-border hover:border-accent/40 transition-colors cursor-pointer"
                  >
                    View Metrics
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TopConsumersTable;
