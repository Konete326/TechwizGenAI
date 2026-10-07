import { base64DecodeAudio } from "./audioUtils";
import { dispatchToolCall } from "./toolDispatch";

export function createServerMessageHandler({
  isReadyRef, playbackRef, setIsSpeaking, setTranscript,
  wsRef, pendingRef, stopAudio, onToolCallRef
}) {
  return async (event) => {
    try {
      let raw = event.data;
      if (typeof raw !== "string") raw = raw?.text ? await raw.text() : new TextDecoder().decode(raw);
      const data = JSON.parse(raw);

      if (data.setupComplete || data.setup_complete) {
        isReadyRef.current = true;
        return;
      }

      if (data.error) {
        const msg = data.error.message || "";
        if (msg.includes("429") || msg.includes("quota") || msg.includes("rate") || msg.includes("exhausted")) {
          try { wsRef.current?.close(4429, msg); } catch {}
        }
        return;
      }

      const toolCall = data.toolCall || data.tool_call || data.serverContent?.toolCall;
      if (toolCall) {
        const calls = toolCall.functionCalls || toolCall.function_calls || [];
        for (const call of calls) dispatchToolCall(call, wsRef, pendingRef, onToolCallRef.current);
        return;
      }

      const sc = data.serverContent || data.server_content;
      if (!sc) return;

      if (sc.interrupted) { stopAudio(); return; }
      if (sc.turnComplete || sc.turn_complete) return;

      const parts = (sc.modelTurn || sc.model_turn)?.parts || [];
      for (const part of parts) {
        if (part.text) setTranscript(prev => prev ? prev + " " + part.text : part.text);
        const inline = part.inlineData || part.inline_data || part.audio;
        const mime = inline?.mimeType || inline?.mime_type;
        if (inline?.data && (mime?.startsWith("audio/") || !mime)) {
          playbackRef.current?.scheduleChunk(base64DecodeAudio(inline.data), setIsSpeaking);
        }
      }
    } catch {}
  };
}
