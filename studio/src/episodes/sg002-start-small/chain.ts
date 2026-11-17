/** SG002 — the domino chain: sizes, layout along the chain axis, and the topple (each one rests on the next). */

import {beat} from './grid';

export const N = 10;
export const H0 = 0.115;
export const RATIO = 1.6;
export const h = (i: number) => H0 * Math.pow(RATIO, i);
export const th = (i: number) => h(i) * 0.17; // thickness, along the chain
export const wd = (i: number) => h(i) * 0.5; // width, across the chain
const GAP = 0.5; // face-to-face gap, in heights of the smaller domino

/** centre of each domino's base along the chain axis (s = 0 at the first one) */
export const S: number[] = (() => {
  const s = [0];
  for (let i = 1; i < N; i++) s.push(s[i - 1] + th(i - 1) / 2 + GAP * h(i - 1) + th(i) / 2);
  return s;
})();

/** chain axis in the world: from the first (small, near) domino into the depth to the right */
export const ALPHA = (38 * Math.PI) / 180;
export const DIR: [number, number] = [Math.sin(ALPHA), -Math.cos(ALPHA)];
export const at = (s: number, side = 0): [number, number] => [DIR[0] * s - DIR[1] * side, DIR[1] * s + DIR[0] * side];

/** the push on the first domino */
export const FLICK = beat(32); // 25.82 — the music comes back with it

const HALF = Math.PI / 2;
/** contact angle: tilt of domino i at which its top-front corner meets the back face of domino i+1 tilted by phi */
const contact = (i: number, phi: number) => {
  const p0 = S[i] + th(i) / 2; // pivot of i (front-bottom edge)
  const p1 = S[i + 1] + th(i + 1) / 2; // pivot of i+1
  const bx = p1 - th(i + 1) * Math.cos(phi);
  const by = th(i + 1) * Math.sin(phi);
  const ux = Math.sin(phi);
  const uy = Math.cos(phi);
  const f = (a: number) => {
    const tx = p0 + h(i) * Math.sin(a);
    const ty = h(i) * Math.cos(a);
    return (tx - bx) * uy - (ty - by) * ux; // > 0 once the corner is past the face
  };
  let lo = 0;
  let hi = HALF;
  if (f(hi) < 0) return HALF;
  for (let k = 0; k < 28; k++) {
    const m = (lo + hi) / 2;
    if (f(m) > 0) hi = m;
    else lo = m;
  }
  return lo;
};

/**
 * when each domino starts to tip — on the music: quarter-beat steps that stretch as the dominoes grow
 * (close to what sqrt(h) physics gives), the giant lands on beat 42
 */
const START_BEATS = [32, 32.25, 32.5, 33, 33.5, 34.25, 35, 36, 37.25, 38.75];
export const START: number[] = START_BEATS.map(beat);
export const LANDED = beat(42);
/** time to fall flat from upright, chosen so it touches the next one exactly at the next start */
const T = (i: number) => (i === N - 1 ? LANDED - START[N - 1] : (START[i + 1] - START[i]) / Math.sqrt(contact(i, 0) / HALF));

/** free topple: accelerating */
const free = (i: number, t: number) => {
  const u = (t - START[i]) / T(i);
  return u <= 0 ? 0 : Math.min(HALF, HALF * u * u);
};

/** tilt of every domino at time t (radians, 0 = upright, pi/2 = flat) */
export const tilts = (t: number): number[] => {
  const a = new Array<number>(N).fill(0);
  a[N - 1] = free(N - 1, t);
  for (let i = N - 2; i >= 0; i--) a[i] = Math.min(free(i, t), contact(i, a[i + 1]));
  return a;
};

