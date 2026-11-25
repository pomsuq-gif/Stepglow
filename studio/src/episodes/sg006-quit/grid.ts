/**
 * SG006 music: the SG002 track (measured again on 66 strong onsets: beat 0.6336–0.6338 s, mean error 26 ms).
 * beat(0) = the first bass hit after the intro, 5.54 s. Strong downbeats every 4 beats.
 * The track drops out to a quiet pad 23.62–25.62 s and comes back hard on beat(32) = 25.82 s.
 */
export const BEAT = 0.6338;
export const DROP = 5.54;
export const beat = (k: number) => DROP + k * BEAT;
/** the quiet break and the return */
export const BREAK = 23.62;
export const RETURN = beat(32);

/** a hit that jumps to 1 at time h and dies away (camera punches, flashes) */
export const hit = (t: number, h: number, decay = 7) => (t < h ? 0 : Math.exp(-(t - h) * decay));
export const hits = (t: number, times: number[], decay = 7) => times.reduce((m, h) => Math.max(m, hit(t, h, decay)), 0);
export const shake = (t: number, a: number) => [Math.sin(t * 61) * a + Math.sin(t * 37) * a * 0.6, Math.cos(t * 53) * a * 0.8] as const;
