import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { VITE_API_URL } from "@/config/env";
import { DashboardHeader } from "./DashboardHeader"; import { DashboardSidebar } from "./DashboardSidebar";
import { InstallPrompt } from "@/components/ui/InstallPrompt"; import { ApiFallbackModal } from "@/components/ui/ApiFallbackModal";
import { ErrorBoundary } from "@/components/common/ErrorBoundary"; import { VisualSpotlight } from "@/components/common/VisualSpotlight"; import { DynamicModalHost } from "@/components/common/DynamicModalHost";
import { NesaCallProvider, useNesaCallContext } from "@/context/NesaCallContext";
import { NesaCallInterface } from "@/pages/Studio/NesaCallInterface";
import { formatToolResponse } from "@/pages/Studio/nesaTools";

const PersistentNesaCallHost = () => { const c = useNesaCallContext(); return <NesaCallInterface isActive={c.isCallActive} callPhase={c.callPhase} isMinimized={c.isMinimized} onToggleMinimize={c.toggleMinimize} onEndCall={c.endCall} nesaState={c.nesaState} isListening={c.isListening} transcript={c.transcript} connectionError={c.connectionError} onRetry={c.startCall} forceReply={(cp) => c.forceReply(cp)} position={c.widgetPosition} onPositionChange={c.setWidgetPosition} widgetSide={c.widgetSide} dockCorner={c.dockCorner} onReposition={c.reposition} />; };

function DashboardLayoutContent() {
  const location = useLocation(), navigate = useNavigate();
  const { sendContextTurn, isCallActive, endCall, startCall, reposition } = useNesaCallContext();
  const isStudio = location.pathname.startsWith("/studio");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false), [isCollapsed, setIsCollapsed] = useState(false), [micErrorNotice, setMicErrorNotice] = useState(false), [limitNotice, setLimitNotice] = useState(false);

  useEffect(() => {
    const handleLogout = () => { if (endCall) endCall(); localStorage.removeItem("token"); localStorage.removeItem("user"); localStorage.removeItem("techwiz_custom_api_key"); navigate("/login"); };
    const handleMicLost = () => { try { const u = new SpeechSynthesisUtterance("Aapka mic access khatam ho gaya hai. Main call cut kar rahi hoon, aap wapas call laga lein."); u.rate = 1.05; window.speechSynthesis.speak(u); } catch {} setTimeout(() => { if (endCall) endCall(); }, 3500); setMicErrorNotice(true); };
    const handleLimitReached = () => { if (endCall) endCall(); setLimitNotice(true); };
    const handleSidebarOpen = () => { if (window.innerWidth < 768) setIsDrawerOpen(true); else setIsCollapsed(false); };

    const handleToolCall = async (e) => {
      const d = e?.detail || {}, route = d.args?.route || d.route, cid = d.id || d.callId || ("call_" + Date.now());
      if (window.innerWidth < 768 && d.name !== "repositionWidget" && reposition) reposition("minimize");
      if (d.name === "navigatePage" && route) { navigate(route); setTimeout(() => window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(cid, "navigatePage", { success: true, route }) })), 120); }
      if (d.name === "closeModal") window.dispatchEvent(new CustomEvent("nesa:modal:close"));
      if (d.name === "executeLogout") handleLogout();
      if (d.name === "disconnectCall" && endCall) setTimeout(() => endCall(), 1400);
      if (d.name === "controlSidebar") {
        const act = (d.args?.action || d.action || "open").toLowerCase();
        if (act === "open") { setIsCollapsed(false); setIsDrawerOpen(true); } else if (act === "close") { setIsCollapsed(true); setIsDrawerOpen(false); } else { setIsCollapsed((p) => !p); setIsDrawerOpen((p) => !p); }
        window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(cid, "controlSidebar", { success: true, action: act }) }));
      }
      if (d.name === "toggleWorkspaceControl") {
        const ctrl = (d.args?.control || d.control || "").toLowerCase();
        if (ctrl.includes("theme")) { try { localStorage.setItem("theme", document.documentElement.classList.toggle("dark") ? "dark" : "light"); } catch {} window.dispatchEvent(new CustomEvent("theme_changed")); }
        if (ctrl.includes("sidebar")) setIsCollapsed((p) => !p);
        window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(cid, "toggleWorkspaceControl", { success: true, control: ctrl }) }));
      }
      if (d.name === "deleteSession") { window.dispatchEvent(new CustomEvent("nesa:delete_session", { detail: d.args || d })); window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(cid, "deleteSession", { success: true }) })); }
      if (d.name === "deleteAsset") {
        if (!location.pathname.startsWith("/assets")) navigate("/assets");
        try {
          const token = localStorage.getItem("token");
          if (token) {
            let tid = d.args?.assetId || d.assetId, tt = (d.args?.title || d.title || "").toLowerCase();
            if (!tid || tt) { const res = await fetch(VITE_API_URL + "/assets", { headers: { Authorization: "Bearer " + token } }), json = await res.json(), m = tt ? (json?.data || []).find((a) => (a.title || "").toLowerCase().includes(tt)) : json?.data?.[0]; if (m?.id) tid = m.id; }
            if (tid) { await fetch(VITE_API_URL + "/assets/" + tid, { method: "DELETE", headers: { Authorization: "Bearer " + token } }); window.dispatchEvent(new CustomEvent("asset_uploaded")); window.dispatchEvent(new CustomEvent("storage_updated")); window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(cid, "deleteAsset", { success: true }) })); }
            else window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(cid, "deleteAsset", { status: "not_found" }) }));
          } else window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(cid, "deleteAsset", { status: "unauthorized" }) }));
        } catch { window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(cid, "deleteAsset", { status: "error" }) })); }
      }
      if (d.name === "previewAsset") {
        if (!location.pathname.startsWith("/assets")) navigate("/assets");
        try {
          const token = localStorage.getItem("token");
          if (token) {
            const q = (d.args?.query || d.query || "").toLowerCase(), res = await fetch(VITE_API_URL + "/assets", { headers: { Authorization: "Bearer " + token } }), json = await res.json(), list = json?.data || [];
            const match = q ? (list.find((a) => (a.title || "").toLowerCase().includes(q) || (a.format || "").toLowerCase().includes(q)) || list[0]) : list[0];
            if (match) { setTimeout(() => window.dispatchEvent(new CustomEvent("asset:preview", { detail: match })), 150); window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(cid, "previewAsset", { success: true, title: match.title }) })); }
            else window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(cid, "previewAsset", { status: "not_found" }) }));
          } else window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(cid, "previewAsset", { status: "unauthorized" }) }));
        } catch { window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(cid, "previewAsset", { status: "error" }) })); }
      }
      if (d.name === "exportCallSummary") {
        try {
          const token = localStorage.getItem("token"), reportTitle = d.args?.title || d.title || "Executive Summary Report";
          if (token) {
            const sRes = await fetch(VITE_API_URL + "/ai/sessions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ persona: "writer" }) }), sData = await sRes.json(), sid = sData?.data?.id;
            if (sid) {
              const promptPayload = "[DOC_REQ: pdf | # " + reportTitle + "\\n\\nCall & Session Executive Summary\\n- Generated by Techwiz GenAI]";
              const streamRes = await fetch(VITE_API_URL + "/ai/sessions/" + sid + "/stream", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ prompt: promptPayload, model: "gemini-3.8-flash" }) });
              const text = await streamRes.text(), artMatch = text.match(/\[ARTIFACT:\s*pdf\s*\|\s*([^\]]+)\]/i), link = artMatch ? artMatch[1].trim() : "";
              window.dispatchEvent(new CustomEvent("asset_uploaded")); window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(cid, "exportCallSummary", { success: true, url: link, title: reportTitle }) }));
            }
          }
        } catch { window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(cid, "exportCallSummary", { status: "error" }) })); }
      }
      if (d.name === "switchSession" && !location.pathname.startsWith("/studio")) { navigate("/studio"); setTimeout(() => window.dispatchEvent(new CustomEvent("nesa:toolcall", { detail: d })), 180); }
      if (d.name === "submitStudioPrompt" && !location.pathname.startsWith("/studio")) { navigate("/studio"); setTimeout(() => window.dispatchEvent(new CustomEvent("nesa:toolcall", { detail: d })), 150); }
      if (d.name === "getDashboardMetrics") {
        try {
          const token = localStorage.getItem("token"), res = await fetch(VITE_API_URL + "/dashboard/stats", { headers: token ? { Authorization: "Bearer " + token } : {} }), json = await res.json();
          window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(cid, "getDashboardMetrics", json?.data || { totalGenerations: 0, totalTokens: 0, totalAssets: 0 }) }));
        } catch { window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(cid, "getDashboardMetrics", { status: "error" }) })); }
      }
      if (d.name === "generateImage") {
        try {
          const token = localStorage.getItem("token"), prompt = d.args?.prompt || d.prompt || "";
          if (!location.pathname.startsWith("/studio")) navigate("/studio");
          const res = await fetch(VITE_API_URL + "/ai/generate-image", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: JSON.stringify({ prompt }) });
          const json = await res.json();
          if (res.ok && json.success) {
            window.dispatchEvent(new CustomEvent("studio:image_generated", { detail: { ...json, prompt } }));
            window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(cid, "generateImage", { status: "success", imageUrl: json.imageUrl }) }));
          } else window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(cid, "generateImage", { status: "error" }) }));
        } catch { window.dispatchEvent(new CustomEvent("nesa:toolresponse", { detail: formatToolResponse(cid, "generateImage", { status: "error" }) })); }
      }
    };

    window.addEventListener("nesa:toolcall", handleToolCall); window.addEventListener("auth:logout", handleLogout); window.addEventListener("nesa:mic_lost", handleMicLost); window.addEventListener("nesa:limit_reached", handleLimitReached); window.addEventListener("app:sidebar:open", handleSidebarOpen);
    return () => { window.removeEventListener("nesa:toolcall", handleToolCall); window.removeEventListener("auth:logout", handleLogout); window.removeEventListener("nesa:mic_lost", handleMicLost); window.removeEventListener("nesa:limit_reached", handleLimitReached); window.removeEventListener("app:sidebar:open", handleSidebarOpen); };
  }, [navigate, endCall, location.pathname, reposition]);

  useEffect(() => {
    if (isCallActive && sendContextTurn) sendContextTurn("Current Screen: " + location.pathname + ", Viewport: " + (window.innerWidth < 768 ? "Mobile" : "Desktop") + " (" + window.innerWidth + "px)");
  }, [location.pathname, isCallActive, sendContextTurn]);

  const [platformBytes, setPlatformBytes] = useState(() => { try { const raw = localStorage.getItem("platform_usage_bytes"); return raw ? Number(raw) : 0; } catch { return 0; } });

  useEffect(() => {
    const fetchStorage = async () => {
      try {
        const token = localStorage.getItem("token"); if (!token) return;
        const res = await fetch(VITE_API_URL + "/assets", { headers: { Authorization: "Bearer " + token } }), data = await res.json();
        if (data.success && Array.isArray(data.data)) { const total = data.data.reduce((sum, item) => sum + (item.bytes || 0), 0); localStorage.setItem("platform_usage_bytes", String(total)); setPlatformBytes(total); }
      } catch {}
    };
    fetchStorage();
    const sync = (e) => setPlatformBytes(e?.detail?.bytes !== undefined ? Number(e.detail.bytes) : Number(localStorage.getItem("platform_usage_bytes") || 0));
    window.addEventListener("storage_updated", sync); window.addEventListener("storage", sync);
    return () => { window.removeEventListener("storage_updated", sync); window.removeEventListener("storage", sync); };
  }, []);

  const formatStorage = (b) => (!b || b <= 0 ? "0 MB" : b < 1048576 ? (b / 1024).toFixed(0) + " KB" : (b / 1048576).toFixed(b < 104857600 ? 1 : 0) + " MB");
  const limitBytes = 500 * 1024 * 1024, percentUsed = Math.min(100, Math.max(0, (platformBytes / limitBytes) * 100)), usageDisplay = formatStorage(platformBytes) + " / 500 MB";

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-background text-text-primary font-sans transition-colors duration-150">
      <DashboardSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} isDrawerOpen={isDrawerOpen} onCloseDrawer={() => setIsDrawerOpen(false)} usageDisplay={usageDisplay} percentUsed={percentUsed} />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <DashboardHeader onOpenDrawer={() => setIsDrawerOpen(true)} />
        <main className={`flex-1 w-full relative ${isStudio ? "overflow-hidden p-0" : "overflow-y-auto overflow-x-hidden p-6"}`}><ErrorBoundary><Outlet /></ErrorBoundary></main>
      </div>
      {micErrorNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 max-w-[calc(100vw-2rem)] w-fit mx-auto px-4 py-2.5 rounded-2xl bg-red-600/90 text-white text-xs font-medium shadow-lg backdrop-blur border border-red-500/30">
          <span className="truncate">Mic access lost. Call ended.</span>
          <button onClick={() => { setMicErrorNotice(false); if (startCall) startCall(); }} className="px-2.5 py-0.5 bg-white text-red-600 rounded-full font-semibold hover:bg-red-50 transition-colors shrink-0">Reconnect Call</button>
          <button onClick={() => setMicErrorNotice(false)} className="text-white/80 hover:text-white ml-1 shrink-0">×</button>
        </div>
      )}
      {limitNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 max-w-[calc(100vw-2rem)] w-fit mx-auto px-4 py-2.5 rounded-2xl bg-amber-600/90 text-white text-xs font-medium shadow-lg backdrop-blur border border-amber-500/30">
          <span className="truncate">1-hour call limit reached.</span>
          <button onClick={() => { setLimitNotice(false); if (startCall) startCall(); }} className="px-2.5 py-0.5 bg-white text-amber-600 rounded-full font-semibold hover:bg-amber-50 transition-colors shrink-0">Reconnect</button>
          <button onClick={() => setLimitNotice(false)} className="text-white/80 hover:text-white ml-1 shrink-0">×</button>
        </div>
      )}
      <VisualSpotlight /><DynamicModalHost /><PersistentNesaCallHost /><InstallPrompt /><ApiFallbackModal />
    </div>
  );
}

export const DashboardLayout = () => <NesaCallProvider><DashboardLayoutContent /></NesaCallProvider>;
export default DashboardLayout;
