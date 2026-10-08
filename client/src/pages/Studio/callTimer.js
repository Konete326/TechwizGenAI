import { logDebug } from "./logger";
export function startCallTimer({ durationRef, warned55Ref, wsRef, onDisconnect }) {
  const id = setInterval(() => {
    durationRef.current += 1;
    const s = durationRef.current;
    if (s === 3300 && !warned55Ref.current) {
      warned55Ref.current = true;
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          clientContent: {
            turns: [{ role: "user", parts: [{ text: "Notice: Call duration approaching 1-hour limit." }] }],
            turnComplete: false
          }
        }));
      }
    }
    if (s >= 3600) {
      clearInterval(id);
      try {
        const u = new SpeechSynthesisUtterance("Call duration reached 1-hour limit. Disconnecting session.");
        u.rate = 1.05;
        window.speechSynthesis.speak(u);
      } catch(err) { console.error("SpeechSynthesis error:", err); }
      window.dispatchEvent(new CustomEvent("nesa:limit_reached"));
      try { wsRef.current?.close(1000, "Call duration limit reached"); } catch(err) { logDebug("WS close error", err); }
      onDisconnect();
    }
  }, 1000);
  return () => clearInterval(id);
}
