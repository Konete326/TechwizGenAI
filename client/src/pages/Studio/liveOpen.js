import { buildSetupMessage } from "./nesaSetup";
import { pcmToB64 } from "./audioUtils";
import { startCallTimer } from "./callTimer";
import { startUserFrameWatchdog, noteUserFrame } from "./userFrameWatch";
import { noteUserActivity } from "./nesaToolGuards";

const MIC_MIME = "audio/pcm;rate=16000";

export function sendSetupAndReconnectContext(ws, { resumeHandleRef, transcript, isReconnect }) {
  ws.send(JSON.stringify(buildSetupMessage(resumeHandleRef.current)));
  if (isReconnect && transcript) {
    ws.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text: "Context from before reconnect: " + transcript.slice(-1000) }] }], turnComplete: false } }));
  } else if (!isReconnect) {
    ws.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text: "Hello Nisa, I just connected. Briefly greet me and let me know you are ready." }] }], turnComplete: true } }));
  }
}

export function startInputStream(ws, { audio, isReadyRef, isCallActiveRef, setIsUserSpeaking, userSpeakingTimerRef }) {
  noteUserActivity("call_started");
  return audio.startCapture({
    onChunk: (pcmBuf, peak) => {
      if (ws.readyState !== WebSocket.OPEN || !isReadyRef.current) return;
      if (audio.micBlocked()) return;

      if (peak > 0.008) {
        startUserFrameWatchdog();
        noteUserFrame("mic.audio");
        noteUserActivity("");
        if (setIsUserSpeaking && userSpeakingTimerRef) {
          setIsUserSpeaking(true);
          if (userSpeakingTimerRef.current) clearTimeout(userSpeakingTimerRef.current);
          userSpeakingTimerRef.current = setTimeout(() => setIsUserSpeaking(false), 450);
        }
      }

      ws.send(JSON.stringify({
        realtimeInput: {
          audio: {
            mimeType: MIC_MIME,
            data: pcmToB64(pcmBuf)
          }
        }
      }));
    },
    onMicLost: () => {
      if (isCallActiveRef.current) window.dispatchEvent(new CustomEvent("nesa:mic_lost"));
    }
  });
}

export function ensureCallTimer({ durationStopRef, durationRef, warned55Ref, wsRef, onDisconnect }) {
  if (durationStopRef.current) return;
  durationStopRef.current = startCallTimer({ durationRef, warned55Ref, wsRef, onDisconnect });
}
