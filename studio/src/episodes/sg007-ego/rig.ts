import {clamp, lerp} from '../nc001-work-smart/anim';
import type {V3} from '../nc001-work-smart/kit3d';
import {add, ANK, ARM, cross, HB, LEG, mix3, mul, norm, solve3, STANDY, sub, type Rig} from '../sg003-same-bar/rig3';
import {moveRig} from '../sg005-top/plan';

/**
 * SG007 — arm wrestling for the 3D stickman (rig3). Everything here is figure-local units (world / K3), root = origin.
 * A table frame: the table axis is x, Ego's side is −x (facing +x), the opponent's +x (facing −x).
 * Index 0 = the right arm / leg (rig3: sh[0] = shc − side·shZ), so both right hands meet on the centre line z = 0:
 * Ego's right side is +z, the opponent's right side is −z.
 */
export const SHC = HB.torso * 0.92;
/** table top (local), elbow centre on it, the half-gap between the two elbows and the two fists */
export const TY = 0.74;
export const R_EL = HB.ar[1];
export const R_HD = HB.ar[2];
export const EY = TY + R_EL;
export const EX = 0.125;
export const HX = 0.066;
/** the fist's height above the elbow line when the forearms stand straight up */
export const FH = Math.sqrt(HB.fore * HB.fore - (EX - HX) ** 2);
/** a pinned hand: the fist rests on the table top */
export const PIN = Math.acos(clamp((TY + R_HD + 0.005 - EY) / FH, -1, 1));
/** table top half sizes (x along the axis, z across) and the grip pegs */
export const TOP = {x: 0.36, z: 0.36, th: 0.05};
export const PEG: V3 = [0.25, TY + 0.075, 0.29];

export const rotY = (v: V3, a: number): V3 => [v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a)];
/** a rig turned by yaw a about the origin, then moved to p (all local) */
export const place = (r: Rig, p: V3, a = 0): Rig => moveRig(r, [0, 0, 0], [0, 1, 0], a, p);

/** the clasped fists for a clasp angle phi (+ = toward −z = Ego wins) */
export const clasp = (phi: number): V3 => [0, EY + FH * Math.cos(phi), -FH * Math.sin(phi)];

export type GripOpts = {
  /** −1 = Ego's side (−x), +1 = the opponent's (+x) */
  side: -1 | 1;
  /** clasp angle, radians: + = toward −z (Ego winning), ±PIN = a pinned hand */
  phi: number;
  /** forward lean of the torso, degrees */
  lean?: number;
  /** twist of the chest (right shoulder forward), degrees */
  twist?: number;
  /** 0..1 shaking with effort */
  strain?: number;
  /** time, for the shaking */
  t?: number;
  /** 0..1: the free hand on the peg (1) or hanging (0) */
  peg?: number;
  /** slouch (Laziness): the shoulders drop, the head hangs */
  slouch?: number;
  /** head nod down / look at the camera */
  nod?: number;
  /** foot spread, local */
  stance?: number;
};

/**
 * The grip, built from the elbow outward so the elbow sits exactly on the table: the shoulder is one upper arm
 * away from the elbow, the torso hangs from that shoulder, the feet stay planted, the knees take up the rest.
 */
export const grip = (o: GripOpts): Rig => {
  const sd = o.side;
  const phi = o.phi;
  const st = o.strain ?? 0;
  const tt = o.t ?? 0;
  const sl = o.slouch ?? 0;
  const jit: V3 = [Math.sin(tt * 4.1 + sd) * 0.006 * st, Math.sin(tt * 3.3 + 2 * sd) * 0.008 * st, Math.sin(tt * 4.7 + 3 * sd) * 0.006 * st];
  const E: V3 = [sd * EX, EY, 0];
  const C = clasp(phi);
  const H: V3 = [sd * HX, C[1], C[2]];
  // upper arm: back toward the body and up; both shoulders follow the clasp across, the loser's drops
  const losing = clamp(-sd * Math.sin(phi) * -1);
  const u = norm([sd * (0.62 + 0.08 * sl), 0.78 - 0.18 * losing - 0.1 * sl, -0.42 * Math.sin(phi)]);
  const S = add(add(E, mul(u, HB.arm)), jit);
  const L = ((o.lean ?? 30) + 6 * losing) * (Math.PI / 180);
  const up = norm([-sd * Math.sin(L), Math.cos(L), 0.08 * -Math.sin(phi)]);
  const tw = ((o.twist ?? 24) * Math.PI) / 180;
  const fwd: V3 = [-sd * Math.cos(tw), 0, sd * Math.sin(tw)];
  const side = norm(cross(up, fwd));
  const shc = add(S, mul(side, HB.shZ));
  const pel = sub(shc, mul(up, SHC));
  // the feet: the right one forward by the pedestal, the left one back and out
  const sp = o.stance ?? 1;
  const f0: V3 = [sd * 0.36, ANK, -sd * 0.04];
  const f1: V3 = [sd * (0.36 + 0.42 * sp), ANK, sd * 0.3 * sp];
  // the free (left) hand: on the peg at the table's corner, or hanging
  const pg: V3 = [sd * PEG[0], PEG[1], sd * PEG[2]];
  const hang: V3 = add(add(shc, mul(side, HB.shZ + 0.05)), [0, -ARM * 0.85, 0]);
  const hand1 = mix3(hang, pg, clamp(o.peg ?? 1));
  const nod = o.nod ?? 0;
  return {
    pel,
    up,
    fwd,
    head: add([-sd * 0.03 * (1 - sl), -0.05 * nod - 0.06 * sl, 0], mul(jit, 1.5)),
    hand: [H, hand1],
    elbow: [sub(E, S), add(add(mul(side, 0.8), [0, -0.4, 0]), mul(fwd, -0.3))],
    foot: [f0, f1],
    knee: [add(fwd, [0, 0, -sd * 0.15]), add(fwd, [0, 0, sd * 0.3])],
  };
};

/* ───────────── standing, walking ───────────── */

export type StandOpts = {
  /** walk phase (radians) and stride (0 = standing) */
  phase?: number;
  stride?: number;
  /** arms: down, up (fists in the air), hips, cross (arms folded), point (right arm out) */
  arms?: 'down' | 'up' | 'hips' | 'fold' | 'swagger';
  lean?: number;
  /** chest out, leaning back a little */
  proud?: number;
  crouch?: number;
  head?: V3;
};

/** standing / walking, facing +z (turn it with place) */
export const standR = (o: StandOpts = {}): Rig => {
  const ph = o.phase ?? 0;
  const st = o.stride ?? 0;
  const s = Math.sin(ph);
  const c = Math.cos(ph);
  const bob = st > 0 ? 0.025 * st * (1 - Math.abs(c)) : 0;
  const pel: V3 = [0.012 * st * s, STANDY - (o.crouch ?? 0) - 0.02 * st + bob, 0];
  const lean = ((o.lean ?? 3) - 6 * (o.proud ?? 0) + 4 * st) * (Math.PI / 180);
  const up = norm([0, 1, Math.tan(lean)]);
  const shy = pel[1] + SHC;
  // feet: alternate, each lifts while it swings forward
  const foot = (i: number): V3 => {
    const sg = i ? -1 : 1;
    const z = 0.2 * st * s * sg;
    const lift = st > 0 ? 0.085 * st * Math.max(0, c * sg) : 0;
    return [(i ? 1 : -1) * (0.1 + 0.02 * (o.proud ?? 0)), ANK + lift, z + 0.02];
  };
  const arms = o.arms ?? 'down';
  const hand = (i: number): V3 => {
    const sx = i ? 1 : -1;
    const swing = -0.22 * st * s * (i ? -1 : 1);
    if (arms === 'up') return [sx * 0.34, shy + ARM * 0.9, 0.06];
    if (arms === 'hips') return [sx * 0.27, pel[1] + 0.06, 0.04];
    if (arms === 'fold') return [-sx * 0.1, shy - 0.17, 0.2];
    if (arms === 'swagger') return [sx * 0.3, shy - ARM * 0.88, 0.05 + swing * 1.3];
    return [sx * 0.24, shy - ARM * 0.92, 0.05 + swing];
  };
  const elbow = (i: number): V3 => {
    const sx = i ? 1 : -1;
    if (arms === 'up') return [sx, -0.2, 0.3];
    if (arms === 'hips') return [sx, 0, -0.5];
    if (arms === 'fold') return [sx * 0.6, -1, 0.4];
    return [sx * 0.3, -0.3, -1];
  };
  return {
    pel,
    up,
    head: o.head,
    hand: [hand(0), hand(1)],
    elbow: [elbow(0), elbow(1)],
    foot: [foot(0), foot(1)],
    knee: [
      [-0.1, 0, 1],
      [0.1, 0, 1],
    ],
  };
};

/* ───────────── on the floor ───────────── */

/** lying flat along direction a (radians about y; 0 = head toward +z), face down (prone) or up */
export const lie = (o: {face: 'down' | 'up'; a?: number; arms?: 'push' | 'out' | 'pillow' | 'side'; knee?: number}): Rig => {
  const dir: V3 = [0, 0, 1];
  const pelY = HB.tr[0] * HB.tr[2] + 0.012;
  const up = norm([0, 0.09, 1]);
  const pel: V3 = [0, pelY, 0];
  const fwd: V3 = o.face === 'down' ? [0, -1, 0] : [0, 1, 0];
  const side = norm(cross(up, fwd));
  const shc = add(pel, mul(up, SHC));
  const arms = o.arms ?? 'side';
  const hand = (i: number): V3 => {
    const sx = i ? 1 : -1;
    const sh = add(shc, mul(side, sx * HB.shZ));
    if (arms === 'push') return [sh[0] + sx * 0.08, R_HD, sh[2] - 0.02];
    if (arms === 'out') return [sh[0] + sx * 0.5, R_HD, sh[2] + 0.12];
    if (arms === 'pillow') return i ? [sh[0] - 0.05, HB.headR * 1.6, shc[2] + 0.42] : [sh[0] + sx * 0.12, R_HD, pel[2] + 0.05];
    return [sh[0] + sx * 0.16, R_HD, pel[2] + 0.02];
  };
  const kn = o.knee ?? 0;
  const foot = (i: number): V3 => {
    const sx = i ? 1 : -1;
    return [sx * (0.12 + (i ? 0.06 * kn : 0)), ANK, -LEG * (0.98 - (i ? 0.35 * kn : 0))];
  };
  const r: Rig = {
    pel,
    up,
    fwd,
    head: o.face === 'up' ? [0.03, -0.02, 0] : [0, 0.0, 0],
    hand: [hand(0), hand(1)],
    elbow: [
      [-1, o.face === 'down' ? 0.6 : 0.2, -0.3],
      [1, o.face === 'down' ? 0.6 : 0.2, -0.3],
    ],
    foot: [foot(0), foot(1)],
    knee: [
      [-0.2, o.face === 'down' ? -0.4 : 1, 0],
      [0.2, o.face === 'down' ? -0.4 : 1, 0],
    ],
  };
  void dir;
  return place(r, [0, 0, 0], o.a ?? 0);
};

/** on the knees, hunched, the left hand clutching the right shoulder (Obsession after the snap); faces +z */
export const kneel = (o: {hunch?: number; rock?: number} = {}): Rig => {
  const kneeY = HB.lr[1];
  const pel: V3 = [0, kneeY + HB.thigh * 0.97, -0.05];
  const h = ((o.hunch ?? 28) + (o.rock ?? 0)) * (Math.PI / 180);
  const up = norm([0, Math.cos(h), Math.sin(h)]);
  const shc = add(pel, mul(up, SHC));
  return {
    pel,
    up,
    head: [0, -0.04, 0.03],
    hand: [add(shc, [-0.3, -0.25, 0.2]), add(shc, [-HB.shZ + 0.02, 0.02, 0.1])],
    elbow: [
      [-1, -0.5, 0],
      [0.6, -0.6, 0.6],
    ],
    foot: [
      [-0.11, ANK, pel[2] - HB.shin * 0.98],
      [0.11, ANK, pel[2] - HB.shin * 0.98],
    ],
    knee: [
      [-0.05, -0.2, 1],
      [0.05, -0.2, 1],
    ],
  };
};

/** sitting on the floor with the back against a wall, legs out, arms limp (Ego after the flight); faces +z */
export const slump = (o: {tilt?: number; roll?: number} = {}): Rig => {
  const pel: V3 = [0, HB.lr[0] * 1.1, 0.02];
  const up = norm([0.08 * (o.roll ?? 0), 1, -0.2]);
  return {
    pel,
    up,
    head: [0.05 * (o.tilt ?? 1), -0.035 * (o.tilt ?? 1), 0.02],
    hand: [
      [-0.3, R_HD, pel[2] + 0.12],
      [0.32, R_HD, pel[2] + 0.2],
    ],
    elbow: [
      [-1, 0, -0.4],
      [1, 0, -0.4],
    ],
    foot: [
      [-0.16, ANK, pel[2] + LEG * 0.86],
      [0.2, ANK, pel[2] + LEG * 0.7],
    ],
    knee: [
      [-0.2, 1, 0.2],
      [0.3, 1, 0.2],
    ],
  };
};

/** flung backward through the air: the body tips back, arms and legs trail toward where he came from; faces +z */
export const flung = (o: {tip: number; t: number}): Rig => {
  const r = standR({arms: 'down'});
  const w = (k: number) => Math.sin(o.t * 21 + k) * 0.08;
  const sh = r.pel[1] + SHC;
  const base: Rig = {
    ...r,
    hand: [
      [-0.42, sh + 0.1 + w(0), 0.32],
      [0.44, sh + 0.16 + w(1), 0.26],
    ],
    elbow: [
      [-1, 0.2, 0],
      [1, 0.2, 0],
    ],
    foot: [
      [-0.16, ANK + 0.25 + w(2), 0.32],
      [0.14, ANK + 0.12 + w(3), 0.2],
    ],
    knee: [
      [0, 0.3, 1],
      [0, 0.3, 1],
    ],
  };
  // tip back about the pelvis (around the x axis: head toward −z)
  return moveRig(base, r.pel, [1, 0, 0], -o.tip);
};

/** spread-eagled with the back flat on a wall (the instant of the hit); faces +z, wall behind at z ≈ −0.17 */
export const splat = (): Rig => {
  const r = standR({});
  const sh = r.pel[1] + SHC;
  return {
    ...r,
    pel: [0, r.pel[1] + 0.06, 0],
    up: [0, 1, -0.02],
    hand: [
      [-0.55, sh + 0.22, -0.04],
      [0.55, sh + 0.24, -0.04],
    ],
    elbow: [
      [-0.3, 1, -0.2],
      [0.3, 1, -0.2],
    ],
    foot: [
      [-0.26, ANK + 0.08, 0.05],
      [0.26, ANK + 0.04, 0.05],
    ],
    knee: [
      [-0.3, 0, 1],
      [0.3, 0, 1],
    ],
  };
};

export const solveR = (r: Rig) => solve3(r, HB);
export {lerp};
