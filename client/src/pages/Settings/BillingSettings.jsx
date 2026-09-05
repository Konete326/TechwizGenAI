import { useState, useEffect } from "react";
import { Coins, HardDrive, ArrowClockwise, CheckCircle } from "@phosphor-icons/react";
import { VITE_API_URL } from "@/config/env";

export function BillingSettings() {
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMetrics = () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setIsLoading(true);
    fetch(`${VITE_API_URL}/analytics/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setMetrics(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const totalTokens = metrics?.tokens?.total || 0;
  const promptTokens = metrics?.tokens?.prompt || 0;
  const completionTokens = metrics?.tokens?.completion || 0;
  const rawCost = Number(metrics?.cost ?? (totalTokens * 0.00000025));
  const estimatedCost = rawCost.toFixed(4);

  const totalBytes = metrics?.storage?.totalBytes || 0;
  const maxBytes = 500 * 1024 * 1024;
  const percentUsed = Math.min(100, Math.max(0, (totalBytes / maxBytes) * 100));
  const usedMb = (totalBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-text-primary">Billing & Storage</h3>
          <p className="text-xs text-text-muted mt-0.5">Track resource consumption, token usage, and allocated cloud storage.</p>
        </div>
        <button
          type="button"
          onClick={fetchMetrics}
          disabled={isLoading}
          className="p-1.5 rounded-lg border border-border bg-surface text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          title="Refresh metrics"
        >
          <ArrowClockwise size={14} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle size={18} className="shrink-0 text-emerald-500" />
          <span>Free Beta Access: All AI model queries, voice calls, and storage are currently 100% free of charge.</span>
        </div>
        <span className="font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] shrink-0">
          $0.00 Billed
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl border border-border bg-surface-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Coins size={16} className="text-accent" />
              <span>Token Consumption</span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium">
              Free Tier
            </span>
          </div>

          <div>
            <div className="text-2xl font-bold text-text-primary font-mono">
              {totalTokens.toLocaleString()}
            </div>
            <div className="text-xs text-text-muted mt-1 flex flex-wrap items-center gap-1.5">
              <span>Standard API value: ${estimatedCost} USD</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">(Waived - $0.00)</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-xs">
            <div>
              <span className="text-text-muted block text-[11px]">Prompt</span>
              <span className="font-mono text-text-primary font-medium">{promptTokens.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-text-muted block text-[11px]">Completion</span>
              <span className="font-mono text-text-primary font-medium">{completionTokens.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-text-muted block text-[11px]">Total Billed</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">$0.00</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-surface-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <HardDrive size={16} className="text-accent" />
              <span>Cloud Storage Allocated</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-medium px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              500 MB Free Tier
            </span>
          </div>

          <div>
            <div className="text-2xl font-bold text-text-primary font-mono">
              {usedMb} MB
            </div>
            <div className="text-xs text-text-muted mt-0.5">
              {percentUsed.toFixed(1)}% of 500 MB capacity utilized
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <div className="w-full h-2 rounded-full bg-surface-elevated overflow-hidden border border-border/40">
              <div
                className="h-full bg-accent transition-all duration-300 rounded-full"
                style={{ width: `${percentUsed}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-text-muted font-mono">
              <span>{metrics?.storage?.count || 0} Assets Stored</span>
              <span>{(500 - Number(usedMb)).toFixed(1)} MB Remaining</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BillingSettings;
