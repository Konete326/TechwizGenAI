import { useState, useEffect } from "react";
import { Eye, EyeSlash, Check, ArrowCounterClockwise, ShieldCheck } from "@phosphor-icons/react";
import { useToast } from "@/context/ToastContext";

export function ApiSettings() {
  const toast = useToast();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [hasSavedKey, setHasSavedKey] = useState(false);

  useEffect(() => {
    const existing = localStorage.getItem("techwiz_custom_api_key") || localStorage.getItem("custom_api_key") || "";
    setApiKey(existing);
    setHasSavedKey(Boolean(existing));
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      toast.error("Please enter a valid API key");
      return;
    }
    localStorage.setItem("techwiz_custom_api_key", cleanKey);
    localStorage.setItem("custom_api_key", cleanKey);
    setHasSavedKey(true);
    toast.success("Custom Gemini API Key saved");
  };

  const handleReset = () => {
    localStorage.removeItem("techwiz_custom_api_key");
    localStorage.removeItem("custom_api_key");
    setApiKey("");
    setHasSavedKey(false);
    window.dispatchEvent(new CustomEvent("api_key_reverted"));
    toast.success("Reverted to default platform API key");
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-text-primary">API & Integrations</h3>
        <p className="text-xs text-text-muted mt-0.5">Configure Bring-Your-Own-Key (BYOK) for direct model interactions.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 max-w-xl">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text-primary">Google Gemini API Key</label>
            <span className="text-[11px] font-mono text-text-muted">
              {hasSavedKey ? "Custom key active" : "Using platform default"}
            </span>
          </div>

          <div className="relative flex items-center">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full pl-3 pr-10 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary font-mono focus:outline-hidden focus:border-accent"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              title={showKey ? "Hide key" : "Show key"}
            >
              {showKey ? <EyeSlash size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs flex items-start gap-2.5">
          <ShieldCheck size={18} className="shrink-0 text-amber-400 mt-0.5" />
          <p className="leading-relaxed text-[11px]">
            Security Notice: Your custom API key is stored strictly on your local browser device via secure web storage and is transmitted over encrypted headers per request. It is never logged into platform database tables.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors cursor-pointer shadow"
          >
            <Check size={14} weight="bold" />
            <span>Save Custom Key</span>
          </button>

          {hasSavedKey && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-surface hover:bg-surface-elevated text-text-muted hover:text-text-primary text-xs font-medium transition-colors cursor-pointer"
            >
              <ArrowCounterClockwise size={14} />
              <span>Reset to Default</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default ApiSettings;
