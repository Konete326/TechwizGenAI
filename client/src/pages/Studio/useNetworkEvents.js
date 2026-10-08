import { useEffect } from "react";

export function useNetworkEvents({ isConnected, connect, isCallActiveRef, setConnectionQuality }) {
  useEffect(() => {
    const handleOnline = () => {
      if (isCallActiveRef.current && !isConnected) connect(true);
    };
    const handleOffline = () => {
      if (isConnected) setConnectionQuality("offline");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isConnected, connect, isCallActiveRef, setConnectionQuality]);
}
