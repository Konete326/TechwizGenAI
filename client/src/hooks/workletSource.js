export const WORKLET_SRC = `class P extends AudioWorkletProcessor {
  constructor() {
    super();
    this.b = new Float32Array(1024);
    this.i = 0;
  }
  process(inputs) {
    const d = inputs[0]?.[0];
    if (!d) return true;
    this.b.set(d, this.i);
    this.i += d.length;
    if (this.i >= 1024) {
      let m = 0;
      const p = new Int16Array(1024);
      for (let i = 0; i < 1024; i++) {
        m = Math.max(m, Math.abs(this.b[i]));
        const v = Math.max(-1, Math.min(1, this.b[i]));
        p[i] = v < 0 ? v * 32768 : v * 32767;
      }
      this.port.postMessage({ pcm: p.buffer, peak: m }, [p.buffer]);
      this.b = new Float32Array(1024);
      this.i = 0;
    }
    return true;
  }
}
registerProcessor('p', P);`;
