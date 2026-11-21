import {clamp, easeInOut, lerp, ss} from '../nc001-work-smart/anim';
import type {V3} from '../nc001-work-smart/kit3d';
import {mixHex} from '../nc001-work-smart/world';
import {beat} from './grid';
import {ANK, fallTime, hang, hugKnees, LEG, mixRig, phone, rigAt, stand, sulk, type Rig} from './rig3';

/**
 * The five on the bar, left to right, as in the reference. Every rep is on the music grid:
 * Obsession one rep a beat (later every half beat), Ego a beat, Talent 1.5 beats, Discipline 2.5 beats, always.
 */
export const SLOT = 0.82;
export const NAMES = ['Motivation', 'Ego', 'Obsession', 'Discipline', 'Talent'] as const;
export const XS = [-2, -1, 0, 1, 2].map((i) => i * SLOT);
export const TINT = {mot: '#ff8a2e', ego: '#ff4fd8', obs: '#ff3b30', dis: '#38e8ff', tal: '#a98bff', gold: '#ffd66b', idle: '#6f7c99', dead: '#3a1f26'};

const B = (k: number) => beat(k);
const range = (a: number, b: number, step = 1) => {
  const r: number[] = [];
  for (let k = a; k <= b + 1e-6; k += step) r.push(k);
  return r;
};

/** lift 0..1 at time t for reps whose tops are at `tops`: up in `up` s, a short hold, down in `down` s */
export const lift = (t: number, tops: number[], up: number, down: number, hold = 0.04) => {
  let v = 0;
  for (const tp of tops) {
    if (t < tp - up || t > tp + hold + down) continue;
    if (t <= tp) v = Math.max(v, easeInOut((t - tp + up) / up));
    else if (t <= tp + hold) v = 1;
    else v = Math.max(v, 1 - easeInOut((t - tp - hold) / down));
  }
  return v;
};
export const count = (t: number, tops: number[]) => tops.filter((x) => t >= x).length;

export type State = {
  rig: Rig;
  energy: number;
  tint: string;
  count: number;
  /** time of the last count change (for the pop) */
  last: number;
  /** still going (counter bright) */
  active: boolean;
  /** world root */
  root: V3;
};

const jitter = (t: number, a: number) => Math.sin(t * 71) * a + Math.sin(t * 43) * a * 0.6;

/** let go of the bar at tr from rig h: drop, land in a crouch, stand up */
const fall = (tr: number, h: Rig, z = 0): [number, Rig, ((k: number) => number)?][] => {
  const feetY = Math.min(h.foot[0][1], h.foot[1][1]);
  const ft = fallTime(feetY - ANK);
  const open = mixRig(h, {...h, hand: [[h.hand[0][0] * 1.3, h.hand[0][1] - 0.12, 0.08], [h.hand[1][0] * 1.3, h.hand[1][1] - 0.12, 0.08]]}, 1);
  return [
    [tr, h],
    [tr + 0.07, open],
    [tr + ft, stand({crouch: 0.2, z, arms: 'out', lean: 12}), (k) => k * k],
    [tr + ft + 0.3, stand({crouch: 0.03, z, lean: 4})],
  ];
};

/* ───────────── Motivation: explodes out of the gate, fades after five ───────────── */
const MOT_TOPS = [-14, -13, -12, -11, -9.5, -7.5].map(B);
const MOT_UP = [0.2, 0.2, 0.22, 0.24, 0.38, 0.75];
const MOT_REL = B(-4);
export const motivation = (t: number): State => {
  let l = 0;
  MOT_TOPS.forEach((tp, i) => (l = Math.max(l, lift(t, [tp], MOT_UP[i], i < 4 ? 0.2 : 0.4))));
  // the seventh: gets a third of the way, shakes, gives up
  const fail = Math.min(ss(t, B(-6.6), B(-5.6)), 1 - ss(t, B(-5.3), B(-4.6))) * 0.32;
  l = Math.max(l, fail + (fail > 0.05 ? jitter(t, 0.025) : 0));
  const tired = ss(t, MOT_TOPS[3], B(-5));
  const hangR = (tt: number, ll: number) => hang(ll, {legs: tired > 0.5 ? 'relaxed' : 'kick', phase: tt * 22, effort: ll * (1 - tired * 0.5), sway: Math.sin(tt * 5) * 0.03 * (1 - tired)});
  const keys = [...fall(MOT_REL, hangR(MOT_REL, 0)), [B(-3), stand({lean: 14, crouch: 0.06})], [B(-2), hugKnees(0.32)]] as [number, Rig, ((k: number) => number)?][];
  const rig = t < MOT_REL ? hangR(t, l) : rigAt(t, keys);
  const c = count(t, MOT_TOPS);
  const energy = lerp(1, 0.4, tired) * (1 - 0.75 * ss(t, MOT_REL, B(-2)));
  return {rig, energy, tint: mixHex(TINT.mot, TINT.idle, ss(t, B(-4.5), B(-2))), count: c, last: c ? MOT_TOPS[c - 1] : -9, active: t < MOT_REL, root: [XS[0], 0, 0]};
};

/* ───────────── Ego: showy, one hand on the hip for "too easy", quits when it gets real ───────────── */
const EGO_TOPS = [...range(-13, -2).map(B), B(1.5)];
const EGO_REL = B(5);
const SHOW = (t: number) => ss(t, B(-10.75), B(-10.3)) * (1 - ss(t, B(-5.7), B(-5.25)));
export const ego = (t: number): State => {
  const shock = t > B(1.5) ? 1 : 0;
  let l = lift(t, EGO_TOPS, 0.24, 0.22, 0.05);
  // holds at the top of the 13th, frozen, then lowers himself slowly
  if (t > B(1.5)) l = 1 - ss(t, B(3.1), B(4.2));
  const look: V3 = [0.05 * ss(t, B(2), B(2.4)), 0, 0.02];
  const two = hang(l, {legs: 'crossed', head: shock ? look : undefined, sway: Math.sin(t * 4) * 0.02});
  const one = hang(l, {legs: 'crossed', grip: [false, true], free: [[-0.25, 1.0, 0.12], null], sway: Math.sin(t * 4) * 0.02});
  // the free hand on the hip: in figure-local coordinates relative to the pelvis
  const pelOne = one.pel;
  one.hand[0] = [pelOne[0] - 0.24, pelOne[1] + 0.06, pelOne[2] + 0.09];
  one.elbow = [[-1, 0.1, -0.2], one.elbow![1]];
  const hangR = mixRig(two, one, SHOW(t));
  const keys = [...fall(EGO_REL, hang(0, {legs: 'crossed'})), [B(6.3), stand({lean: -4})], [B(7.3), sulk(0.34, -1)]] as [number, Rig, ((k: number) => number)?][];
  const rig = t < EGO_REL ? hangR : rigAt(t, keys);
  const c = count(t, EGO_TOPS);
  const energy = (1 - 0.7 * ss(t, EGO_REL, B(7))) * (1 + 0.25 * Math.sin(t * 40) * (t > B(2) && t < B(4) ? 1 : 0));
  return {rig, energy: clamp(energy), tint: mixHex(TINT.ego, '#7a5a86', ss(t, EGO_REL, B(7.5))), count: c, last: c ? EGO_TOPS[c - 1] : -9, active: t < EGO_REL, root: [XS[1], 0, 0]};
};
export const egoShow = SHOW;

/* ───────────── Obsession: started before everyone, breaks, keeps going on one arm, burns out ───────────── */
export const OBS_SNAP = B(2);
export const OBS_DROPARM = B(3);
export const OBS_REL = B(33);
const OBS_PRE = range(-15, 0).map(B);
const OBS_ONE = [...range(4, 28), ...range(28.5, 30.5, 0.5)].map(B);
const OBS_TOPS = [...OBS_PRE, ...OBS_ONE];
export const obsTops = OBS_TOPS;
const kneel = (z: number): Rig => ({
  pel: [0.04, 0.47, z],
  up: [0.05, 1, 0.35],
  head: [0, -0.06, 0.04],
  hand: [
    [-0.2, 0.3, z + 0.4],
    [0.2, ANK + 0.02, z + 0.46],
  ],
  foot: [
    [-0.1, ANK, z - 0.3],
    [0.1, ANK, z - 0.28],
  ],
  knee: [
    [-0.1, -0.3, 1],
    [0.1, -0.3, 1],
  ],
});
export const LYING: Rig = {
  pel: [0.3, 0.13, 0.3],
  up: [-0.78, 0.13, 0.6],
  fwd: [0, 1, 0],
  head: [0, 0.03, 0],
  hand: [
    [-0.2, 0.08, 0.6],
    [-0.08, 0.08, 0.2],
  ],
  elbow: [
    [0, 1, 0],
    [0, 1, 0],
  ],
  foot: [
    [0.95, ANK, 0.2],
    [0.86, ANK, 0.02],
  ],
  knee: [
    [0, 1, 0],
    [0, 1, 0],
  ],
};
export const obsession = (t: number): State => {
  const strain = t >= B(0) && t < OBS_SNAP ? 1 : 0;
  let l: number;
  let rig: Rig;
  if (t < OBS_SNAP) {
    l = lift(t, OBS_PRE, 0.19, 0.2, 0.03);
    if (t >= B(0)) l = 0.93 + jitter(t, 0.03) * (0.4 + ss(t, B(0), OBS_SNAP));
    rig = hang(l, {legs: t < B(0) ? 'kick' : 'tuck', phase: t * 26, effort: l, sway: strain * jitter(t * 1.3, 0.04)});
  } else if (t < OBS_REL) {
    const dt = t - OBS_SNAP;
    // after the snap: swings on one arm, then one-arm reps, faster and faster; the last attempt fails
    const reps = lift(t, OBS_ONE, 0.2, 0.18, 0.02);
    const fast = lift(t, OBS_ONE.slice(-5), 0.1, 0.1, 0.01);
    const att = Math.min(ss(t, B(31), B(31.8)), 1 - ss(t, B(32.1), B(32.8))) * 0.42;
    l = Math.max(reps, fast, att + (att > 0.05 ? jitter(t, 0.03) : 0));
    const sway = Math.sin(dt * 7.5) * 0.35 * Math.exp(-dt * 1.6) + Math.sin(t * 3) * 0.02;
    rig = hang(l, {grip: [false, true], legs: 'tuck', effort: l, sway, swing: Math.sin(dt * 6.3) * 0.25 * Math.exp(-dt * 2)});
  } else {
    const h = hang(0, {grip: [false, true], legs: 'relaxed'});
    const keys: [number, Rig, ((k: number) => number)?][] = [...fall(OBS_REL, h, 0.05).slice(0, 3), [OBS_REL + 0.62, kneel(0.15)], [OBS_REL + 1.05, LYING, (k) => k * k]];
    rig = rigAt(t, keys);
  }
  const c = 5 + count(t, OBS_TOPS);
  const out = ss(t, B(31.5), B(32.9));
  const flick = t > B(31) && t < B(33) ? (Math.sin(t * 57) > 0.2 ? 1 : 0.35) : 1;
  const energy = t < OBS_REL ? (0.85 + 0.15 * strain) * (1 - out * 0.92) * flick : 0.04;
  const tint = t < B(0) ? '#ff6a3a' : mixHex(TINT.obs, TINT.dead, out);
  const idx = Math.max(0, c - 5);
  return {rig, energy, tint, count: c, last: idx ? OBS_TOPS[idx - 1] : -9, active: t < OBS_REL, root: [XS[2], 0, 0]};
};

/* ───────────── Discipline: strict form, one rep every 2.5 beats, from the first beat to the last ───────────── */
const DIS_TOPS = range(0, 23).map((n) => B(-13 + 2.5 * n));
export const disTops = DIS_TOPS;
export const DIS_GOLD = B(39.5);
export const discipline = (t: number): State => {
  const l = lift(t, DIS_TOPS, 0.5, 0.56, 0.1);
  const rig = hang(l, {legs: 'straight', effort: 0, sway: Math.sin(t * 2.1) * 0.012});
  const c = count(t, DIS_TOPS);
  const gold = ss(t, DIS_GOLD, DIS_GOLD + 0.5);
  return {rig, energy: 0.8 + 0.2 * gold, tint: mixHex(TINT.dis, TINT.gold, gold), count: c, last: c ? DIS_TOPS[c - 1] : -9, active: true, root: [XS[3], 0, 0]};
};

/* ───────────── Talent: effortless five, gets bored, sits down with the phone ───────────── */
const TAL_TOPS = [-13, -11.5, -10, -8.5, -7].map(B);
const TAL_ONE = B(-6.2);
export const TAL_REL = B(-4.6);
export const TAL_PHONE = B(-2.6);
export const talent = (t: number): State => {
  const l = lift(t, TAL_TOPS, 0.32, 0.34, 0.06);
  const lazy = ss(t, TAL_ONE, TAL_ONE + 0.35);
  const two = hang(l, {legs: 'relaxed', sway: Math.sin(t * 2.4) * 0.025});
  const one = hang(0, {grip: [true, false], legs: 'relaxed', sway: Math.sin(t * 2.4) * 0.05});
  one.hand[1] = [one.pel[0] + 0.25, one.pel[1] + 0.02, one.pel[2] + 0.08];
  const hangR = mixRig(two, one, lazy);
  const keys = [...fall(TAL_REL, one), [B(-3.4), stand({lean: 2})], [B(-2.6), phone(0.32)]] as [number, Rig, ((k: number) => number)?][];
  const rig = t < TAL_REL ? hangR : rigAt(t, keys);
  const c = count(t, TAL_TOPS);
  return {rig, energy: 0.9 - 0.6 * ss(t, TAL_REL, B(-2)), tint: mixHex(TINT.tal, '#6f6a99', ss(t, TAL_REL, B(-1.5))), count: c, last: c ? TAL_TOPS[c - 1] : -9, active: t < TAL_REL, root: [XS[4], 0, 0]};
};

export const CAST = [motivation, ego, obsession, discipline, talent];
export const FEET_HANG = (r: Rig) => Math.min(r.foot[0][1], r.foot[1][1]);
export {LEG};
