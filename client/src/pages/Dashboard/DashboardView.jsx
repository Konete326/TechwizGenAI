import { useState, useEffect } from "react";
import { fetchAnalyticsData } from "@/services/analyticsService";
import { Skeleton } from "@/components/ui/Skeleton";
import { KpiCards } from "./KpiCards";
import { SalesCharts } from "./SalesCharts";
import { ConversionAndTraffic } from "./ConversionAndTraffic";
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
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-52 w-full" />
        </div>
        <div className="p-5 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-10 w-full" />
          <div className="space-y-3 pt-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
        <div className="p-5 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-4 gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
        <div className="p-5 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-16 w-16 rounded-full" />
          </div>
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-28 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchAnalyticsData().then((res) => {
      if (isMounted) {
        setData(res);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="w-full space-y-4">
      {loading || !data ? (
        <DashboardSkeleton />
      ) : (
        <>
          <KpiCards kpis={data.kpis} />
          <SalesCharts
            totalSalesDisplay={data.totalSalesDisplay}
            campaignRevenueDisplay={data.campaignRevenueDisplay}
            salesColumns={data.salesColumns}
            campaigns={data.campaigns}
          />
          <ConversionAndTraffic
            funnelSteps={data.funnelSteps}
            totalOrdersDisplay={data.totalOrdersDisplay}
            trafficSources={data.trafficSources}
          />
          <ActivityMatrix
            trafficBars={data.trafficBars}
            heatmap={data.heatmap}
          />
        </>
      )}
    </div>
  );
}

export default DashboardView;
