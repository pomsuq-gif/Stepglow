import {clamp, easeInOut, lerp, ss} from '../nc001-work-smart/anim';
import type {V3} from '../nc001-work-smart/kit3d';
import {mixHex} from '../nc001-work-smart/world';
import {add, ARM, HB, K3, LEG, mixRig, mul, norm, rigAt, solve3, stand, sub, type Rig} from '../sg003-same-bar/rig3';
import {BEAT, beat} from './grid';

/**
 * SG005 — Who reaches the top? Six on six ropes, left to right as in the reference:
 * Motivation · Ego · Obsession · Discipline · Day 1 · On drugs.
 * Every character is a function of time → {rig, light, label}. All heights are world units;
 * a rig is figure-local (root = the foot of its rope on the ground, units / K3).
 */
export const NAMES = ['Motivation', 'Ego', 'Obsession', 'Discipline', 'Day 1', 'On drugs'] as const;
export const TINT = {mot: '#ffb347', ego: '#ff4a3a', obs: '#b77cff', dis: '#3cc8ff', day: '#4dffd2', drug: '#8dff5a', dead: '#56607a', gold: '#ffd66b'};
export const TINTS = [TINT.mot, TINT.ego, TINT.obs, TINT.dis, TINT.day, TINT.drug];

const B = beat;
export const SP = 0.85;
export const XS = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((k) => k * SP);
/** the rope hangs this far in front of the climber's chest */
export const RZ = 0.17;
/** the wall face behind the climbers, and the summit */
export const WALL_Z = -0.36;
export const TOPY = 24.3;
export const TL = TOPY / K3;
export const ROPE_BOT = 0.38;

/** the reference's beats */
export const T = {
  drugJump: B(-9),
  jump: B(-7.5),
  motJump: B(-6),
  dayUp: B(-5.5),
  quit: B(15.25),
  bleed: B(15),
  flip: B(10),
  flipBack: B(14),
  fly: B(28),
  fall: B(31.5),
  crash: B(32.5),
  zoom: B(46),
  wave: B(48),
  slip: B(49),
  fell: B(55),
  edge: B(53),
  spent: B(59),
  torn: B(61),
  top: B(66),
  reach: B(70),
  flash: 39.08,
  day1: B(79),
  end: B(83),
};

/* ───────────── climbing on a rope ───────────── */

const SHC = HB.torso * 0.92;
/** hand above the shoulder when it grabs; hand step on the rope (two per cycle) */
const A_H = 0.56;
const F_HI = -0.24;

/** where a hand or foot is on the rope for a climb height s: held for 3/4 of its cycle, then moved up to the next grip */
const grip = (s: number, step: number, ph: number, top: number) => {
  const u = (s + ph) / (2 * step);
  const f = u - Math.floor(u);
  if (f < 0.72) return {rel: top - f * 2 * step, k: 0};
  const k = easeInOut((f - 0.72) / 0.28);
  return {rel: top - f * 2 * step + k * 2 * step, k};
};

export type ClimbOpts = {
  step?: number;
  sway?: number;
  /** a hand off the rope: its target (figure-local) */
  free?: [V3 | null, V3 | null];
  /** legs: 'climb' (alternate), 'sit' (legs out in front, as if on a chair), 'dangle', 'wrap' (both feet clamping one point) */
  legs?: 'climb' | 'sit' | 'dangle' | 'wrap';
  /** both hands fixed at one height above the shoulder (sliding down) */
  hold?: number;
  head?: V3;
  /** 0..1 slumped: head down, shoulders forward */
  slump?: number;
};

/** s = shoulder height (local units) */
export const climb = (s: number, o: ClimbOpts = {}): Rig => {
  const step = o.step ?? 0.3;
  const sw = o.sway ?? 0;
  const shc: V3 = [sw * 0.05, s, 0.02 * (o.slump ?? 0)];
  const up = norm([sw * 0.2, 1, -0.06 + 0.1 * (o.slump ?? 0)]);
  const pel = sub(shc, mul(up, SHC));
  const hand = (i: number): V3 => {
    const sd = i ? 1 : -1;
    const fr = o.free?.[i];
    if (fr) return fr;
    if (o.hold !== undefined) return [sd * 0.025, s + o.hold + (i ? 0.11 : 0), RZ];
    const g = grip(s, step, i * step, A_H);
    const lift = Math.sin(Math.PI * g.k);
    return [sd * (0.03 + 0.07 * lift), s + g.rel, RZ + 0.09 * lift];
  };
  const legs = o.legs ?? 'climb';
  const py = pel[1];
  const foot = (i: number): V3 => {
    const sd = i ? 1 : -1;
    if (legs === 'sit') return [sd * 0.1, py - LEG * 0.62, 0.48];
    if (legs === 'dangle') return [sd * 0.09 + sw * 0.1, py - LEG * 0.97, 0.06];
    if (legs === 'wrap') return [sd * 0.05, py - LEG * 0.72, RZ - 0.02];
    const g = grip(s, step, (1 - i) * step + step * 0.45, F_HI);
    const lift = Math.sin(Math.PI * g.k);
    return [sd * (0.055 + 0.05 * lift), py + g.rel, RZ - 0.02 + 0.05 * lift];
  };
  return {
    pel,
    up,
    head: o.head ?? [0, -0.05 * (o.slump ?? 0), 0.02 + 0.04 * (o.slump ?? 0)],
    hand: [hand(0), hand(1)],
    elbow: [
      [-1, -0.35, 0.25],
      [1, -0.35, 0.25],
    ],
    foot: [foot(0), foot(1)],
    knee:
      legs === 'sit'
        ? [
            [-0.2, 1, 0.3],
            [0.2, 1, 0.3],
          ]
        : [
            [-0.7, 0.1, 1],
            [0.7, 0.1, 1],
          ],
  };
};

/* ───────────── rigid moves of a whole rig ───────────── */

const rotV = (v: V3, ax: V3, a: number): V3 => {
  const k = norm(ax);
  const c = Math.cos(a);
  const s = Math.sin(a);
  const d = v[0] * k[0] + v[1] * k[1] + v[2] * k[2];
  const cr: V3 = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]];
  return [v[0] * c + cr[0] * s + k[0] * d * (1 - c), v[1] * c + cr[1] * s + k[1] * d * (1 - c), v[2] * c + cr[2] * s + k[2] * d * (1 - c)];
};
/** rotate a rig about a pivot and move it */
export const moveRig = (r: Rig, pivot: V3, ax: V3, a: number, d: V3 = [0, 0, 0]): Rig => {
  const P = (p: V3) => add(add(pivot, rotV(sub(p, pivot), ax, a)), d);
  const Vv = (v: V3) => rotV(v, ax, a);
  return {
    pel: P(r.pel),
    up: Vv(r.up),
    fwd: Vv(r.fwd ?? [0, 0, 1]),
    head: Vv(r.head ?? [0, 0, 0]),
    hand: [P(r.hand[0]), P(r.hand[1])],
    elbow: r.elbow ? [Vv(r.elbow[0]), Vv(r.elbow[1])] : undefined,
    foot: [P(r.foot[0]), P(r.foot[1])],
    knee: r.knee ? [Vv(r.knee[0]), Vv(r.knee[1])] : undefined,
  };
};
const shift = (r: Rig, d: V3) => moveRig(r, [0, 0, 0], [0, 1, 0], 0, d);

/** arms and legs thrown out (a fall), around a body at shoulder height s */
const flail = (s: number, t: number): Rig => {
  const c = climb(s, {legs: 'dangle'});
  const w = (k: number) => Math.sin(t * 13 + k);
  return {
    ...c,
    hand: [add(c.pel, [-0.5, SHC + 0.25 + 0.12 * w(0), 0.12]), add(c.pel, [0.5, SHC + 0.3 + 0.12 * w(2), 0.05])],
    foot: [add(c.pel, [-0.25, -0.55 + 0.1 * w(4), 0.15]), add(c.pel, [0.22, -0.6 + 0.1 * w(5), -0.05])],
    elbow: [
      [-1, 0.3, 0],
      [1, 0.3, 0],
    ],
  };
};

/** a free fall from shoulder height h0 (world) at time t0, tumbling */
const G = 8.2;
export const fallY = (t: number, t0: number, h0: number) => h0 - 0.5 * G * Math.max(0, t - t0) ** 2;
const tumble = (t: number, t0: number, h0: number, spin: number, from: Rig): Rig => {
  const dt = Math.max(0, t - t0);
  const k = clamp(dt / 0.35);
  const f = flail(h0 / K3, t);
  const base = mixRig(from, f, easeInOut(k));
  const piv = add(base.pel, mul(base.up, SHC * 0.5));
  return moveRig(base, piv, [0.25, 0, 1], spin * dt * dt * 1.4 + spin * dt * 0.6, [0, (fallY(t, t0, h0) - h0) / K3, 0.25 * dt]);
};

/* ───────────── the six ───────────── */

export type State = {
  rig: Rig;
  energy: number;
  tint: string;
  /** shoulder height, world (for the camera) */
  h: number;
  /** 0..1 the body has gone cold (spent) */
  spent: number;
  /** label: status word and when it appears */
  status?: {text: string; color: string; at: number};
  /** 0..1 red-hot hands (Obsession) */
  burn?: number;
  /** 0..1 sliding down the rope (sparks at the hands) */
  slide?: number;
  /** label visible */
  label: number;
};

/** shoulder height after jumping on at tj, then segments of speed [until, speed] (world units / s) */
const H0 = 1.5;
const run = (t: number, tj: number, segs: [number, number][]) => {
  let h = H0;
  let a = tj + 0.3;
  if (t <= a) return h;
  for (const [b, v] of segs) {
    const e = Math.min(t, b);
    if (e > a) h += v * (e - a);
    a = b;
    if (t <= b) break;
  }
  return h;
};

/** before the jump: stand, crouch on the beat, spring to the rope; then the climb */
const start = (t: number, tj: number, hang: (t: number) => Rig): Rig => {
  const st = stand({arms: 'down'});
  if (t < tj - 0.35) return st;
  const crouch = stand({crouch: 0.16, arms: 'up', lean: 8});
  if (t < tj) return mixRig(st, crouch, easeInOut((t - tj + 0.35) / 0.35));
  const k = clamp((t - tj) / 0.3);
  const target = hang(tj + 0.3);
  const air = mixRig(crouch, target, easeInOut(k));
  return t < tj + 0.3 ? shift(air, [0, 0.25 * Math.sin(Math.PI * k), 0]) : hang(t);
};

const V = 0.667;

const sway = (t: number, seed: number, a = 1) => a * (Math.sin(t * 1.3 + seed) * 0.6 + Math.sin(t * 0.7 + seed * 2) * 0.4);

/** Motivation: jumps on late but fast, leads early, slows down, freezes, quits and slides off */
const HM = (t: number) => run(t, T.motJump, [[B(6), 1.1], [B(12), 0.5], [B(14), 0.15], [1e9, 0]]);
const M_SLIDE = B(16);
export const motivation = (t: number): State => {
  const hq = HM(M_SLIDE);
  const slideD = t > M_SLIDE ? 0.5 * 1.6 * (t - M_SLIDE) ** 2 : 0;
  const h = HM(t) - slideD;
  const s = h / K3;
  const quitK = ss(t, T.quit - 0.25, T.quit + 0.2);
  const hang = (tt: number) => climb(HM(tt) / K3, {sway: sway(tt, 1, 0.6), step: 0.32});
  let rig = start(t, T.motJump, hang);
  if (t > T.quit - 0.25) rig = mixRig(climb(s, {sway: sway(t, 1, 0.6), step: 0.32}), climb(s, {legs: 'sit', hold: 0.45, slump: 0.8}), quitK);
  if (t > M_SLIDE) rig = climb(s, {legs: 'sit', hold: 0.45, slump: 0.8});
  return {rig, energy: lerp(1, 0.35, quitK), tint: mixHex(TINT.mot, TINT.dead, quitK * 0.8), h, spent: 0.6 * quitK, status: {text: 'quit', color: '#ff5a5a', at: T.quit}, slide: t > M_SLIDE ? 1 : 0, label: 1 - ss(hq - h, 3, 4)};
};

/** Ego: fast and showy; waves with the crown hand on the beat, slips, falls */
export const HE = (t: number) => run(t, T.jump, [[B(8), 0.8], [1e9, V]]);
export const egoFallH = () => HE(T.slip);
export const ego = (t: number): State => {
  const hang = (tt: number) => climb(HE(Math.min(tt, T.wave)) / K3, {sway: sway(tt, 2, 0.5), step: 0.28});
  if (t < T.wave) {
    const rig = start(t, T.jump, hang);
    return {rig, energy: 1, tint: TINT.ego, h: HE(t), spent: 0, label: 1};
  }
  const hs = HE(T.wave);
  const s = hs / K3;
  const base = climb(s, {step: 0.28});
  // the wave: the right hand leaves the rope and waves over the head; the left hand alone holds
  const wv = ss(t, T.wave, T.wave + 0.2);
  const ph = Math.sin((t - T.wave) * 11);
  const waved = climb(s, {step: 0.28, free: [null, [0.42 + 0.06 * ph, s + 0.42 + 0.06 * ph, 0.25]], sway: 0.6 * wv});
  let rig = mixRig(base, waved, wv);
  // the left hand slips: down the rope a little, sparks, then he is off
  if (t > T.slip) {
    const sl = clamp((t - T.slip) / 0.18);
    const slip = shift(waved, [0, -0.18 * sl, 0]);
    rig = t < T.slip + 0.18 ? slip : tumble(t, T.slip + 0.18, hs - 0.18 * K3, 3.2, slip);
  }
  const h = t > T.slip + 0.18 ? fallY(t, T.slip + 0.18, hs - 0.18 * K3) : hs;
  return {rig, energy: 1, tint: TINT.ego, h, spent: 0, status: {text: 'fell', color: '#ff5a5a', at: T.fell}, slide: ss(t, T.slip, T.slip + 0.05) * (1 - ss(t, T.slip + 0.18, T.slip + 0.25)), label: 1};
};

/** Obsession: fast, frantic hands, burning them from B(15); burns out, slides down the rope and hangs there */
export const HO = (t: number) => run(t, T.jump, [[T.spent, 0.7], [1e9, 0]]);
const O_STOP = 2.6;
export const obsession = (t: number): State => {
  const hang = (tt: number) => climb(HO(tt) / K3, {sway: sway(tt, 3, 0.35), step: 0.22});
  const hs = HO(T.torn);
  // the slide: starts slow, picks up, brakes to a stop O_STOP lower
  const d = O_STOP * easeInOut(clamp((t - T.torn) / 2.3));
  const h = t < T.torn ? HO(t) : hs - d;
  const spentK = ss(t, T.spent, T.spent + 0.9);
  let rig = start(t, T.jump, hang);
  if (t > T.spent) {
    const sp = climb(HO(t) / K3, {step: 0.22, slump: 0.5 * spentK});
    const sl = climb(h / K3, {hold: 0.5, legs: 'wrap', slump: 0.9});
    rig = mixRig(sp, sl, ss(t, T.torn - 0.2, T.torn + 0.15));
  }
  const burn = ss(t, T.bleed, T.bleed + 0.6);
  const sliding = t > T.torn && t < T.torn + 2.3 ? Math.sin(Math.PI * clamp((t - T.torn) / 2.3)) : 0;
  return {rig, energy: lerp(1, 0.08, spentK), tint: mixHex(TINT.obs, '#ffffff', spentK * 0.6), h, spent: spentK, burn, status: {text: 'torn', color: '#ff5a5a', at: T.torn}, slide: sliding, label: 1};
};

/** Discipline: one hand per beat, never faster, never slower; the summit; then the hand for Day 1 */
const DIS_STOP = TOPY - 0.12;
export const HD = (t: number) => Math.min(DIS_STOP, run(t, T.jump, [[1e9, V]]));
const D_UP = T.top - 0.55;
/** the moment hands meet, and Day 1's hand there (world) */
export const MEET_W: V3 = [XS[4] - 0.12, TOPY - 0.3, 0.02];
const loc = (p: V3, i: number): V3 => [(p[0] - XS[i]) / K3, p[1] / K3, p[2] / K3];

/** summit poses, Discipline (figure-local, rope at x 0) */
const SEAT = HB.lr[0] * 1.05;
const onTop = (x: number, z: number, o: Parameters<typeof stand>[0] = {}): Rig => shift(stand({...o}), [x, TL, z]);
const dipUp = (k: number): Rig => {
  // hands behind him on the edge, a reverse dip: out of the pool backwards, onto the edge
  const hz = (WALL_Z - 0.1) / K3;
  const sh: V3 = [0, lerp(TL - 0.05, TL + 0.5, k), lerp(-0.05, -0.28, k)];
  const up = norm([0, 1, lerp(0.0, -0.1, k)]);
  const pel = sub(sh, mul(up, SHC));
  return {
    pel,
    up,
    hand: [
      [-0.26, TL + 0.03, hz],
      [0.26, TL + 0.03, hz],
    ],
    elbow: [
      [-0.5, 0, -1],
      [0.5, 0, -1],
    ],
    foot: [
      [-0.09, pel[1] - LEG * 0.85, 0.12],
      [0.09, pel[1] - LEG * 0.9, 0.08],
    ],
    knee: [
      [-0.2, 0, 1],
      [0.2, 0, 1],
    ],
  };
};
const sitEdge = (): Rig => {
  const z = (WALL_Z - 0.18) / K3;
  return {
    pel: [0, TL + SEAT, z],
    up: norm([0, 1, 0.08]),
    hand: [
      [-0.27, TL + 0.04, z - 0.05],
      [0.27, TL + 0.04, z - 0.05],
    ],
    elbow: [
      [-0.6, 0, -0.6],
      [0.6, 0, -0.6],
    ],
    foot: [
      [-0.1, TL + SEAT - 0.36, z + 0.38],
      [0.1, TL + SEAT - 0.34, z + 0.36],
    ],
    knee: [
      [-0.1, 1, 0.3],
      [0.1, 1, 0.3],
    ],
  };
};
/** lying on his belly at the edge, one arm down to Day 1 */
const prone = (reach: number): Rig => {
  const m = loc(MEET_W, 3);
  const x = m[0] - 0.12;
  const shz = (WALL_Z + 0.02) / K3;
  const pel: V3 = [x, TL + 0.14, shz - SHC];
  const up: V3 = norm([0, 0.12, 1]);
  const rest: V3 = [x + 0.3, TL + HB.ar[2], shz + 0.05];
  return {
    pel,
    up,
    fwd: [0, -1, 0.1],
    head: [0, -0.03, 0.05],
    hand: [[x - 0.3, TL + HB.ar[2], shz - 0.05], [lerp(rest[0], m[0], reach), lerp(rest[1], m[1], reach), lerp(rest[2], m[2], reach)]],
    elbow: [
      [-1, 0, 0],
      [1, 0.2, 0.3],
    ],
    foot: [
      [x - 0.09, TL + HB.ankle, shz - SHC - LEG * 0.98],
      [x + 0.09, TL + HB.ankle, shz - SHC - LEG * 0.97],
    ],
    knee: [
      [0, -1, 0],
      [0, -1, 0],
    ],
  };
};

export const discipline = (t: number): State => {
  const hang = (tt: number) => climb(HD(tt) / K3, {sway: sway(tt, 4, 0.25), step: 0.3});
  const h = HD(t);
  let rig = start(t, T.jump, hang);
  const fin = loc([XS[3] + 0.3, 0, -0.95], 3);
  const day = loc([XS[4] - 0.1, 0, -0.95], 3);
  if (t > D_UP) {
    rig = rigAt(t, [
      [D_UP, hang(D_UP)],
      [D_UP + 0.35, dipUp(0)],
      [D_UP + 0.75, dipUp(1)],
      [D_UP + 1.05, sitEdge()],
      [D_UP + 1.45, onTop(0, (WALL_Z - 0.55) / K3, {crouch: 0.12, arms: 'down'})],
      [D_UP + 1.75, onTop(0, (WALL_Z - 0.6) / K3, {arms: 'down'})],
      [T.reach - 0.75, onTop(0.25, (WALL_Z - 0.62) / K3, {arms: 'down'})],
      [T.reach - 0.2, prone(0)],
      [T.reach + 0.35, prone(1)],
      [T.flash - 0.3, prone(1)],
      [T.flash - 0.02, shift(prone(1), [0, 0.12, -0.12])],
      [T.flash + 0.06, onTop(fin[0], fin[2], {arms: 'down', lean: -2})],
      [T.day1 - 0.6, onTop(fin[0], fin[2], {arms: 'down', lean: -2})],
      // turns to Day 1 and claps his shoulder
      [T.day1 - 0.2, {...onTop(fin[0], fin[2], {arms: 'down'}), hand: [onTop(fin[0], fin[2]).hand[0], [day[0] - 0.12, TL + 1.12, day[2] + 0.02]], fwd: norm([0.35, 0, 1])}],
      [T.end + 1.5, {...onTop(fin[0], fin[2], {arms: 'down'}), hand: [onTop(fin[0], fin[2]).hand[0], [day[0] - 0.12, TL + 1.12, day[2] + 0.02]], fwd: norm([0.35, 0, 1])}],
    ]);
  }
  const top = ss(t, D_UP + 1.0, D_UP + 1.8);
  return {rig, energy: 1 + 0.2 * top, tint: mixHex(TINT.dis, TINT.gold, 0.35 * ss(t, T.flash, T.flash + 1)), h: t < D_UP ? h : TOPY, spent: 0, label: 1};
};

/** Day 1: on one knee at the start; then slow, steady, always below; speeds up at the end; Discipline pulls him up */
export const HY = (t: number) => Math.min(TOPY - 0.88, run(t, T.dayUp + 0.45, [[30, 0.6], [1e9, 0.78]]));
const kneel = (): Rig => ({
  pel: [0, 0.44, 0],
  up: norm([0, 1, 0.22]),
  head: [0, -0.06, 0.05],
  hand: [
    [-0.04, 0.47, 0.33],
    [0.12, 0.42, 0.1],
  ],
  elbow: [
    [-1, -0.4, 0.4],
    [1, -0.4, 0.3],
  ],
  foot: [
    [-0.09, HB.ankle, 0.3],
    [0.09, 0.06, -0.38],
  ],
  knee: [
    [-0.1, 1, 0.4],
    [0.1, -1, 0.4],
  ],
});
export const day1 = (t: number): State => {
  const tj = T.dayUp + 0.45;
  const hang = (tt: number) => climb(HY(tt) / K3, {sway: sway(tt, 5, 0.3), step: 0.3});
  let rig: Rig;
  if (t < T.dayUp) rig = kneel();
  else if (t < tj - 0.35) rig = mixRig(kneel(), stand({arms: 'down'}), easeInOut((t - T.dayUp) / 0.1));
  else rig = start(t, tj, hang);
  if (t < T.dayUp + 0.1 && t >= T.dayUp) rig = mixRig(kneel(), stand({arms: 'down'}), easeInOut((t - T.dayUp) / 0.1));
  const m = loc(MEET_W, 4);
  const sTop = HY(1e9) / K3;
  const reachK = ss(t, T.reach + 0.1, T.reach + 0.55);
  if (reachK > 0) {
    const r = climb(sTop, {step: 0.3, free: [m, null]});
    rig = mixRig(climb(HY(t) / K3, {step: 0.3}), r, reachK);
  }
  // pulled: up the rope with the joined hand, then (under the flash) standing on the top beside him
  const fin = loc([XS[4] - 0.1, 0, -0.95], 4);
  if (t > T.flash - 0.55) {
    const k = easeInOut(clamp((t - T.flash + 0.55) / 0.5));
    const pulled = shift(climb(sTop, {step: 0.3, free: [m, null], legs: 'dangle'}), [0, 0.45 * k, -0.05 * k]);
    pulled.hand[0] = add(m, [0, 0.45 * k, -0.05 * k]);
    rig = pulled;
  }
  if (t > T.flash + 0.04) {
    const st = onTop(fin[0], fin[2], {arms: 'down'});
    const up = onTop(fin[0], fin[2], {arms: 'up'});
    rig = rigAt(t, [
      [T.flash + 0.04, shift(onTop(fin[0], fin[2], {arms: 'down', crouch: 0.2, lean: 12}), [0, 0, 0.05])],
      [T.flash + 0.6, st],
      [T.day1 - 0.05, st],
      [T.day1 + 0.3, up, (k: number) => 1 - Math.pow(1 - k, 3)],
      [T.end + 2, up],
    ]);
  }
  const win = ss(t, T.flash, T.flash + 0.8);
  return {rig, energy: lerp(0.75, 1.3, win) + 0.25 * ss(t, T.day1, T.day1 + 0.3), tint: mixHex(TINT.day, TINT.gold, 0.55 * ss(t, T.day1, T.day1 + 0.6)), h: HY(t), spent: 0, label: 1};
};

/** On drugs: leaps first and high; hangs upside down; lets go — "I can fly" — and falls */
const HG = (t: number) => {
  if (t < T.drugJump + 0.5) return lerp(H0, 3.6, easeInOut(clamp((t - T.drugJump) / 0.5)));
  return run(t, T.drugJump + 0.2, [[T.flip, 0.82], [T.flipBack, 0.05], [T.fly, 0.45], [1e9, 0]]) + 2.1 - 0.3 * 0.82;
};
const upside = (s: number, t: number): Rig => {
  // hanging by the hooked knees, head down, arms dangling and swinging
  const py = s + 0.25;
  const w = Math.sin(t * 2.6) * 0.12;
  const pel: V3 = [0, py, 0.02];
  const up = norm([0.08 * Math.sin(t * 1.7), -1, 0.08]);
  const sh = add(pel, mul(up, SHC));
  return {
    pel,
    up,
    head: [0, 0, 0],
    hand: [add(sh, [-0.18 + w, -ARM * 0.95, 0.06]), add(sh, [0.18 + w, -ARM * 0.95, 0.06])],
    elbow: [
      [-1, 0, 0.3],
      [1, 0, 0.3],
    ],
    foot: [
      [-0.07, py + 0.55, RZ - 0.06],
      [0.07, py + 0.57, RZ - 0.06],
    ],
    knee: [
      [-0.3, 0, 1],
      [0.3, 0, 1],
    ],
  };
};
export const drugs = (t: number): State => {
  const h = HG(t);
  const s = h / K3;
  const sw = sway(t, 6, 1.4) + 0.6 * Math.sin(t * 5.3);
  const hang = (tt: number) => climb(HG(tt) / K3, {sway: sway(tt, 6, 1.4), step: 0.36});
  let rig: Rig;
  if (t < T.drugJump + 0.5) rig = mixRig(stand({arms: t < T.drugJump ? 'down' : 'up', crouch: t < T.drugJump ? 0.12 * ss(t, T.drugJump - 0.3, T.drugJump) : 0}), climb(s, {step: 0.36}), easeInOut(clamp((t - T.drugJump) / 0.45)));
  else rig = hang(t);
  // flip upside down and back
  const fk = ss(t, T.flip - 0.05, T.flip + 0.35) * (1 - ss(t, T.flipBack - 0.1, T.flipBack + 0.3));
  if (fk > 0) rig = mixRig(climb(s, {step: 0.36, sway: sw}), upside(s, t), fk);
  // "I can fly": lets go, arms wide, standing on the clamped rope, wobbling
  const flyK = ss(t, T.fly - 0.1, T.fly + 0.25);
  const sF = HG(T.fly) / K3;
  if (flyK > 0) {
    const wob = Math.sin((t - T.fly) * 4.4) * 0.06 * ss(t, T.fly, T.fly + 0.4);
    const fly: Rig = {
      ...climb(sF, {legs: 'wrap', sway: 0}),
      up: norm([wob, 1, 0.04]),
      hand: [
        [-0.62, sF + 0.05 + wob * 2, 0.12],
        [0.62, sF + 0.05 - wob * 2, 0.12],
      ],
      elbow: [
        [-0.3, 1, 0.2],
        [0.3, 1, 0.2],
      ],
      head: [0, 0.03, 0.03],
    };
    rig = mixRig(climb(sF, {step: 0.36}), fly, flyK);
    if (t > T.fall) rig = tumble(t, T.fall, HG(T.fly), -2.6, fly);
  }
  const hh = t > T.fall ? fallY(t, T.fall, HG(T.fly)) : h;
  return {rig, energy: 1 + 0.25 * Math.sin(t * 9), tint: TINT.drug, h: hh, spent: 0, status: t > T.crash ? {text: 'crashed', color: '#ff5a5a', at: T.crash} : {text: 'I can fly', color: TINT.drug, at: T.fly}, label: 1};
};

export const CAST = [motivation, ego, obsession, discipline, day1, drugs];
export const solveC = (r: Rig) => solve3(r, HB);
export {BEAT};
