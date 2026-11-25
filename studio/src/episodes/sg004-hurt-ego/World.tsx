import React, {useMemo} from 'react';
import {clamp, fract, lerp, rnd, ss} from '../nc001-work-smart/anim';
import {Ball, Glow, Limb, useLook, type V3} from '../nc001-work-smart/kit3d';
import {mat, type Mat} from '../nc001-work-smart/looks';
import {mixHex} from '../nc001-work-smart/world';
import {K3, Man, W3, type J3, type Look3} from '../sg003-same-bar/rig3';
import {BEAT, beat, gap} from './grid';
import {PoolFloor, Shade, onFloor} from './fx';
import {CAST, HURT, LANE, OBS_UP, OUT, PB, TINT, UP, ZS, solveP, type State} from './plan';

const B = beat;
const G = 9.8;
const X0 = -1.75;
const X1 = 1.55;
const CROWD = mat('#4b5878', '#1a2134', {shade: '#141a2a', rim: '#8ea4d6', rimAmt: 0.3, rimPow: 2.4, wrap: 0.7});

const q = (x: number, n = 20) => Math.round(clamp(x) * n) / n;
/** porcelain going red-hot (the hurt Ego's arms) */
const redHot = (k: number): Mat => mat(mixHex('#ffffff', '#ffd9a0', k), mixHex('#a9b9d6', '#ff3a1e', k), {shade: mixHex('#56688f', '#ff2a14', k), rim: mixHex('#dcebff', '#ffe0b0', k), rimAmt: 0.6, rimPow: 2, wrap: 1, emit: 0.96 + 0.7 * k});
/** porcelain that has given up: cold grey-blue, no glow */
const spentMat = (k: number): Mat => mat(mixHex('#ffffff', '#6d778e', k), mixHex('#a9b9d6', '#1e2436', k), {shade: mixHex('#56688f', '#0e121e', k), rim: mixHex('#dcebff', '#5d6c90', k), rimAmt: 0.5 - 0.2 * k, rimPow: 2.4, wrap: 0.75, emit: 0.96 - 0.4 * k});

/* ───────────── the spotlight: where it points, how wide, what colour ───────────── */

export const spot = (t: number) => {
  const toPair = ss(t, B(-4.5), B(-2.8)) * (1 - ss(t, B(8), B(11)));
  const cx = lerp(-0.2, -0.35, toPair);
  const cz = lerp(-1.9, -0.55, toPair);
  const r = lerp(2.9, 1.9, toPair);
  const hurt = ss(t, HURT - 0.05, HURT + 0.25);
  const red = hurt * (t < UP ? 0.85 + 0.15 * gap(t) : 0.55 + 0.45 * Math.exp(-(t - UP) * 1.5));
  const on = ss(t, 0.3, 0.55);
  // the light dips in every gap of the stutter, flares on the drop
  const amp = on * (1 - 0.35 * gap(t)) * (1 + 0.25 * (t > UP ? Math.exp(-(t - UP) * 4) : 0));
  return {c: [cx, 0, cz] as V3, r, red, amp, color: mixHex('#dfe8ff', '#ff3a26', red)};
};

/* ───────────── the arena ───────────── */

/** tiered stands behind the lanes, packed with silhouettes that rise when Ego comes back */
const Crowd: React.FC<{t: number; lights: number}> = ({t, lights}) => {
  const people = useMemo(() => {
    const p: {x: number; y: number; z: number; s: number; seed: number}[] = [];
    for (let r = 0; r < 6; r++) {
      for (let i = 0; i < 36; i++) {
        const seed = r * 53 + i;
        if (rnd(seed + 0.5) < 0.07) continue;
        p.push({x: -6.6 + i * 0.37 + (rnd(seed) - 0.5) * 0.12 + (r % 2) * 0.18, y: 0.3 + r * 0.36, z: -5.0 - r * 0.5, s: 0.88 + 0.24 * rnd(seed + 3), seed});
      }
    }
    return p;
  }, []);
  const fade = {z0: -4.9, z1: -9.5, zmax: 0.5};
  return (
    <>
      {people.map((p, i) => {
        const delay = 0.05 + 0.35 * rnd(p.seed + 7);
        const rise = ss(t, UP + delay, UP + delay + 0.35);
        const cheer = t > UP ? 0.05 * Math.max(0, Math.sin(((t - UP) / BEAT + rnd(p.seed)) * Math.PI)) * rise : 0;
        const flinch = OUT.reduce((m, o) => m + 0.03 * Math.exp(-Math.max(0, t - o - delay * 0.5) * 6) * (t > o ? 1 : 0), 0) + 0.04 * (t > HURT ? Math.exp(-(t - HURT - delay * 0.4) * 5) : 0) * (t > HURT + delay * 0.4 ? 1 : 0);
        const sway = 0.012 * Math.sin(t * (1.3 + rnd(p.seed + 4)) + p.seed);
        const y = p.y + 0.12 * rise + cheer + flinch;
        const s = p.s;
        return (
          <React.Fragment key={i}>
            <Ball p={[p.x + sway, y + 0.36 * s, p.z]} r={0.1 * s} m={CROWD} y0={0} y1={2.6} fade={fade} />
            <Limb a={[p.x - 0.09 * s, y + 0.17 * s, p.z]} b={[p.x + 0.09 * s, y + 0.17 * s, p.z]} r0={0.11 * s} r1={0.11 * s} m={CROWD} y0={0} y1={2.6} fade={fade} />
          </React.Fragment>
        );
      })}
      {/* phone screens glowing here and there */}
      {Array.from({length: 22}, (_, j) => {
        const p = people[Math.floor(rnd(j + 77) * people.length)];
        return <Glow key={`p${j}`} p={[p.x + 0.06, p.y + 0.3, p.z + 0.12]} w={0.09} h={0.09} color="#bcd4ff" a={(0.25 + 0.2 * Math.sin(t * 2 + j)) * lights} />;
      })}
      {/* camera flashes: at every fall, at the hurt, and a storm when Ego comes back */}
      {[...OUT, HURT, UP, UP + 0.2, UP + 0.45, UP + 0.8].flatMap((at, k) =>
        Array.from({length: k >= 4 ? 8 : 4}, (_, j) => {
          const s = k * 17 + j;
          const tt = at + 0.03 + rnd(s) * 0.45;
          const a = t > tt ? Math.exp(-(t - tt) * 14) : 0;
          if (a < 0.02) return null;
          return <Glow key={`${k}-${j}`} p={[-5 + rnd(s + 1) * 10, 0.7 + rnd(s + 2) * 1.8, -5.1 - rnd(s + 3) * 2.2]} w={0.55} h={0.55} color="#f2f6ff" a={0.95 * a * lights} />;
        }),
      )}
    </>
  );
};

/** lane lines on the glossy floor, the start line under the heads, and streaks of light racing down a lane */
const Lanes: React.FC<{t: number; st: State[]; lights: number}> = ({t, st, lights}) => {
  const lines = Array.from({length: 6}, (_, i) => ZS[0] - LANE / 2 + i * LANE);
  const streak = (at: number, z: number, color: string, key: string, speed = 9, a = 0.9) => {
    const dt = t - at;
    if (dt < 0 || dt > 0.8) return null;
    const x = X0 - 0.3 + dt * speed;
    return <Glow key={key} p={[x, 0.012, z]} w={1.6} h={0.06} color={color} a={a * (1 - dt / 0.8) * lights} mode="line" flat />;
  };
  return (
    <>
      {lines.map((z, i) => (
        <Glow key={i} p={[(X0 + X1) / 2 + 0.8, 0.01, z]} w={X1 - X0 + 2.6} h={0.035} color="#c8d8ff" a={0.2 * lights} mode="line" flat />
      ))}
      <Glow p={[X0 - 0.35, 0.011, -2 * LANE]} w={0.05} h={LANE * 5.1} color="#e8f0ff" a={0.35 * lights} mode="line" flat />
      {/* a fall: a red streak down that lane; the drop: white-hot streaks down every lane */}
      {OUT.map((o, i) => streak(o + 0.05, ZS[i], '#ff5a4a', `o${i}`, 8, 0.8))}
      {lines.map((z, i) => streak(UP + 0.03 * i, z, '#ffd7c0', `u${i}`, 11))}
      {streak(UP, ZS[3], '#ff4a2a', 'ue', 7)}
      {streak(HURT, ZS[3], '#ff3a1e', 'h', 6)}
    </>
  );
};

/** dust in the beam */
const Haze: React.FC<{t: number; sp: ReturnType<typeof spot>}> = ({t, sp}) => (
  <>
    {Array.from({length: 70}, (_, i) => {
      const a0 = rnd(i + 1) * Math.PI * 2;
      const rr = Math.sqrt(rnd(i + 2)) * sp.r * 1.1;
      const y = fract(rnd(i + 3) + t * (0.02 + 0.03 * rnd(i + 4))) * 2.6 + 0.05;
      const x = sp.c[0] + Math.cos(a0) * rr + Math.sin(t * 0.4 + i) * 0.06;
      const z = sp.c[2] + Math.sin(a0) * rr * 0.9;
      const tw = 0.5 + 0.5 * Math.sin(t * (1 + rnd(i) * 2) + i * 3);
      const a = (0.12 + 0.3 * rnd(i + 6)) * tw * sp.amp * (1 - rr / (sp.r * 1.2)) * (1 - y / 3);
      return <Glow key={i} p={[x, y, z]} w={0.03 + 0.03 * rnd(i + 8)} h={0.03 + 0.03 * rnd(i + 8)} color={sp.color} a={a} />;
    })}
  </>
);

/* ───────────── shadows ───────────── */

const SEGS = (j: J3): [V3, V3, number][] => [
  [j.shc, j.hip[0], PB.tr[1] * 0.95],
  [j.sh[0], j.el[0], PB.ar[0]],
  [j.el[0], j.hd[0], PB.ar[1]],
  [j.sh[1], j.el[1], PB.ar[0]],
  [j.el[1], j.hd[1], PB.ar[1]],
  [j.hip[0], j.kn[0], PB.lr[0]],
  [j.kn[0], j.ft[0], PB.lr[1]],
  [j.hip[1], j.kn[1], PB.lr[0]],
  [j.kn[1], j.ft[1], PB.lr[1]],
  [j.head, j.head, PB.headR],
];

const Shadows: React.FC<{j: J3; root: V3; amp: number}> = ({j, root, amp}) => (
  <>
    {SEGS(j).map(([a, b, r], k) => {
      const A = W3(a, root, K3);
      const Bw = W3(b, root, K3);
      const h = (A[1] + Bw[1]) / 2;
      return <Shade key={k} a={onFloor(A)} b={onFloor(Bw)} r={r * K3 * (1 + 0.8 * h)} alpha={0.95 * amp * Math.exp(-h * 0.9)} soft={0.5 + 0.4 * Math.min(1, h)} />;
    })}
  </>
);

/* ───────────── motion: stroboscopic ghosts of a fall or a push ───────────── */

const Ghosts: React.FC<{t: number; i: number; at: number; len: number; color: string}> = ({t, i, at, len, color}) => {
  const dt = t - at;
  if (dt < -0.05 || dt > len + 0.25) return null;
  const fade = 1 - clamp((dt - len) / 0.25);
  return (
    <>
      {Array.from({length: 6}, (_, k) => {
        const tk = t - (k + 1) * 0.035;
        if (tk < at - 0.05) return null;
        const s = CAST[i](tk);
        const j = solveP(s.rig);
        const h = W3(j.head, s.root, K3);
        const c = W3(j.shc, s.root, K3);
        const a = 0.32 * (1 - k / 6) * fade;
        return (
          <React.Fragment key={k}>
            <Glow p={h} w={PB.headR * K3 * 3} h={PB.headR * K3 * 3} color={color} a={a} />
            <Glow p={c} w={0.4} h={0.4} color={color} a={a * 0.6} />
          </React.Fragment>
        );
      })}
    </>
  );
};

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
  const n = 56;
  return (
    <>
      {Array.from({length: n}, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        return <Glow key={i} p={[p[0] + Math.cos(a) * R, 0.03, p[2] + Math.sin(a) * R * 0.85]} w={0.14 + 0.1 * e} h={0.14 + 0.1 * e} color={color} a={0.6 * (1 - k)} flat />;
      })}
      <Glow p={[p[0], 0.02, p[2]]} w={R * 2.4} h={R * 2} color={color} a={0.22 * (1 - k)} flat />
    </>
  );
};

/** red embers lifting off the hurt Ego's arms */
const Embers: React.FC<{t: number; from: V3[]}> = ({t, from}) => {
  if (t < HURT) return null;
  const on = ss(t, HURT, HURT + 0.3);
  return (
    <>
      {Array.from({length: 36}, (_, i) => {
        const period = 0.9 + 0.6 * rnd(i + 3);
        const ph = fract((t - HURT) / period + rnd(i));
        const src = from[i % from.length];
        const x = src[0] + (rnd(i + 5) - 0.5) * 0.2 + Math.sin(t * 2 + i) * 0.06 * ph;
        const z = src[2] + (rnd(i + 9) - 0.5) * 0.16;
        const y = src[1] + ph * (0.55 + 0.5 * rnd(i + 2));
        const a = on * (1 - ph) * (0.5 + 0.5 * rnd(i + 4));
        return <Glow key={i} p={[x, y, z]} w={0.035} h={0.035} color={i % 3 ? '#ff5a2a' : '#ffc08a'} a={a} />;
      })}
    </>
  );
};

const DRIP = 0.13;
/** red-hot drops off the elbows once he is up on straight arms, gathering in a glowing pool around his hands */
const Drips: React.FC<{t: number}> = ({t}) => {
  const t0 = UP + 0.25;
  if (t < t0) return null;
  const n = Math.floor((t - t0) / DRIP);
  const out: React.ReactNode[] = [];
  for (let i = Math.max(0, n - 10); i <= n; i++) {
    const ts = t0 + i * DRIP + rnd(i) * 0.05;
    if (ts > t) continue;
    const s = CAST[3](ts);
    const j = solveP(s.rig);
    const side = i % 2;
    const p0 = W3([(j.el[side][0] + j.hd[side][0]) / 2, (j.el[side][1] + j.hd[side][1]) / 2, j.el[side][2]], s.root, K3);
    const dt = t - ts;
    const ft = Math.sqrt((2 * p0[1]) / G);
    if (dt < ft) out.push(<Glow key={i} p={[p0[0], p0[1] - 0.5 * G * dt * dt, p0[2]]} w={0.04} h={0.065} color="#ff5a2a" a={0.95} />);
    else if (dt < ft + 0.7) {
      const k = 1 - (dt - ft) / 0.7;
      out.push(<Glow key={i} p={[p0[0], 0.015, p0[2]]} w={0.15 * (1.5 - k)} h={0.08 * (1.5 - k)} color="#ff4a22" a={0.7 * k} flat />);
    }
  }
  return <>{out}</>;
};

/* ───────────── the world ───────────── */

export const World: React.FC<{t: number}> = ({t}) => {
  const look = useLook();
  const sp = spot(t);
  const lights = sp.amp;
  const st = CAST.map((f) => f(t));
  const js = st.map((s) => solveP(s.rig));
  const hurt = q(ss(t, HURT - 0.05, HURT + 0.3));
  const spent = st.map((s) => q(s.spent));
  const mats = useMemo(() => ({fore: redHot(hurt), s0: spentMat(spent[0]), s1: spentMat(spent[1]), s2: spentMat(spent[2])}), [hurt, spent[0], spent[1], spent[2]]);
  const w = (i: number, p: V3) => W3(p, st[i].root, K3);
  const chestW = (i: number) => w(i, js[i].chest);
  const ej = js[3];
  const egoArms = [w(3, ej.hd[0]), w(3, ej.hd[1]), w(3, ej.el[0]), w(3, ej.el[1])];
  const bursts: Burst[] = [
    ...OUT.map((o, i): Burst => ({at: o + (i === 1 ? 0.35 : 0.17), p: w(i, [-0.2, 0.05, 0]), n: i === 1 ? 10 : 22, speed: 1.0, color: '#9fb3dc', life: 0.9, seed: 7 + i * 40, up: 0.35, size: 0.08})),
    {at: HURT, p: w(3, [-0.55, 0.1, 0]), n: 34, speed: 1.6, color: '#ff4a22', life: 1.0, seed: 301, up: 0.5},
    {at: UP, p: w(3, [-0.5, 0.05, 0]), n: 60, speed: 2.6, color: '#ff5a2a', life: 1.2, seed: 401, up: 0.6},
    {at: UP, p: w(3, [-0.5, 0.05, 0]), n: 30, speed: 1.6, color: '#ffd0a0', life: 0.9, seed: 451, up: 0.9},
    {at: OBS_UP + 0.3, p: w(4, [-0.5, 0.05, 0]), n: 16, speed: 1.0, color: TINT.obs, life: 0.7, seed: 501, up: 0.6},
  ];
  const egoC = chestW(3);
  const pool = mixHex('#3a4257', '#4e2a2e', sp.red * 0.6);
  return (
    <>
      <PoolFloor c={[sp.c[0], sp.c[2]]} r={sp.r * 1.3} edge={0.1} pool={mixHex('#03050a', pool, clamp(lights))} base="#020307" />
      {/* the spotlight: a bright pool, a softer halo, light in the air */}
      <Glow p={[sp.c[0], 0.004, sp.c[2]]} w={sp.r * 2.0} h={sp.r * 1.8} color={sp.color} a={0.07 * lights} flat />
      <Glow p={[sp.c[0], 0.005, sp.c[2]]} w={sp.r * 1.2} h={sp.r * 1.1} color={sp.color} a={0.06 * lights} flat />
      {/* shafts of light standing behind the lanes, as in the reference */}
      {[-2.2, -0.6, 1.0].map((x, i) => (
        <Glow key={`sh${i}`} p={[x, 2.2, -4.2]} w={1.1} h={6} color={i === 1 ? sp.color : mixHex('#dfe8ff', '#ff3a26', sp.red * 0.4)} a={(0.16 + 0.05 * Math.sin(t * 1.3 + i)) * lights} mode="beam" />
      ))}
      <Glow p={[0, 2.4, -7]} w={18} h={6} color={mixHex(look.bg.glow, '#7a1a14', sp.red * 0.5)} a={0.4 * lights} />
      <Haze t={t} sp={sp} />
      <Crowd t={t} lights={lights} />
      <Lanes t={t} st={st} lights={lights} />
      {st.map((s, i) => {
        const j = js[i];
        const body = i < 3 && spent[i] > 0 ? [mats.s0, mats.s1, mats.s2][i] : look.a.body;
        const l: Look3 = {
          body,
          core: s.tint,
          energy: Math.min(1, s.energy) * clamp(lights),
          armMat: i === 3 && hurt > 0 ? [mats.fore, mats.fore] : undefined,
        };
        const c = chestW(i);
        return (
          <React.Fragment key={i}>
            <Shadows j={j} root={s.root} amp={clamp(lights)} />
            <Man j={j} root={s.root} k={K3} l={l} body={PB} />
            {/* his runway: a bar of light along the lane under his body, alive while he holds, dead when he is out */}
            <Glow p={[0.1, 0.012, ZS[i] + 0.04]} w={2.2} h={0.42} color={mixHex('#eef3ff', s.tint, 0.35)} a={(s.active ? 0.22 + 0.12 * Math.min(1.3, s.energy) : 0.03) * clamp(lights)} mode="line" flat />
            <Glow p={[0.1, 0.013, ZS[i] + 0.04]} w={2.0} h={0.12} color="#ffffff" a={(s.active ? 0.3 : 0.02) * clamp(lights) * (i === 3 ? 1 - 0.6 * hurt : 1)} mode="line" flat />
            {/* the chest light on the floor under him */}
            <Glow p={[c[0], 0.03, c[2]]} w={1.0} h={0.7} color={s.tint} a={(s.active ? 0.25 + 0.3 * Math.min(1.3, s.energy) : 0.03) * clamp(lights)} flat />
          </React.Fragment>
        );
      })}
      {[0, 1, 2].map((i) => (
        <Ghosts key={i} t={t} i={i} at={OUT[i] - 0.02} len={i === 1 ? 0.5 : 0.25} color="#dfe8ff" />
      ))}
      <Ghosts t={t} i={3} at={UP - 0.02} len={0.25} color="#ffb59a" />
      {/* Ego: the red under him, the rings, the embers, the drips */}
      {hurt > 0 ? <Glow p={[egoC[0] + 0.1, 0.035, egoC[2]]} w={2.8} h={1.6} color={TINT.hurt} a={0.35 * hurt * (0.7 + 0.3 * Math.sin(t * 9)) * (1 - 0.4 * gap(t))} flat /> : null}
      <Ring t={t} at={HURT} p={egoC} r={1.4} color="#ff3a1e" />
      <Ring t={t} at={UP} p={egoC} r={3.0} color="#ff5a2a" life={0.9} />
      <Ring t={t} at={UP + 0.12} p={egoC} r={1.8} color="#ffc08a" life={0.7} />
      <Embers t={t} from={egoArms} />
      <Drips t={t} />
      {t > UP ? <Glow p={[(egoArms[0][0] + egoArms[1][0]) / 2, 0.02, (egoArms[0][2] + egoArms[1][2]) / 2]} w={0.5 + 0.5 * ss(t, UP, B(10))} h={0.35 + 0.35 * ss(t, UP, B(10))} color="#ff3a1e" a={0.45 * ss(t, UP + 0.3, UP + 2)} flat /> : null}
      {/* strain: sparks of light off whoever is shaking */}
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
    </>
  );
};
