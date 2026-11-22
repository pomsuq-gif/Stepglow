import React, {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, fract, rnd, ss} from '../nc001-work-smart/anim';
import {Ball, Glow, Limb, Part, roundedBox, useLook, type V3} from '../nc001-work-smart/kit3d';
import {mat, type Mat} from '../nc001-work-smart/looks';
import {mixHex} from '../nc001-work-smart/world';
import {K3, Man, mul, add, solve3, W3, type Look3} from '../sg003-same-bar/rig3';
import {BEAT, beat} from './grid';
import {CAST, HURT, LANE, OUT, TINT, UP, ZS, type State} from './plan';

const G = 9.8;
const X0 = -1.75;
const X1 = 1.55;
const floorGeo = new THREE.PlaneGeometry(60, 60);
const FLOOR = mat('#101829', '#101829', {shade: '#080c18', rim: '#22325a', rimAmt: 0.2, rimPow: 3, wrap: 0.4});
const matGeo = roundedBox(X1 - X0, 0.03, LANE * 0.84, 0.012);
const MAT = mat('#26324f', '#141c30', {shade: '#0c1222', rim: '#7f9ad6', rimAmt: 0.35, rimPow: 2.6, wrap: 0.6, spec: 0.25});
const SEAT = mat('#1a2236', '#0c1020', {shade: '#070a14', rim: '#3a4c7a', rimAmt: 0.3, rimPow: 3, wrap: 0.5});
const CROWD = mat('#202b48', '#0e1424', {shade: '#0a0f1c', rim: '#7c98d8', rimAmt: 0.75, rimPow: 2.2, wrap: 0.6});

const q = (x: number, n = 20) => Math.round(clamp(x) * n) / n;
/** porcelain going red-hot (the hurt Ego's forearms) */
const redHot = (k: number): Mat => mat(mixHex('#ffffff', '#ffd9a0', k), mixHex('#a9b9d6', '#ff3a1e', k), {shade: mixHex('#56688f', '#ff2a14', k), rim: mixHex('#dcebff', '#ffe0b0', k), rimAmt: 0.6, rimPow: 2, wrap: 1, emit: 0.96 + 0.7 * k});
/** porcelain that has given up: cold grey-blue, no glow */
const spentMat = (k: number): Mat => mat(mixHex('#ffffff', '#7d879e', k), mixHex('#a9b9d6', '#2a3248', k), {shade: mixHex('#56688f', '#141a2a', k), rim: mixHex('#dcebff', '#5d6c90', k), rimAmt: 0.5 - 0.2 * k, rimPow: 2.4, wrap: 0.75, emit: 0.96 - 0.35 * k});

/* ───────────── the arena ───────────── */

/** tiered seats behind the lanes, full of silhouettes that rise when Ego comes back */
const Crowd: React.FC<{t: number; lights: number}> = ({t, lights}) => {
  const people = useMemo(() => {
    const p: {x: number; y: number; z: number; s: number; seed: number}[] = [];
    for (let r = 0; r < 4; r++) {
      for (let i = 0; i < 26; i++) {
        const seed = r * 31 + i;
        if (rnd(seed + 0.5) < 0.12) continue;
        p.push({x: -6.5 + i * 0.5 + (rnd(seed) - 0.5) * 0.16 + (r % 2) * 0.25, y: 0.32 + r * 0.42, z: -5.0 - r * 0.62, s: 0.9 + 0.2 * rnd(seed + 3), seed});
      }
    }
    return p;
  }, []);
  const fade = {z0: -4.9, z1: -9.2, zmax: 0.55};
  return (
    <>
      {[0, 1, 2, 3].map((r) => (
        <Part key={r} geo={STEP} m={SEAT} y0={-0.2} y1={2} position={[0, 0.16 + r * 0.42, -5.0 - r * 0.62]} fade={fade} />
      ))}
      {people.map((p, i) => {
        // rise on the drop, cheer on every beat after it
        const delay = 0.05 + 0.35 * rnd(p.seed + 7);
        const rise = ss(t, UP + delay, UP + delay + 0.35);
        const cheer = t > UP ? 0.05 * Math.max(0, Math.sin(((t - UP) / BEAT + rnd(p.seed)) * Math.PI)) * rise : 0;
        const flinch = OUT.reduce((m, o) => m + 0.03 * Math.exp(-Math.max(0, t - o - delay * 0.5) * 6) * (t > o ? 1 : 0), 0);
        const y = p.y + 0.12 * rise + cheer + flinch;
        const s = p.s * 0.95;
        return (
          <React.Fragment key={i}>
            <Ball p={[p.x, y + 0.4 * s, p.z]} r={0.105 * s} m={CROWD} y0={0} y1={2.4} fade={fade} />
            <Limb a={[p.x - 0.1 * s, y + 0.2 * s, p.z]} b={[p.x + 0.1 * s, y + 0.2 * s, p.z]} r0={0.11 * s} r1={0.11 * s} m={CROWD} y0={0} y1={2.4} fade={fade} />
          </React.Fragment>
        );
      })}
      {/* camera flashes in the stands: at every fall and when Ego comes back */}
      {[...OUT, UP, UP + 0.2, UP + 0.45].flatMap((at, k) =>
        Array.from({length: k >= 3 ? 7 : 3}, (_, j) => {
          const s = k * 17 + j;
          const tt = at + 0.04 + rnd(s) * 0.5;
          const a = t > tt ? Math.exp(-(t - tt) * 14) : 0;
          if (a < 0.02) return null;
          return <Glow key={`${k}-${j}`} p={[-5 + rnd(s + 1) * 10, 0.75 + rnd(s + 2) * 1.4, -5.2 - rnd(s + 3) * 1.8]} w={0.5} h={0.5} color="#f2f6ff" a={0.9 * a * lights} />;
        }),
      )}
    </>
  );
};
const STEP = roundedBox(14, 0.32, 0.6, 0.04);

const Lanes: React.FC<{st: State[]; lights: number}> = ({st, lights}) => (
  <>
    {ZS.map((z, i) => {
      const s = st[i];
      const e = s.active ? 0.55 + 0.45 * Math.min(1, s.energy) : 0.12;
      return (
        <React.Fragment key={i}>
          <Part geo={matGeo} m={MAT} y0={-0.05} y1={0.05} position={[(X0 + X1) / 2, 0.015, z]} />
          {/* the lane's light: a thin line along its near edge, in the colour of whoever is on it */}
          <Glow p={[(X0 + X1) / 2, 0.034, z + LANE * 0.43]} w={X1 - X0 + 0.3} h={0.05} color={s.tint} a={(0.12 + 0.3 * e) * lights} mode="line" flat />
          <Glow p={[X0 - 0.02, 0.034, z]} w={LANE * 0.8} h={0.06} color={s.tint} a={(0.1 + 0.35 * e) * lights} mode="line" flat rot={90} />
        </React.Fragment>
      );
    })}
    {/* start line across all lanes, under the heads */}
    <Glow p={[X0 - 0.02, 0.035, -2 * LANE]} w={0.06} h={LANE * 5.2} color="#cfe0ff" a={0.22 * lights} mode="line" flat />
  </>
);

/* ───────────── particles ───────────── */

type Burst = {at: number; p: V3; n: number; speed: number; color: string; life: number; seed: number; up?: number; size?: number};

const BurstFx: React.FC<{t: number; b: Burst}> = ({t, b}) => {
  const dt = t - b.at;
  if (dt < 0 || dt > b.life) return null;
  return (
    <>
      {Array.from({length: b.n}, (_, i) => {
        const a = rnd(b.seed + i) * Math.PI * 2;
        const el = (b.up ?? 0.5) + rnd(b.seed + i * 3) * 0.8;
        const v = b.speed * (0.4 + 0.8 * rnd(b.seed + i * 7));
        const life = b.life * (0.5 + 0.5 * rnd(b.seed + i * 11));
        if (dt > life) return null;
        const y = Math.max(0.02, b.p[1] + el * v * dt - 0.5 * G * dt * dt);
        const k = 1 - dt / life;
        const w = (b.size ?? 0.06) * (0.6 + k);
        return <Glow key={i} p={[b.p[0] + Math.cos(a) * v * dt, y, b.p[2] + Math.sin(a) * v * dt * 0.8]} w={w} h={w} color={b.color} a={0.9 * k} />;
      })}
    </>
  );
};

/** an expanding ring of light on the floor */
const Ring: React.FC<{t: number; at: number; p: V3; r: number; color: string; life?: number}> = ({t, at, p, r, color, life = 0.7}) => {
  const k = (t - at) / life;
  if (k < 0 || k > 1) return null;
  const e = 1 - Math.pow(1 - k, 3);
  const R = 0.15 + r * e;
  const n = 44;
  return (
    <>
      {Array.from({length: n}, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        return <Glow key={i} p={[p[0] + Math.cos(a) * R, 0.04, p[2] + Math.sin(a) * R * 0.85]} w={0.16 + 0.1 * e} h={0.16 + 0.1 * e} color={color} a={0.55 * (1 - k)} flat />;
      })}
      <Glow p={[p[0], 0.03, p[2]]} w={R * 2.4} h={R * 2} color={color} a={0.25 * (1 - k)} flat />
    </>
  );
};

/** red embers lifting off the hurt Ego's forearms */
const Embers: React.FC<{t: number; from: V3[]}> = ({t, from}) => {
  if (t < HURT) return null;
  const on = ss(t, HURT, HURT + 0.3);
  return (
    <>
      {Array.from({length: 30}, (_, i) => {
        const period = 0.9 + 0.6 * rnd(i + 3);
        const ph = fract((t - HURT) / period + rnd(i));
        const src = from[i % from.length];
        const x = src[0] + (rnd(i + 5) - 0.5) * 0.25 + Math.sin(t * 2 + i) * 0.05 * ph;
        const z = src[2] + (rnd(i + 9) - 0.5) * 0.2;
        const y = src[1] + ph * (0.5 + 0.5 * rnd(i + 2));
        const a = on * (1 - ph) * (0.5 + 0.5 * rnd(i + 4));
        return <Glow key={i} p={[x, y, z]} w={0.035} h={0.035} color={i % 3 ? '#ff5a2a' : '#ffc08a'} a={a} />;
      })}
    </>
  );
};

/* ───────────── the world ───────────── */

export const World: React.FC<{t: number}> = ({t}) => {
  const look = useLook();
  const lights = ss(t, 0.3, 0.62);
  const st = CAST.map((f) => f(t));
  const js = st.map((s) => solve3(s.rig));
  const hurt = q(ss(t, HURT - 0.05, HURT + 0.3));
  const spent = st.map((s) => q(s.spent));
  const mats = useMemo(() => ({fore: redHot(hurt), s0: spentMat(spent[0]), s1: spentMat(spent[1]), s2: spentMat(spent[2])}), [hurt, spent[0], spent[1], spent[2]]);
  const w = (i: number, p: V3) => W3(p, st[i].root, K3);
  const chestW = (i: number) => w(i, js[i].chest);
  const egoHands = [w(3, js[3].hd[0]), w(3, js[3].hd[1]), w(3, js[3].el[0]), w(3, js[3].el[1])];
  const bursts: Burst[] = [
    ...OUT.map((o, i): Burst => ({at: o + (i === 1 ? 0.3 : 0.15), p: add(w(i, [-0.2, 0.05, 0]), [0, 0, 0]), n: i === 1 ? 8 : 18, speed: 0.9, color: '#8fa3cc', life: 0.8, seed: 7 + i * 40, up: 0.35, size: 0.08})),
    {at: HURT, p: w(3, [-0.55, 0.1, 0]), n: 26, speed: 1.4, color: '#ff4a22', life: 0.9, seed: 301, up: 0.5},
    {at: UP, p: w(3, [-0.5, 0.05, 0]), n: 44, speed: 2.3, color: '#ff5a2a', life: 1.1, seed: 401, up: 0.6},
    {at: UP, p: w(3, [-0.5, 0.05, 0]), n: 22, speed: 1.4, color: '#ffd0a0', life: 0.8, seed: 451, up: 0.9},
  ];
  const redFloor = hurt * (0.65 + 0.35 * Math.sin(t * 9) * (t < UP ? 1 : 0.3)) + 0.6 * (t > UP ? Math.exp(-(t - UP) * 3) : 0);
  const egoC = chestW(3);
  return (
    <>
      <Part geo={floorGeo} m={FLOOR} y0={-1} y1={1} rotation={[-Math.PI / 2, 0, 0]} fade={{z0: -4.3, z1: -9.5, zmax: 1}} />
      {/* the spotlight on the lanes */}
      <Glow p={[-0.1, 0.008, -1.9]} w={6.6 * (0.6 + 0.4 * lights)} h={6.4 * (0.6 + 0.4 * lights)} color="#3b5a9a" a={0.55 * lights} flat />
      <Glow p={[-0.2, 0.009, -1.8]} w={3.8} h={4.2} color="#c8dcff" a={0.12 * lights} flat />
      <Glow p={[0, 2.2, -6.5]} w={16} h={6} color={look.bg.glow} a={0.32 * lights} />
      <Crowd t={t} lights={lights} />
      <Lanes st={st} lights={lights} />
      {st.map((s, i) => {
        const j = js[i];
        const body = i < 3 && spent[i] > 0 ? [mats.s0, mats.s1, mats.s2][i] : look.a.body;
        const l: Look3 = {
          body,
          core: s.tint,
          energy: Math.min(1, s.energy) * lights,
          armMat: i === 3 && hurt > 0 ? [mats.fore, mats.fore] : undefined,
        };
        const c = chestW(i);
        return (
          <React.Fragment key={i}>
            <Man j={j} root={s.root} k={K3} l={l} />
            {/* the chest light on the floor under him */}
            <Glow p={[c[0], 0.04, c[2]]} w={1.1} h={0.75} color={s.tint} a={(s.active ? 0.22 + 0.25 * Math.min(1.3, s.energy) : 0.04) * lights} flat />
          </React.Fragment>
        );
      })}
      {/* Ego: the red under him, the rings, the embers */}
      {hurt > 0 ? <Glow p={[egoC[0] + 0.1, 0.045, egoC[2]]} w={2.6} h={1.5} color={TINT.hurt} a={0.32 * redFloor} flat /> : null}
      <Ring t={t} at={HURT} p={egoC} r={1.3} color="#ff3a1e" />
      <Ring t={t} at={UP} p={egoC} r={2.6} color="#ff5a2a" life={0.9} />
      <Ring t={t} at={UP + 0.12} p={egoC} r={1.6} color="#ffc08a" life={0.7} />
      <Embers t={t} from={egoHands} />
      {/* strain sparks: sweat of light off whoever is shaking */}
      {st.map((s, i) =>
        s.strain > 0.25 && s.active && i !== 3
          ? Array.from({length: 3}, (_, k) => {
              const ph = fract(t * 1.7 + rnd(i * 9 + k));
              const c = chestW(i);
              return <Glow key={`${i}-${k}`} p={[c[0] + (rnd(i + k * 3) - 0.5) * 0.4, c[1] + 0.12 + ph * 0.35, c[2] + (rnd(i * 2 + k) - 0.5) * 0.3]} w={0.03} h={0.03} color={s.tint} a={0.6 * (1 - ph) * s.strain} />;
            })
          : null,
      )}
      {bursts.map((b, i) => (
        <BurstFx key={i} t={t} b={b} />
      ))}
      {void mul}
      {void beat}
    </>
  );
};
