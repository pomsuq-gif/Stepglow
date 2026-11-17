/** SG002 music grid (reference track, measured): beat 0 = the first bass hit after the intro */
export const BEAT = 0.6338;
export const DROP = 5.54;
export const beat = (k: number) => DROP + k * BEAT;

/** a hit that jumps to 1 at time h and dies away (camera punches, flashes) */
export const hit = (t: number, h: number, decay = 7) => (t < h ? 0 : Math.exp(-(t - h) * decay));
/** strongest of several hits */
export const hits = (t: number, times: number[], decay = 7) => times.reduce((m, h) => Math.max(m, hit(t, h, decay)), 0);
/** beat times from beat k0 to k1 (inclusive) every `every` beats */
export const grid = (k0: number, k1: number, every = 1) => {
  const r: number[] = [];
  for (let k = k0; k <= k1 + 1e-6; k += every) r.push(beat(k));
  return r;
};
/** small camera shake, amplitude a */
export const shake = (t: number, a: number) => [Math.sin(t * 61) * a + Math.sin(t * 37) * a * 0.6, Math.cos(t * 53) * a * 0.8] as const;
