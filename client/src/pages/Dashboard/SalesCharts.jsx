import { useState } from "react";

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

export function SalesCharts({
  totalSalesDisplay = "$413K",
  campaignRevenueDisplay = "$92.5K",
  salesColumns = [],
  campaigns = [],
}) {
  const [activeTab, setActiveTab] = useState("1M");
  const tabs = ["14D", "1M", "3M", "6M"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
      <div className="relative lg:col-span-2 p-5 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-4">
        <CornerBracket />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-text-primary">
              {totalSalesDisplay}
            </div>
            <p className="text-xs text-text-muted">Total Sales in last 30 days</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-text-muted text-[11px]">
                <span className="w-2 h-2 rounded-xs bg-accent inline-block" /> New user
              </span>
              <span className="flex items-center gap-1 text-text-muted text-[11px]">
                <span className="w-2 h-2 rounded-xs bg-zinc-400 dark:bg-zinc-600 inline-block" /> Existing user
              </span>
            </div>
            <div className="flex items-center p-0.5 rounded-[var(--radius-sm)] bg-surface border border-border text-xs">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 py-0.5 rounded-[calc(var(--radius-sm)-2px)] text-[11px] font-medium transition-colors cursor-pointer ${
                    activeTab === tab
                      ? "bg-accent text-white font-semibold"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-52 w-full flex items-end justify-between gap-1.5 pt-4">
          {salesColumns.map((col) => (
            <div key={col.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
              <div className="w-full max-w-[22px] flex flex-col-reverse gap-1 justify-start h-40">
                {Array.from({ length: col.newTicks }).map((_, i) => (
                  <div
                    key={`new-${i}`}
                    className="w-full h-1.5 rounded-xs bg-accent transition-all group-hover:bg-accent-hover"
                  />
                ))}
                {Array.from({ length: col.existingTicks }).map((_, i) => (
                  <div
                    key={`exist-${i}`}
                    className="w-full h-1.5 rounded-xs bg-zinc-400 dark:bg-zinc-600 transition-all group-hover:opacity-80"
                  />
                ))}
              </div>
              <span className="text-[10px] font-mono text-text-muted">{col.day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative p-5 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-4">
        <CornerBracket />

        <div>
          <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-text-primary">
            {campaignRevenueDisplay}
          </div>
          <p className="text-xs text-text-muted">Revenue from campaigns in Aug</p>
        </div>

        <div className="p-3 rounded-[var(--radius-sm)] bg-surface border border-border flex items-center justify-between text-xs">
          <span className="text-text-muted text-[11px]">Monthly Goal ($100K)</span>
          <span className="font-mono font-semibold text-accent text-[11px]">92.5% Achieved</span>
        </div>

        <div className="space-y-3 pt-1">
          {campaigns.map((camp) => (
            <div key={camp.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-text-primary text-[11px]">{camp.name}</span>
                <span className="font-mono text-text-muted text-[11px]">
                  {camp.revenue} / {camp.target}
                </span>
              </div>
              <div className="relative h-2 w-full bg-surface rounded-full overflow-hidden border border-border/60">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: `${camp.percent}%` }}
                />
                <div className="absolute inset-y-0 left-1/2 w-0.5 border-r border-dotted border-border pointer-events-none" />
                <div className="absolute inset-y-0 left-3/4 w-0.5 border-r border-dotted border-border pointer-events-none" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SalesCharts;
