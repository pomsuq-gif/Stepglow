/**
 * SG004 music grid (reference track, spectral flux, eighth notes fitted on 63 onsets, error ≤ 9 ms):
 * one beat = 0.51954 s, beat 0 = the drop at 12.567 s (eighths start at 0.358 s).
 * The reference drops its quitters exactly on the beat: beat(−16), beat(−10), beat(−4).
 */
export const BEAT = 0.51954;
export const DROP = 12.567;
export const beat = (k: number) => DROP + k * BEAT;

/** a hit that jumps to 1 at time h and dies away (camera punches, flashes) */
export const hit = (t: number, h: number, decay = 7) => (t < h ? 0 : Math.exp(-(t - h) * decay));
export const shake = (t: number, a: number) => [Math.sin(t * 61) * a + Math.sin(t * 37) * a * 0.6, Math.cos(t * 53) * a * 0.8] as const;

/**
 * The stutter before the drop (11.3–12.5 s): the track cuts out on the off-eighths.
 * 1 while the sound is there, 0 in a gap — the hurt Ego sinks in every gap and fights back up.
 */
export const GAPS: [number, number][] = [
  [11.42, 11.52],
  [11.68, 11.78],
  [11.93, 12.03],
  [12.18, 12.29],
  [12.45, 12.55],
];
export const gap = (t: number) => GAPS.reduce((m, [a, b]) => Math.max(m, t > a && t < b + 0.06 ? Math.sin(Math.PI * Math.min(1, (t - a) / (b + 0.06 - a))) : 0), 0);
