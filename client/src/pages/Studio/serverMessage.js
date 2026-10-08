import { logDebug } from "./logger";
import { base64DecodeAudio } from "./audioUtils";
import { dispatchToolCall } from "./toolDispatch";
import { noteUserActivity } from "./nesaToolGuards";
import { noteUserFrame } from "./userFrameWatch";
import { logServerMessage, markFirstAudioRecv } from "./logger";

const USER_SPEECH_EVENTS = new Set(["ACTIVITY_START", "ACTIVITY_END"]);

export function createServerMessageHandler({
  isReadyRef, audio, setTranscript,
  wsRef, pendingRef, stopAudio, onToolCallRef, lastMessageTimeRef, resumeHandleRef
}) {
  return async (event) => {
    if (lastMessageTimeRef) lastMessageTimeRef.current = Date.now();
    try {
      let raw = event.data;
      if (typeof raw !== "string") raw = raw?.text ? await raw.text() : new TextDecoder().decode(raw);
      const data = JSON.parse(raw);

      if (data.sessionResumptionUpdate) {
        if (resumeHandleRef && data.sessionResumptionUpdate.resumable) {
          resumeHandleRef.current = data.sessionResumptionUpdate.newHandle || null;
        }
        return;
      }

      if (data.setupComplete || data.setup_complete) {
        logServerMessage("setupComplete");
        isReadyRef.current = true;
        return;
      }

      if (data.error) {
        logServerMessage("error");
        const msg = data.error.message || "";
        if (msg.includes("429") || msg.includes("quota") || msg.includes("rate") || msg.includes("exhausted")) {
          try { wsRef.current?.close(4429, msg); } catch(err) { logDebug("WS close error", err); }
        } else {
          try { wsRef.current?.close(4000, msg); } catch(err) { logDebug("WS close error", err); }
        }
        return;
      }

      const va = data.voiceActivity || data.voice_activity;
      const vaType = va?.voiceActivityType || va?.voice_activity_type;
      if (USER_SPEECH_EVENTS.has(vaType)) {
        logServerMessage(`voiceActivity.${vaType}`);
        noteUserFrame(`voiceActivity.${vaType}`);
        noteUserActivity("");
      }

      const sc = data.serverContent || data.server_content;

      if (sc) {
        const inputTr = sc.inputTranscription || sc.input_transcription;
        const interimTr = sc.interimInputTranscription || sc.interim_input_transcription;
        const userWords = inputTr?.text || interimTr?.text || "";
        if (userWords.trim()) {
          noteUserFrame(inputTr ? "serverContent.inputTranscription" : "serverContent.interimInputTranscription");
          noteUserActivity(userWords);
        }
      }

      const toolCall = data.toolCall || data.tool_call || sc?.toolCall || sc?.tool_call;
      if (toolCall) {
        if (import.meta.env.VITE_DEBUG === "true") {
          console.log(`[DEBUG] ${performance.now().toFixed(1)} toolCall received:`, toolCall);
        }
        logServerMessage("toolCall");
        const calls = toolCall.functionCalls || toolCall.function_calls || [];
        for (const call of calls) dispatchToolCall(call, wsRef, pendingRef, onToolCallRef.current);
        return;
      }

      if (!sc) return;

      if (sc.interrupted) {
        if (import.meta.env.VITE_DEBUG === "true") {
          console.log(`[DEBUG] ${performance.now().toFixed(1)} serverContent.interrupted received`);
        }
        logServerMessage("serverContent.interrupted");
        if (pendingRef.current && pendingRef.current.size > 0) {
          if (import.meta.env.VITE_DEBUG === "true") {
            console.log(`[DEBUG] ${performance.now().toFixed(1)} ignoring interrupted because a tool is pending`);
          }
          return;
        }
        stopAudio();
        return;
      }
      if (sc.turnComplete || sc.turn_complete) {
        logServerMessage("serverContent.turnComplete");
        return;
      }

      const parts = (sc.modelTurn || sc.model_turn)?.parts || [];
      if (parts.length > 0) {
        logServerMessage("serverContent.modelTurn");
        markFirstAudioRecv();
      }
      for (const part of parts) {
        if (part.text) setTranscript(prev => prev ? prev + " " + part.text : part.text);
        const inline = part.inlineData || part.inline_data || part.audio;
        const mime = inline?.mimeType || inline?.mime_type;
        if (inline?.data && (mime?.startsWith("audio/") || !mime)) {
          audio.schedule(base64DecodeAudio(inline.data));
        }
      }
    } catch(err) { logDebug("JSON parse error", err); }
  };
}
