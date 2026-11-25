import React, {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, fract, lerp, rnd, ss} from '../nc001-work-smart/anim';
import {Ball, Glow, Limb, Part, roundedBox, useLook, type V3} from '../nc001-work-smart/kit3d';
import {mat, type Mat} from '../nc001-work-smart/looks';
import {mixHex} from '../nc001-work-smart/world';
import {beat} from './grid';
import {CAST, DIS_GOLD, OBS_DROPARM, OBS_REL, OBS_SNAP, TAL_PHONE, TINT, XS, obsession, talent, type State} from './plan';
import {BAR_Y, HB, K3, Man, add, len, mix3, mul, norm, solve3, sub, W3, type J3, type Look3} from './rig3';

const B = beat;
const G = 9.8;
const METAL = mat('#dfe7f7', '#59688c', {shade: '#323d5c', rim: '#f0f5ff', rimAmt: 0.55, rimPow: 2.2, wrap: 0.55, spec: 0.9});
const POST = mat('#7d8bad', '#1b2338', {shade: '#1d2540', rim: '#b8c8f0', rimAmt: 0.5, rimPow: 2.2, wrap: 0.5, spec: 0.4});
const HALF = 2.2;
const floorGeo = new THREE.PlaneGeometry(40, 40);
const FLOOR = mat('#131b30', '#131b30', {shade: '#0a0f1d', rim: '#24345c', rimAmt: 0.25, rimPow: 3, wrap: 0.4});

/** quantised material helpers so a colour that drifts every frame does not build a new shader every frame */
const q = (x: number, n = 24) => Math.round(clamp(x) * n) / n;
const hot = (k: number): Mat => mat(mixHex('#ffffff', '#ffd2b8', k), mixHex('#a9b9d6', '#c2433a', k), {shade: mixHex('#56688f', '#6b1a22', k), rim: mixHex('#dcebff', '#ffb09a', k), rimAmt: 0.5, rimPow: 2.4, wrap: 0.75, emit: 0.96 + 0.25 * k});
const redHot = (k: number): Mat => mat(mixHex('#ffffff', '#ffd9a0', k), mixHex('#a9b9d6', '#ff3a1e', k), {shade: mixHex('#56688f', '#ff3a1e', k), rim: mixHex('#dcebff', '#ffe0b0', k), rimAmt: 0.6, rimPow: 2, wrap: 1, emit: 0.96 + 0.9 * k});
const ember = (k: number): Mat => mat(mixHex('#3a1418', '#fff0c8', k), mixHex('#2a0c10', '#ff3a1e', k), {shade: '#ffffff', wrap: 1, emit: 0.6 + 1.6 * k});
const charred = (k: number): Mat => mat(mixHex('#ffffff', '#6c6670', k), mixHex('#a9b9d6', '#24202a', k), {shade: mixHex('#56688f', '#15121a', k), rim: mixHex('#dcebff', '#7a6a78', k), rimAmt: 0.45, rimPow: 2.4, wrap: 0.75, emit: 0.96 - 0.3 * k});

/* ───────────── the rig ───────────── */

const Gym: React.FC<{t: number; gold: number}> = ({t, gold}) => {
  const look = useLook();
  return (
    <>
      <Limb a={[-HALF - 0.05, BAR_Y, 0]} b={[HALF + 0.05, BAR_Y, 0]} r0={0.032} r1={0.032} m={METAL} y0={BAR_Y - 0.1} y1={BAR_Y + 0.05} />
      {[-1, 1].map((s) => (
        <React.Fragment key={s}>
          <Limb a={[s * HALF, 0, 0]} b={[s * HALF, BAR_Y + 0.16, 0]} r0={0.075} r1={0.07} m={POST} y0={0} y1={BAR_Y + 0.4} />
          <Ball p={[s * HALF, BAR_Y + 0.16, 0]} r={0.075} m={POST} y0={0} y1={BAR_Y + 0.4} />
          <Limb a={[s * HALF, 0.05, -0.55]} b={[s * HALF, 0.05, 0.55]} r0={0.055} r1={0.055} m={POST} y0={-0.2} y1={1.2} />
          <Limb a={[s * (HALF - 0.08), BAR_Y, 0]} b={[s * (HALF - 0.02), BAR_Y, 0]} r0={0.05} r1={0.05} m={POST} y0={0} y1={BAR_Y + 0.4} />
        </React.Fragment>
      ))}
      {/* a thin line of light along the bar; gold under Discipline's hands at the end */}
      <Glow p={[0, BAR_Y + 0.005, 0.05]} w={HALF * 2.1} h={0.09} color="#cfe0ff" a={0.14} mode="line" />
      <Glow p={[XS[3], BAR_Y, 0.06]} w={1.2 + 1.5 * gold} h={0.16} color={TINT.gold} a={0.55 * gold} mode="line" />
      <Glow p={[0, 0.02, -2.5]} w={14} h={0.5} color={look.bg.glow} a={0.18} mode="line" />
      {void t}
    </>
  );
};

/** soft beams from above, one per figure, in its own colour, dying when it quits */
const Spots: React.FC<{st: State[]}> = ({st}) => (
  <>
    {st.map((s, i) => {
      const e = s.active ? 0.35 + 0.65 * s.energy : 0.18 * s.energy;
      return (
        <React.Fragment key={i}>
          <Glow p={[XS[i], 3.3, -1.1]} w={1.55} h={5.6} color={s.tint} a={0.05 + 0.14 * e} mode="beam" />
          <Glow p={[XS[i], 0.012, 0.15]} w={1.5} h={1.1} color={s.tint} a={0.08 + 0.2 * e} flat />
        </React.Fragment>
      );
    })}
  </>
);

const Motes: React.FC<{t: number}> = ({t}) => (
  <>
    {Array.from({length: 46}, (_, i) => {
      const x = (rnd(i + 1) - 0.5) * 5;
      const y = fract(rnd(i + 7) + t * (0.012 + 0.02 * rnd(i + 3))) * 3.6 + 0.1;
      const z = -1.4 + rnd(i + 5) * 2.2;
      const a = (0.14 + 0.3 * rnd(i + 2)) * (0.6 + 0.4 * Math.sin(t * (0.8 + rnd(i) * 1.5) + i));
      return <Glow key={i} p={[x + Math.sin(t * 0.3 + i) * 0.05, y, z]} w={0.03 + 0.03 * rnd(i + 9)} h={0.03 + 0.03 * rnd(i + 9)} color="#dce8ff" a={a} />;
    })}
  </>
);

/* ───────────── Obsession's arm: snaps, hangs on the bar by the hand, slips, shatters on the floor ───────────── */

const jAt = (t: number) => {
  const s = obsession(t);
  return solve3(s.rig);
};
const world = (p: V3) => W3(p, [XS[2], 0, 0], K3);

const rot = (v: V3, axis: V3, a: number): V3 => {
  const [x, y, z] = v;
  const [u, w, n] = axis;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const d = u * x + w * y + n * z;
  return [u * d * (1 - c) + x * c + (-n * y + w * z) * s, w * d * (1 - c) + y * c + (n * x - u * z) * s, n * d * (1 - c) + z * c + (-w * x + u * y) * s];
};

const R = HB.ar[1] * K3;
const REST = {hand: [-0.1, R, -0.32] as V3, elF: [-0.38, R, -0.22] as V3, elU: [-0.43, R, -0.29] as V3, sh: [-0.7, R, -0.38] as V3};
const FALL_T = 0.56;
export const ARM_HIT = OBS_DROPARM + FALL_T;

/** world points [shoulder, elbowU, elbowF, hand] of the broken arm at time t (t ≥ snap) */
const armAt = (t: number): [V3, V3, V3, V3] => {
  const j0 = jAt(OBS_SNAP - 1 / 120);
  const H = world(j0.hd[0]);
  const E0 = world(j0.el[0]);
  const S0 = world(j0.sh[0]);
  const hanging = (tt: number): [V3, V3, V3, V3] => {
    const dt = tt - OBS_SNAP;
    const d0 = norm(sub(S0, H));
    const down: V3 = [0, -1, 0];
    const ax = norm([d0[1] * down[2] - d0[2] * down[1], d0[2] * down[0] - d0[0] * down[2], d0[0] * down[1] - d0[1] * down[0]]);
    const th0 = Math.acos(clamp(-d0[1], -1, 1));
    const phi = th0 * Math.exp(-dt * 2.2) * Math.cos(dt * 7.5);
    const dir = rot(down, ax, -phi);
    const straight = ss(dt, 0, 0.22);
    const E = mix3(E0, add(H, mul(dir, HB.fore * K3)), straight);
    const S = mix3(S0, add(E, mul(dir, HB.arm * K3)), straight);
    return [S, E, E, H];
  };
  if (t < OBS_DROPARM) return hanging(t);
  const P = hanging(OBS_DROPARM);
  const k = clamp((t - OBS_DROPARM) / FALL_T);
  const rest: [V3, V3, V3, V3] = [REST.sh, REST.elU, REST.elF, REST.hand];
  const out = P.map((p, i) => {
    const r = rest[i];
    // each piece falls with gravity; the shoulder end (lower) lands first, the arm tips over
    const lag = i === 3 ? 1 : i === 0 ? 0.78 : 0.9;
    const kk = clamp(k / lag);
    const y = lerp(p[1], r[1], kk * kk);
    const bounce = t > OBS_DROPARM + FALL_T * lag ? 0.05 * Math.abs(Math.sin((t - OBS_DROPARM - FALL_T * lag) * 18)) * Math.exp(-(t - OBS_DROPARM - FALL_T * lag) * 9) : 0;
    return [lerp(p[0], r[0], ss(kk, 0, 1)), y + bounce, lerp(p[2], r[2], ss(kk, 0, 1))] as V3;
  });
  return out as [V3, V3, V3, V3];
};

const BrokenArm: React.FC<{t: number}> = ({t}) => {
  const heat = 1 - 0.75 * ss(t, ARM_HIT, ARM_HIT + 4);
  const m = useMemo(() => hot(q(0.15 + heat * 0.3)), [q(0.15 + heat * 0.3)]);
  const tip = useMemo(() => ember(q(heat)), [q(heat)]);
  if (t < OBS_SNAP) return null;
  const [S, EU, EF, H] = armAt(t);
  const y0 = Math.min(S[1], H[1]) - 0.1;
  const y1 = Math.max(S[1], H[1]) + 0.1;
  return (
    <>
      <Limb a={S} b={EU} r0={HB.ar[0] * K3} r1={HB.ar[1] * K3} m={m} y0={y0} y1={y1} />
      <Limb a={EF} b={H} r0={HB.ar[1] * K3} r1={HB.ar[2] * K3} m={m} y0={y0} y1={y1} />
      <Ball p={S} r={HB.ar[0] * K3 * 1.02} m={tip} y0={0} y1={1} />
      <Glow p={add(S, [0, 0, 0.05])} w={0.35} h={0.35} color="#ff4a22" a={0.5 * heat} />
      {t > ARM_HIT ? <Ball p={EF} r={HB.ar[1] * K3 * 1.01} m={tip} y0={0} y1={1} /> : null}
    </>
  );
};

/* ───────────── sparks and embers ───────────── */

type Burst = {at: number; p: V3; n: number; speed: number; color: string; life: number; seed: number; up?: number};

const BurstFx: React.FC<{t: number; b: Burst}> = ({t, b}) => {
  const dt = t - b.at;
  if (dt < 0 || dt > b.life) return null;
  return (
    <>
      {Array.from({length: b.n}, (_, i) => {
        const a = rnd(b.seed + i) * Math.PI * 2;
        const el = (b.up ?? 0.5) + rnd(b.seed + i * 3) * 0.8;
        const v = b.speed * (0.4 + 0.8 * rnd(b.seed + i * 7));
        const vx = Math.cos(a) * v;
        const vz = Math.sin(a) * v * 0.6;
        const vy = el * v;
        let y = b.p[1] + vy * dt - 0.5 * G * dt * dt;
        const life = b.life * (0.5 + 0.5 * rnd(b.seed + i * 11));
        if (dt > life) return null;
        y = Math.max(0.01, y);
        const k = 1 - dt / life;
        return <Glow key={i} p={[b.p[0] + vx * dt, y, b.p[2] + vz * dt]} w={0.06 * (0.6 + k)} h={0.06 * (0.6 + k)} color={b.color} a={0.9 * k} />;
      })}
    </>
  );
};

const DRIP = 0.11;
/** red-hot drops from the broken shoulder while he keeps going, gathering in a glowing pool under the bar */
const Drips: React.FC<{t: number}> = ({t}) => {
  if (t < OBS_SNAP) return null;
  const end = Math.min(t, OBS_REL);
  const n = Math.floor((end - OBS_SNAP) / DRIP);
  const live: React.ReactNode[] = [];
  for (let i = Math.max(0, n - 14); i <= n; i++) {
    const ts = OBS_SNAP + 0.04 + i * DRIP + rnd(i) * 0.04;
    if (ts > end) continue;
    const dt = t - ts;
    const j = jAt(ts);
    const p0 = world(add(j.sh[0], mul(j.side, -0.03)));
    const vx = -0.25 - rnd(i + 3) * 0.3;
    const y = p0[1] - 0.5 * G * dt * dt;
    const fallT = Math.sqrt((2 * p0[1]) / G);
    const x = p0[0] + vx * Math.min(dt, fallT);
    const z = p0[2] + (rnd(i + 5) - 0.5) * 0.2 * Math.min(dt, fallT);
    if (dt < fallT) {
      live.push(<Glow key={i} p={[x, y, z]} w={0.045} h={0.07} color="#ff5a2a" a={0.95} />);
      live.push(<Glow key={`t${i}`} p={[x, y + 0.08, z]} w={0.02} h={0.16} color="#ff3a1e" a={0.35} />);
    } else if (dt < fallT + 0.9) {
      const k = 1 - (dt - fallT) / 0.9;
      live.push(<Glow key={i} p={[x, 0.015, z]} w={0.16 * (1.4 - k)} h={0.08 * (1.4 - k)} color="#ff4a22" a={0.6 * k} flat />);
    }
  }
  return <>{live}</>;
};

/* ───────────── Talent's phone ───────────── */

const phoneGeo = roundedBox(0.11, 0.2, 0.016, 0.006);
const PHONE_BODY = mat('#1b2236', '#0a0e18', {shade: '#0a0e18', rim: '#7f95c8', rimAmt: 0.7, rimPow: 2, wrap: 0.5, spec: 0.8});
const SCREEN = mat('#e8f4ff', '#a8d0ff', {shade: '#ffffff', wrap: 1, emit: 1.6});
const screenGeo = new THREE.PlaneGeometry(0.096, 0.18);

const Phone: React.FC<{t: number; j: J3; root: V3}> = ({t, j, root}) => {
  const on = ss(t, TAL_PHONE - 0.3, TAL_PHONE + 0.2);
  if (on <= 0) return null;
  const c = mul(add(j.hd[0], j.hd[1]), 0.5);
  const toHead = norm(sub(j.head, c));
  const qq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...toHead));
  const flick = 0.85 + 0.15 * Math.sin(t * 3.3) * Math.sin(t * 7.1);
  const cw = W3(c, root, K3);
  return (
    <>
      <group position={cw} quaternion={qq} scale={[K3 * on, K3 * on, K3 * on]}>
        <group position={[0, -0.1, 0]}>
          <Part geo={phoneGeo} m={PHONE_BODY} y0={-0.1} y1={0.1} />
        </group>
        <Part geo={screenGeo} m={SCREEN} y0={0} y1={1} position={[0, 0, 0.0092]} />
      </group>
      <Glow p={add(W3(j.head, root, K3), [0, -0.05, 0.12])} w={0.75} h={0.75} color="#bfe0ff" a={0.3 * on * flick} />
      <Glow p={add(cw, [0, 0, 0.05])} w={0.4} h={0.4} color="#d6ecff" a={0.25 * on * flick} />
    </>
  );
};

/* ───────────── the world ───────────── */

const BURSTS: Burst[] = [];

export const World: React.FC<{t: number}> = ({t}) => {
  const look = useLook();
  const st = CAST.map((f) => f(t));
  const gold = ss(t, DIS_GOLD, DIS_GOLD + 0.6);
  const snapP = world(jAt(OBS_SNAP - 1 / 120).sh[0]);
  const bursts: Burst[] = [
    {at: OBS_SNAP, p: snapP, n: 34, speed: 2.4, color: '#ffb070', life: 1.0, seed: 11, up: 0.3},
    {at: OBS_SNAP, p: snapP, n: 16, speed: 1.2, color: '#ff3a1e', life: 1.4, seed: 51, up: 0.1},
    {at: ARM_HIT, p: [-0.4, 0.05, -0.3], n: 26, speed: 1.6, color: '#ff7a3a', life: 0.9, seed: 91, up: 0.6},
    {at: OBS_REL + 1.0, p: [0, 0.08, 0.5], n: 16, speed: 0.8, color: '#8a5a5a', life: 1.1, seed: 131, up: 0.7},
    ...BURSTS,
  ];
  // obsession: heat, cracks, the arm glowing before it goes
  const o = st[2];
  const heat = q(ss(t, beat(-6), beat(0)) * 0.5 + ss(t, beat(0), OBS_SNAP) * 0.3 + 0.15 * ss(t, OBS_SNAP, beat(20)));
  const burnt = q(ss(t, beat(31.8), OBS_REL + 1));
  const crk = ss(t, beat(0), OBS_SNAP - 0.05);
  const crackGlow = q(1 - burnt * 0.85);
  const armHot = q(ss(t, beat(0.4), OBS_SNAP));
  const mats = useMemo(
    () => ({
      body: burnt > 0 ? charred(burnt) : hot(heat * 0.4),
      crack: ember(crackGlow),
      arm: redHot(armHot),
      stump: ember(crackGlow * 0.9),
    }),
    [heat, burnt, crackGlow, armHot],
  );
  const pool = clamp((Math.min(t, OBS_REL) - OBS_SNAP) / 14) * (1 - 0.7 * ss(t, OBS_REL, OBS_REL + 3));
  return (
    <>
      <Part geo={floorGeo} m={FLOOR} y0={-1} y1={1} rotation={[-Math.PI / 2, 0, 0]} fade={{z0: -2.5, z1: -10, zmax: 1}} />
      <Glow p={[0, 0.006, 0.2]} w={7} h={3.4} color="#2a3f72" a={0.35} flat />
      <Glow p={[0, 1.8, -3.2]} w={9} h={6} color={look.bg.glow} a={0.32} />
      <Spots st={st} />
      <Motes t={t} />
      <Gym t={t} gold={gold} />
      {st.map((s, i) => {
        const j = solve3(s.rig);
        const isObs = i === 2;
        const l: Look3 = {
          body: isObs ? mats.body : look.a.body,
          core: s.tint,
          energy: s.energy,
          noArm: isObs && t >= OBS_SNAP ? [true, false] : undefined,
          armMat: isObs && t < OBS_SNAP && armHot > 0 ? [mats.arm, null] : undefined,
          cracks: isObs ? crk : 0,
          crackMat: mats.crack,
          stumpMat: mats.stump,
        };
        return (
          <React.Fragment key={i}>
            <Man j={j} root={s.root} k={K3} l={l} />
            {i === 4 ? <Phone t={t} j={j} root={s.root} /> : null}
          </React.Fragment>
        );
      })}
      <BrokenArm t={t} />
      <Drips t={t} />
      {pool > 0 ? (
        <>
          <Glow p={[-0.25, 0.013, -0.2]} w={0.5 + 1.3 * pool} h={0.35 + 0.8 * pool} color="#ff3a1e" a={0.45 * pool} flat />
          <Glow p={[-0.25, 0.014, -0.2]} w={0.25 + 0.6 * pool} h={0.18 + 0.4 * pool} color="#ffb070" a={0.3 * pool} flat />
        </>
      ) : null}
      {/* the moment it breaks: the shoulder flares */}
      {t > beat(0) && t < OBS_SNAP + 0.6 ? <Glow p={add(snapP, [0, 0, 0.1])} w={0.9} h={0.9} color="#ff5a2a" a={0.6 * ss(t, beat(0.3), OBS_SNAP) * (1 - ss(t, OBS_SNAP, OBS_SNAP + 0.6)) + 0.5 * Math.exp(-Math.max(0, t - OBS_SNAP) * 6) * (t > OBS_SNAP ? 1 : 0)} /> : null}
      {bursts.map((b, i) => (
        <BurstFx key={i} t={t} b={b} />
      ))}
      {void o}
      {void len}
      {void talent}
    </>
  );
};
