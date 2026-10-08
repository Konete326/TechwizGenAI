import { useEffect } from "react";

export function useWakeLock(isCallActive) {
  useEffect(() => {
    let wakeLock = null;
    const acquireLock = async () => {
      if (isCallActive && typeof navigator !== "undefined" && "wakeLock" in navigator) {
        try { wakeLock = await navigator.wakeLock.request("screen"); } catch (e) { console.error(e); }
      }
    };
    acquireLock();
    const handleVisChange = () => { if (document.visibilityState === "visible") acquireLock(); };
    document.addEventListener("visibilitychange", handleVisChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisChange);
      if (wakeLock) { wakeLock.release().catch((e) => { console.error(e); }); wakeLock = null; }
    };
  }, [isCallActive]);
}
