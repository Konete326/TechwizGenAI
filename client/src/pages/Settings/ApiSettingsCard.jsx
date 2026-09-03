import { useState } from "react";
import { Key, Sparkle, CloudCheck, Check, Eye, EyeSlash, Broadcast } from "@phosphor-icons/react";
import { Loader } from "@/components/ui/Loader";
import { useToast } from "@/context/ToastContext";
import { VITE_API_URL } from "@/config/env";

function CornerBracket() {
  return (
    <>
      <span className="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-border-corner pointer-events-none" />
      <span className="absolute top-1 right-1 w-1.5 h-1.5 border-t border-r border-border-corner pointer-events-none" />
      <span className="absolute bottom-1 left-1 w-1.5 h-1.5 border-b border-l border-border-corner pointer-events-none" />
      <span className="absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r border-border-corner pointer-events-none" />
    </>
  );
}

export function ApiSettingsCard({
  aiProvider,
  setAiProvider,
  customApiKey,
  setCustomApiKey,
  onSave
}) {
  const toast = useToast();
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleTestConnection = async () => {
    if (!customApiKey.trim()) {
      toast.error("Please enter a custom API key first");
      return;
    }

    setIsTesting(true);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${VITE_API_URL}/ai/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-custom-api-key": customApiKey.trim(),
          "x-ai-provider": aiProvider
        },
        body: JSON.stringify({ apiKey: customApiKey.trim(), provider: aiProvider })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("API Connection Verified");
      } else {
        toast.error(data.message || "API Key Verification Failed");
      }
    } catch {
      toast.error("Network error testing API connection");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="relative p-5 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-4 flex flex-col justify-between">
      <div>
        <CornerBracket />
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Key size={16} className="text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">API & Infrastructure Endpoints</h3>
        </div>

        <div className="space-y-4 mt-4 text-xs">
          <div>
            <label className="text-[11px] font-mono text-text-muted block mb-1">AI Provider</label>
            <select
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value)}
              className="w-full h-8 px-3 rounded-[var(--radius-sm)] bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-accent cursor-pointer"
            >
              <option value="Google Gemini">Google Gemini</option>
              <option value="OpenRouter">OpenRouter</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-mono text-text-muted block mb-1">Custom API Key</label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder="Leave blank to use system default"
                className="w-full h-8 pl-3 pr-9 rounded-[var(--radius-sm)] bg-surface border border-border text-xs font-mono text-text-primary focus:outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute inset-y-0 right-0 px-2.5 flex items-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                aria-label={showKey ? "Hide API Key" : "Show API Key"}
              >
                {showKey ? <EyeSlash size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="flex justify-start">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-surface border border-border hover:border-accent text-text-primary text-xs font-medium transition-colors btn-tactile cursor-pointer disabled:opacity-50"
            >
              {isTesting ? <Loader size={13} /> : <Broadcast size={14} className="text-accent" />}
              <span>{isTesting ? "Testing Connection..." : "Test Connection"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex items-center justify-between p-2.5 rounded bg-surface border border-border">
              <div className="flex items-center gap-2">
                <Sparkle size={15} className="text-purple-400" />
                <span className="text-xs text-text-primary font-medium">Gemini 2.5 Engine</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <Check size={12} /> Connected
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded bg-surface border border-border">
              <div className="flex items-center gap-2">
                <CloudCheck size={15} className="text-blue-400" />
                <span className="text-xs text-text-primary font-medium">Cloudinary CDN</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <Check size={12} /> Synchronized
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border">
        <button
          type="button"
          onClick={onSave}
          className="px-4 py-1.5 rounded-[var(--radius-sm)] bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm transition-colors btn-tactile cursor-pointer"
        >
          Save Configuration
        </button>
      </div>
    </div>
  );
}

export default ApiSettingsCard;
