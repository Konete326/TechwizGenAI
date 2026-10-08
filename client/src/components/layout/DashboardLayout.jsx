import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { VITE_API_URL } from "@/config/env";
import { DashboardHeader } from "./DashboardHeader"; import { DashboardSidebar } from "./DashboardSidebar"; import { InstallPrompt } from "@/components/ui/InstallPrompt"; import { ApiFallbackModal } from "@/components/ui/ApiFallbackModal"; import { ErrorBoundary } from "@/components/common/ErrorBoundary"; import { VisualSpotlight } from "@/components/common/VisualSpotlight"; import { DynamicModalHost } from "@/components/common/DynamicModalHost"; import { NesaCallProvider, useNesaCallContext } from "@/context/NesaCallContext"; import { NesaCallInterface } from "@/pages/Studio/NesaCallInterface"; import { registerNesaActions } from "./nesaToolActions"; import { logDebug } from "@/pages/Studio/logger";

const PersistentNesaCallHost = () => { const c = useNesaCallContext(); return <NesaCallInterface isActive={c.isCallActive} callPhase={c.callPhase} isMinimized={c.isMinimized} onToggleMinimize={c.toggleMinimize} onEndCall={c.endCall} nesaState={c.nesaState} isListening={c.isListening} isUserSpeaking={c.isUserSpeaking} transcript={c.transcript} connectionError={c.connectionError} onRetry={c.startCall} forceReply={(cp) => c.forceReply(cp)} position={c.widgetPosition} onPositionChange={c.setWidgetPosition} widgetSide={c.widgetSide} dockCorner={c.dockCorner} onReposition={c.reposition} />; };

function DashboardLayoutContent() {
  const location = useLocation(), navigate = useNavigate(), { sendContextTurn, isCallActive, endCall, startCall, reposition } = useNesaCallContext(), isStudio = location.pathname.startsWith("/studio");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false), [isCollapsed, setIsCollapsed] = useState(false), [micErrorNotice, setMicErrorNotice] = useState(false), [limitNotice, setLimitNotice] = useState(false);

  useEffect(() => registerNesaActions({
    navigate, pathname: location.pathname, endCall, reposition,
    setDrawerOpen: setIsDrawerOpen, setCollapsed: setIsCollapsed, setMicNotice: setMicErrorNotice, setLimitNotice
  }), [navigate, endCall, location.pathname, reposition]);

  useEffect(() => { if (isCallActive && sendContextTurn) sendContextTurn("Current Screen: " + location.pathname + ", Viewport: " + (window.innerWidth < 768 ? "Mobile" : "Desktop") + " (" + window.innerWidth + "px)"); }, [location.pathname, isCallActive, sendContextTurn]);

  const [platformBytes, setPlatformBytes] = useState(() => { try { const raw = localStorage.getItem("platform_usage_bytes"); return raw ? Number(raw) : 0; } catch { return 0; } });

  useEffect(() => {
    const fetchStorage = async () => {
      try {
        const token = localStorage.getItem("token"); if (!token) return;
        const res = await fetch(VITE_API_URL + "/assets", { headers: { Authorization: "Bearer " + token } }), data = await res.json();
        if (data.success && Array.isArray(data.data)) { const total = data.data.reduce((sum, item) => sum + (item.bytes || 0), 0); localStorage.setItem("platform_usage_bytes", String(total)); setPlatformBytes(total); }
      } catch (err) { logDebug("storage usage refresh failed", err); }
    };
    fetchStorage(); const sync = (e) => setPlatformBytes(e?.detail?.bytes !== undefined ? Number(e.detail.bytes) : Number(localStorage.getItem("platform_usage_bytes") || 0));
    window.addEventListener("storage_updated", sync); window.addEventListener("storage", sync);
    return () => { window.removeEventListener("storage_updated", sync); window.removeEventListener("storage", sync); };
  }, []);

  const formatStorage = (b) => (!b || b <= 0 ? "0 MB" : b < 1048576 ? (b / 1024).toFixed(0) + " KB" : (b / 1048576).toFixed(b < 104857600 ? 1 : 0) + " MB"), limitBytes = 500 * 1024 * 1024, percentUsed = Math.min(100, Math.max(0, (platformBytes / limitBytes) * 100)), usageDisplay = formatStorage(platformBytes) + " / 500 MB";

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-background text-text-primary font-sans transition-colors duration-150">
      <DashboardSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} isDrawerOpen={isDrawerOpen} onCloseDrawer={() => setIsDrawerOpen(false)} usageDisplay={usageDisplay} percentUsed={percentUsed} />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden"><DashboardHeader onOpenDrawer={() => setIsDrawerOpen(true)} /><main className={`flex-1 w-full relative ${isStudio ? "overflow-hidden p-0" : "overflow-y-auto overflow-x-hidden p-6"}`}><ErrorBoundary><Outlet /></ErrorBoundary></main></div>
      {micErrorNotice && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 max-w-[calc(100vw-2rem)] w-fit mx-auto px-4 py-2.5 rounded-2xl bg-red-600/90 text-white text-xs font-medium shadow-lg backdrop-blur border border-red-500/30"><span className="truncate">Mic access lost. Call ended.</span><button onClick={() => { setMicErrorNotice(false); if (startCall) startCall(); }} className="px-2.5 py-0.5 bg-white text-red-600 rounded-full font-semibold hover:bg-red-50 transition-colors shrink-0">Reconnect Call</button><button onClick={() => setMicErrorNotice(false)} className="text-white/80 hover:text-white ml-1 shrink-0">x</button></div>}
      {limitNotice && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 max-w-[calc(100vw-2rem)] w-fit mx-auto px-4 py-2.5 rounded-2xl bg-amber-600/90 text-white text-xs font-medium shadow-lg backdrop-blur border border-amber-500/30"><span className="truncate">1-hour call limit reached.</span><button onClick={() => { setLimitNotice(false); if (startCall) startCall(); }} className="px-2.5 py-0.5 bg-white text-amber-600 rounded-full font-semibold hover:bg-red-50 transition-colors shrink-0">Reconnect</button><button onClick={() => setLimitNotice(false)} className="text-white/80 hover:text-white ml-1 shrink-0">x</button></div>}
      <VisualSpotlight /><DynamicModalHost /><PersistentNesaCallHost /><InstallPrompt /><ApiFallbackModal />
    </div>
  );
}

export const DashboardLayout = () => <NesaCallProvider><DashboardLayoutContent /></NesaCallProvider>; export default DashboardLayout;
