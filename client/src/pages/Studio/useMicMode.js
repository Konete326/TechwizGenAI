import { useCallback, useEffect, useSyncExternalStore } from "react";
import { applyAutoMicMode, hasHeadphoneOutput, isHalfDuplex, setMicMode, subscribeMicMode } from "./micGate";

export function useMicMode({ sessionActive = false } = {}) {
  const halfDuplex = useSyncExternalStore(subscribeMicMode, isHalfDuplex, isHalfDuplex);

  const scan = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      console.warn("Audio output enumeration is not supported in this browser, staying half-duplex");
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      applyAutoMicMode(hasHeadphoneOutput(devices));
    } catch (err) {
      console.warn("Audio output enumeration failed:", err?.message);
    }
  }, []);

  const toggleMicMode = useCallback(() => {
    setMicMode(isHalfDuplex() ? "full" : "half");
  }, []);

  useEffect(() => {
    const media = navigator.mediaDevices;
    scan();
    if (!media?.addEventListener) return;
    media.addEventListener("devicechange", scan);
    return () => media.removeEventListener("devicechange", scan);
  }, [scan]);

  useEffect(() => {
    if (sessionActive) scan();
  }, [sessionActive, scan]);

  return { micMode: halfDuplex ? "half" : "full", toggleMicMode };
}

export default useMicMode;
