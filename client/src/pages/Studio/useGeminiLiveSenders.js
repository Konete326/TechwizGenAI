import { markLastSpeech } from "./logger";
import { noteUserActivity } from "./nesaToolGuards";
import { noteUserFrame } from "./userFrameWatch";

function sendTurn(wsRef, text, turnComplete) {
  if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !text) return false;
  try {
    noteUserActivity(text);
    noteUserFrame("client.text");
    wsRef.current.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text }] }], turnComplete } }));
    return true;
  } catch {
    return false;
  }
}

export function useGeminiLiveSenders(wsRef) {
  const forceReply = (t = "Hello Nisa") => {
    const sent = sendTurn(wsRef, t, true);
    if (sent) markLastSpeech();
    return sent;
  };

  const sendContextTurn = (t) => {
    sendTurn(wsRef, t, false);
  };

  return { forceReply, sendContextTurn };
}

export default useGeminiLiveSenders;
