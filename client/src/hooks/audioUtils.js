export const pcmToB64 = (ab) => {
  const b = new Uint8Array(ab);
  let s = "";
  for (let i = 0; i < b.length; i += 8192) {
    s += String.fromCharCode.apply(null, b.subarray(i, i + 8192));
  }
  return btoa(s);
};

export const b64ToF32 = (b64) => {
  const b = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const p = new Int16Array(b.buffer);
  const f = new Float32Array(p.length);
  for (let i = 0; i < p.length; i++) {
    f[i] = p[i] / 32768;
  }
  return f;
};
