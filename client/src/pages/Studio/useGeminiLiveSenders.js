import { markLastSpeech } from "./logger";
import { noteUserActivity } from "./nesaToolGuards";
import { noteUserFrame } from "./userFrameWatch";

function sendTurn(wsRef, text, turnComplete) {
  if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !text) return false;
  noteUserActivity(text);
  noteUserFrame("client.text");
  wsRef.current.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text }] }], turnComplete } }));
  return true;
}

export function useGeminiLiveSenders(wsRef) {
  const forceReply = (t = "Hello Nisa") => {
    if (sendTurn(wsRef, t, true)) markLastSpeech();
  };

  const sendContextTurn = (t) => {
    sendTurn(wsRef, t, false);
  };

  return { forceReply, sendContextTurn };
}

export default useGeminiLiveSenders;
