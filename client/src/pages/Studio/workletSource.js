export const WORKLET_SRC = `class P extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.buffer = new Float32Array(512);
    this.bufferIndex = 0;
    this.sourceSampleRate = options?.processorOptions?.sampleRate || (typeof sampleRate !== 'undefined' ? sampleRate : 48000);
    this.targetSampleRate = 16000;
    this.step = this.sourceSampleRate / this.targetSampleRate;
    this.phase = 0;
    this.lastSample = 0;
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input || input.length === 0) return true;

    for (let i = 0; i < input.length; i++) {
      const current = input[i];
      while (this.phase < 1) {
        const interpolated = this.lastSample + this.phase * (current - this.lastSample);
        this.buffer[this.bufferIndex++] = interpolated;

        if (this.bufferIndex >= 512) {
          let peak = 0;
          const pcm = new Int16Array(512);
          for (let j = 0; j < 512; j++) {
            const v = Math.max(-1, Math.min(1, this.buffer[j]));
            const abs = Math.abs(v);
            if (abs > peak) peak = abs;
            pcm[j] = v < 0 ? v * 32768 : v * 32767;
          }
          this.port.postMessage({ pcm: pcm.buffer, peak }, [pcm.buffer]);
          this.bufferIndex = 0;
        }

        this.phase += this.step;
      }
      this.phase -= 1;
      this.lastSample = current;
    }

    return true;
  }
}
registerProcessor('p', P);`;
