/**
 * AudioAnalysisBus — Central real-time audio telemetry bus.
 * Bridges Web Audio API playback with VoiceSyncManager for lip-sync.
 * Completely provider-agnostic.
 */

class AudioAnalysisBusClass {
  constructor() {
    /** @type {AnalyserNode | null} */
    this._analyser = null;
    /** @type {Uint8Array | null} */
    this._freqData = null;
    /** @type {Uint8Array | null} */
    this._timeData = null;
    this._isActive = false;
  }

  /**
   * Set the active AnalyserNode from any playback engine (Web Audio, HTMLAudioElement, etc.)
   * @param {AnalyserNode | null} analyser
   */
  setAnalyser(analyser) {
    this._analyser = analyser;
    if (analyser) {
      this._freqData = new Uint8Array(analyser.frequencyBinCount);
      this._timeData = new Uint8Array(analyser.fftSize);
    } else {
      this._freqData = null;
      this._timeData = null;
    }
  }

  getAnalyser() {
    return this._analyser;
  }

  setActive(active) {
    this._isActive = Boolean(active);
  }

  isActive() {
    return this._isActive;
  }

  /**
   * Sample current audio metrics:
   * @returns {{
   *   volume: number,        // 0.0 - 1.0 RMS amplitude
   *   lowFreq: number,       // 0.0 - 1.0 (approx 200-800Hz, mouth opening 'aa'/'oh')
   *   midFreq: number,       // 0.0 - 1.0 (approx 800-2200Hz, spread 'ih'/'ee')
   *   highFreq: number,      // 0.0 - 1.0 (approx 2200-4000Hz, sibilance)
   *   dominantPhoneme: string // 'aa' | 'oh' | 'ee' | 'ih' | 'ou' | 'neutral'
   * }}
   */
  sample() {
    if (!this._analyser || !this._freqData || !this._timeData) {
      return { volume: 0, lowFreq: 0, midFreq: 0, highFreq: 0, dominantPhoneme: "neutral" };
    }

    this._analyser.getByteFrequencyData(this._freqData);
    this._analyser.getByteTimeDomainData(this._timeData);

    // Compute RMS amplitude from time-domain data
    let sumSquares = 0;
    const len = this._timeData.length;
    for (let i = 0; i < len; i++) {
      const normalized = (this._timeData[i] - 128) / 128; // -1.0 to 1.0
      sumSquares += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquares / len);

    // If below noise gate, return silence
    if (rms < 0.02) {
      return { volume: 0, lowFreq: 0, midFreq: 0, highFreq: 0, dominantPhoneme: "neutral" };
    }

    // Split frequency spectrum (FFT 512 bins at 24kHz -> bin width ~47Hz)
    // Low: bins 4 to 18 (~200Hz - 850Hz) - F1 vowel formant
    // Mid: bins 19 to 50 (~900Hz - 2350Hz) - F2 vowel formant
    // High: bins 51 to 90 (~2400Hz - 4200Hz) - consonants / fricatives
    let lowSum = 0, lowCount = 0;
    let midSum = 0, midCount = 0;
    let highSum = 0, highCount = 0;

    for (let i = 4; i <= 18 && i < this._freqData.length; i++) {
      lowSum += this._freqData[i];
      lowCount++;
    }
    for (let i = 19; i <= 50 && i < this._freqData.length; i++) {
      midSum += this._freqData[i];
      midCount++;
    }
    for (let i = 51; i <= 90 && i < this._freqData.length; i++) {
      highSum += this._freqData[i];
      highCount++;
    }

    const lowAvg = lowCount > 0 ? (lowSum / lowCount) / 255 : 0;
    const midAvg = midCount > 0 ? (midSum / midCount) / 255 : 0;
    const highAvg = highCount > 0 ? (highSum / highCount) / 255 : 0;

    // Estimate dominant mouth viseme based on acoustic formant ratio
    let dominant = "aa";
    if (lowAvg > 0.35 && midAvg < 0.25) {
      dominant = "oh";
    } else if (midAvg > lowAvg * 1.2 && midAvg > 0.25) {
      dominant = "ee";
    } else if (lowAvg > 0.4 && midAvg > 0.3) {
      dominant = "aa";
    } else if (midAvg > 0.2) {
      dominant = "ih";
    } else if (lowAvg > 0.2) {
      dominant = "ou";
    }

    return {
      volume: Math.min(1, rms * 3.5),
      lowFreq: lowAvg,
      midFreq: midAvg,
      highFreq: highAvg,
      dominantPhoneme: dominant
    };
  }
}

const AudioAnalysisBus = new AudioAnalysisBusClass();
export default AudioAnalysisBus;
