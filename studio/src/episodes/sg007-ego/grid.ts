/**
 * SG007 music: the reference track ("Ego vs everyone", 39.9 s before its outro card).
 * Spectral flux, 43 strong onsets fitted to one grid (mean error 9 ms): one beat = 0.41467 s (≈145 BPM),
 * beat(0) = 0.200 s. The track thins out to a tense pad 25.5–29.9 s and comes back with the big hit on beat(72) = 30.06 s.
 */
export const BEAT = 0.41467;
export const T0 = 0.2;
export const beat = (k: number) => T0 + k * BEAT;

/** a hit that jumps to 1 at time h and dies away (camera punches, flashes) */
export const hit = (t: number, h: number, decay = 7) => (t < h ? 0 : Math.exp(-(t - h) * decay));
export const hits = (t: number, times: number[], decay = 7) => times.reduce((m, h) => Math.max(m, hit(t, h, decay)), 0);
export const shake = (t: number, a: number) => [Math.sin(t * 61) * a + Math.sin(t * 37) * a * 0.6, Math.cos(t * 53) * a * 0.8] as const;

const B = beat;
/** the reference's beats: captions, wins and cuts */
export const K = {
  t1: B(3), // Table 1: Motivation
  w1: B(9), // Ego slams Motivation
  t2: B(14.5), // Table 2: Laziness
  w2: B(19.5), // Laziness flops
  t3: B(24), // Table 3: Talent
  losing: B(30.75), // Ego was losing…
  w3: B(36), // Ego comes back, slams Talent
  dark: B(38.5), // then the lights went out
  more: B(41.5), // …more were waiting
  t4: B(44.5), // Table 4: Obsession
  never: B(50.5), // Obsession never stops…
  wont: B(54), // but Ego won't lose
  broke: B(56.5), // he broke his own arm
  s4: B(59), // Ego 4 — 0
  t5: B(61.5), // Last table: Discipline
  sure: B(65), // Ego was so sure…
  seen: B(68), // Discipline had seen it all
  slam: B(72), // the hit: Discipline pins Ego, Ego flies
  blink: B(74), // Discipline didn't blink
  all: B(78.5), // Ego beat everyone…
  except: B(83), // …except the one who shows up daily
  end: B(89), // Discipline > Ego · agree?
};
export const SECONDS = 39.85;
