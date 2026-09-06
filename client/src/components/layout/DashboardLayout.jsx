import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { VITE_API_URL } from "@/config/env";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardSidebar } from "./DashboardSidebar";
import { InstallPrompt } from "@/components/ui/InstallPrompt";
import { ApiFallbackModal } from "@/components/ui/ApiFallbackModal";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

export const DashboardLayout = () => {
  const location = useLocation();
  const isStudio = location.pathname.startsWith("/studio");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [platformBytes, setPlatformBytes] = useState(() => {
    try {
      const raw = localStorage.getItem("platform_usage_bytes");
      return raw ? Number(raw) : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const fetchStorage = async () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const res = await fetch(`${VITE_API_URL}/assets`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
              const total = data.data.reduce((sum, item) => sum + (item.bytes || 0), 0);
              localStorage.setItem("platform_usage_bytes", String(total));
              setPlatformBytes(total);
              return;
            }
          }
        }
      } catch {
        return null;
      }
      const raw = localStorage.getItem("platform_usage_bytes");
      if (raw) setPlatformBytes(Number(raw));
    };

    fetchStorage();

    const handleStorageUpdate = (e) => {
      if (e?.detail?.bytes !== undefined) {
        setPlatformBytes(Number(e.detail.bytes));
      } else {
        const raw = localStorage.getItem("platform_usage_bytes");
        setPlatformBytes(raw ? Number(raw) : 0);
      }
    };

    window.addEventListener("storage_updated", handleStorageUpdate);
    window.addEventListener("storage", handleStorageUpdate);

    return () => {
      window.removeEventListener("storage_updated", handleStorageUpdate);
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, []);

  const formatStorage = (bytes) => {
    if (!bytes || bytes <= 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return mb < 100 ? `${mb.toFixed(1)} MB` : `${mb.toFixed(0)} MB`;
  };

  const limitBytes = 500 * 1024 * 1024;
  const percentUsed = Math.min(100, Math.max(0, (platformBytes / limitBytes) * 100));
  const usageDisplay = `${formatStorage(platformBytes)} / 500 MB`;

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-background text-text-primary font-sans transition-colors duration-150">
      <DashboardSidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        usageDisplay={usageDisplay}
        percentUsed={percentUsed}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <DashboardHeader onOpenDrawer={() => setIsDrawerOpen(true)} />

        <main className={`flex-1 w-full relative ${isStudio ? "overflow-hidden p-0" : "overflow-y-auto overflow-x-hidden p-6"}`}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <InstallPrompt />
      <ApiFallbackModal />
    </div>
  );
};

export default DashboardLayout;
