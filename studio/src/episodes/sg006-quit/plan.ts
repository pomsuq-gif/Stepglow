import {clamp, easeInOut, lerp, ss} from '../nc001-work-smart/anim';
import type {V3} from '../nc001-work-smart/kit3d';
import {mixHex} from '../nc001-work-smart/world';
import {add, ANK, cross, HB, K3, LEG, mixRig, mul, norm, rigAt, solve3, STANDY, sub, type Rig} from '../sg003-same-bar/rig3';
import {BEAT, beat} from './grid';

/**
 * SG006 — Who quits first? Four mindsets carry a stone up an endless stair on a mountain ridge:
 * Motivation · Ego · Obsession · Discipline (left → right, lanes across x). The stair climbs toward +z;
 * the climbers face +z. Every character is a function of time → {rig, stone, light, label}.
 * World units; a rig is figure-local (root = the lane at the foot of the stair, units / K3).
 */
export const NAMES = ['Motivation', 'Ego', 'Obsession', 'Discipline'] as const;
export const TINT = {mot: '#ffb347', ego: '#ff4a3a', obs: '#b77cff', dis: '#3cc8ff', dead: '#56607a', gold: '#ffd66b', hot: '#ff5a2a'};
export const TINTS = [TINT.mot, TINT.ego, TINT.obs, TINT.dis];
export const XS = [-1.2, -0.4, 0.4, 1.2];

const B = beat;

/* ───────────── the stair ───────────── */

/** tread depth and rise (world); N = the summit tread; PL treads of flat summit; then only Obsession's narrow stair goes on */
export const D = 0.36;
export const R = 0.2;
export const N = 32;
export const PL = 4;
export const STAIR_W = 1.75;
/** the endless stair: centred on Obsession's lane */
export const NARROW = {x: XS[2], w: 0.44};
export const TOP_Y = N * R;

/** height of tread j for a lane (main stair, the summit, then the narrow stair for Obsession only) */
export const treadY = (j: number, narrow = false) => {
  if (j <= 0) return 0;
  if (j <= N) return j * R;
  if (!narrow || j <= N + PL) return TOP_Y;
  return TOP_Y + (j - N - PL) * R;
};
/** centre z of tread j (tread j spans [(j-1)·D, j·D]) */
export const treadZ = (j: number) => (j - 0.5) * D;
/** ground height under a world z (the step function) */
export const groundAt = (z: number, narrow = false) => treadY(Math.floor(z / D) + 1, narrow);
/** a smooth ramp through the tread centres: c is a fractional tread index */
const treadYf = (c: number, narrow: boolean) => {
  const a = Math.floor(c);
  return lerp(treadY(a, narrow), treadY(a + 1, narrow), c - a);
};

/* ───────────── carrying a stone up the stair ───────────── */

const SHC = HB.torso * 0.92;
/** the stone (world radius) */
export const SR = 0.35;
const SRL = SR / K3;

export type WalkOpts = {
  /** forward lean of the torso, degrees */
  lean?: number;
  /** pelvis drop below a straight stance (local) */
  crouch?: number;
  /** extra side sway 0..1 */
  sway?: number;
  narrow?: boolean;
  /** torso turn about y, radians (+ = toward +x) */
  turn?: number;
  head?: V3;
  /** foot lift multiplier */
  lift?: number;
};

/**
 * n = steps taken (float). At integer n the lead foot stands on tread n, the trail foot on n − 1;
 * over the step the trail foot swings from n − 1 to n + 1 (feet alternate treads) and lands at f = 0.75.
 */
export const walk = (n: number, o: WalkOpts = {}): Rig => {
  const nar = o.narrow ?? false;
  const j = Math.floor(n);
  const f = n - j;
  const k = 0.5 - 0.5 * Math.cos(Math.PI * clamp(f / 0.82));
  const footAt = (tr: number, side: number): V3 => [side * 0.1, treadY(tr, nar) / K3 + ANK, treadZ(tr) / K3];
  const sideOf = (tr: number) => (((tr % 2) + 2) % 2 ? 1 : -1);
  const stance = footAt(j, sideOf(j));
  const a = footAt(j - 1, sideOf(j + 1));
  const b = footAt(j + 1, sideOf(j + 1));
  const rise = Math.max(0, b[1] - a[1]);
  const swing: V3 = [a[0] + 0.03 * Math.sin(Math.PI * k) * sideOf(j + 1), lerp(a[1], b[1], k) + Math.sin(Math.PI * k) * (0.1 + 0.55 * rise) * (o.lift ?? 1), lerp(a[2], b[2], k)];
  const feet: [V3, V3] = sideOf(j) < 0 ? [stance, swing] : [swing, stance];
  const lean = ((o.lean ?? 20) * Math.PI) / 180;
  const sw = (o.sway ?? 0.5) * Math.sin(Math.PI * n) * 0.06;
  const up = norm([sw * 0.6, Math.cos(lean), Math.sin(lean)]);
  // the body rides a ramp through the tread centres, half a tread behind the lead foot
  const c = n - 0.5;
  const bob = -0.025 * Math.cos(2 * Math.PI * f);
  const pel: V3 = [sw * 0.4, treadYf(c, nar) / K3 + STANDY - (o.crouch ?? 0.14) + bob, (c - 0.5) * (D / K3) - 0.02];
  const tr = o.turn ?? 0;
  return {
    pel,
    up,
    fwd: [Math.sin(tr), 0, Math.cos(tr)],
    head: o.head ?? [0, -0.01, 0.03],
    hand: [add(pel, [-0.2, 0.2, 0.05]), add(pel, [0.2, 0.2, 0.05])],
    foot: feet,
    knee: [
      [-0.12, 0.25, 1],
      [0.12, 0.25, 1],
    ],
  };
};

/** the stone on the upper back, both hands over the shoulders on its top (figure-local) */
export const backStone = (r: Rig): V3 => {
  const up = norm(r.up);
  const side = norm(cross(up, r.fwd ?? [0, 0, 1]));
  const fwd = cross(side, up);
  const shc = add(r.pel, mul(up, SHC));
  return add(add(shc, mul(fwd, -(HB.tr[1] + SRL * 0.82))), mul(up, SRL * 0.42));
};
export const carry = (r: Rig): Rig => {
  const up = norm(r.up);
  const side = norm(cross(up, r.fwd ?? [0, 0, 1]));
  const fwd = cross(side, up);
  const shc = add(r.pel, mul(up, SHC));
  const h = (s: number): V3 => add(add(add(shc, mul(up, 0.2)), mul(fwd, -0.07)), mul(side, s * 0.17));
  return {
    ...r,
    hand: [h(-1), h(1)],
    elbow: [add(add(mul(side, -0.7), mul(fwd, 1)), mul(up, -0.1)), add(add(mul(side, 0.7), mul(fwd, 1)), mul(up, -0.1))],
  };
};
/** hands on the two sides of a stone centred at c (figure-local) */
const holdAt = (r: Rig, c: V3, pole: [V3, V3] = [[-1, -0.3, 0.6], [1, -0.3, 0.6]]): Rig => {
  const side = norm(cross(norm(r.up), r.fwd ?? [0, 0, 1]));
  return {...r, hand: [add(c, mul(side, -SRL * 0.98)), add(c, mul(side, SRL * 0.98))], elbow: pole};
};

/* ───────────── the beats ───────────── */

export const T = {
  slam: B(-5.5),
  go: B(-2.75),
  motTire: B(2),
  motKneel: B(6),
  motDrop: B(8),
  crowdOff: B(12),
  egoLook: B(13),
  egoDrop: B(15.25),
  egoSit: B(16.5),
  storm: B(20),
  obsTop: B(26),
  disTop: B(29),
  lift: B(29.25),
  high: B(30.6),
  place: B(31.8),
  ignite: B(32),
  cap1: B(32),
  cap2: B(36),
  cap3: B(40),
  end: 33.5,
};

/** steps taken: start at t0, then piecewise rates (steps per second) */
const steps = (t: number, t0: number, segs: [number, number][]) => {
  let n = 0;
  let a = t0;
  if (t <= a) return 0;
  for (const [b, v] of segs) {
    const e = Math.min(t, b);
    if (e > a) n += v * (e - a);
    a = b;
    if (t <= b) break;
  }
  return n;
};
const PB = 1 / BEAT;

/* ───────────── the four ───────────── */

export type Stone = {p: V3; rot: number; on: boolean; glow?: number};
export type State = {
  rig: Rig;
  energy: number;
  tint: string;
  /** body position along the stair (world z) and height, for the camera */
  z: number;
  y: number;
  stone: Stone;
  status?: {text: string; color: string; at: number};
  spent: number;
  /** red-hot cracks 0..1 (Obsession) */
  cracks?: number;
  label: number;
};

const lw = (r: Rig, i: number) => (p: V3): V3 => [XS[i] + p[0] * K3, p[1] * K3, p[2] * K3];

/** before the walk: upright, looking up the stair; on the slam the weight lands and they bend under it */
const intro = (t: number, o: WalkOpts) => {
  const up = walk(0, {...o, lean: 4, crouch: 0.04, head: [0, 0.04, 0.0]});
  const bent = walk(0, o);
  const k = ss(t, T.slam - 0.06, T.slam + 0.16) - 0.25 * Math.exp(-Math.max(0, t - T.slam - 0.16) * 6) * (t > T.slam + 0.16 ? 1 : 0);
  return mixRig(up, bent, clamp(k));
};

/** a stone falls off a back at t0 with a velocity, bounces down the stair and rolls to a stop on the flat (simulated) */
const simStone = (t: number, t0: number, p0: V3, v0: V3, narrow = false) => {
  let [x, y, z] = p0;
  let [vx, vy, vz] = v0;
  let rot = 0;
  const dt = 1 / 240;
  let firstHit = -1;
  for (let s = t0; s < t; s += dt) {
    vy -= 9.8 * dt;
    x += vx * dt;
    y += vy * dt;
    z += vz * dt;
    const g = groundAt(z, narrow);
    if (y - SR < g) {
      y = g + SR;
      if (firstHit < 0) firstHit = s;
      vy = Math.abs(vy) * 0.42;
      if (vy < 0.4) vy = 0;
      // downhill pull on a stair, friction on the flat
      vz = z > 0 ? Math.min(vz, -1.4) * 0.97 : vz * 0.94;
      vx *= 0.8;
    }
    rot += (vz * dt) / SR;
  }
  return {p: [x, y, z] as V3, rot, firstHit};
};

/** Motivation: bursts off first, fastest, burns out by mile 10; the knees go, the stone slides off and rolls down */
const NM = (t: number) => Math.min(11.75, steps(t, T.go, [[B(1), 1.9 * PB], [B(4), 1.2 * PB], [1e9, 0.6 * PB]]));
export const motivation = (t: number): State => {
  const i = 0;
  const tired = ss(t, T.motTire, T.motKneel);
  const o = (tt: number): WalkOpts => ({lean: lerp(14, 32, ss(tt, T.motTire, T.motKneel)), crouch: lerp(0.12, 0.2, ss(tt, T.motTire, T.motKneel)), sway: lerp(0.4, 1.4, ss(tt, T.motTire, T.motKneel))});
  const n = NM(t);
  let rig = t < T.go ? intro(t, o(t)) : walk(n, o(t));
  rig = carry(rig);
  // the knees buckle: down on one knee on the stair
  const kneelR = (): Rig => {
    const w = walk(11.75, o(T.motKneel));
    const y11 = treadY(11) / K3;
    const z11 = treadZ(11) / K3;
    const knee: V3 = [0.1, y11 + HB.lr[1], z11 - 0.02];
    return {
      ...w,
      pel: [0, y11 + HB.lr[1] + HB.thigh * 0.96, z11 - 0.05],
      up: norm([0.06, 1, 0.55]),
      head: [0, -0.07, 0.05],
      foot: [
        [-0.1, treadY(12) / K3 + ANK, treadZ(12) / K3 - 0.04],
        [0.1, y11 + HB.lr[2] + 0.004, knee[2] - HB.shin * 0.99],
      ],
      knee: [
        [-0.1, 0.6, 1],
        [0.1, -1, 0.15],
      ],
    };
  };
  const kk = ss(t, T.motKneel, T.motKneel + 0.35);
  if (kk > 0) rig = mixRig(rig, carry(kneelR()), kk);
  // the stone slides off: hands come off, then he sits on the step, head down, arms on the knees
  const SEATH = HB.tr[0] + 0.012;
  const sitR = (): Rig => {
    const z = treadZ(11) / K3;
    const y = treadY(11) / K3;
    const f = norm([-1, 0, -0.55]);
    const pel: V3 = [0.05, y + SEATH, z - 0.02];
    return {
      pel,
      up: norm([-0.45, 1, -0.25]),
      fwd: f,
      head: [-0.06, -0.08, -0.03],
      hand: [add(pel, [-0.34, 0.27, -0.12]), add(pel, [-0.3, 0.25, -0.24])],
      elbow: [
        [0, -1, 0.3],
        [0, -1, -0.3],
      ],
      foot: [
        [-0.4, treadY(10) / K3 + ANK, treadZ(10) / K3 - 0.02],
        [-0.3, treadY(10) / K3 + ANK, treadZ(10) / K3 - 0.13],
      ],
      knee: [
        [-0.3, 1, 0.2],
        [-0.3, 1, -0.2],
      ],
    };
  };
  const midSit = (): Rig => {
    const k = kneelR();
    return {...k, fwd: norm([-1, 0, 0.6]), up: norm([-0.2, 1, 0.3]), knee: [[-1, 0.2, 0.3], [-1, 0, 0]]};
  };
  const dropK = ss(t, T.motDrop - 0.1, T.motDrop + 0.25);
  if (t > T.motDrop - 0.1) {
    const kn = kneelR();
    const loose = {...kn, hand: [add(kn.pel, [-0.24, 0.3, 0.16]), add(kn.pel, [0.24, 0.3, 0.16])] as [V3, V3], elbow: [[0, -1, 0.3], [0, -1, 0.3]] as [V3, V3]};
    rig = mixRig(carry(kn), loose, dropK);
    if (t > T.motDrop + 0.5) rig = rigAt(t, [[T.motDrop + 0.5, loose], [T.motDrop + 0.95, {...midSit(), hand: loose.hand, elbow: loose.elbow}], [T.motDrop + 1.6, sitR()]]);
  }
  // the stone
  const W = lw(rig, i);
  let stone: Stone;
  if (t < T.motDrop) {
    const r = t < T.motKneel ? carry(t < T.go ? intro(t, o(t)) : walk(n, o(t))) : mixRig(carry(walk(11.75, o(T.motKneel))), carry(kneelR()), kk);
    stone = {p: W(backStone(r)), rot: 0, on: true};
  } else {
    const p0 = W(backStone(carry(kneelR())));
    const s = simStone(t, T.motDrop, p0, [0.05, 0.4, -0.9]);
    stone = {p: s.p, rot: s.rot, on: false};
  }
  const quitK = ss(t, T.motKneel, T.motDrop + 0.4);
  const energy = lerp(1.35, 0.9, ss(t, T.go, T.motTire)) * (1 - 0.35 * tired) * (1 - 0.85 * quitK) + 0.02;
  return {
    rig,
    energy,
    tint: mixHex(TINT.mot, TINT.dead, quitK * 0.85),
    z: XSZ(rig),
    y: rig.pel[1] * K3,
    stone,
    status: {text: 'quit', color: '#ff5a5a', at: T.motDrop},
    spent: 0.65 * quitK,
    label: 1,
  };
};
const XSZ = (r: Rig) => r.pel[2] * K3;

/** Ego: upright and showy under the spotlight; the crowd leaves, he turns to look, drops the stone and sits */
const NE = (t: number) => Math.min(14.75, steps(t, T.go + 0.18, [[1e9, PB]]));
export const ego = (t: number): State => {
  const i = 1;
  const show = 1 - ss(t, T.crowdOff, T.crowdOff + 1);
  const o: WalkOpts = {lean: lerp(9, 16, 1 - show), crouch: 0.12, sway: 0.7, head: [0, 0.03 * show, 0.0]};
  const n = NE(t);
  let base = t < T.go ? intro(t, o) : walk(n, o);
  // the look back: the torso turns to the crowd below
  const look = ss(t, T.egoLook, T.egoLook + 0.6) * (1 - ss(t, T.egoDrop - 0.45, T.egoDrop - 0.05));
  if (look > 0) base = {...base, fwd: [Math.sin(-2.0 * look), 0, Math.cos(-2.0 * look)], up: norm([0, 1, lerp(Math.tan((16 * Math.PI) / 180), -0.05, look)])};
  let rig = carry(base);
  // the drop: he straightens, opens his hands, the stone slides off behind him; he sits, arms crossed, turned away
  const drop = ss(t, T.egoDrop - 0.12, T.egoDrop + 0.12);
  const stood: Rig = {...walk(14.75, {lean: 2, crouch: 0.06}), elbow: [[-1, -0.2, 0], [1, -0.2, 0]]};
  const open: Rig = {...stood, hand: [add(stood.pel, [-0.32, 0.62, 0.05]), add(stood.pel, [0.32, 0.62, 0.05])], elbow: [[-0.3, 0, -1], [0.3, 0, -1]]};
  if (t > T.egoDrop - 0.12) rig = mixRig(rig, open, drop);
  const sulk = (): Rig => {
    const z = treadZ(14) / K3;
    const y = treadY(14) / K3;
    const pel: V3 = [0, y + HB.tr[0] + 0.012, z - 0.02];
    const up = norm([0.25, 1, -0.2]);
    return {
      pel,
      up,
      fwd: norm([1, 0, -0.5]),
      head: [0.05, 0.03, 0],
      // arms crossed on the chest
      hand: [add(pel, [0.2, 0.43, 0.05]), add(pel, [0.18, 0.4, -0.12])],
      elbow: [
        [-0.2, -1, 0.6],
        [0.2, -1, -0.6],
      ],
      foot: [
        [0.32, treadY(13) / K3 + ANK, treadZ(13) / K3 + 0.0],
        [0.4, treadY(13) / K3 + ANK, treadZ(13) / K3 - 0.16],
      ],
      knee: [
        [0.3, 1, 0.3],
        [0.3, 1, -0.3],
      ],
    };
  };
  const half = (): Rig => {
    const k = sulk();
    return {...stood, pel: add(stood.pel, [0.04, -0.09, -0.1]), fwd: norm([1, 0, 0.6]), up: norm([0.1, 1, 0.1]), hand: k.hand, elbow: [[-1, -0.6, 0.3], [1, -0.6, -0.3]], knee: [[0.6, 0.3, 0.6], [1, 0.3, 0.2]]};
  };
  const down: Rig = {...stood, hand: [add(stood.pel, [-0.26, -0.02, 0.1]), add(stood.pel, [0.26, -0.02, 0.1])], elbow: [[-0.3, 0, -1], [0.3, 0, -1]]};
  if (t > T.egoDrop + 0.3) rig = rigAt(t, [[T.egoDrop + 0.3, open], [T.egoDrop + 0.7, down], [T.egoSit + 0.15, {...half(), hand: [add(half().pel, [-0.05, 0.25, 0.25]), add(half().pel, [0.25, 0.2, 0.15])]}], [T.egoSit + 0.75, sulk()]]);
  const W = lw(rig, i);
  let stone: Stone;
  if (t < T.egoDrop) stone = {p: W(backStone(carry(base))), rot: 0, on: true};
  else {
    const s = simStone(t, T.egoDrop, W(backStone(carry(stood))), [-0.05, 0.2, -0.7]);
    stone = {p: s.p, rot: s.rot, on: false};
  }
  const quitK = ss(t, T.egoDrop, T.egoSit + 0.5);
  return {rig, energy: 1.15 - 0.3 * (1 - show) - 0.75 * quitK, tint: mixHex(TINT.ego, TINT.dead, quitK * 0.7), z: XSZ(rig), y: rig.pel[1] * K3, stone, status: {text: 'quit', color: '#ff5a5a', at: T.egoDrop + 0.1}, spent: 0.5 * quitK, label: 1};
};

/**
 * Obsession: frantic — sprints, doubles over gasping, sprints again; cracks open red-hot from mile 30.
 * Normalised so that it reaches the summit tread on beat 28, then never stops: the narrow stair goes on.
 */
const OBS_SEGS: [number, number][] = [
  [B(2), 2.1],
  [B(4), 0.5],
  [B(9), 1.45],
  [B(11), 0.45],
  [B(17), 1.4],
  [B(19), 0.45],
  [B(26), 1.45],
];
const OBS_K = N / steps(B(26), T.go, OBS_SEGS.map(([b, v]) => [b, v * PB]));
export const NO = (t: number) => (t <= B(26) ? OBS_K * steps(t, T.go, OBS_SEGS.map(([b, v]) => [b, v * PB])) : N + (t - B(26)) * 1.4 * PB);
/** how hard he is going now (1 = sprinting, 0 = doubled over) */
const obsRate = (t: number) => {
  let v = OBS_SEGS[OBS_SEGS.length - 1][1];
  for (const [b, r] of OBS_SEGS)
    if (t < b) {
      v = r;
      break;
    }
  return clamp((v - 0.45) / 1.0);
};
export const obsession = (t: number): State => {
  const i = 2;
  // the lean follows the effort smoothly (sample a little back in time)
  const eff = (obsRate(t) + obsRate(t - 0.15) + obsRate(t - 0.3)) / 3;
  const o: WalkOpts = {lean: lerp(38, 22, eff), crouch: lerp(0.2, 0.13, eff), sway: lerp(1.2, 0.5, eff), narrow: true, head: [0, lerp(-0.07, 0.0, eff), 0.05], lift: lerp(1.15, 1.3, eff)};
  const n = NO(t);
  const rig = carry(t < T.go ? intro(t, o) : walk(n, o));
  const cracks = ss(t, B(12), B(26));
  return {rig, energy: 1.2 + 0.15 * Math.sin(t * 9) * eff, tint: mixHex(TINT.obs, TINT.hot, 0.35 * cracks), z: XSZ(rig), y: rig.pel[1] * K3, stone: {p: lw(rig, i)(backStone(rig)), rot: 0, on: true}, spent: 0, cracks, label: 1};
};

/** Discipline: one step on every beat, never faster, never slower; on the summit he lifts the stone and sets it down */
export const ND = (t: number) => Math.min(N + 1 - 0.25, steps(t, T.go - BEAT, [[1e9, PB]]));
export const discipline = (t: number): State => {
  const i = 3;
  const o: WalkOpts = {lean: 18, crouch: 0.13, sway: 0.35};
  const n = ND(t);
  let rig = carry(t < T.go - BEAT ? intro(t, o) : walk(n, o));
  const W = lw(rig, i);
  let stoneL = backStone(rig);
  if (t > T.lift) {
    // stand up, the stone over the head, then down onto the summit in front of him
    const st = walk(N + 0.75, {lean: 2, crouch: 0.04});
    const sq = walk(N + 0.75, {lean: 30, crouch: 0.34});
    const top = add(st.pel, [0, SHC + 0.66 + SRL, 0.04]);
    const ground: V3 = [0, TOP_Y / K3 + SRL, sq.pel[2] + 0.52];
    const keys: [number, V3, Rig][] = [
      [T.lift, backStone(carry(walk(N + 0.75, o))), carry(walk(N + 0.75, o))],
      [T.high, top, st],
      [T.high + 0.2, add(top, [0, 0.03, 0.02]), st],
      [T.place, ground, sq],
      [T.place + 0.7, ground, walk(N + 0.75, {lean: 4, crouch: 0.06})],
    ];
    let a = keys[keys.length - 1];
    let b = a;
    let k = 1;
    for (let m = 0; m < keys.length - 1; m++)
      if (t < keys[m + 1][0]) {
        a = keys[m];
        b = keys[m + 1];
        k = 0.5 - 0.5 * Math.cos(Math.PI * clamp((t - a[0]) / (b[0] - a[0])));
        break;
      }
    // the stone goes up the back and over the head on an arc
    const arc = a === keys[0] ? Math.sin(Math.PI * k) * 0.2 : 0;
    stoneL = add([lerp(a[1][0], b[1][0], k), lerp(a[1][1], b[1][1], k), lerp(a[1][2], b[1][2], k)], [0, arc, 0]);
    const body = mixRig(a[2], b[2], k);
    if (t < T.place + 0.05) {
      const pz = ss(t, T.high + 0.1, T.high + 0.6);
      const hold = holdAt(body, stoneL, [[-1, lerp(0, -0.3, pz), lerp(0.9, 0.5, pz)], [1, lerp(0, -0.3, pz), lerp(0.9, 0.5, pz)]]);
      rig = a === keys[0] ? mixRig(carry(body), hold, ss(k, 0, 0.35)) : hold;
    } else {
      const free = holdAt(body, stoneL);
      const rest = walk(N + 0.75, {lean: 4, crouch: 0.06});
      const restH: Rig = {...rest, hand: [add(rest.pel, [-0.2, -0.02, 0.1]), add(stoneL, [0.0, SRL * 0.95, -0.05])], elbow: [[-1, -0.3, 0.3], [1, -0.2, 0.3]]};
      rig = mixRig(free, restH, ss(t, T.place + 0.05, T.place + 0.7));
    }
  }
  return {
    rig,
    energy: 1 + 0.25 * ss(t, T.ignite, T.ignite + 0.6),
    tint: mixHex(TINT.dis, TINT.gold, 0.35 * ss(t, T.ignite, T.ignite + 1)),
    z: XSZ(rig),
    y: rig.pel[1] * K3,
    stone: {p: W(stoneL), rot: 0, on: true, glow: ss(t, T.ignite - 0.05, T.ignite + 0.1)},
    spent: 0,
    label: 1,
  };
};

export const CAST = [motivation, ego, obsession, discipline];
export const solveC = (r: Rig) => solve3(r, HB);
export {LEG, sub};
