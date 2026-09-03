import { useAnalytics } from "./useAnalytics";
import { AnalyticsHeader } from "./AnalyticsHeader";
import { TokenMetricsCards } from "./TokenMetricsCards";
import { UsageChart } from "./UsageChart";
import { TopConsumersTable } from "./TopConsumersTable";

export function Analytics() {
  const {
    metrics,
    userList,
    selectedUserId,
    setSelectedUserId,
    loading,
    error,
    refresh,
    isAdmin
  } = useAnalytics();

  const isViewingPlatform = isAdmin && selectedUserId === "all";
  const targetUser = userList.find((u) => u._id === selectedUserId) || metrics?.user;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <AnalyticsHeader
        isAdmin={isAdmin}
        userList={userList}
        selectedUserId={selectedUserId}
        onSelectUser={setSelectedUserId}
        onRefresh={refresh}
        loading={loading}
        targetUser={targetUser}
      />

      {error ? (
        <div className="p-4 rounded-[var(--radius-md)] bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
          <span>Failed to load analytics: {error}</span>
          <button
            type="button"
            onClick={refresh}
            className="px-2.5 py-1 rounded bg-rose-500 text-white font-medium text-xs hover:bg-rose-600 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : loading && !metrics ? (
        <div className="h-64 flex items-center justify-center text-xs text-text-muted font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
            <span>Aggregating telemetry metrics...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <TokenMetricsCards metrics={metrics} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <UsageChart timeline={metrics?.timeline || []} />

            {isViewingPlatform && (
              <TopConsumersTable
                consumers={metrics?.topConsumers || []}
                onSelectUser={setSelectedUserId}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;
