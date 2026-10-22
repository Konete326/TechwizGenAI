import { startCapture } from "./audioCapture";
import { createPlayback } from "./audioPlayback";
import { markSpeaking, micBlocked } from "./micGate";

export function createLiveAudio(setIsSpeaking) {
  let playback = null;
  let capture = null;

  const report = (active) => {
    markSpeaking(active);
    setIsSpeaking(active);
  };

  return {
    open() {
      if (!playback) playback = createPlayback();
      playback?.resume?.();
    },
    schedule(chunk) {
      if (!playback) playback = createPlayback();
      playback?.scheduleChunk(chunk, report);
    },
    startTurn() {
      playback?.startTurn?.(report);
    },
    endTurn() {
      playback?.endTurn?.(report);
    },
    stopAll() {
      playback?.stopAll?.(report);
      report(false);
    },
    resume() {
      if (!playback) playback = createPlayback();
      playback?.resume?.();
    },
    micBlocked() {
      return micBlocked();
    },
    async startCapture(options) {
      capture = await startCapture(options);
      return capture;
    },
    close() {
      capture?.stop();
      capture = null;
      playback?.close();
      playback = null;
      report(false);
    }
  };
}

export default createLiveAudio;
