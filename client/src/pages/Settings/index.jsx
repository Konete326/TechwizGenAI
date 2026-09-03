import { useState, useEffect } from "react";
import { Sun, Moon, Bell } from "@phosphor-icons/react";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import { ApiSettingsCard } from "./ApiSettingsCard";

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

export function Settings() {
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [storageWarnings, setStorageWarnings] = useState(true);
  const [aiProvider, setAiProvider] = useState(() => localStorage.getItem("custom_ai_provider") || "Google Gemini");
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem("custom_api_key") || "");

  useEffect(() => {
    const handleReverted = () => {
      setCustomApiKey("");
      setAiProvider("Google Gemini");
    };
    window.addEventListener("api_key_reverted", handleReverted);
    return () => window.removeEventListener("api_key_reverted", handleReverted);
  }, []);

  const handleSave = () => {
    localStorage.setItem("custom_ai_provider", aiProvider);
    if (customApiKey.trim()) {
      localStorage.setItem("custom_api_key", customApiKey.trim());
    } else {
      localStorage.removeItem("custom_api_key");
    }
    toast.success("Platform settings updated successfully");
  };

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="pb-3 border-b border-border/60">
        <h2 className="text-xl font-bold tracking-tight text-text-primary">Platform Settings</h2>
        <p className="text-xs text-text-muted mt-0.5">Configure system themes, notification triggers, and API integration endpoints.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        <div className="space-y-6">
          <div className="relative p-5 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-4">
            <CornerBracket />
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Sun size={16} className="text-accent" />
              <h3 className="text-sm font-semibold text-text-primary">Appearance & Display</h3>
            </div>
            <div className="space-y-3">
              <p className="text-xs text-text-muted leading-relaxed">
                Switch between High-Contrast Dark and Technical Light palettes optimized for long data inspection sessions.
              </p>
              <div className="flex items-center justify-between p-3 rounded bg-surface border border-border">
                <span className="text-xs font-medium text-text-primary">Current Theme</span>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-surface-elevated border border-border text-xs font-semibold text-text-primary hover:border-accent transition-colors cursor-pointer"
                >
                  {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
                  <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="relative p-5 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-4">
            <CornerBracket />
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Bell size={16} className="text-accent" />
              <h3 className="text-sm font-semibold text-text-primary">Notification Triggers</h3>
            </div>
            <div className="space-y-2.5">
              <label className="flex items-center justify-between p-2.5 rounded bg-surface border border-border cursor-pointer">
                <span className="text-xs text-text-primary font-medium">Generation Status Alerts</span>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="accent-blue-600 rounded cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between p-2.5 rounded bg-surface border border-border cursor-pointer">
                <span className="text-xs text-text-primary font-medium">Storage Quota Thresholds</span>
                <input
                  type="checkbox"
                  checked={storageWarnings}
                  onChange={(e) => setStorageWarnings(e.target.checked)}
                  className="accent-blue-600 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>

        <ApiSettingsCard
          aiProvider={aiProvider}
          setAiProvider={setAiProvider}
          customApiKey={customApiKey}
          setCustomApiKey={setCustomApiKey}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}

export default Settings;
