import {clamp, easeInOut, easeOut, lerp, ss} from '../nc001-work-smart/anim';
import type {V3} from '../nc001-work-smart/kit3d';
import {K3, rigAt, type Rig} from '../sg003-same-bar/rig3';
import {BEAT, K} from './grid';
import {flung, grip, kneel, lie, PIN, place, slump, splat, standR, type StandOpts} from './rig';

/**
 * SG007 — Ego vs Everyone (arm wrestling). Five tables in a row going away from the camera, one opponent at each:
 * Motivation · Laziness · Talent · Obsession · Discipline. Ego walks from table to table.
 * All rigs here are absolute figure-local (world = local · K3, root at the origin).
 */
export const NAMES = ['Ego', 'Motivation', 'Laziness', 'Talent', 'Obsession', 'Discipline'] as const;
export const TINT = {ego: '#ff4a3a', mot: '#ffb347', laz: '#6fe0b4', tal: '#ffd66b', obs: '#b77cff', dis: '#3cc8ff', dead: '#56607a', gold: '#ffd66b'};
export const TINTS = [TINT.ego, TINT.mot, TINT.laz, TINT.tal, TINT.obs, TINT.dis];

/** the tables (local): a line going away (−z), drifting right */
export const TP: V3[] = [0, 1, 2, 3, 4].map((i) => [0.55 * i, 0, -2.7 * i]);
export const tw = (i: number): V3 => [TP[i][0] * K3, 0, TP[i][2] * K3];
/** the arena board Ego flies into: a wall along z at this x (local), beside the last table */
export const WALL_X = TP[4][0] - 2.55;

const P2 = Math.PI / 2;
const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
/** standing at a spot, facing yaw a (0 = +z, π/2 = +x) */
const at = (p: V3, a: number, o: StandOpts = {}) => place(standR(o), p, a);
/** Ego's and the opponent's standing spots beside table i */
const egoSpot = (i: number) => add3(TP[i], [-0.82, 0, -0.06]);
const oppSpot = (i: number) => add3(TP[i], [0.82, 0, 0.06]);

/** a walk from p0 to p1 between t0 and t1; facing the way it goes; returns the rig */
const walk = (t: number, t0: number, t1: number, p0: V3, p1: V3, o: StandOpts = {}) => {
  const k = easeInOut(clamp((t - t0) / (t1 - t0)));
  const dx = p1[0] - p0[0];
  const dz = p1[2] - p0[2];
  const dist = Math.hypot(dx, dz);
  const p: V3 = [lerp(p0[0], p1[0], k), 0, lerp(p0[2], p1[2], k)];
  const a = Math.atan2(dx, dz);
  const st = Math.sin(Math.PI * clamp((t - t0) / (t1 - t0))) ** 0.5;
  return at(p, a, {...o, phase: (k * dist) / 0.42 * Math.PI, stride: st});
};

/* ───────────── the clasp angle of every match (+ = Ego winning) ───────────── */

const wob = (t: number, f: number, s = 0) => Math.sin(t * f + s) * 0.6 + Math.sin(t * f * 1.73 + s * 2) * 0.4;
/** how fast a slam falls: the last 0.13 s */
const slam = (t: number, t0: number, from: number, to: number, d = 0.13) => lerp(from, to, easeOut(clamp((t - t0) / d)) ** 1.6);

export const GRIP = {
  m1: [1.62, K.w1],
  m2: [6.58, K.w2],
  m3: [10.72, K.w3],
  m4: [18.3, K.broke],
  m5: [26.75, K.slam],
};

export const phiAt = (t: number, m: number): number => {
  if (m === 1) {
    // Motivation bursts in, pushes Ego a little, burns out; Ego slams on the beat
    const burst = -0.32 * ss(t, 1.75, 2.25) * (1 - ss(t, 2.6, 3.5));
    const v = burst + 0.04 * wob(t, 9) * (1 - ss(t, 3.2, 3.8));
    return t < K.w1 ? v : slam(t, K.w1, v, PIN);
  }
  if (m === 2) {
    // Laziness barely holds: the hands drift his way, then just flop
    const v = 0.55 * ss(t, 6.9, 8.2) ** 1.4 + 0.02 * wob(t, 3);
    return t < K.w2 ? v : slam(t, K.w2, v, PIN, 0.22);
  }
  if (m === 3) {
    // Talent is a real fight: even, then Talent takes him nearly all the way down; Ego comes back in one blow
    const even = 0.1 * wob(t, 6) + 0.05 * Math.sin(t * 23);
    const down = -1.08 * ss(t, 12.15, 13.2) - 0.1 * ss(t, 13.2, 14.6) + 0.06 * ss(t, 14.6, 15.05);
    const shakeIt = 0.035 * Math.sin(t * 41) * ss(t, 12.2, 13);
    const v = even * (1 - ss(t, 12.2, 12.8)) + down + shakeIt;
    return t < K.w3 ? v : slam(t, K.w3, v, PIN, 0.11);
  }
  if (m === 4) {
    // Obsession grinds; never stops; Ego won't lose; the arm snaps
    const grind = 0.22 * wob(t, 7.3, 1) + 0.05 * Math.sin(t * 31);
    const push = -0.78 * ss(t, K.never - 0.2, K.never + 0.9) * (1 - ss(t, K.wont - 0.1, K.wont + 0.5));
    const back = 0.95 * ss(t, K.wont - 0.05, K.broke - 0.05);
    const v = grind * (1 - 0.6 * ss(t, K.never - 0.3, K.never)) + push + back + 0.04 * Math.sin(t * 47) * ss(t, K.wont, K.broke);
    return t < K.broke ? v : slam(t, K.broke, v, PIN, 0.09);
  }
  // Discipline does not move at all (Ego shakes against a wall), then pins him in one move
  const v = 0.008 * Math.sin(t * 50) * ss(t, K.sure, K.sure + 0.4);
  return t < K.slam ? v : slam(t, K.slam, v, -PIN, 0.12);
};

/* ───────────── state of a character at a time ───────────── */

export type State = {
  rig: Rig;
  /** chest light colour and brightness */
  tint: string;
  energy: number;
  /** flame aura 0..1+ and its colour */
  aura: number;
  auraColor: string;
  /** 0..1 gone grey (beaten) */
  spent: number;
  /** strain 0..1 (shaking, sparks) */
  strain: number;
  noArm?: boolean;
  /** red-hot cracks on the torso (Ego against Discipline) */
  cracks?: number;
  /** the label above the head: 0..1 */
  label: number;
};

/** a grip at table i (rigs from grip() are table-local) */
const gripAt = (i: number, o: Parameters<typeof grip>[0]) => place(grip(o), TP[i]);

const S0 = (rig: Rig, tint: string, e = 1): State => ({rig, tint, energy: e, aura: 0, auraColor: tint, spent: 0, strain: 0, label: 1});

/* ── Ego ── */
const EGO_IN: V3 = [-1.35, 0, 2.6];
const egoRig = (t: number): Rig => {
  // table 1
  if (t < 1.32) {
    const r = walk(t, -0.15, 1.32, EGO_IN, egoSpot(0), {arms: 'swagger', proud: 1});
    return t > 1.0 ? rigAt(t, [[1.0, r], [1.32, at(egoSpot(0), P2, {proud: 1})]]) : r;
  }
  const into = (i: number, a: number, b: number, m: number) => (t < b ? rigAt(t, [[a, at(egoSpot(i), P2, {proud: 0.5})], [b, gripAt(i, {side: -1, phi: phiAt(b, m), t})]]) : null);
  const g = (m: number, strain = 0, o: Partial<Parameters<typeof grip>[0]> = {}) => gripAt(m - 1, {side: -1, phi: phiAt(t, m), t, strain, ...o});
  if (t < GRIP.m1[0]) return into(0, 1.32, GRIP.m1[0], 1)!;
  if (t < K.w1 + 0.06) return g(1, 0.15);
  // stand up, turn to the camera: "Next."
  if (t < 4.95) return rigAt(t, [[K.w1 + 0.06, g(1)], [K.w1 + 0.38, at(egoSpot(0), P2, {proud: 1})], [4.3, at(egoSpot(0), 0.55, {proud: 1, arms: 'hips'})]]);
  if (t < 6.2) return walk(t, 4.95, 6.2, egoSpot(0), egoSpot(1), {arms: 'swagger', proud: 1});
  if (t < GRIP.m2[0]) return into(1, 6.2, GRIP.m2[0], 2)!;
  if (t < K.w2 + 0.08) return g(2, 0, {lean: 26});
  // "Too easy." — hands on the hips, chest out
  if (t < 9.45) return rigAt(t, [[K.w2 + 0.08, g(2, 0, {lean: 26})], [K.w2 + 0.45, at(egoSpot(1), P2, {proud: 1})], [8.95, at(egoSpot(1), 0.6, {proud: 1.2, arms: 'hips'})]]);
  if (t < 10.4) return walk(t, 9.45, 10.4, egoSpot(1), egoSpot(2), {arms: 'swagger', proud: 1});
  if (t < GRIP.m3[0]) return into(2, 10.4, GRIP.m3[0], 3)!;
  if (t < K.w3 + 0.05) {
    const losing = ss(t, 12.2, 13.2);
    return g(3, 0.35 + 0.65 * losing, {lean: 30 + 8 * losing, nod: 0.5 * losing});
  }
  // "WHO'S NEXT?!" — fists in the air
  if (t < 16.5) return rigAt(t, [[K.w3 + 0.05, g(3, 1, {lean: 38})], [K.w3 + 0.3, at(egoSpot(2), P2, {proud: 1.4, arms: 'up'})], [15.7, at(egoSpot(2), 0.5, {proud: 1.6, arms: 'up'})]]);
  // the lights go out; he walks on in the dark
  if (t < 18.0) return walk(t, 16.5, 18.0, egoSpot(2), egoSpot(3), {arms: 'swagger', proud: 0.6});
  if (t < GRIP.m4[0]) return into(3, 18.0, GRIP.m4[0], 4)!;
  if (t < K.broke + 0.05) return g(4, 0.8, {lean: 34});
  // "Is that all?"
  if (t < 25.0) return rigAt(t, [[K.broke + 0.05, g(4, 0.5, {lean: 34})], [K.broke + 0.4, at(egoSpot(3), P2, {proud: 1})], [24.7, at(egoSpot(3), 0.7, {proud: 1.4, arms: 'hips'})]]);
  if (t < 26.25) return walk(t, 25.0, 26.25, egoSpot(3), egoSpot(4), {arms: 'swagger', proud: 1.2});
  if (t < GRIP.m5[0]) return rigAt(t, [[26.25, at(egoSpot(4), P2, {proud: 1.2})], [26.45, at(egoSpot(4), P2, {proud: 1.2})], [GRIP.m5[0], gripAt(4, {side: -1, phi: 0, t})]]);
  if (t < K.slam) {
    const st = ss(t, K.sure, K.sure + 0.5);
    return g(5, 0.6 + 0.4 * st, {lean: 32 + 6 * ss(t, K.seen, K.slam)});
  }
  // flung into the board, slides down to the floor
  const P0 = add3(TP[4], [-0.6, 0, -0.08]);
  const wallP: V3 = [WALL_X + 0.2, 0, TP[4][2] - 0.08];
  const fl = 0.36;
  if (t < K.slam + fl) {
    const k = clamp((t - K.slam) / fl);
    const x = lerp(P0[0], wallP[0], easeOut(k) * 0.4 + k * 0.6);
    const y = 0.5 * Math.sin(Math.PI * k) + 0.25 * k;
    const r = place(flung({tip: lerp(0.3, 1.35, easeOut(k)), t}), [x, y, lerp(P0[2], wallP[2], k)], P2);
    if (t < K.slam + 0.07) return rigAt(t, [[K.slam, g(5, 1)], [K.slam + 0.07, r]]);
    return r;
  }
  const sp = place(splat(), add3(wallP, [0, 0.42, 0]), P2);
  return rigAt(t, [
    [K.slam + fl, sp],
    [K.slam + fl + 0.22, place(splat(), add3(wallP, [0, 0.33, 0]), P2)],
    [K.slam + fl + 0.75, place(slump({tilt: 1}), add3(wallP, [0.02, 0, 0]), P2)],
  ]);
};

const egoState = (t: number): State => {
  const s = S0(egoRig(t), TINT.ego, 1);
  // the aura: a lick on every win, a blaze when losing to Talent, against Obsession, against Discipline
  const w = (a: number) => (t > a ? Math.exp(-(t - a) * 2.2) : 0);
  const m3 = ss(t, 12.4, 13.6) * (1 - ss(t, 16.2, 16.6));
  const dark = ss(t, 16.5, 17.5) * (1 - ss(t, 18.2, 18.6)) * 0.45;
  const m4 = ss(t, 18.3, 19.2) * (1 - ss(t, 24.2, 25.2)) * (0.75 + 0.35 * ss(t, K.wont, K.wont + 0.4));
  const m5 = ss(t, K.sure - 0.1, K.sure + 0.5) * (1 - ss(t, K.slam, K.slam + 0.3)) * (1 + 0.25 * ss(t, K.seen, K.slam));
  const flick = t > K.seen && t < K.slam ? 0.85 + 0.15 * Math.sin(t * 37) : 1;
  s.aura = Math.max(0.5 * w(K.w1) + 0.35 * w(K.w2), m3 * 1.1 + 0.5 * w(K.w3), dark, m4, m5 * flick, 0.12 * ss(t, 0.3, 1));
  s.energy = 1 + 0.6 * s.aura - 0.8 * ss(t, K.slam, K.slam + 0.5);
  s.strain = Math.max(ss(t, 12.3, 13) * (1 - ss(t, K.w3, K.w3 + 0.1)), ss(t, 18.3, 19) * (1 - ss(t, K.broke, K.broke + 0.1)), ss(t, K.sure, K.sure + 0.4) * (1 - ss(t, K.slam, K.slam + 0.1)));
  s.cracks = 1.0 * ss(t, K.sure + 0.4, K.slam - 0.2);
  s.spent = 0.6 * ss(t, K.slam + 0.4, K.slam + 1.4);
  if (t > K.slam) s.tint = TINT.ego;
  return s;
};

/* ── opponents ── */

const ready = (i: number, t: number, bounce = 0) => at(add3(oppSpot(i), [0, Math.max(0, Math.sin(t * Math.PI * 2 / (BEAT * 2))) * 0.03 * bounce, 0]), -P2, {proud: 0.3});
const og = (m: number, t: number, o: Partial<Parameters<typeof grip>[0]> = {}) => place(grip({side: 1, phi: phiAt(t, m), t, ...o}), TP[m - 1]);
/** thrown off the table: grip → staggering back → down on the floor (spot, yaw a) */
const thrown = (t: number, t0: number, gr: Rig, i: number, down: Rig, back = 0.55) =>
  rigAt(t, [
    [t0, gr],
    [t0 + 0.16, at(add3(oppSpot(i), [0.3, 0.05, -0.15]), -P2 + 0.5, {lean: -20, arms: 'up'})],
    [t0 + back, down, easeOut],
  ]);

const motState = (t: number): State => {
  const i = 0;
  const m = 1;
  let rig: Rig;
  if (t < 1.32) rig = ready(i, t, 1);
  else if (t < GRIP.m1[0]) rig = rigAt(t, [[1.32, ready(i, t, 1)], [GRIP.m1[0], og(m, GRIP.m1[0])]]);
  else if (t < K.w1) rig = og(m, t, {strain: 0.6 * (1 - ss(t, 2.6, 3.4)), lean: 28 - 6 * ss(t, 2.6, 3.6), slouch: 0.4 * ss(t, 2.8, 3.8)});
  else rig = thrown(t, K.w1, og(m, K.w1, {slouch: 0.4}), i, place(lie({face: 'down', arms: 'push', knee: 0.6}), add3(TP[i], [1.25, 0, 0.35]), P2 + 0.35), 0.5);
  const s = S0(rig, TINT.mot, 1.5 - 1.3 * ss(t, 2.4, 3.7));
  s.aura = 0.55 * ss(t, 1.65, 1.95) * (1 - ss(t, 2.4, 3.3));
  s.spent = ss(t, K.w1 + 0.1, K.w1 + 0.8);
  s.energy *= 1 - 0.8 * s.spent;
  s.strain = 0.5 * ss(t, 1.7, 2) * (1 - ss(t, 2.5, 3));
  return s;
};

const lazState = (t: number): State => {
  const i = 1;
  const m = 2;
  let rig: Rig;
  const slouchy = (tt: number) => at(add3(oppSpot(i), [0, 0, 0]), -P2, {lean: 10, crouch: 0.03, arms: 'down', head: [0, -0.05, 0.02]});
  if (t < 6.2) rig = slouchy(t);
  else if (t < GRIP.m2[0]) rig = rigAt(t, [[6.2, slouchy(t)], [GRIP.m2[0], og(m, GRIP.m2[0], {slouch: 1, peg: 0.2, lean: 22})]]);
  else if (t < K.w2) rig = og(m, t, {slouch: 1, peg: 0.2, lean: 22, nod: 0.6});
  else
    rig = rigAt(t, [
      [K.w2, og(m, K.w2, {slouch: 1, peg: 0, nod: 0.6})],
      [K.w2 + 0.3, at(add3(oppSpot(i), [0.15, 0, 0]), -P2, {crouch: 0.25, lean: 15})],
      [K.w2 + 0.75, place(lie({face: 'up', arms: 'pillow', knee: 0.7}), add3(TP[i], [1.1, 0, -0.1]), P2 + 0.15)],
    ]);
  const s = S0(rig, TINT.laz, 0.35 + 0.1 * Math.sin(t * 2));
  s.spent = 0.25 * ss(t, K.w2, K.w2 + 0.6);
  return s;
};

const talState = (t: number): State => {
  const i = 2;
  const m = 3;
  let rig: Rig;
  if (t < 10.4) rig = ready(i, t, 0.5);
  else if (t < GRIP.m3[0]) rig = rigAt(t, [[10.4, ready(i, t, 0.5)], [GRIP.m3[0], og(m, GRIP.m3[0])]]);
  else if (t < K.w3) {
    const win = ss(t, 12.2, 13.2);
    rig = og(m, t, {strain: 0.5 + 0.3 * win, lean: 30 + 4 * win});
  } else rig = thrown(t, K.w3, og(m, K.w3, {strain: 1}), i, place(lie({face: 'up', arms: 'out', knee: 0.3}), add3(TP[i], [1.5, 0, -0.25]), P2 - 0.3), 0.6);
  const s = S0(rig, TINT.tal, 1.1);
  s.aura = 0.35 * ss(t, 12.2, 13) * (1 - ss(t, K.w3, K.w3 + 0.2));
  s.spent = ss(t, K.w3 + 0.2, K.w3 + 0.9);
  s.energy *= 1 - 0.8 * s.spent;
  s.strain = ss(t, 10.8, 11.2) * (1 - ss(t, K.w3, K.w3 + 0.1)) * 0.7;
  return s;
};

const obsState = (t: number): State => {
  const i = 3;
  const m = 4;
  let rig: Rig;
  if (t < 18.0) rig = ready(i, t, 1.6);
  else if (t < GRIP.m4[0]) rig = rigAt(t, [[18.0, ready(i, t, 1.6)], [GRIP.m4[0], og(m, GRIP.m4[0])]]);
  else if (t < K.broke) rig = og(m, t, {strain: 1, lean: 36});
  else
    rig = rigAt(t, [
      [K.broke, og(m, K.broke, {strain: 1, lean: 36, peg: 1})],
      [K.broke + 0.25, at(add3(oppSpot(i), [0.3, 0, 0.1]), -P2 + 0.3, {lean: 25, crouch: 0.08})],
      [K.broke + 0.75, place(kneel({rock: 4 * Math.sin(t * 9)}), add3(TP[i], [1.05, 0, 0.15]), -P2 + 0.25)],
    ]);
  const s = S0(rig, TINT.obs, 1.35);
  s.aura = Math.max(0.25 * ss(t, 16.6, 17.2), ss(t, 18.3, 19) * (0.9 + 0.3 * ss(t, K.never - 0.3, K.never + 0.4) - 0.3 * ss(t, K.wont, K.broke))) * (1 - ss(t, K.broke, K.broke + 0.5));
  s.noArm = t >= K.broke;
  s.spent = 0.55 * ss(t, K.broke + 0.3, K.broke + 1.2);
  s.strain = ss(t, 18.3, 18.8) * (1 - ss(t, K.broke, K.broke + 0.1));
  s.energy = 1.35 - 0.9 * s.spent;
  return s;
};

const disState = (t: number): State => {
  const i = 4;
  const m = 5;
  const calm = (tt: number) => at(oppSpot(i), -P2, {lean: 1, head: [0, 0.005 * Math.sin(tt * 1.6), 0]});
  let rig: Rig;
  if (t < 26.3) rig = calm(t);
  else if (t < GRIP.m5[0]) rig = rigAt(t, [[26.3, calm(t)], [GRIP.m5[0], og(m, GRIP.m5[0], {lean: 22, twist: 18})]]);
  else if (t < K.slam + 0.3) rig = og(m, t, {lean: 22 + 5 * ss(t, K.slam - 0.05, K.slam + 0.1), twist: 18});
  else
    rig = rigAt(t, [
      [K.slam + 0.3, og(m, K.slam + 0.3, {lean: 27, twist: 18})],
      [K.slam + 1.2, at(oppSpot(i), -P2 - 0.15, {lean: 0})],
      [33.2, at(oppSpot(i), -P2 - 0.15, {lean: 0})],
      [34.4, at(add3(oppSpot(i), [-0.25, 0, 0.05]), -P2 - 0.6, {lean: 0, arms: 'down'})],
    ]);
  const s = S0(rig, TINT.dis, 0.95);
  s.aura = 0.75 * ss(t, K.seen - 0.2, K.seen + 1.1) * (1 - 0.4 * ss(t, K.slam + 0.5, K.slam + 2)) + 0.25 * ss(t, 33, 35);
  s.auraColor = '#7fd8ff';
  s.energy = 0.95 + 0.4 * ss(t, K.seen, K.slam);
  return s;
};

export const CAST: ((t: number) => State)[] = [egoState, motState, lazState, talState, obsState, disState];
export const WALL = {x: WALL_X, z: TP[4][2], len: 6.5};
