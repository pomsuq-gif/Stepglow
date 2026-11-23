/**
 * SG005 music grid (reference track, spectral flux, eighth notes fitted on 95 onsets, 78 within 30 ms):
 * one beat = 0.46304 s (129.6 BPM), beat 0 = the drop at 4.649 s.
 */
export const BEAT = 0.46304;
export const DROP = 4.649;
export const beat = (k: number) => DROP + k * BEAT;

/** a hit that jumps to 1 at time h and dies away (camera punches, flashes) */
export const hit = (t: number, h: number, decay = 7) => (t < h ? 0 : Math.exp(-(t - h) * decay));
export const shake = (t: number, a: number) => [Math.sin(t * 61) * a + Math.sin(t * 37) * a * 0.6, Math.cos(t * 53) * a * 0.8] as const;
