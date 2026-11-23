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
export const RZ = 0.27;
/** the wall face behind the climbers, and the summit */
export const WALL_Z = -0.36;
export const TOPY = 24.3;
export const TL = TOPY / K3;
export const ROPE_BOT = 0.38;
/** the sea of clouds */
export const CL = 10.5;
/** the gantry the ropes hang from, high above the summit */
export const BEAM_Y = TOPY + 3.6;

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
  if (f < 0.55) return {rel: top - f * 2 * step, k: 0};
  const k = easeInOut((f - 0.55) / 0.45);
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
  const shc: V3 = [sw * 0.05, s, 0];
  const up = norm([sw * 0.2 + 0.08 * (o.slump ?? 0), 1, -0.06]);
  const pel = sub(shc, mul(up, SHC));
  const hand = (i: number): V3 => {
    const sd = i ? 1 : -1;
    const fr = o.free?.[i];
    if (fr) return fr;
    if (o.hold !== undefined) return [sd * 0.025, s + o.hold + (i ? 0.11 : 0), RZ];
    const g = grip(s, step, i * step, A_H);
    const lift = Math.sin(Math.PI * g.k);
    return [sd * (0.03 + 0.1 * lift), s + g.rel, RZ + 0.09 * lift];
  };
  const legs = o.legs ?? 'climb';
  const py = pel[1];
  const foot = (i: number): V3 => {
    const sd = i ? 1 : -1;
    if (legs === 'sit') return [sd * 0.14, py - LEG * 0.62, 0.5];
    if (legs === 'dangle') return [sd * 0.09 + sw * 0.1, py - LEG * 0.97, 0.06];
    if (legs === 'wrap') return [sd * 0.1, py - LEG * 0.72, RZ - 0.07];
    const g = grip(s, step, (1 - i) * step + step * 0.45, F_HI);
    const lift = Math.sin(Math.PI * g.k);
    return [sd * (0.1 + 0.05 * lift), py + g.rel, RZ - 0.03 - 0.05 * lift];
  };
  return {
    pel,
    up,
    head: o.head ?? [0.07 * (o.slump ?? 0), -0.05 * (o.slump ?? 0), 0.0],
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

/** standing, with the elbows bending out to the sides (no flip when a hand passes the shoulder) */
const standP = (o: Parameters<typeof stand>[0] = {}): Rig => ({
  ...stand(o),
  elbow: [
    [-0.45, -0.3, 1],
    [0.45, -0.3, 1],
  ],
});

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
    foot: [add(c.pel, [-0.25, -0.55 + 0.1 * w(4), 0.04]), add(c.pel, [0.22, -0.6 + 0.1 * w(5), -0.05])],
    elbow: [
      [-1, 0.3, 0],
      [1, 0.3, 0],
    ],
  };
};

/** a free fall from shoulder height h0 (world) at time t0, tumbling */
export const fallY = (t: number, t0: number, h0: number, g = 8.2) => h0 - 0.5 * g * Math.max(0, t - t0) ** 2;
/** the fall stays in the plane behind the ropes (spin about z only, no drift toward the camera) */
const tumble = (t: number, t0: number, h0: number, spin: number, from: Rig, g = 8.2): Rig => {
  const dt = Math.max(0, t - t0);
  const k = clamp(dt / 0.35);
  const f = flail(h0 / K3, t);
  const base = mixRig(from, f, easeInOut(k));
  const piv = add(base.pel, mul(base.up, SHC * 0.5));
  return moveRig(base, piv, [0, 0, 1], spin * dt * dt * 1.4 + spin * dt * 0.6, [0, (fallY(t, t0, h0, g) - h0) / K3, -0.1 * easeInOut(clamp(dt / 0.12))]);
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
  const st = standP({arms: 'down', z: -0.07});
  if (t < tj - 0.35) return st;
  const crouch = standP({crouch: 0.16, arms: 'up', lean: 0, z: -0.07});
  if (t < tj) return mixRig(st, crouch, easeInOut((t - tj + 0.35) / 0.35));
  const k = clamp((t - tj) / 0.3);
  const target = hang(tj + 0.3);
  const air = mixRig(crouch, target, easeInOut(k));
  return t < tj + 0.3 ? shift(air, [0, 0.25 * Math.sin(Math.PI * k), 0]) : hang(t);
};

const V = 0.667;

/**
 * Each climber's own rhythm on top of the mean speed v: v·(1 + k·cos), so the climb never runs backwards (k ≤ 1).
 * Gated in and out over half a second so heights stay continuous.
 */
const surge = (t: number, v: number, k: number, period: number, ph: number, t0: number, t1: number) => {
  const w = (2 * Math.PI) / period;
  const gate = ss(t, t0, t0 + 0.5) * (1 - ss(t, t1 - 0.5, t1));
  return (gate * v * k * (Math.sin(w * (t - t0) + ph) - Math.sin(ph))) / w;
};
const look = (x: number, y: number, z = 0): V3 => [x, y, z];

const sway = (t: number, seed: number, a = 1) => a * (Math.sin(t * 1.3 + seed) * 0.6 + Math.sin(t * 0.7 + seed * 2) * 0.4);

/** Motivation: jumps on late but fast, leads early, slows down, freezes, quits and slides off */
const HM = (t: number) => run(t, T.motJump, [[B(6), 1.1], [B(12), 0.5], [B(14), 0.15], [1e9, 0]]) + surge(t, 1.1, 0.35, 0.93, 0, T.motJump + 0.3, B(11));
const M_SLIDE = B(16);
export const motivation = (t: number): State => {
  const hq = HM(M_SLIDE);
  const slideD = t > M_SLIDE ? 0.5 * 1.6 * (t - M_SLIDE) ** 2 : 0;
  const h = HM(t) - slideD;
  const s = h / K3;
  const quitK = ss(t, T.quit - 0.25, T.quit + 0.2);
  const hang = (tt: number) => {
    const sh = HM(tt) / K3;
    const c = climb(sh, {sway: sway(tt, 1, 0.6), step: 0.32, head: look(0, 0.05)});
    // the fist pump: right hand off the rope, punched up on beat 4
    const fp = ss(tt, B(3.6), B(4)) * (1 - ss(tt, B(5.2), B(5.8)));
    if (fp <= 0) return c;
    const p = climb(sh, {sway: sway(tt, 1, 0.6), step: 0.32, head: look(0.03, 0.07), free: [null, [0.3, sh + 0.66 + 0.05 * Math.sin(tt * 18), 0.12]]});
    return mixRig(c, p, fp);
  };
  let rig = start(t, T.motJump, hang);
  if (t > T.quit - 0.25) rig = mixRig(climb(s, {sway: sway(t, 1, 0.6), step: 0.32}), climb(s, {legs: 'sit', hold: 0.45, slump: 0.8}), quitK);
  if (t > M_SLIDE) rig = climb(s, {legs: 'sit', hold: 0.45, slump: 0.8});
  return {rig, energy: lerp(1, 0.35, quitK), tint: mixHex(TINT.mot, TINT.dead, quitK * 0.8), h, spent: 0.6 * quitK, status: {text: 'quit', color: '#ff5a5a', at: T.quit}, slide: t > M_SLIDE ? 1 : 0, label: 1 - ss(hq - h, 3, 4)};
};

/** lying on his side on the ground, arms and legs out (Ego after the fall) */
const sprawl = (bounce: number): Rig => {
  const r = moveRig(standP({arms: 'out'}), [0, 0, 0], [0, 0, 1], -Math.PI / 2, [0, 0, 0]);
  // stand is ~1.7 long: put it on the floor (its side), the head toward +x, a little back from the rope
  return moveRig(r, [0, 0, 0], [0, 1, 0], 0, [-0.85, HB.tr[1] + 0.02 + bounce, -0.12]);
};

/** Ego: fast and showy; waves with the crown hand on the beat, slips, falls */
export const HE = (t: number) => run(t, T.jump, [[B(8), 0.8], [B(36), V], [B(40), 1.05], [B(44), 0.45], [1e9, V]]) + surge(t, V, 0.3, 1.852, 0, T.jump + 0.3, B(46));
/** Ego falls slower than real gravity so that he hits the clouds on the beat of the reference's FELL */
export const EGO_G = (2 * (HE(B(48)) - 0.18 * K3 - 0.32)) / (T.fell - T.slip - 0.18) ** 2;
export const ego = (t: number): State => {
  const hang = (tt: number) => {
    const sh = HE(Math.min(tt, T.wave)) / K3;
    const lookDown = ss(tt, B(40.5), B(41.5)) * (1 - ss(tt, B(44.5), B(45.5)));
    const head = look(0.07 * lookDown, -0.02 - 0.05 * lookDown, 0);
    const c = climb(sh, {sway: sway(tt, 2, 0.5), step: 0.28, head});
    // the pose: hangs by one hand, the other on the hip, chin up (beat 8 → 10)
    const ps = ss(tt, B(7.6), B(8)) * (1 - ss(tt, B(9.6), B(10.2)));
    if (ps <= 0) return c;
    const p = climb(sh, {sway: 0.2, step: 0.28, head: look(-0.04, 0.06), free: [null, [0.27, sh - 0.4, 0.07]]});
    p.elbow = [p.elbow![0], [1, 0.3, -0.2]];
    return mixRig(c, p, ps);
  };
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
    const dang = climb(s, {step: 0.28, legs: 'dangle', free: [null, waved.hand[1]]});
    const slip = shift(mixRig(waved, {...waved, foot: dang.foot, knee: dang.knee}, sl), [0, -0.18 * sl, 0]);
    rig = t < T.slip + 0.18 ? slip : tumble(Math.min(t, T.fell), T.slip + 0.18, hs - 0.18 * K3, 3.2, slip, EGO_G);
  }
  // on the ground: sprawled on his side, a small bounce
  if (t > T.fell) {
    const b = 0.12 * Math.abs(Math.sin((t - T.fell) * 11)) * Math.exp(-(t - T.fell) * 6);
    rig = mixRig(rig, sprawl(b), easeInOut(clamp((t - T.fell) / 0.12)));
  }
  const h = t > T.slip + 0.18 ? Math.max(0.32, fallY(t, T.slip + 0.18, hs - 0.18 * K3, EGO_G)) : hs;
  return {rig, energy: 1, tint: TINT.ego, h, spent: 0, status: {text: 'fell', color: '#ff5a5a', at: T.fell}, slide: ss(t, T.slip, T.slip + 0.05) * (1 - ss(t, T.slip + 0.18, T.slip + 0.25)), label: 1};
};

/** Obsession: fast, frantic hands, burning them from B(15); burns out, slides down the rope and hangs there */
export const HO = (t: number) => run(t, T.jump, [[B(41), 0.7], [B(44), 1.0], [B(46), 0.5], [T.spent, 0.7], [1e9, 0]]) + surge(t, 0.7, 0.3, 0.463, 1.3, T.jump + 0.3, T.spent);
const O_STOP = 2.6;
export const obsession = (t: number): State => {
  const hang = (tt: number) => climb(HO(tt) / K3, {sway: sway(tt, 3, 0.35) + 0.1 * Math.sin(tt * 17), step: 0.22, head: look(0.02 * Math.sin(tt * 9), -0.045, 0.02)});
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
const D_UP = T.top - 0.9;
/** the moment hands meet (world) */
export const MEET_W: V3 = [XS[4] - 0.12, TOPY - 0.3, 0.02];
const loc = (p: V3, i: number): V3 => [(p[0] - XS[i]) / K3, p[1] / K3, p[2] / K3];

/** the pull, on the beat grid: grip → Discipline rises to his knees → steps back → Day 1 sits on the edge (flash) */
export const P = {grip: T.reach + 0.72, knees: B(73.2), back: B(73.95), sit: T.flash};
/** the joined hands (world) over the pull */
export const joint = (t: number): V3 => {
  const A: V3 = MEET_W;
  const K: V3 = [XS[4] - 0.18, TOPY + 0.34, WALL_Z - 0.38];
  const Bk: V3 = [XS[4] - 0.28, TOPY + 0.62, WALL_Z - 0.5];
  if (t <= P.grip) return A;
  if (t <= P.knees) {
    const k = easeInOut((t - P.grip) / (P.knees - P.grip));
    // up first, then back over the edge (an arc, so the forearms clear the corner)
    return [lerp(A[0], K[0], k), lerp(A[1], K[1], k) + 0.3 * Math.sin(Math.PI * k), lerp(A[2], K[2], ss(k, 0.25, 1))];
  }
  const k = easeInOut(clamp((t - P.knees) / (P.back - P.knees)));
  return [lerp(K[0], Bk[0], k), lerp(K[1], Bk[1], k), lerp(K[2], Bk[2], k)];
};

/** summit poses (figure-local, rope at x 0) */
const SEAT = HB.tr[0] + 0.01;
const onTop = (x: number, z: number, o: Parameters<typeof stand>[0] = {}): Rig => shift(standP({...o}), [x, TL, z]);
/** out of the pool backwards: hands behind him on the edge, a reverse dip, hips over the edge (k 0..1) */
const dipUp = (k: number, xo = 0, hand0?: V3): Rig => {
  const hz = (WALL_Z - 0.1) / K3;
  const sh: V3 = [xo, lerp(TL - 0.05, TL + 0.5, k), lerp(-0.05, -0.28, k)];
  const up = norm([0, 1, lerp(0.0, -0.1, k)]);
  const pel = sub(sh, mul(up, SHC));
  return {
    pel,
    up,
    hand: [hand0 ?? [xo - 0.3, TL + 0.03, hz], [xo + 0.3, TL + 0.03, hz]],
    elbow: [
      [-1, lerp(0.7, 0.1, k), lerp(0.1, -0.8, k)],
      [1, lerp(0.7, 0.1, k), lerp(0.1, -0.8, k)],
    ],
    foot: [
      [xo - 0.1, pel[1] - LEG * 0.85, Math.min(0.12, pel[2] + 0.25)],
      [xo + 0.1, pel[1] - LEG * 0.9, Math.min(0.08, pel[2] + 0.22)],
    ],
    knee: [
      [-0.2, 0, 1],
      [0.2, 0, 1],
    ],
  };
};
const sitEdge = (xo = 0, hand0?: V3): Rig => {
  const z = (WALL_Z - 0.18) / K3;
  return {
    pel: [xo, TL + SEAT, z],
    up: norm([0, 1, 0.08]),
    hand: [hand0 ?? [xo - 0.27, TL + 0.04, z - 0.05], [xo + 0.27, TL + 0.04, z - 0.05]],
    elbow: [
      [-0.6, 0, -0.6],
      [0.6, 0, -0.6],
    ],
    foot: [
      [xo - 0.12, TL + SEAT - 0.36, z + 0.38],
      [xo + 0.12, TL + SEAT - 0.34, z + 0.36],
    ],
    knee: [
      [-0.1, 1, 0.3],
      [0.1, 1, 0.3],
    ],
  };
};
/** sitting on the edge, knees up, feet already on the top (between sitting and standing, so the shins never cut the edge) */
const tuck = (xo = 0, hand0?: V3): Rig => {
  const z = (WALL_Z - 0.3) / K3;
  return {
    pel: [xo, TL + SEAT, z],
    up: norm([0, 1, 0.25]),
    hand: [hand0 ?? [xo - 0.28, TL + 0.04, z - 0.12], [xo + 0.28, TL + 0.04, z - 0.12]],
    elbow: [
      [-0.6, 0, -0.6],
      [0.6, 0, -0.6],
    ],
    foot: [
      [xo - 0.12, TL + HB.ankle, z + 0.38],
      [xo + 0.12, TL + HB.ankle, z + 0.36],
    ],
    knee: [
      [-0.1, 1, 0.3],
      [0.1, 1, 0.3],
    ],
  };
};
/** Discipline lying on his belly at the edge, the right arm down to Day 1 (reach 0..1 to the target) */
const DX = loc(MEET_W, 3)[0] - 0.12;
const prone = (reach: number, target: V3): Rig => {
  const x = DX;
  const shz = (WALL_Z + 0.02) / K3;
  const pel: V3 = [x, TL + 0.14, shz - SHC];
  const up: V3 = norm([0, 0.12, 1]);
  const rest: V3 = [x + 0.3, TL + HB.ar[2], shz + 0.05];
  return {
    pel,
    up,
    fwd: [0, -1, 0.1],
    head: [0, -0.03, 0.05],
    hand: [[x - 0.3, TL + HB.ar[2], shz - 0.05], [lerp(rest[0], target[0], reach), lerp(rest[1], target[1], reach), lerp(rest[2], target[2], reach)]],
    elbow: [
      [-1, 0, 0],
      [1, 0.2, 0.3],
    ],
    foot: [
      [x - 0.09, TL + HB.lr[2] + 0.01, shz - SHC - LEG * 0.995],
      [x + 0.09, TL + HB.lr[2] + 0.01, shz - SHC - LEG * 0.99],
    ],
    knee: [
      [0, 1, 0],
      [0, 1, 0],
    ],
  };
};
/** up on his knees, leaning back, both hands on Day 1's hand */
const kneelPull = (J: V3): Rig => {
  const x = DX;
  const z0 = (WALL_Z - 0.72) / K3;
  const pel: V3 = [x, TL + 0.47, z0];
  return {
    pel,
    up: norm([0, 1, -0.32]),
    head: [0, 0.0, 0.03],
    hand: [add(J, [-0.07, -0.02, -0.03]), J],
    elbow: [
      [-0.7, -0.6, -0.3],
      [0.7, -0.6, -0.3],
    ],
    foot: [
      [x - 0.11, TL + HB.lr[2] + 0.012, z0 - 0.4],
      [x + 0.11, TL + HB.lr[2] + 0.012, z0 - 0.42],
    ],
    knee: [
      [-0.1, 0.2, 1],
      [0.1, 0.2, 1],
    ],
  };
};
/** a crouch stepped back, still pulling */
const crouchPull = (J: V3): Rig => {
  const z0 = (WALL_Z - 1.0) / K3;
  const r = onTop(DX - 0.05, z0, {crouch: 0.2, lean: -14, arms: 'down'});
  return {...r, hand: [add(J, [-0.07, -0.02, -0.03]), J], elbow: [[-0.7, -0.5, -0.4], [0.7, -0.5, -0.4]]};
};

export const discipline = (t: number): State => {
  const hang = (tt: number) => climb(HD(tt) / K3, {sway: sway(tt, 4, 0.25), step: 0.3, head: [0, 0.02, 0]});
  const h = HD(t);
  let rig = start(t, T.jump, hang);
  const fin = loc([XS[3] + 0.3, 0, -0.95], 3);
  const day = loc([XS[4] - 0.1, 0, -0.95], 3);
  const Jl = loc(joint(t), 3);
  const m = loc(MEET_W, 3);
  const clap: Rig = {...onTop(fin[0], fin[2], {arms: 'down'}), hand: [onTop(fin[0], fin[2]).hand[0], [day[0] - 0.12, TL + 1.12, day[2] + 0.02]], fwd: norm([0.35, 0, 1])};
  if (t > D_UP) {
    rig = rigAt(t, [
      [D_UP, hang(D_UP)],
      [D_UP + 0.25, {...hang(D_UP), hand: [[-0.26, TL + 0.32, (WALL_Z + 0.02) / K3], [0.26, TL + 0.32, (WALL_Z + 0.02) / K3]]}],
      [D_UP + 0.5, dipUp(0)],
      [D_UP + 0.9, dipUp(1)],
      [D_UP + 1.2, sitEdge()],
      [D_UP + 1.45, tuck()],
      [D_UP + 1.8, onTop(0, (WALL_Z - 0.6) / K3, {crouch: 0.14, arms: 'down'})],
      [D_UP + 2.05, onTop(0, (WALL_Z - 0.65) / K3, {arms: 'down'})],
      [D_UP + 2.45, onTop(DX, (WALL_Z - 0.7) / K3, {arms: 'down'})],
      [T.reach + 0.02, kneelPull(add(loc(MEET_W, 3), [0, 0.55, -0.45]))],
      [T.reach + 0.42, prone(0, m)],
      [T.reach + 0.68, prone(1, m)],
    ]);
    if (t > T.reach + 0.68) rig = prone(1, m);
    if (t > P.grip) rig = mixRig(prone(1, Jl), kneelPull(Jl), easeInOut(clamp((t - P.grip) / (P.knees - P.grip))));
    if (t > P.knees) rig = mixRig(kneelPull(Jl), crouchPull(Jl), easeInOut(clamp((t - P.knees) / (P.back - P.knees))));
    if (t > P.back) {
      rig = rigAt(t, [
        [P.back, crouchPull(Jl)],
        [P.sit - 0.05, crouchPull(loc(joint(P.back), 3))],
        [P.sit + 0.5, onTop(fin[0], fin[2], {arms: 'down', lean: -2})],
        [T.day1 - 0.6, onTop(fin[0], fin[2], {arms: 'down', lean: -2})],
        [T.day1 - 0.2, clap],
        [T.end + 1.5, clap],
      ]);
    }
  }
  const top = ss(t, D_UP + 1.0, D_UP + 1.8);
  return {rig, energy: 1 + 0.2 * top, tint: mixHex(TINT.dis, TINT.gold, 0.35 * ss(t, T.flash, T.flash + 1)), h: t < D_UP ? h : TOPY, spent: 0, label: 1};
};

/** Day 1: on one knee at the start; then slow, steady, always below; speeds up at the end; Discipline pulls him up */
export const DAY_SLIP = B(42.5);
export const HY = (t: number) =>
  Math.min(TOPY - 0.88, run(t, T.dayUp + 0.45, [[30, 0.6], [1e9, 0.86]]) + surge(t, 0.6, 0.55, 1.852, 0, T.dayUp + 0.75, 35.6) - 0.25 * easeInOut(clamp((t - DAY_SLIP) / 0.22)));
const kneel = (): Rig => ({
  pel: [0, 0.44, -0.04],
  up: norm([0, 1, 0.04]),
  head: [0, -0.06, 0.03],
  hand: [
    [-0.14, 0.47, 0.17],
    [0.16, 0.42, 0.02],
  ],
  elbow: [
    [-1, -0.4, 0.4],
    [1, -0.4, 0.3],
  ],
  foot: [
    [-0.12, HB.ankle, 0.16],
    [0.1, 0.07, -0.25],
  ],
  knee: [
    [-0.1, 1, 0.4],
    [0.1, -1, 0.4],
  ],
});
export const day1 = (t: number): State => {
  const tj = T.dayUp + 0.45;
  const hang = (tt: number) => {
    const sl = ss(tt, DAY_SLIP, DAY_SLIP + 0.08) * (1 - ss(tt, DAY_SLIP + 0.5, DAY_SLIP + 0.9));
    const c = climb(HY(tt) / K3, {sway: sway(tt, 5, 0.3) + 0.6 * sl * Math.sin(tt * 14), step: 0.3, head: look(0, 0.05 - 0.1 * sl, 0)});
    if (sl <= 0) return c;
    // the slip: the legs lose the rope and kick, the hands burn down it
    const d = climb(HY(tt) / K3, {legs: 'dangle', hold: 0.5, head: look(0, -0.06)});
    d.foot = [add(d.foot[0], [-0.08, 0.12 * Math.sin(tt * 19), 0]), add(d.foot[1], [0.08, 0.12 * Math.sin(tt * 19 + 2), 0])];
    return mixRig(c, d, sl);
  };
  let rig: Rig;
  if (t < T.dayUp - 0.3) rig = kneel();
  else if (t < tj - 0.35) rig = mixRig(kneel(), standP({arms: 'down', z: -0.07}), easeInOut(clamp((t - T.dayUp + 0.3) / 0.38)));
  else rig = start(t, tj, hang);
  const m = loc(MEET_W, 4);
  const sTop = HY(1e9) / K3;
  const reachK = ss(t, T.reach + 0.25, T.reach + 0.7);
  if (reachK > 0) rig = mixRig(climb(HY(t) / K3, {step: 0.3}), climb(sTop, {step: 0.3, free: [m, null], head: [0, 0.04, 0]}), reachK);
  // the pull: the joined hand leads, the other hand goes to the edge, the feet walk up the wall
  const J = loc(joint(t), 4);
  const xo = -0.06;
  if (t > P.grip) {
    const k = easeInOut(clamp((t - P.grip) / (P.knees - P.grip)));
    const sh = lerp(sTop, TL - 0.02, k);
    const c = climb(sh, {step: 0.3, free: [J, null], legs: 'dangle'});
    const edge: V3 = [xo + 0.3, TL + 0.04, (WALL_Z - 0.06) / K3];
    const rope = climb(sTop, {step: 0.3}).hand[1];
    const e = ss(k, 0.15, 0.7);
    c.hand[1] = [lerp(rope[0], edge[0], e), lerp(rope[1], edge[1], e) + 0.35 * Math.sin(Math.PI * e), lerp(rope[2], edge[2], ss(e, 0.3, 1))];
    c.pel = [lerp(c.pel[0], xo, k), c.pel[1], lerp(c.pel[2], -0.04, k)];
    // feet stepping on the wall face
    const wz = (WALL_Z + 0.08) / K3;
    const stepA = Math.sin(k * Math.PI * 3);
    c.foot = [
      [xo - 0.1, c.pel[1] - LEG * 0.8 + 0.12 * Math.max(0, stepA), wz],
      [xo + 0.1, c.pel[1] - LEG * 0.8 + 0.12 * Math.max(0, -stepA), wz],
    ];
    c.knee = [
      [-0.3, 0.2, 1],
      [0.3, 0.2, 1],
    ];
    c.elbow = [
      [-1, 0.2, 0.3],
      [1, 0.9, 0.1],
    ];
    rig = mixRig(rig, c, ss(t, P.grip, P.grip + 0.25));
  }
  if (t > P.knees) {
    const k = easeInOut(clamp((t - P.knees) / (P.sit - P.knees)));
    rig = k < 0.55 ? mixRig(rig, dipUp(1, xo, J), easeInOut(k / 0.55)) : mixRig(dipUp(1, xo, J), sitEdge(xo, J), easeInOut((k - 0.55) / 0.45));
    if (k < 0.55) rig.foot = [[xo - 0.1, rig.foot[0][1], Math.max(rig.foot[0][2], (WALL_Z + 0.08) / K3)], [xo + 0.1, rig.foot[1][1], Math.max(rig.foot[1][2], (WALL_Z + 0.08) / K3)]];
  }
  const fin = loc([XS[4] - 0.1, 0, -0.95], 4);
  if (t > P.sit) {
    const st = onTop(fin[0], fin[2], {arms: 'down'});
    const up = onTop(fin[0], fin[2], {arms: 'up'});
    rig = rigAt(t, [
      [P.sit, sitEdge(xo, loc(joint(P.sit), 4))],
      [P.sit + 0.3, tuck(xo)],
      [P.sit + 0.65, onTop(lerp(xo, fin[0], 0.5), (WALL_Z - 0.6) / K3, {arms: 'down', crouch: 0.2, lean: 10})],
      [P.sit + 1.0, st],
      [T.day1 - 0.05, st],
      [T.day1 + 0.45, up],
      [T.end + 2, up],
    ]);
  }
  const win = ss(t, T.flash, T.flash + 0.8);
  return {rig, energy: lerp(0.75, 1.3, win) + 0.25 * ss(t, T.day1, T.day1 + 0.3), tint: mixHex(TINT.day, TINT.gold, 0.55 * ss(t, T.day1, T.day1 + 0.6)), h: HY(t), spent: 0, label: 1};
};

/** On drugs: leaps first and high; hangs upside down; lets go — "I can fly" — and falls */
/** a crazy burst right after the jump, then fast */
const HG = (t: number) => run(t, T.drugJump, [[T.drugJump + 1.0, 1.9], [T.flip, 0.82], [T.flipBack, 0.05], [T.fly, 0.45], [1e9, 0]]) + surge(t, 0.82, 0.6, 0.66, 2, T.drugJump + 1.2, T.flip) + surge(t, 0.45, 0.6, 0.74, 1, T.flipBack + 0.4, T.fly - 0.2);
const upside = (s: number, t: number): Rig => {
  // hanging by the hooked knees, head down, arms dangling and swinging
  const py = s + 0.25;
  const w = Math.sin(t * 2.6) * 0.12;
  const pel: V3 = [0, py, 0.02];
  const up = norm([0.08 * Math.sin(t * 1.7), -1, -0.06]);
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
      [-0.11, py + 0.55, RZ - 0.12],
      [0.11, py + 0.57, RZ - 0.12],
    ],
    knee: [
      [-1, 0, 0.15],
      [1, 0, 0.15],
    ],
  };
};
export const drugs = (t: number): State => {
  const h = HG(t);
  const s = h / K3;
  const hang = (tt: number) => climb(HG(tt) / K3, {sway: sway(tt, 6, 1.4) + 0.2 * Math.sin(tt * 6.3), step: 0.36, head: look(0.03 * Math.sin(tt * 4.1), 0.015 * Math.sin(tt * 2.7), 0)});
  let rig: Rig;
  rig = start(t, T.drugJump, hang);
  // flip upside down and back
  const fk = ss(t, T.flip - 0.05, T.flip + 0.35) * (1 - ss(t, T.flipBack - 0.1, T.flipBack + 0.3));
  if (fk > 0) {
    rig = mixRig(hang(t), upside(s, t), fk);
    rig = {...rig, up: add(rig.up, [1.3 * Math.sin(Math.PI * fk), 0, 0.15 * Math.sin(Math.PI * fk)])};
  }
  // "I can fly": lets go, arms wide, standing on the clamped rope, wobbling
  const flyK = ss(t, T.fly - 0.1, T.fly + 0.25);
  const sF = HG(T.fly) / K3;
  if (flyK > 0) {
    const wob = Math.sin((t - T.fly) * 4.4) * 0.06 * ss(t, T.fly, T.fly + 0.4);
    const fly: Rig = {
      ...climb(sF, {legs: 'wrap', sway: 0}),
      up: norm([wob, 1, -0.07]),
      hand: [
        [-0.62, sF + 0.05 + wob * 2, 0.12],
        [0.62, sF + 0.05 - wob * 2, 0.12],
      ],
      elbow: [
        [-0.3, 1, 0.2],
        [0.3, 1, 0.2],
      ],
      head: [0, 0.03, -0.03],
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
