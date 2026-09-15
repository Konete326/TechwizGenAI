import { useDashboardData } from "./useDashboardData";
import { KpiCards } from "./KpiCards";
import { GenerationVelocityChart } from "./GenerationVelocityChart";
import { ModelDistributionCard } from "./ModelDistributionCard";
import { ActivityMatrix } from "./ActivityMatrix";

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
}

function DashboardSkeleton() {
  const pulse = "animate-pulse bg-[var(--surface)] rounded-xl";
  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${pulse} h-28`} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full">
        <div className={`lg:col-span-8 ${pulse} h-72`} />
        <div className={`lg:col-span-4 ${pulse} h-72`} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full">
        <div className={`lg:col-span-7 ${pulse} h-64`} />
        <div className={`lg:col-span-5 ${pulse} h-64`} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${pulse} h-52`} />
        ))}
      </div>
    </div>
  );
}

export function DashboardView() {
  const { stats, loading, error, refetch } = useDashboardData();
  const user = getStoredUser();
  const firstName = user?.name?.split(" ")[0] || "there";
  const isAdmin = stats?.isAdmin;

  if (loading && !stats) return <DashboardSkeleton />;

  if (error && !stats) {
    return (
      <div className="p-6 rounded-xl bg-[var(--surface-card)] border border-rose-500/30 text-center space-y-3">
        <svg className="w-7 h-7 text-rose-400 mx-auto" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-xs text-rose-400">{error}</p>
        <button
          type="button"
          onClick={refetch}
          className="px-3 py-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-card)] border border-[var(--border)] text-xs font-medium text-[var(--text-primary)] inline-flex items-center gap-1.5 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Welcome back, {firstName}!
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {isAdmin ? "Platform overview - All users" : "Your personal AI workspace telemetry"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Admin View
            </span>
          )}
          <button
            type="button"
            onClick={refetch}
            className="inline-flex items-center gap-1.5 bg-[var(--surface-card)] hover:bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Refresh
          </button>
        </div>
      </section>

      <KpiCards stats={stats} />
      <GenerationVelocityChart stats={stats} />
      <ModelDistributionCard stats={stats} />
      <ActivityMatrix stats={stats} />
    </div>
  );
}

export default DashboardView;
