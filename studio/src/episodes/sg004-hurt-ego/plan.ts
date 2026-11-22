import {clamp, easeInOut, lerp, ss} from '../nc001-work-smart/anim';
import type {V3} from '../nc001-work-smart/kit3d';
import {mixHex} from '../nc001-work-smart/world';
import {ANK, HB, LEG, norm, type Rig} from '../sg003-same-bar/rig3';
import {BEAT, beat, gap} from './grid';

/**
 * SG004 — five in a plank, one lane each, far to near as in the reference:
 * Motivated · Talented · Disciplined · Ego · Obsessed. Every quit sits on the beat the reference uses.
 * Figure-local: feet at +x, head toward −x, the lane's depth is z.
 */
export const NAMES = ['Motivated', 'Talented', 'Disciplined', 'Ego', 'Obsessed'] as const;
export const LANE = 0.95;
export const ZS = [-4, -3, -2, -1, 0].map((i) => i * LANE);
export const TINT = {mot: '#ffc94a', tal: '#a98bff', dis: '#38e8ff', ego: '#ff4fd8', hurt: '#ff2a1a', obs: '#ff8a2e', dead: '#56607a'};

const B = beat;
/** the beats of the reference */
export const OUT = [B(-16), B(-10), B(-4)];
export const HURT = B(-2.5);
export const UP = B(0);
export const OBS_UP = B(0.5);
export const END_TXT = B(11);

/* ───────────── the plank as a rig ───────────── */

const SHC = HB.torso * 0.92;
const L = LEG * 0.985 + SHC;
export const FX = 0.55;
const R_EL = HB.ar[1];
const R_HD = HB.ar[2];
/** shoulder heights: on the forearms, on straight arms, lying flat */
const SH_LOW = HB.arm + R_EL;
const SH_HIGH = Math.sqrt((HB.arm + HB.fore) ** 2 * 0.993 ** 2 - 0.0004) + R_HD - 0.01;
const SH_LIE = HB.headR + 0.005;

export type PlankOpts = {
  /** 0 = on the forearms, 1 = on straight arms */
  high?: number;
  /** hips sinking 0..1 */
  sag?: number;
  /** 0..1 lying flat on the floor */
  lie?: number;
  /** extra shoulder height (bobs, jitter), local units */
  dy?: number;
  /** head turn toward the camera (−1..1) and nod (+ = down) */
  look?: number;
  nod?: number;
};

export const plank = (o: PlankOpts = {}): Rig => {
  const h = clamp(o.high ?? 0);
  const lie = clamp(o.lie ?? 0);
  const shY = lerp(lerp(SH_LOW, SH_HIGH, h), SH_LIE, lie) + (o.dy ?? 0) * (1 - lie);
  const s = clamp((shY - ANK) / L, 0, 0.95);
  const c = Math.sqrt(1 - s * s);
  const dir: V3 = [-c, s, 0];
  const ank: V3 = [FX, ANK, 0];
  const shc: V3 = [ank[0] + dir[0] * L, ank[1] + dir[1] * L, 0];
  const sag = clamp(o.sag ?? 0) * (1 - lie);
  const pel: V3 = [shc[0] - dir[0] * SHC, Math.max(HB.tr[0] + 0.005, shc[1] - dir[1] * SHC - 0.13 * sag), 0];
  const up = norm([shc[0] - pel[0], shc[1] - pel[1], 0]);
  const x = shc[0];
  const hand = (sd: number): V3 => {
    const fore: V3 = [x - 0.289, R_HD, sd * 0.09];
    const high: V3 = [x - 0.02, R_HD, sd * 0.19];
    const flat: V3 = [x - 0.42, R_HD, sd * 0.27];
    const a: V3 = [lerp(fore[0], high[0], h), R_HD, lerp(fore[2], high[2], h)];
    return [lerp(a[0], flat[0], lie), R_HD, lerp(a[2], flat[2], lie)];
  };
  const elbow = (sd: number): V3 => {
    const fore: V3 = [0.35, -1, sd * 0.15];
    const high: V3 = [0.7, 0.1, sd * 1];
    const flat: V3 = [0.1, 0.4, sd * 1];
    const a = [0, 1, 2].map((k) => lerp(fore[k], high[k], h)) as V3;
    return [0, 1, 2].map((k) => lerp(a[k], flat[k], lie)) as V3;
  };
  const look = o.look ?? 0;
  const nod = (o.nod ?? 0) + 0.04 * lie;
  return {
    pel,
    up,
    fwd: [0, -1, 0],
    head: [0.02 * lie, -0.03 * nod - 0.01, 0.07 * look + 0.04 * lie],
    hand: [hand(-1), hand(1)],
    elbow: [elbow(-1), elbow(1)],
    foot: [
      [FX, ANK, -0.075],
      [FX + 0.01, ANK, 0.075],
    ],
    knee: [
      [0, -1, -0.1],
      [0, -1, 0.1],
    ],
  };
};

/* ───────────── the five ───────────── */

export type State = {
  rig: Rig;
  energy: number;
  tint: string;
  active: boolean;
  /** when it went down (or 1e9) */
  out: number;
  /** 0..1 the body has turned to spent grey */
  spent: number;
  root: V3;
  /** how hard it shakes right now 0..1 (sweat sparks, sound) */
  strain: number;
};

const jit = (t: number, seed: number) => Math.sin(t * 67 + seed) * 0.6 + Math.sin(t * 41 + seed * 2.3) * 0.4;

/** a crash onto the belly at tOut: falls with gravity from the shoulder height, a small bounce */
const crash = (t: number, tOut: number) => {
  if (t < tOut) return 0;
  const k = clamp((t - tOut) / 0.2);
  const b = t > tOut + 0.2 ? 0.12 * Math.abs(Math.sin((t - tOut - 0.2) * 16)) * Math.exp(-(t - tOut - 0.2) * 10) : 0;
  return clamp(k * k - b);
};

const base = (i: number, rig: Rig, o: Partial<State>): State => ({
  rig,
  energy: 1,
  tint: '#ffffff',
  active: true,
  out: 1e9,
  spent: 0,
  root: [0, 0, ZS[i]],
  strain: 0,
  ...o,
});

/** Motivated: fired up, then the shaking starts early and the hips go */
export const motivated = (t: number): State => {
  const tOut = OUT[0];
  const strain = ss(t, B(-20.5), tOut) * (t < tOut ? 1 : 0);
  const lie = crash(t, tOut);
  const rig = plank({sag: ss(t, B(-19), tOut) * 0.9, lie, dy: jit(t, 1) * 0.02 * strain - 0.04 * ss(t, B(-18), tOut), nod: ss(t, B(-18), tOut), look: 0.3 * lie});
  return base(0, rig, {energy: t < tOut ? lerp(1, 0.55, strain) : 0.55 * (1 - ss(t, tOut, tOut + 0.6)) + 0.05, tint: mixHex(TINT.mot, TINT.dead, ss(t, tOut, tOut + 0.6)), active: t < tOut, out: tOut, spent: ss(t, tOut, tOut + 0.5), strain});
};

/** Talented: easy, looks around, gets bored and simply lies down — no crash */
export const talented = (t: number): State => {
  const tOut = OUT[1];
  const look = Math.sin(clamp((t - B(-13.5)) / (B(-10.5) - B(-13.5))) * Math.PI * 2) * 0.9 * ss(t, B(-13.5), B(-13));
  const lie = easeInOut(clamp((t - tOut + 0.12) / 0.5));
  const rig = plank({lie, look: lie > 0 ? lerp(look, 0.9, lie) : look, sag: 0.15 * ss(t, B(-12), tOut)});
  return base(1, rig, {energy: t < tOut ? 0.9 : 0.9 * (1 - ss(t, tOut, tOut + 0.8)) + 0.05, tint: mixHex(TINT.tal, TINT.dead, ss(t, tOut, tOut + 0.8)), active: t < tOut, out: tOut, spent: ss(t, tOut, tOut + 0.6)});
};

/** Disciplined: dead still for a long time, then the shaking, then down */
export const disciplined = (t: number): State => {
  const tOut = OUT[2];
  const strain = ss(t, B(-7), tOut) * (t < tOut ? 1 : 0);
  const lie = crash(t, tOut);
  const rig = plank({sag: 0.6 * ss(t, B(-6), tOut), lie, dy: jit(t, 3) * 0.018 * strain - 0.03 * strain, nod: 0.6 * strain});
  return base(2, rig, {energy: t < tOut ? 1 - 0.3 * strain : 0.7 * (1 - ss(t, tOut, tOut + 0.6)) + 0.05, tint: mixHex(TINT.dis, TINT.dead, ss(t, tOut, tOut + 0.6)), active: t < tOut, out: tOut, spent: ss(t, tOut, tOut + 0.5), strain});
};

/** Ego: shows off, gets hurt when Disciplined goes down beside him, sinks in every gap of the stutter, then explodes up */
export const ego = (t: number): State => {
  const show = Math.max(0, Math.sin(((t - B(-14)) / (2 * BEAT)) * Math.PI * 2)) * ss(t, B(-14), B(-13)) * (1 - ss(t, B(-8), B(-7)));
  const hurt = ss(t, HURT - 0.05, HURT + 0.15);
  const strain = hurt * (t < UP ? 1 : 0.18);
  const sink = t < UP ? gap(t) * 0.16 + 0.06 * ss(t, HURT, UP - 0.1) : 0;
  const k = clamp((t - UP) / 0.2);
  const high = t < UP ? 0 : 1 - Math.pow(1 - k, 3) + 0.08 * Math.sin(k * Math.PI);
  // after the drop: a small push on every beat, rock-solid in between
  const beatPush = t > UP + 0.3 ? 0.012 * Math.exp(-(((t - UP) / BEAT) % 1) * 6) : 0;
  const rig = plank({high: Math.min(1.05, high), sag: t < UP ? 0.35 * hurt : 0, dy: (t < UP ? jit(t, 5) * 0.025 * strain - sink : jit(t, 5) * 0.004 + beatPush) + 0.02 * show, nod: t < UP ? 0.7 * hurt : -0.4, look: -0.25 * show});
  const pulse = t > UP ? 0.15 * Math.exp(-(((t - UP) / BEAT) % 1) * 4) : 0;
  return base(3, rig, {energy: t < HURT ? 0.95 : t < UP ? 0.7 + 0.3 * (1 - gap(t)) : 1 + pulse, tint: mixHex(TINT.ego, TINT.hurt, hurt), strain});
};

/** Obsessed: never stops, follows Ego up half a beat later, the strain creeps in at the end but he holds */
export const obsessed = (t: number): State => {
  const k = clamp((t - OBS_UP) / 0.35);
  const high = t < OBS_UP ? 0 : easeInOut(k);
  const strain = 0.12 * ss(t, B(-3), B(0)) + 0.35 * ss(t, B(5), B(13));
  const rig = plank({high, dy: jit(t, 7) * 0.014 * strain, sag: 0.25 * ss(t, B(6), B(13)), nod: 0.2 * strain});
  const flick = strain > 0.2 ? 0.12 * Math.max(0, Math.sin(t * 23) * Math.sin(t * 9.1)) : 0;
  return base(4, rig, {energy: 0.95 - flick, tint: TINT.obs, strain});
};

export const CAST = [motivated, talented, disciplined, ego, obsessed];
