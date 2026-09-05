import { Link, useLocation } from "react-router-dom";
import {
  MagnifyingGlass,
  Sun,
  Moon,
  List,
} from "@phosphor-icons/react";
import logoImg from "@/assets/logo.png";
import { useTheme } from "@/context/ThemeContext";
import { UserNavDropdown } from "./UserNavDropdown";
import { NotificationBell } from "./NotificationBell";

export function DashboardHeader({ onOpenDrawer }) {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const getPageTitle = (path) => {
    if (path.startsWith("/studio")) return "AI Studio";
    if (path.startsWith("/assets")) return "Media Assets";
    if (path.startsWith("/users")) return "Users Directory";
    if (path.startsWith("/notifications")) return "Notification History";
    if (path.startsWith("/profile")) return "User Profile";
    if (path.startsWith("/settings")) return "Settings";
    if (path.startsWith("/dashboard")) return "Dashboard";
    return "Dashboard";
  };

  const pageTitle = getPageTitle(location.pathname);

  return (
    <>
      <header className="h-14 shrink-0 border-b border-border bg-surface/80 backdrop-blur flex items-center justify-between px-3 sm:px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenDrawer}
            className="p-2 rounded-[var(--radius-sm)] text-text-muted hover:text-text-primary hover:bg-surface btn-tactile cursor-pointer"
            aria-label="Toggle navigation"
          >
            <List size={20} />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src={logoImg} alt="Techwiz GenAI" className="w-6 h-6 object-contain" />
            <span className="font-semibold tracking-tight text-text-primary text-sm">{pageTitle}</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-[var(--radius-sm)] text-text-muted hover:text-text-primary hover:bg-surface border border-border cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <header className="hidden lg:flex w-full h-16 shrink-0 border-b border-border bg-surface-card/60 backdrop-blur z-20 items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-text-primary tracking-tight">{pageTitle}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search..."
              className="w-44 h-8 pl-8 pr-3 text-xs bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
          </div>
          <NotificationBell />
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-[var(--radius-sm)] text-text-muted hover:text-text-primary hover:bg-surface border border-border transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <UserNavDropdown />
        </div>
      </header>
    </>
  );
}

export default DashboardHeader;
