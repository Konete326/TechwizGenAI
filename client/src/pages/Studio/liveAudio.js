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
      playback = createPlayback();
    },
    schedule(chunk) {
      playback?.scheduleChunk(chunk, report);
    },
    stopAll() {
      playback?.stopAll();
      report(false);
    },
    resume() {
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
