import { useEffect } from "react";

export function useNesaContextEvent(sendContextTurn) {
  useEffect(() => {
    const handleContextEvent = (e) => {
      const text = e?.detail?.text || e?.detail;
      if (text && sendContextTurn) sendContextTurn(text);
    };
    window.addEventListener("nesa:context", handleContextEvent);
    return () => window.removeEventListener("nesa:context", handleContextEvent);
  }, [sendContextTurn]);
}
