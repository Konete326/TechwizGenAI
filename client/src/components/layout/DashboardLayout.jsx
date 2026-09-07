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

const PersistentNesaCallHost = () => {
  const c = useNesaCallContext();
  return (
    <NesaCallInterface
      isActive={c.isCallActive} callPhase={c.callPhase} isMinimized={c.isMinimized}
      onToggleMinimize={c.toggleMinimize} onEndCall={c.endCall} nesaState={c.nesaState}
      isListening={c.isListening} transcript={c.transcript} connectionError={c.connectionError}
      onRetry={c.startCall} forceReply={callProp => c.forceReply(callProp)} position={c.widgetPosition}
      onPositionChange={c.setWidgetPosition} widgetSide={c.widgetSide} onReposition={c.reposition}
    />
  );
};

function DashboardLayoutContent() {
  const location = useLocation(), navigate = useNavigate();
  const { sendContextTurn, isCallActive, endCall, isSpeaking, reposition } = useNesaCallContext();
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
      const d = e?.detail || {}, route = d.args?.route || d.route, cid = d.id || d.callId || `call_${Date.now()}`;
      if (window.innerWidth < 768 && d.name !== "repositionWidget" && reposition) reposition("minimize");
      if (d.name === "navigatePage" && route) navigate(route);
      if (d.name === "closeModal") window.dispatchEvent(new CustomEvent("nesa:modal:close"));
      if (d.name === "executeLogout") handleLogout();
      if (d.name === "disconnectCall" && endCall) setTimeout(() => endCall(), 1400);
      if (d.name === "deleteSession") {
        window.dispatchEvent(new CustomEvent("nesa:delete_session", { detail: d.args || d }));
        window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(cid, "deleteSession", { success: true }) }));
      }
      if (d.name === "deleteAsset") {
        if (!location.pathname.startsWith("/assets")) navigate("/assets");
        try {
          const token = localStorage.getItem("token");
          if (token) {
            let tid = d.args?.assetId || d.assetId, tt = (d.args?.title || d.title || "").toLowerCase();
            if (!tid || tt) {
              const res = await fetch(`${VITE_API_URL}/assets`, { headers: { Authorization: `Bearer ${token}` } });
              const json = await res.json(), list = json?.data || [];
              const match = tt ? list.find((a) => (a.title || "").toLowerCase().includes(tt)) : list[0];
              if (match?.id) tid = match.id;
            }
            if (tid) {
              await fetch(`${VITE_API_URL}/assets/${tid}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
              window.dispatchEvent(new CustomEvent("asset_uploaded"));
              window.dispatchEvent(new CustomEvent("storage_updated"));
              window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(cid, "deleteAsset", { success: true }) }));
            }
          }
        } catch {}
      }
      if (d.name === "submitStudioPrompt" && !location.pathname.startsWith("/studio")) {
        navigate("/studio");
        setTimeout(() => window.dispatchEvent(new CustomEvent("nesa:toolcall", { detail: d })), 150);
      }
      if (d.name === "getDashboardMetrics") {
        try {
          const token = localStorage.getItem("token");
          const res = await fetch(`${VITE_API_URL}/dashboard/stats`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
          const json = await res.json(), metrics = json?.data || { totalGenerations: 0, totalTokens: 0, totalAssets: 0 };
          window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(cid, "getDashboardMetrics", metrics) }));
        } catch {
          window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(cid, "getDashboardMetrics", { status: "error" }) }));
        }
      }
    };

    window.addEventListener("nesa:toolcall", handleToolCall);
    window.addEventListener("auth:logout", handleLogout);
    return () => { window.removeEventListener("nesa:toolcall", handleToolCall); window.removeEventListener("auth:logout", handleLogout); };
  }, [navigate, endCall, location.pathname, reposition]);

  useEffect(() => {
    const pushTelemetry = () => {
      if (!isSpeaking && isCallActive && sendContextTurn) {
        const vp = window.innerWidth < 768 ? "Mobile" : "Desktop";
        sendContextTurn(`Current Screen: ${location.pathname}, Viewport: ${vp} (${window.innerWidth}px)`);
      }
    };
    pushTelemetry();
    const handleResize = () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(pushTelemetry, 300);
    };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current); };
  }, [location.pathname, isCallActive, isSpeaking, sendContextTurn]);

  const [platformBytes, setPlatformBytes] = useState(() => {
    try { const raw = localStorage.getItem("platform_usage_bytes"); return raw ? Number(raw) : 0; } catch { return 0; }
  });

  useEffect(() => {
    const fetchStorage = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch(`${VITE_API_URL}/assets`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const total = data.data.reduce((sum, item) => sum + (item.bytes || 0), 0);
          localStorage.setItem("platform_usage_bytes", String(total));
          setPlatformBytes(total);
        }
      } catch {}
    };
    fetchStorage();
    const sync = (e) => setPlatformBytes(e?.detail?.bytes !== undefined ? Number(e.detail.bytes) : Number(localStorage.getItem("platform_usage_bytes") || 0));
    window.addEventListener("storage_updated", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("storage_updated", sync); window.removeEventListener("storage", sync); };
  }, []);

  const formatStorage = (b) => (!b || b <= 0 ? "0 MB" : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(b < 104857600 ? 1 : 0)} MB`);
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
