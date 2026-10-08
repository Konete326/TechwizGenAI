import { useEffect } from "react";
import { logConnectionQuality } from "./logger";

export function useConnectionQuality({ isConnected, wsRef, lastMessageTimeRef, setConnectionQuality }) {
  useEffect(() => {
    let lastQ = "offline";
    const updateQ = (q) => { if (q !== lastQ) { lastQ = q; setConnectionQuality(q); logConnectionQuality(q); } };
    if (!isConnected) { updateQ("offline"); return; }
    if (!navigator.onLine) { updateQ("offline"); return; }
    updateQ("good");
    const id = setInterval(() => {
      if (!navigator.onLine) {
        updateQ("offline");
      } else if (wsRef.current && wsRef.current.bufferedAmount > 1024 * 64) {
        updateQ("weak");
      } else if (Date.now() - lastMessageTimeRef.current > 15000) {
        updateQ("weak");
      } else {
        updateQ("good");
      }
    }, 1000);
    return () => clearInterval(id);
  }, [isConnected, wsRef, lastMessageTimeRef, setConnectionQuality]);
}
