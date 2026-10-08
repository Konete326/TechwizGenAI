import { respondToTool } from "@/pages/Studio/nesaTools";
import { isAllowedRoute, userAskedFor } from "@/pages/Studio/nesaToolGuards";
import { logDebug } from "@/pages/Studio/logger";
import { runNesaDataTool } from "./nesaDataActions";

function findTarget(targetKey) {
  return document.querySelector(`[data-nesa-target="${targetKey}"]`) || document.getElementById(targetKey);
}

export function registerNesaActions(ctx) {
  const { navigate, pathname, endCall, reposition, setDrawerOpen, setCollapsed, setMicNotice, setLimitNotice } = ctx;

  const handleLogout = () => { if (endCall) endCall(); localStorage.removeItem("token"); localStorage.removeItem("user"); localStorage.removeItem("techwiz_custom_api_key"); navigate("/login"); };
  const handleMicLost = () => {
    try { const u = new SpeechSynthesisUtterance("Aapka mic access khatam ho gaya hai. Main call cut kar rahi hoon, aap wapas call laga lein."); u.rate = 1.05; window.speechSynthesis.speak(u); } catch (err) { logDebug("Mic lost announcement failed", err); }
    setTimeout(() => { if (endCall) endCall(); }, 3500); setMicNotice(true);
  };
  const handleLimitReached = () => { if (endCall) endCall(); setLimitNotice(true); };
  const handleSidebarOpen = () => { if (window.innerWidth < 768) setDrawerOpen(true); else setCollapsed(false); };

  const handleToolCall = async (e) => {
    const d = e?.detail || {}, route = d.args?.route || d.route, cid = d.id || d.callId || ("call_" + Date.now());
    if (window.innerWidth < 768 && d.name !== "repositionWidget" && reposition) reposition("minimize");
    if (d.name === "navigatePage") {
      if (!route) respondToTool(cid, "navigatePage", { status: "error", message: "Missing route" });
      else if (!isAllowedRoute(route)) respondToTool(cid, "navigatePage", { status: "error", message: `Route ${route} is outside the allowed app routes and was not opened` });
      else {
        navigate(route);
        setTimeout(() => respondToTool(cid, "navigatePage", { success: true, route }), 120);
      }
    }
    if (d.name === "clickElement") {
      const targetKey = d.args?.targetKey || d.targetKey;
      if (!targetKey) respondToTool(cid, "clickElement", { status: "error", message: "Missing targetKey" });
      else {
        if (targetKey.startsWith("nav_") || targetKey === "sidebar_toggle") { if (window.innerWidth < 768) setDrawerOpen(true); else setCollapsed(false); }
        if (targetKey === "logout_btn") window.dispatchEvent(new CustomEvent("app:user_menu:open"));
        setTimeout(() => {
          const el = findTarget(targetKey);
          if (el) {
            try { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.click(); } catch (err) { logDebug("clickElement failed", targetKey, err); }
            respondToTool(cid, "clickElement", { status: "success", clicked: targetKey });
          } else respondToTool(cid, "clickElement", { status: "not_found", target: targetKey });
        }, 60);
      }
    }
    if (d.name === "fillFormField") {
      const targetKey = d.args?.targetKey || d.targetKey, value = d.args?.value !== undefined ? d.args.value : (d.value !== undefined ? d.value : "");
      if (!targetKey) respondToTool(cid, "fillFormField", { status: "error", message: "Missing targetKey" });
      else {
        setTimeout(() => {
          const el = document.querySelector('[data-nesa-target="' + targetKey + '"]') || document.querySelector('input[name="' + targetKey + '"]') || document.getElementById(targetKey);
          if (el) {
            try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (err) { logDebug("fillFormField scroll failed", targetKey, err); }
            const proto = (window.HTMLTextAreaElement && el instanceof window.HTMLTextAreaElement) ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
            try { if (setter) setter.call(el, value); else el.value = value; } catch (err) { el.value = value; logDebug("fillFormField native setter failed", targetKey, err); }
            el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true }));
            respondToTool(cid, "fillFormField", { status: "success", field: targetKey, value });
          } else respondToTool(cid, "fillFormField", { status: "not_found", field: targetKey });
        }, 60);
      }
    }
    if (d.name === "closeModal") window.dispatchEvent(new CustomEvent("nesa:modal:close"));
    if (d.name === "executeLogout") {
      if (userAskedFor("executeLogout")) handleLogout();
      else respondToTool(cid, "executeLogout", { status: "blocked", message: "Logout was not run because the user did not ask for it in this turn" });
    }
    if (d.name === "disconnectCall" && endCall) {
      if (userAskedFor("disconnectCall")) setTimeout(() => endCall(), 1400);
      else respondToTool(cid, "disconnectCall", { status: "blocked", message: "The call was not ended because the user did not ask for it in this turn" });
    }
    if (d.name === "controlSidebar") {
      const act = (d.args?.action || d.action || "open").toLowerCase();
      if (act === "open") { setCollapsed(false); setDrawerOpen(true); } else if (act === "close") { setCollapsed(true); setDrawerOpen(false); } else { setCollapsed((p) => !p); setDrawerOpen((p) => !p); }
      respondToTool(cid, "controlSidebar", { success: true, action: act });
    }
    if (d.name === "toggleWorkspaceControl") {
      const ctrl = (d.args?.control || d.control || "").toLowerCase();
      if (ctrl.includes("theme")) { try { localStorage.setItem("theme", document.documentElement.classList.toggle("dark") ? "dark" : "light"); } catch (err) { logDebug("theme toggle persist failed", err); } window.dispatchEvent(new CustomEvent("theme_changed")); }
      if (ctrl.includes("sidebar")) setCollapsed((p) => !p);
      respondToTool(cid, "toggleWorkspaceControl", { success: true, control: ctrl });
    }
    if (d.name === "deleteSession") { window.dispatchEvent(new CustomEvent("nesa:delete_session", { detail: d.args || d })); respondToTool(cid, "deleteSession", { success: true }); }
    if (d.name === "switchSession" || d.name === "submitStudioPrompt") {
      if (!pathname.startsWith("/studio")) navigate("/studio", { state: { pendingToolCall: d } });
      respondToTool(cid, d.name, { status: "unsupported", message: `${d.name} has no handler on /studio, only the navigation ran` });
    }
    await runNesaDataTool(ctx, d, cid);
  };

  window.addEventListener("nesa:toolcall", handleToolCall); window.addEventListener("auth:logout", handleLogout); window.addEventListener("nesa:mic_lost", handleMicLost); window.addEventListener("nesa:limit_reached", handleLimitReached); window.addEventListener("app:sidebar:open", handleSidebarOpen);
  return () => { window.removeEventListener("nesa:toolcall", handleToolCall); window.removeEventListener("auth:logout", handleLogout); window.removeEventListener("nesa:mic_lost", handleMicLost); window.removeEventListener("nesa:limit_reached", handleLimitReached); window.removeEventListener("app:sidebar:open", handleSidebarOpen); };
}
