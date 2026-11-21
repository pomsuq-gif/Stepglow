/**
 * SG003 music grid (reference track, measured by spectral flux, eighth notes fitted):
 * one beat = 0.4758 s, beat 0 = the drop (the white flash) at 7.273 s.
 * The track has an edit near 23 s: from there one beat = 0.4672 s, beat 34 = 23.192 s.
 */
export const BEAT = 0.4758;
export const DROP = 7.273;
const B2 = 0.4672;
const T34 = 23.192;
export const beat = (k: number) => (k < 33.6 ? DROP + k * BEAT : T34 + (k - 34) * B2);

/** a hit that jumps to 1 at time h and dies away (camera punches, flashes) */
export const hit = (t: number, h: number, decay = 7) => (t < h ? 0 : Math.exp(-(t - h) * decay));
export const hits = (t: number, times: number[], decay = 7) => times.reduce((m, h) => Math.max(m, hit(t, h, decay)), 0);
export const shake = (t: number, a: number) => [Math.sin(t * 61) * a + Math.sin(t * 37) * a * 0.6, Math.cos(t * 53) * a * 0.8] as const;
