import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { VITE_API_URL } from "@/config/env";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardSidebar } from "./DashboardSidebar";
import { InstallPrompt } from "@/components/ui/InstallPrompt";
import { ApiFallbackModal } from "@/components/ui/ApiFallbackModal";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { VisualSpotlight } from "@/components/common/VisualSpotlight";
import { DynamicModalHost } from "@/components/common/DynamicModalHost";
import { NesaCallProvider, useNesaCallContext } from "@/context/NesaCallContext";
import { NesaCallInterface } from "@/pages/Studio/NesaCallInterface";
import { formatToolResponse } from "@/pages/Studio/nesaTools";

function PersistentNesaCallHost() {
  const call = useNesaCallContext();
  return (
    <NesaCallInterface
      isActive={call.isCallActive} callPhase={call.callPhase} isMinimized={call.isMinimized}
      onToggleMinimize={call.toggleMinimize} onEndCall={call.endCall} nesaState={call.nesaState}
      isListening={call.isListening} transcript={call.transcript} connectionError={call.connectionError}
      onRetry={call.startCall} forceReply={call.forceReply} position={call.widgetPosition}
      onPositionChange={call.setWidgetPosition} widgetSide={call.widgetSide} onReposition={call.reposition}
    />
  );
}

function DashboardLayoutContent() {
  const location = useLocation(), navigate = useNavigate();
  const { sendContextTurn, isCallActive, endCall, isSpeaking } = useNesaCallContext();
  const isStudio = location.pathname.startsWith("/studio");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false), [isCollapsed, setIsCollapsed] = useState(false);
  const resizeTimerRef = useRef(null);

  useEffect(() => {
    const handleLogout = () => {
      if (endCall) endCall();
      localStorage.removeItem("token"); localStorage.removeItem("user"); localStorage.removeItem("techwiz_custom_api_key");
      navigate("/login");
    };

    const handleToolCall = async (e) => {
      const detail = e?.detail || {}, route = detail.args?.route || detail.route;
      if (detail.name === "navigatePage" && route) navigate(route);
      if (detail.name === "closeModal") window.dispatchEvent(new CustomEvent("nesa:modal:close"));
      if (detail.name === "executeLogout") handleLogout();
      if (detail.name === "disconnectCall" && endCall) setTimeout(() => endCall(), 1400);
      if (detail.name === "submitStudioPrompt" && !location.pathname.startsWith("/studio")) {
        navigate("/studio");
        setTimeout(() => window.dispatchEvent(new CustomEvent("nesa:toolcall", { detail })), 150);
      }
      if (detail.name === "getDashboardMetrics") {
        const callId = detail.id || detail.callId || `call_${Date.now()}`;
        try {
          const token = localStorage.getItem("token");
          const res = await fetch(`${VITE_API_URL}/dashboard/stats`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
          const json = await res.json(), metrics = json?.data || { totalGenerations: 0, totalTokens: 0, totalAssets: 0 };
          window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(callId, "getDashboardMetrics", metrics) }));
        } catch {
          window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(callId, "getDashboardMetrics", { status: "error" }) }));
        }
      }
    };

    window.addEventListener("nesa:toolcall", handleToolCall);
    window.addEventListener("auth:logout", handleLogout);
    return () => {
      window.removeEventListener("nesa:toolcall", handleToolCall);
      window.removeEventListener("auth:logout", handleLogout);
    };
  }, [navigate, endCall, location.pathname]);

  useEffect(() => {
    const pushTelemetry = () => {
      if (isSpeaking) return;
      const vp = window.innerWidth < 768 ? "Mobile" : "Desktop";
      const text = `Current Screen: ${location.pathname}, Viewport: ${vp} (${window.innerWidth}px)`;
      if (isCallActive && sendContextTurn) sendContextTurn(text);
    };
    pushTelemetry();

    const handleResize = () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(pushTelemetry, 300);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    };
  }, [location.pathname, isCallActive, isSpeaking, sendContextTurn]);

  const [platformBytes, setPlatformBytes] = useState(() => {
    try { const raw = localStorage.getItem("platform_usage_bytes"); return raw ? Number(raw) : 0; } catch { return 0; }
  });

  useEffect(() => {
    const fetchStorage = async () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const res = await fetch(`${VITE_API_URL}/assets`, { headers: { Authorization: `Bearer ${token}` } });
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
      } catch { return null; }
      const raw = localStorage.getItem("platform_usage_bytes");
      if (raw) setPlatformBytes(Number(raw));
    };

    fetchStorage();
    const handleStorageUpdate = (e) => {
      if (e?.detail?.bytes !== undefined) setPlatformBytes(Number(e.detail.bytes));
      else { const raw = localStorage.getItem("platform_usage_bytes"); setPlatformBytes(raw ? Number(raw) : 0); }
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
    return mb < 1 ? `${(bytes / 1024).toFixed(0)} KB` : mb < 100 ? `${mb.toFixed(1)} MB` : `${mb.toFixed(0)} MB`;
  };

  const limitBytes = 500 * 1024 * 1024, percentUsed = Math.min(100, Math.max(0, (platformBytes / limitBytes) * 100));
  const usageDisplay = `${formatStorage(platformBytes)} / 500 MB`;

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-background text-text-primary font-sans transition-colors duration-150">
      <DashboardSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} isDrawerOpen={isDrawerOpen} onCloseDrawer={() => setIsDrawerOpen(false)} usageDisplay={usageDisplay} percentUsed={percentUsed} />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <DashboardHeader onOpenDrawer={() => setIsDrawerOpen(true)} />
        <main className={`flex-1 w-full relative ${isStudio ? "overflow-hidden p-0" : "overflow-y-auto overflow-x-hidden p-6"}`}>
          <ErrorBoundary><Outlet /></ErrorBoundary>
        </main>
      </div>
      <VisualSpotlight /><DynamicModalHost /><PersistentNesaCallHost /><InstallPrompt /><ApiFallbackModal />
    </div>
  );
}

export const DashboardLayout = () => <NesaCallProvider><DashboardLayoutContent /></NesaCallProvider>;
export default DashboardLayout;
