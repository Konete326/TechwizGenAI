import { useEffect } from "react";

export function useWakeLock(isCallActive) {
  useEffect(() => {
    let wakeLock = null;
    const acquireLock = async () => {
      if (!isCallActive) return;
      if (typeof window === "undefined" || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
      if (window.self !== window.top) return;
      try {
        wakeLock = await navigator.wakeLock.request("screen");
      } catch (_) {}
    };
    acquireLock();
    const handleVisChange = () => {
      if (document.visibilityState === "visible") acquireLock();
    };
    document.addEventListener("visibilitychange", handleVisChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisChange);
      if (wakeLock) {
        wakeLock.release().catch(() => {});
        wakeLock = null;
      }
    };
  }, [isCallActive]);
}
