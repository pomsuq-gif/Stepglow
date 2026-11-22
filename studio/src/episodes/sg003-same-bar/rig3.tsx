import React, {useMemo} from 'react';
import * as THREE from 'three';
import {Ball, BODIES, Glow, Limb, Part, torsoGeo, type Body, type V3} from '../nc001-work-smart/kit3d';
import {clamp, easeInOut, lerp} from '../nc001-work-smart/anim';
import type {Mat} from '../nc001-work-smart/looks';

/**
 * SG003: a fully 3D stickman rig (the NC001 Figure moves its limbs in one plane only, so a frontal pull-up
 * with the elbows flaring out is impossible there). Same porcelain body and chest light as Figure,
 * the arms a little longer so a dead hang leaves the head below the bar.
 * Coordinates are figure-local (root on the floor under the slot, x across, y up, z toward the camera), before scale.
 */
export const HB: Body = {...BODIES.core, arm: 0.31, fore: 0.3};
export const ARM = HB.arm + HB.fore;
export const LEG = HB.thigh + HB.shin;
const TORSO = torsoGeo(HB.tr[0], HB.tr[1], HB.torso - 0.06);

/* ───────── vectors ───────── */
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3): V3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const mix3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

/** two-bone IK: root a, target t, bone lengths, pole = the direction the middle joint bends toward */
const twoBone = (a: V3, t: V3, l1: number, l2: number, pole: V3): [V3, V3] => {
  let d = sub(t, a);
  let D = len(d);
  const max = (l1 + l2) * 0.999;
  const min = Math.abs(l1 - l2) + 0.02;
  if (D > max) {
    d = mul(d, max / D);
    D = max;
  }
  if (D < min) {
    d = mul(norm(d), min);
    D = min;
  }
  const dir = mul(d, 1 / D);
  let p = sub(pole, mul(dir, dot(pole, dir)));
  if (len(p) < 1e-4) p = Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [0, 0, 1];
  p = norm(p);
  const x = (l1 * l1 - l2 * l2 + D * D) / (2 * D);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  return [add(add(a, mul(dir, x)), mul(p, h)), add(a, d)];
};

/** a pose as targets: pelvis, torso direction, chest facing, hand / foot targets [side −x, side +x] and bend poles */
export type Rig = {
  pel: V3;
  up: V3;
  fwd?: V3;
  head?: V3;
  hand: [V3, V3];
  elbow?: [V3, V3];
  foot: [V3, V3];
  knee?: [V3, V3];
};

export const mixRig = (a: Rig, b: Rig, k: number): Rig => {
  const c = clamp(k);
  const pick = c < 0.5 ? a : b;
  return {
    pel: mix3(a.pel, b.pel, c),
    up: mix3(a.up, b.up, c),
    fwd: mix3(a.fwd ?? [0, 0, 1], b.fwd ?? [0, 0, 1], c),
    head: mix3(a.head ?? [0, 0, 0], b.head ?? [0, 0, 0], c),
    hand: [mix3(a.hand[0], b.hand[0], c), mix3(a.hand[1], b.hand[1], c)],
    elbow: a.elbow && b.elbow ? [mix3(a.elbow[0], b.elbow[0], c), mix3(a.elbow[1], b.elbow[1], c)] : pick.elbow,
    foot: [mix3(a.foot[0], b.foot[0], c), mix3(a.foot[1], b.foot[1], c)],
    knee: a.knee && b.knee ? [mix3(a.knee[0], b.knee[0], c), mix3(a.knee[1], b.knee[1], c)] : pick.knee,
  };
};

/** keyed rigs on a timeline; each key may bring its own easing into it */
export const rigAt = (t: number, keys: [number, Rig, ((k: number) => number)?][]): Rig => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [ta, ra] = keys[i];
    const [tb, rb, e] = keys[i + 1];
    if (t <= tb) return mixRig(ra, rb, (e ?? easeInOut)((t - ta) / (tb - ta)));
  }
  return keys[keys.length - 1][1];
};

export const solve3 = (r: Rig, b: Body = HB) => {
  const up = norm(r.up);
  const f0 = r.fwd ?? [0, 0, 1];
  const side = norm(cross(up, f0));
  const fwd = cross(side, up);
  const chest = add(r.pel, mul(up, b.torso));
  const shc = add(r.pel, mul(up, b.torso * 0.92));
  const head = add(add(chest, mul(up, b.gap + b.headR)), r.head ?? [0, 0, 0]);
  const sh: [V3, V3] = [add(shc, mul(side, -b.shZ)), add(shc, mul(side, b.shZ))];
  const hip: [V3, V3] = [add(r.pel, mul(side, -b.hipZ)), add(r.pel, mul(side, b.hipZ))];
  const pole = (i: number): V3 => r.elbow?.[i] ?? add(add(mul(side, i ? 1 : -1), mul(up, -0.5)), mul(fwd, 0.35));
  const kpole = (i: number): V3 => r.knee?.[i] ?? add(fwd, mul(side, (i ? 1 : -1) * 0.15));
  const a0 = twoBone(sh[0], r.hand[0], b.arm, b.fore, pole(0));
  const a1 = twoBone(sh[1], r.hand[1], b.arm, b.fore, pole(1));
  const l0 = twoBone(hip[0], r.foot[0], b.thigh, b.shin, kpole(0));
  const l1 = twoBone(hip[1], r.foot[1], b.thigh, b.shin, kpole(1));
  return {up, side, fwd, chest, shc, head, sh, hip, el: [a0[0], a1[0]] as [V3, V3], hd: [a0[1], a1[1]] as [V3, V3], kn: [l0[0], l1[0]] as [V3, V3], ft: [l0[1], l1[1]] as [V3, V3]};
};
export type J3 = ReturnType<typeof solve3>;

/** figure-local → world */
export const W3 = (p: V3, root: V3, k: number): V3 => [root[0] + p[0] * k, root[1] + p[1] * k, root[2] + p[2] * k];

/** a red-hot crack network on the front of the torso, grown 0→1; points as (angle from the front, height 0..1 of the torso) */
const CRACKS: [number, number][][] = [
  [[-1.05, 0.93], [-0.8, 0.84], [-0.62, 0.78], [-0.5, 0.66], [-0.28, 0.6], [-0.2, 0.48], [0.02, 0.4], [0.08, 0.27], [0.25, 0.18]],
  [[-0.62, 0.78], [-0.86, 0.66], [-0.92, 0.52], [-1.15, 0.42]],
  [[-0.28, 0.6], [-0.05, 0.68], [0.18, 0.66], [0.32, 0.74], [0.55, 0.72]],
  [[0.02, 0.4], [0.3, 0.44], [0.42, 0.36]],
  [[-0.2, 0.48], [-0.42, 0.38], [-0.4, 0.24], [-0.6, 0.14]],
];

export type Look3 = {
  body: Mat;
  /** chest light colour and brightness 0..1 */
  core: string;
  energy: number;
  /** missing arm per side (the broken one) */
  noArm?: [boolean, boolean];
  /** material of one arm instead of the body (red-hot before it breaks) */
  armMat?: [Mat | null, Mat | null];
  /** material of a forearm only (SG004: the red-hot forearms of the hurt Ego) */
  foreMat?: [Mat | null, Mat | null];
  cracks?: number;
  crackMat?: Mat;
  stumpMat?: Mat;
};

const torsoProf = (u: number) => HB.tr[0] + (HB.tr[1] - HB.tr[0]) * (u * u * (3 - 2 * u));

/** the stickman, from a solved rig. root: world point of the figure origin, k: scale */
export const Man: React.FC<{j: J3; root: V3; k: number; l: Look3; children?: React.ReactNode}> = ({j, root, k, l, children}) => {
  const b = HB;
  // body gradient over the figure's actual extent (hanging, standing or lying)
  const ys = [j.head[1] + b.headR, j.ft[0][1], j.ft[1][1], j.hd[0][1], j.hd[1][1], j.chest[1], j.shc[1] + 0.1];
  const lo = Math.min(...ys.slice(1)) - 0.05;
  const hi = Math.max(lo + 0.7, ys[0]);
  const y0 = root[1] + lo * k;
  const y1 = root[1] + hi * k;
  const B = {m: l.body, y0, y1};
  const q = useMemo(() => new THREE.Quaternion(), []);
  q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...j.side), new THREE.Vector3(...j.up), new THREE.Vector3(...j.fwd)));
  const tPos = add(j.shc, mul(j.up, -b.torso * 0.92 + 0.02));
  const coreL = {color: l.core, y: b.torso * 0.52, r: 0.115, amt: 0.25 + 0.85 * l.energy};
  const chestP = add(add(tPos, mul(j.up, b.torso * 0.52)), mul(j.fwd, 0.1));
  const tl = b.torso - 0.06;
  return (
    <group position={root} scale={[k, k, k]}>
      {[0, 1].map((i) => (
        <React.Fragment key={i}>
          <Limb a={j.hip[i]} b={j.kn[i]} r0={b.lr[0]} r1={b.lr[1]} {...B} />
          <Limb a={j.kn[i]} b={j.ft[i]} r0={b.lr[1]} r1={b.lr[2]} {...B} />
          {l.noArm?.[i] ? (
            <Ball p={add(j.sh[i], mul(j.side, (i ? 1 : -1) * 0.01))} r={b.ar[0] * 1.08} m={l.stumpMat ?? l.body} y0={y0} y1={y1} />
          ) : (
            <>
              <Limb a={j.sh[i]} b={j.el[i]} r0={b.ar[0]} r1={b.ar[1]} m={l.armMat?.[i] ?? l.body} y0={y0} y1={y1} />
              <Limb a={j.el[i]} b={j.hd[i]} r0={b.ar[1]} r1={b.ar[2]} m={l.foreMat?.[i] ?? l.armMat?.[i] ?? l.body} y0={y0} y1={y1} />
            </>
          )}
        </React.Fragment>
      ))}
      <Part geo={TORSO} {...B} core={coreL} position={tPos} quaternion={q} scale={[b.tr[2], 1, 1]} />
      {l.cracks && l.cracks > 0 && l.crackMat ? (
        <group position={tPos} quaternion={q}>
          {CRACKS.flatMap((line, li) => {
            const grow = clamp(l.cracks! * 1.6 - li * 0.15) * (line.length - 1);
            const pts = line.map(([a, u]): V3 => {
              const y = 0.04 + u * (tl - 0.02);
              const r = torsoProf(y / tl) * 1.015;
              return [Math.sin(a) * r * b.tr[2], y, Math.cos(a) * r];
            });
            return pts.slice(0, -1).map((p, s) => {
              const g = clamp(grow - s);
              if (g <= 0) return null;
              return <Limb key={`${li}-${s}`} a={p} b={mix3(p, pts[s + 1], g)} r0={0.0085} r1={0.0065} m={l.crackMat!} y0={0} y1={1} />;
            });
          })}
        </group>
      ) : null}
      <Glow p={chestP} w={1.25} h={1.25} color={l.core} a={0.12 + 0.42 * l.energy} />
      <Ball p={j.head} r={b.headR} s={b.headS} {...B} />
      {children}
    </group>
  );
};

/* ───────── pose builders (figure-local, root on the floor) ───────── */

export const BAR_Y = 2.3;
export const K3 = HB.s;
export const YB = BAR_Y / K3;
export const GRIP = 0.24;
const SHC = HB.torso * 0.92;
const DEAD = -Math.sqrt((ARM * 0.985) ** 2 - (GRIP - HB.shZ) ** 2);
const TOPS = -0.04;

export type Legs = 'relaxed' | 'crossed' | 'tuck' | 'straight' | 'kick';
export type HangOpts = {
  /** which hands hold the bar */
  grip?: [boolean, boolean];
  /** where a free hand goes (figure-local) */
  free?: [V3 | null, V3 | null];
  legs?: Legs;
  /** pendulum swing, radians (+ = feet toward the camera) */
  swing?: number;
  /** side sway, radians */
  sway?: number;
  head?: V3;
  /** 0..1: legs pulled up harder on the way up */
  effort?: number;
  /** extra phase for the kicking legs */
  phase?: number;
};

/** hanging from the bar; lift 0 = dead hang, 1 = chin over the bar (the body goes behind the bar so the head clears it) */
export const hang = (lift: number, o: HangOpts = {}): Rig => {
  const g = o.grip ?? [true, true];
  const one = g[0] !== g[1];
  const gs = g[1] ? 1 : -1; // the side that holds, for one-arm hangs
  const h = clamp(lift);
  let sy = lerp(DEAD, TOPS, h);
  const bz = -0.05 - 0.23 * (h <= 0.04 ? 0 : h >= 0.4 ? 1 : ((h - 0.04) / 0.36) ** 2 * (3 - 2 * ((h - 0.04) / 0.36)));
  let px = 0;
  let up: V3 = [0, 1, 0];
  if (one) {
    px = gs * 0.17;
    up = norm([-gs * 0.12, 1, 0]);
    sy -= 0.02;
  }
  const sw = o.swing ?? 0;
  const sa = o.sway ?? 0;
  // swing about the hands: the body rotates around the bar
  up = norm([up[0] - Math.sin(sa) * 0.6, up[1], up[2] - Math.sin(sw)]);
  const shc: V3 = [px + Math.sin(sa) * 0.05, YB + sy, bz + Math.sin(sw) * 0.08];
  const pel = sub(shc, mul(up, SHC));
  const hand = (i: number): V3 => {
    const s = i ? 1 : -1;
    if (g[i]) return [s * GRIP, YB + 0.015, 0];
    return o.free?.[i] ?? add(pel, [s * 0.22, 0.05, 0.1]);
  };
  const e = o.effort ?? h;
  const ly = -LEG * 0.95 + 0.12 * e;
  const legs = o.legs ?? 'relaxed';
  let f0: V3, f1: V3;
  let knee: [V3, V3] = [
    [-0.15, 0, 1],
    [0.15, 0, 1],
  ];
  switch (legs) {
    case 'crossed':
      f0 = add(pel, [0.05, ly + 0.04, 0.12]);
      f1 = add(pel, [-0.04, ly + 0.02, 0.0]);
      break;
    case 'tuck':
      f0 = add(pel, [-0.07, ly + 0.18, -0.2]);
      f1 = add(pel, [0.07, ly + 0.18, -0.2]);
      break;
    case 'straight':
      f0 = add(pel, [-0.035, -LEG * 0.985, 0.02]);
      f1 = add(pel, [0.035, -LEG * 0.985, 0.02]);
      break;
    case 'kick': {
      const p = o.phase ?? 0;
      f0 = add(pel, [-0.09, ly + 0.1 + 0.1 * Math.sin(p), 0.12 * Math.cos(p)]);
      f1 = add(pel, [0.09, ly + 0.1 + 0.1 * Math.sin(p + Math.PI), 0.12 * Math.cos(p + Math.PI)]);
      break;
    }
    default:
      f0 = add(pel, [-0.08, ly, 0.07]);
      f1 = add(pel, [0.08, ly + 0.01, 0.05]);
  }
  // the legs swing with the body
  f0 = add(f0, [Math.sin(sa) * -0.25, 0, Math.sin(sw) * 0.55]);
  f1 = add(f1, [Math.sin(sa) * -0.25, 0, Math.sin(sw) * 0.55]);
  if (legs === 'tuck') knee = [[-0.2, 0.2, 1], [0.2, 0.2, 1]];
  return {
    pel,
    up,
    head: o.head ?? [0, 0, h > 0.5 ? 0.02 : 0],
    hand: [hand(0), hand(1)],
    elbow: [
      [-1, -0.45, 0.35],
      [1, -0.45, 0.35],
    ],
    foot: [f0, f1],
    knee,
  };
};

export const ANK = HB.ankle;
export const STANDY = HB.ankle + LEG * 0.985;

export const stand = (o: {z?: number; lean?: number; crouch?: number; arms?: 'down' | 'up' | 'out'} = {}): Rig => {
  const z = o.z ?? 0;
  const cr = o.crouch ?? 0;
  const pel: V3 = [0, STANDY - cr, z];
  const up = norm([0, 1, Math.tan(((o.lean ?? 3) * Math.PI) / 180)]);
  const shy = pel[1] + SHC;
  const arms = o.arms ?? 'down';
  const hand = (s: number): V3 => (arms === 'up' ? [s * 0.3, shy + ARM * 0.92, z + 0.05] : arms === 'out' ? [s * 0.5, shy - 0.1, z + 0.18] : [s * 0.25, shy - ARM * 0.93, z + 0.06]);
  return {
    pel,
    up,
    hand: [hand(-1), hand(1)],
    foot: [
      [-0.1, ANK, z + 0.02],
      [0.1, ANK, z - 0.01],
    ],
    knee: [
      [-0.1, 0, 1],
      [0.1, 0, 1],
    ],
  };
};

const SEAT = HB.lr[0] * 1.05;

/** sitting on the floor, hugging the knees, head down (motivation gone) */
export const hugKnees = (z: number): Rig => ({
  pel: [0, SEAT, z],
  up: norm([0, 1, 0.55]),
  head: [0, -0.07, 0.06],
  hand: [
    [-0.045, 0.3, z + 0.5],
    [0.045, 0.3, z + 0.5],
  ],
  elbow: [
    [-1, -0.2, 0.2],
    [1, -0.2, 0.2],
  ],
  foot: [
    [-0.1, ANK, z + 0.46],
    [0.1, ANK, z + 0.47],
  ],
  knee: [
    [-0.15, 1, 0.3],
    [0.15, 1, 0.3],
  ],
});

/** sitting, leaning back, arms crossed, turned away (ego hurt) */
export const sulk = (z: number, away: number): Rig => ({
  pel: [0, SEAT, z],
  up: norm([away * 0.12, 1, -0.12]),
  head: [away * 0.05, 0.0, -0.02],
  hand: [
    [0.13, 0.5, z + 0.13],
    [-0.12, 0.46, z + 0.15],
  ],
  elbow: [
    [-1, -0.6, 0.6],
    [1, -0.6, 0.6],
  ],
  foot: [
    [-0.12, ANK, z + 0.46],
    [0.16, ANK, z + 0.7],
  ],
  knee: [
    [-0.15, 1, 0.3],
    [0.15, 1, 0.2],
  ],
});

/** cross-legged on the floor, phone in both hands, head down to it (talent bored) */
export const phone = (z: number): Rig => ({
  pel: [0, SEAT, z],
  up: norm([0, 1, 0.16]),
  head: [0, -0.06, 0.07],
  hand: [
    [-0.05, 0.53, z + 0.3],
    [0.05, 0.53, z + 0.3],
  ],
  elbow: [
    [-1, -0.8, 0.2],
    [1, -0.8, 0.2],
  ],
  foot: [
    [0.13, ANK, z + 0.33],
    [-0.13, ANK, z + 0.36],
  ],
  knee: [
    [-1, 0.25, 0.35],
    [1, 0.25, 0.35],
  ],
});

/** fall time from a height h (local units) at real gravity */
export const fallTime = (h: number) => Math.sqrt((2 * Math.max(0, h) * K3) / 9.8);
export const easeFall = (k: number) => clamp(k) * clamp(k);
export {easeInOut};
