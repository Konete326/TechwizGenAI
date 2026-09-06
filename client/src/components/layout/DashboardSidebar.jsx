import { Link, NavLink } from "react-router-dom";
import {
  House,
  Sparkle,
  ImageSquare,
  ChartLineUp,
  Gear,
  Users,
  User,
  X,
  SidebarSimple,
  HardDrive
} from "@phosphor-icons/react";
import logoImg from "@/assets/logo.png";

export function DashboardSidebar({
  isCollapsed,
  setIsCollapsed,
  isDrawerOpen,
  onCloseDrawer,
  usageDisplay,
  percentUsed
}) {
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();
  const isAdmin = user?.role === "admin";

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: House },
    { label: "Studio", href: "/studio", icon: Sparkle },
    { label: "Assets", href: "/assets", icon: ImageSquare },
    { label: "Analytics", href: "/analytics", icon: ChartLineUp },
    ...(isAdmin ? [{ label: "Users", href: "/admin", icon: Users }] : []),
    { label: "Profile", href: "/profile", icon: User },
    { label: "Settings", href: "/settings", icon: Gear }
  ];

  return (
    <>
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur lg:hidden" onClick={onCloseDrawer}>
          <div className="fixed inset-y-0 left-0 w-64 bg-surface border-r border-border p-5 flex flex-col justify-between animate-in slide-in-from-left duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src={logoImg} alt="Techwiz GenAI" className="w-6 h-6 object-contain" />
                  <span className="font-bold text-text-primary text-sm">Techwiz GenAI</span>
                </div>
                <button type="button" onClick={onCloseDrawer} className="p-1.5 text-text-muted hover:text-text-primary">
                  <X size={18} />
                </button>
              </div>
              <nav className="flex flex-col gap-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.label}
                      to={item.href}
                      onClick={onCloseDrawer}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors btn-tactile ${
                          isActive
                            ? "border-l-2 border-accent bg-accent/10 text-accent font-semibold"
                            : "text-text-muted hover:text-text-primary hover:bg-surface border-l-2 border-transparent"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon size={20} weight={isActive ? "fill" : "regular"} className={isActive ? "text-accent" : ""} />
                          <span>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
            <Link
              to="/assets"
              onClick={onCloseDrawer}
              className="block p-2.5 rounded-[var(--radius-md)] bg-surface hover:bg-surface-elevated border border-border hover:border-accent/40 space-y-1.5 transition-all cursor-pointer"
              title="View Storage in Assets"
            >
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-text-primary">
                  <HardDrive size={13} className="text-accent" /> Storage
                </span>
                <span className="font-mono text-[9px] tracking-tight">{usageDisplay}</span>
              </div>
              <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: `${percentUsed}%` }} />
              </div>
            </Link>
          </div>
        </div>
      )}

      <aside
        className={`hidden lg:flex flex-col justify-between h-full shrink-0 z-30 border-r border-border bg-surface/90 backdrop-blur p-4 transition-all duration-200 ${
          isCollapsed ? "w-16 px-2" : "w-64"
        }`}
      >
        <div className="space-y-6">
          <div className={`flex items-center ${isCollapsed ? "flex-col gap-3 justify-center" : "justify-between px-1"}`}>
            <Link to="/dashboard" className="flex items-center gap-2.5 overflow-hidden" title="Techwiz GenAI">
              <img src={logoImg} alt="Techwiz GenAI" className="w-8 h-8 object-contain shrink-0" />
              {!isCollapsed && <span className="font-bold text-text-primary text-sm tracking-tight truncate">Techwiz GenAI</span>}
            </Link>
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded-[var(--radius-sm)] text-text-muted hover:text-text-primary hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <SidebarSimple size={18} />
            </button>
          </div>

          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.label}
                  to={item.href}
                  className={({ isActive }) =>
                    `group flex items-center transition-colors btn-tactile ${
                      isCollapsed
                        ? "w-10 h-10 mx-auto justify-center rounded-[var(--radius-md)] " +
                          (isActive ? "bg-accent/15 text-accent border border-accent/30 shadow-sm" : "text-text-muted hover:text-text-primary hover:bg-surface border border-transparent")
                        : "gap-3 px-2.5 py-2 rounded-[var(--radius-md)] text-sm font-medium " +
                          (isActive ? "border-l-2 border-accent bg-accent/10 text-accent font-semibold" : "text-text-muted hover:text-text-primary hover:bg-surface border-l-2 border-transparent")
                    }`
                  }
                  title={isCollapsed ? item.label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={isCollapsed ? 22 : 18} weight={isActive ? "fill" : "regular"} className={isActive ? "text-accent" : ""} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {isCollapsed ? (
          <Link to="/assets" className="flex justify-center" title={`Storage: ${usageDisplay} (View Assets)`}>
            <div className="w-9 h-9 rounded-[var(--radius-sm)] bg-surface hover:bg-surface-elevated border border-border hover:border-accent/40 flex items-center justify-center text-accent transition-colors cursor-pointer">
              <HardDrive size={18} />
            </div>
          </Link>
        ) : (
          <Link
            to="/assets"
            className="block p-2.5 rounded-[var(--radius-md)] bg-surface hover:bg-surface-elevated border border-border hover:border-accent/40 space-y-1.5 transition-all cursor-pointer"
            title="View Storage in Assets"
          >
            <div className="flex items-center justify-between text-text-muted">
              <span className="flex items-center gap-1.5 text-text-primary font-medium text-[11px]">
                <HardDrive size={13} className="text-accent" /> Storage
              </span>
              <span className="font-mono text-[9px] tracking-tight">{usageDisplay}</span>
            </div>
            <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${percentUsed}%` }} />
            </div>
          </Link>
        )}
      </aside>
    </>
  );
}

export default DashboardSidebar;
