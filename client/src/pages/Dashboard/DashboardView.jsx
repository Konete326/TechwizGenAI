import { Skeleton } from "@/components/ui/Skeleton";
import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";
import { useDashboardData } from "./useDashboardData";
import { KpiCards } from "./KpiCards";
import { GenerationVelocityChart } from "./GenerationVelocityChart";
import { ModelDistributionCard } from "./ModelDistributionCard";
import { ActivityMatrix } from "./ActivityMatrix";

function DashboardSkeleton() {
  return (
    <div className="w-full space-y-4 animate-in fade-in duration-200">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
        <div className="lg:col-span-2 p-5 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-52 w-full" />
        </div>
        <div className="p-5 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-10 w-full" />
          <div className="space-y-3 pt-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
        <div className="p-5 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="p-5 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}

export function DashboardView() {
  const { stats, loading, error, refetch } = useDashboardData();

  if (loading && !stats) {
    return <DashboardSkeleton />;
  }

  if (error && !stats) {
    return (
      <div className="p-6 rounded-[var(--radius-md)] bg-surface-card border border-rose-500/30 text-center space-y-3">
        <WarningCircle size={28} className="text-rose-400 mx-auto" />
        <p className="text-xs text-rose-400">{error}</p>
        <button
          type="button"
          onClick={refetch}
          className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-surface hover:bg-surface/80 border border-border text-xs font-medium text-text-primary inline-flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowClockwise size={13} />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <KpiCards stats={stats} />
      <GenerationVelocityChart stats={stats} />
      <ModelDistributionCard stats={stats} />
      <ActivityMatrix stats={stats} />
    </div>
  );
}

export default DashboardView;
