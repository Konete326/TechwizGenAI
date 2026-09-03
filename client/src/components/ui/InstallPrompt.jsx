import { useState, useEffect } from "react";
import { DownloadSimple, X } from "@phosphor-icons/react";
import logoImg from "@/assets/logo.png";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full p-4 rounded-[var(--radius-md)] bg-surface-card border border-border shadow-2xl animate-in slide-in-from-bottom-5 duration-200 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <img src={logoImg} alt="Techwiz GenAI" className="w-8 h-8 object-contain shrink-0" />
        <div className="min-w-0">
          <h4 className="text-xs font-semibold text-text-primary truncate">Install Desktop App</h4>
          <p className="text-[11px] text-text-muted truncate">Standalone offline-capable PWA</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleInstall}
          className="flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-sm)] bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm transition-colors btn-tactile"
        >
          <DownloadSimple size={13} weight="bold" />
          <span>Install</span>
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
          aria-label="Dismiss install prompt"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export default InstallPrompt;
