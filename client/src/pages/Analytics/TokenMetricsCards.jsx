import { Cpu, CurrencyDollar, HardDrives, ChatsTeardrop } from "@phosphor-icons/react";

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

export function TokenMetricsCards({ metrics }) {
  const tokens = metrics?.tokens || { prompt: 0, completion: 0, total: 0 };
  const storage = metrics?.storage || { totalBytes: 0, count: 0, imageBytes: 0, documentBytes: 0 };
  const cost = metrics?.cost || 0;
  const sessionsCount = metrics?.sessionsCount || 0;

  const formatMb = (bytes) => {
    if (!bytes) return "0.0 MB";
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const cards = [
    {
      title: "Token Consumption",
      value: (tokens.total || 0).toLocaleString(),
      subLabel: `${(tokens.prompt || 0).toLocaleString()} in / ${(tokens.completion || 0).toLocaleString()} out`,
      icon: Cpu,
      accent: "text-indigo-400"
    },
    {
      title: "Estimated Cost",
      value: `$${Number(cost || 0).toFixed(4)}`,
      subLabel: "$0.10/M prompt, $0.40/M output",
      icon: CurrencyDollar,
      accent: "text-emerald-400"
    },
    {
      title: "Storage Allocated",
      value: formatMb(storage.totalBytes),
      subLabel: `${storage.count || 0} files (${formatMb(storage.documentBytes)} docs)`,
      icon: HardDrives,
      accent: "text-sky-400"
    },
    {
      title: "Chat Sessions",
      value: (sessionsCount || 0).toLocaleString(),
      subLabel: metrics?.messagesCount ? `${metrics.messagesCount.toLocaleString()} total messages` : "Active dialog histories",
      icon: ChatsTeardrop,
      accent: "text-amber-400"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.title}
            className="relative p-4 rounded-[var(--radius-md)] bg-surface-card border border-border hover:border-accent/40 transition-all space-y-2.5"
          >
            <CornerBracket />
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span className="font-medium uppercase tracking-wider text-[10px]">{c.title}</span>
              <span className={`p-1.5 rounded-md bg-surface border border-border ${c.accent}`}>
                <Icon size={16} weight="bold" />
              </span>
            </div>
            <div>
              <div className="text-xl font-bold font-mono tracking-tight text-text-primary">{c.value}</div>
              <div className="text-[11px] font-mono text-text-muted truncate mt-1">{c.subLabel}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TokenMetricsCards;
