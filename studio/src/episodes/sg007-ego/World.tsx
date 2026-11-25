import React, {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {clamp, fract, lerp, rnd, ss} from '../nc001-work-smart/anim';
import {Ball, Glow, light, Limb, Part, roundedBox, useLook, type V3} from '../nc001-work-smart/kit3d';
import {mat, type Mat} from '../nc001-work-smart/looks';
import {mixHex} from '../nc001-work-smart/world';
import {add, HB, K3, Man, mul, W3, type J3, type Look3} from '../sg003-same-bar/rig3';
import {Shade} from '../sg004-hurt-ego/fx';
import {BurstFx, Crown, GOLD, redHot, spentMat, type Burst} from '../sg005-top/World';
import {hit, K} from './grid';
import {CAST, TINT, TINTS, TP, tw, WALL, type State} from './plan';
import {clasp, PEG, solveR, TOP, TY} from './rig';
import {CLAY, useSty} from './styles';
import {ToonFig} from './toon';
import {EnvWorld} from './envs';

const G = 9.8;
const q = (x: number, n = 16) => Math.round(clamp(x) * n) / n;

/* ───────────── light: which spots are on ───────────── */

/** 0..1 house lights (the arena), and each table's spot */
export const lights = (t: number) => {
  const out = ss(t, K.dark - 0.04, K.dark + 0.02);
  const back = ss(t, K.t4 - 0.25, K.t4 + 0.05);
  const house = 1 - out * (1 - back);
  // the active table is brightest
  const active = t < 4.9 ? 0 : t < 9.45 ? 1 : t < 16.2 ? 2 : t < 25 ? 3 : 4;
  const spots = [0, 1, 2, 3, 4].map((i) => {
    const base = i === active ? 1 : 0.55;
    // in the dark: Obsession's spot clunks on, then Discipline's far away; Ego keeps a red glow
    const dark = i === 3 ? ss(t, 16.72, 16.78) : i === 4 ? ss(t, K.more - 0.03, K.more + 0.03) : 0;
    return lerp(dark, base, house);
  });
  return {house, spots};
};

/* ───────────── floor: dark, glossy, one pool per table ───────────── */

const FLOOR_VERT = /* glsl */ `varying vec3 vW; void main(){ vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FLOOR_FRAG = /* glsl */ `
uniform vec4 uP[6]; uniform vec3 uC[6]; uniform vec3 uBase; uniform float uHouse, uGrid; varying vec3 vW;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec3 col = uBase;
  // faint boards of the stage floor
  vec2 g = abs(fract(vW.xz * vec2(0.5, 0.5)) - 0.5);
  float line = 1.0 - smoothstep(0.0, 0.012, min(g.x, g.y));
  col += vec3(0.004, 0.006, 0.012) * line * uHouse * uGrid;
  for (int i = 0; i < 6; i++) {
    vec4 p = uP[i];
    float d = length((vW.xz - p.xy) * vec2(1.0, 1.0));
    float k = 1.0 - smoothstep(p.z * 0.55, p.z, d);
    float core = exp(-d * d / (p.z * p.z * 0.18));
    col += uC[i] * p.w * (k * k * (3.0 - 2.0 * k) * 0.55 + core * 0.35);
  }
  col += (h(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;
const floorGeo = new THREE.PlaneGeometry(90, 90);

const Floor: React.FC<{pools: {c: V3; r: number; a: number; color: string}[]; house: number}> = ({pools, house}) => {
  const sty = useSty();
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: FLOOR_VERT,
        fragmentShader: FLOOR_FRAG,
        uniforms: {
          uP: {value: Array.from({length: 6}, () => new THREE.Vector4())},
          uC: {value: Array.from({length: 6}, () => new THREE.Color())},
          uBase: {value: new THREE.Color()},
          uHouse: {value: 1},
          uGrid: {value: 1},
        },
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  const u = material.uniforms;
  for (let i = 0; i < 6; i++) {
    const p = pools[i];
    (u.uP.value[i] as THREE.Vector4).set(p ? p.c[0] : 0, p ? p.c[2] : 0, p ? p.r : 1, p ? p.a : 0);
    (u.uC.value[i] as THREE.Color).set(p ? p.color : '#000000');
  }
  (u.uBase.value as THREE.Color).set(mixHex(sty.floor[0], sty.floor[1], house));
  u.uHouse.value = house;
  u.uGrid.value = sty.grid;
  return <mesh geometry={floorGeo} material={material} rotation={[-Math.PI / 2, 0, 0]} renderOrder={0} />;
};

/* ───────────── a spotlight's cone in the haze ───────────── */

const CONE_VERT = /* glsl */ `varying vec3 vN; varying vec3 vV; varying float vY;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vec4 mv = viewMatrix * w; vN = normalize(normalMatrix * normal); vV = -mv.xyz; vY = uv.y; gl_Position = projectionMatrix * mv; }`;
const CONE_FRAG = /* glsl */ `uniform vec3 uC; uniform float uA; varying vec3 vN; varying vec3 vV; varying float vY;
void main(){ float f = abs(dot(normalize(vN), normalize(vV))); float a = pow(f, 2.2) * (0.25 + 0.75 * pow(vY, 1.4)) * uA; gl_FragColor = vec4(uC * a, a); }`;
const coneGeo = new THREE.ConeGeometry(1, 1, 48, 1, true);

const Cone: React.FC<{p: V3; r: number; h: number; color: string; a: number}> = ({p, r, h, color, a}) => {
  const material = useMemo(() => new THREE.ShaderMaterial({vertexShader: CONE_VERT, fragmentShader: CONE_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: {uC: {value: new THREE.Color()}, uA: {value: 0}}}), []);
  useEffect(() => () => material.dispose(), [material]);
  (material.uniforms.uC.value as THREE.Color).set(color);
  material.uniforms.uA.value = a;
  if (a <= 0.002) return null;
  // the cone's apex is at the top (the lamp), its base on the floor; uv.y = 1 at the apex
  return <mesh geometry={coneGeo} material={material} position={[p[0], h / 2, p[2]]} scale={[r, h, r]} rotation={[Math.PI, 0, 0]} renderOrder={7} />;
};

/* ───────────── the tables ───────────── */

const STEEL = mat('#5a6688', '#1a2032', {shade: '#0d111c', rim: '#a8bce8', rimAmt: 0.45, rimPow: 2.2, wrap: 0.6, spec: 0.7});
const TOPM = mat('#2b3450', '#141a2a', {shade: '#0a0d16', rim: '#9fb4e6', rimAmt: 0.5, rimPow: 2.4, wrap: 0.6, spec: 0.9});
const topGeo = roundedBox(TOP.x * 2 * K3, TOP.th * K3, TOP.z * 2 * K3, 0.03);
const padGeo = roundedBox(0.2 * K3, 0.018 * K3, 0.2 * K3, 0.008);

const padMat = new Map<string, Mat>();
const pad = (c: string) => {
  if (!padMat.has(c)) padMat.set(c, mat(mixHex(c, '#ffffff', 0.15), mixHex(c, '#000000', 0.45), {shade: mixHex(c, '#000000', 0.7), rim: c, rimAmt: 0.5, wrap: 0.7, emit: 1.05}));
  return padMat.get(c)!;
};

const tmats = new Map<string, [Mat, Mat]>();
const tableMats = (st: [string, string], tp: [string, string]): [Mat, Mat] => {
  const k = st.join() + tp.join();
  if (!tmats.has(k)) tmats.set(k, [mat(st[0], st[1], {shade: mixHex(st[1], '#000000', 0.5), rim: mixHex(st[0], '#ffffff', 0.5), rimAmt: 0.45, rimPow: 2.2, wrap: 0.6, spec: 0.7}), mat(tp[0], tp[1], {shade: mixHex(tp[1], '#000000', 0.5), rim: mixHex(tp[0], '#ffffff', 0.5), rimAmt: 0.5, rimPow: 2.4, wrap: 0.6, spec: 0.9})]);
  return tmats.get(k)!;
};

const Table: React.FC<{i: number; shake: number; color: string}> = ({i, shake, color}) => {
  const sty = useSty();
  const [STEEL, TOPM] = tableMats(sty.steel, sty.top);
  const c = tw(i);
  const s = K3;
  const y = TY * s;
  const sx = shake * Math.sin(i * 7 + shake * 40) * 0.01;
  const P = (x: number, yy: number, z: number): V3 => [c[0] + x * s + sx, yy, c[2] + z * s];
  return (
    <>
      {/* base plate, column, the top, elbow pads, grip pegs */}
      <Limb a={P(0, 0.01, 0)} b={P(0, 0.035, 0)} r0={0.19} r1={0.17} m={STEEL} y0={0} y1={0.1} />
      <Limb a={P(0, 0.05, 0)} b={P(0, y - 0.03, 0)} r0={0.07} r1={0.06} m={STEEL} y0={0} y1={y} />
      <Part geo={topGeo} m={TOPM} y0={y - 0.06} y1={y + 0.02} position={P(0, y - TOP.th * s * 0.5, 0)} />
      <Part geo={padGeo} m={pad(TINT.ego)} y0={y - 0.02} y1={y + 0.03} position={P(-0.125, y + 0.004, 0)} />
      <Part geo={padGeo} m={pad(color)} y0={y - 0.02} y1={y + 0.03} position={P(0.125, y + 0.004, 0)} />
      {[-1, 1].map((sd) => (
        <React.Fragment key={sd}>
          <Limb a={P(sd * PEG[0], y, sd * PEG[2])} b={P(sd * PEG[0], (PEG[1] + 0.05) * s, sd * PEG[2])} r0={0.022} r1={0.02} m={STEEL} y0={y} y1={y + 0.15} />
          <Ball p={P(sd * PEG[0], (PEG[1] + 0.05) * s, sd * PEG[2])} r={0.03} m={STEEL} y0={y} y1={y + 0.2} />
        </React.Fragment>
      ))}
      {/* a thin light strip round the table's edge, in the opponent's colour */}
      <Glow p={P(0, y - 0.03, TOP.z + 0.002)} w={TOP.x * 2 * s} h={0.025} color={color} a={0.5} mode="line" />
    </>
  );
};

/* ───────────── the arena: boards, the crowd in the dark, the scoreboard ───────────── */

const BOARD = mat('#232c46', '#0b0f1a', {shade: '#06080f', rim: '#7f95c8', rimAmt: 0.35, rimPow: 2.4, wrap: 0.6, spec: 0.5});
const CROWD = mat('#2c3550', '#0d1220', {shade: '#0a0d18', rim: '#6d80b0', rimAmt: 0.25, rimPow: 2.4, wrap: 0.7});
const boardGeo = roundedBox(0.12, 0.95, 1, 0.02);

/** the board Ego hits, along z at WALL.x; a dent and a crack star at the impact */
const Wall: React.FC<{t: number; house: number}> = ({t, house}) => {
  const x = WALL.x * K3;
  const z0 = WALL.z * K3;
  const L = WALL.len;
  const imp = K.slam + 0.36;
  const k = t > imp ? 1 : 0;
  const hz = z0 - 0.08 * K3;
  return (
    <>
      <Part geo={boardGeo} m={BOARD} y0={0} y1={1} position={[x - 0.06, 0.475, z0]} scale={[1, 1, L]} />
      <Glow p={[x + 0.001, 0.93, z0]} w={L} h={0.03} color="#7fa2ff" a={0.55 * (0.4 + 0.6 * house)} mode="line" rot={0} />
      <mesh position={[x + 0.002, 0.93, z0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[L, 0.02]} />
        <meshBasicMaterial color="#9fbaff" />
      </mesh>
      {/* impact: cracks spread on the board's face, a ring of light, dust */}
      {k
        ? Array.from({length: 9}, (_, i) => {
            const a = (i / 9) * Math.PI * 2 + rnd(i) * 0.5;
            const g = ss(t, imp, imp + 0.12 + 0.1 * rnd(i + 3));
            const r = (0.25 + 0.3 * rnd(i + 1)) * g;
            const c: V3 = [x + 0.005, 0.6, hz];
            const m: V3 = [x + 0.005, 0.6 + Math.sin(a) * r * 0.55, hz + Math.cos(a) * r * 0.55 + 0.04 * Math.sin(i * 3)];
            const e: V3 = [x + 0.005, 0.6 + Math.sin(a + 0.25) * r, hz + Math.cos(a + 0.25) * r];
            return (
              <React.Fragment key={i}>
                <Limb a={c} b={m} r0={0.008} r1={0.006} m={CRACKW} y0={0} y1={1} />
                <Limb a={m} b={e} r0={0.006} r1={0.003} m={CRACKW} y0={0} y1={1} />
              </React.Fragment>
            );
          })
        : null}
      {k ? <Glow p={[x + 0.02, 0.6, hz]} w={0.9} h={0.9} color="#bcd4ff" a={0.7 * hit(t, imp, 3)} /> : null}
    </>
  );
};
const CRACKW = mat('#0a0d16', '#0a0d16', {shade: '#000000', rim: '#8fb0ff', rimAmt: 0.6, wrap: 0.5, emit: 1});

/** silhouettes of a crowd in tiers far behind, and phone lights */
const cmats = new Map<string, Mat>();
const crowdMat = (c: string) => {
  if (!cmats.has(c)) cmats.set(c, mat(c, mixHex(c, '#000000', 0.55), {shade: mixHex(c, '#000000', 0.7), rim: mixHex(c, '#ffffff', 0.4), rimAmt: 0.25, rimPow: 2.4, wrap: 0.7}));
  return cmats.get(c)!;
};

const Crowd: React.FC<{t: number; house: number}> = ({t, house}) => {
  const sty = useSty();
  const CROWD = crowdMat(sty.crowd);
  const people = useMemo(() => {
    const p: {x: number; y: number; z: number; s: number; seed: number}[] = [];
    for (let r = 0; r < 5; r++) {
      for (let i = 0; i < 46; i++) {
        const seed = r * 61 + i;
        if (rnd(seed + 0.5) < 0.1) continue;
        p.push({x: -9 + i * 0.4 + (rnd(seed) - 0.5) * 0.14 + (r % 2) * 0.2, y: 0.4 + r * 0.42, z: -16.5 - r * 0.55, s: 0.9 + 0.25 * rnd(seed + 3), seed});
      }
    }
    return p;
  }, []);
  const wins = [K.w1, K.w2, K.w3, K.broke];
  const fade = {z0: -16, z1: -21, zmax: 0.55};
  return (
    <>
      {people.map((p, i) => {
        const cheer = wins.reduce((m, w) => m + (t > w + 0.05 * rnd(p.seed) ? 0.08 * Math.exp(-(t - w) * 3) : 0), 0);
        const y = p.y + cheer + 0.01 * Math.sin(t * (1.2 + rnd(p.seed + 4)) + p.seed);
        return (
          <React.Fragment key={i}>
            <Ball p={[p.x, y + 0.36 * p.s, p.z]} r={0.11 * p.s} m={CROWD} y0={0} y1={3} fade={fade} />
            <Limb a={[p.x - 0.1 * p.s, y + 0.17 * p.s, p.z]} b={[p.x + 0.1 * p.s, y + 0.17 * p.s, p.z]} r0={0.12 * p.s} r1={0.12 * p.s} m={CROWD} y0={0} y1={3} fade={fade} />
          </React.Fragment>
        );
      })}
      {Array.from({length: 26}, (_, j) => {
        const p = people[Math.floor(rnd(j + 77) * people.length)];
        return <Glow key={`ph${j}`} p={[p.x + 0.05, p.y + 0.34, p.z + 0.15]} w={0.1} h={0.1} color="#cfe0ff" a={(0.3 + 0.2 * Math.sin(t * 2 + j)) * house} />;
      })}
      {/* camera flashes on every win */}
      {[...wins, K.slam, K.slam + 0.2].flatMap((w, k) =>
        Array.from({length: k >= 4 ? 10 : 6}, (_, j) => {
          const s = k * 23 + j;
          const tt = w + 0.04 + rnd(s) * 0.5;
          const a = t > tt ? Math.exp(-(t - tt) * 13) : 0;
          if (a < 0.02) return null;
          return <Glow key={`f${k}-${j}`} p={[-8 + rnd(s + 1) * 17, 0.8 + rnd(s + 2) * 2, -16.4 - rnd(s + 3) * 2]} w={0.7} h={0.7} color="#f2f6ff" a={a * Math.max(0.3, house)} />;
        }),
      )}
    </>
  );
};

/** the big screen at the back: five lamps, one per table; each turns red when Ego wins, the last one blue */
const Score: React.FC<{t: number; house: number}> = ({t, house}) => {
  const wins = [K.w1, K.w2, K.w3, K.broke];
  const cx = 1.1;
  const y = 3.3;
  const z = -15.6;
  return (
    <>
      <Part geo={SCREEN} m={BOARD} y0={y - 1} y1={y + 1} position={[cx, y, z - 0.05]} />
      {TINTS.slice(1).map((c, i) => {
        const won = i < 4 ? ss(t, wins[i], wins[i] + 0.1) : 0;
        const lost = i === 4 ? ss(t, K.slam, K.slam + 0.1) : 0;
        const col = lost ? TINT.dis : won ? TINT.ego : c;
        const a = (0.25 + 0.75 * Math.max(won, lost) + 0.6 * hit(t, i < 4 ? wins[i] : K.slam, 4)) * (0.35 + 0.65 * house);
        const x = cx + (i - 2) * 1.05;
        return (
          <React.Fragment key={i}>
            <Glow p={[x, y + 0.15, z + 0.02]} w={0.75} h={0.75} color={col} a={a} />
            <Glow p={[x, y + 0.15, z + 0.03]} w={0.26} h={0.26} color="#ffffff" a={0.55 * a} />
            <Glow p={[x, y - 0.5, z + 0.02]} w={0.7} h={0.05} color={c} a={0.6 * (0.35 + 0.65 * house) * (1 - 0.7 * Math.max(won, lost * 0))} mode="line" />
          </React.Fragment>
        );
      })}
      <Glow p={[cx, y, z - 0.2]} w={7.5} h={3.2} color="#2a3d7a" a={0.35 * house} />
    </>
  );
};
const SCREEN = roundedBox(5.8, 1.7, 0.1, 0.06);

/* ───────────── shadows from the spot above (short, under the body) ───────────── */

const SEGS = (j: J3): [V3, V3, number][] => [
  [j.shc, j.hip[0], HB.tr[1] * 0.95],
  [j.sh[0], j.el[0], HB.ar[0]],
  [j.el[0], j.hd[0], HB.ar[1]],
  [j.sh[1], j.el[1], HB.ar[0]],
  [j.el[1], j.hd[1], HB.ar[1]],
  [j.hip[0], j.kn[0], HB.lr[0]],
  [j.kn[0], j.ft[0], HB.lr[1]],
  [j.hip[1], j.kn[1], HB.lr[0]],
  [j.kn[1], j.ft[1], HB.lr[1]],
  [j.head, j.head, HB.headR],
];
const LD: V3 = [0.12, -1, 0.32];
const drop = (p: V3): V3 => {
  const k = p[1] / -LD[1];
  return [p[0] + LD[0] * k, 0, p[2] + LD[2] * k];
};
const Shadows: React.FC<{j: J3; amp: number}> = ({j, amp}) => (
  <>
    {SEGS(j).map(([a, b, r], k) => {
      const A = W3(a, [0, 0, 0], K3);
      const Bw = W3(b, [0, 0, 0], K3);
      const h = (A[1] + Bw[1]) / 2;
      return <Shade key={k} a={drop(A)} b={drop(Bw)} r={r * K3 * (1 + 0.7 * h)} alpha={0.85 * amp * Math.exp(-h * 0.8)} soft={0.5 + 0.4 * Math.min(1, h)} />;
    })}
  </>
);

/* ───────────── the aura: flames licking up off the body ───────────── */

const AURA_N = 64;
const Aura: React.FC<{t: number; j: J3; amt: number; color: string; seed: number}> = ({t, j, amt, color, seed}) => {
  if (amt < 0.02) return null;
  const segs = SEGS(j).slice(0, 9);
  const hot = mixHex(color, '#ffffff', 0.55);
  return (
    <>
      {Array.from({length: AURA_N}, (_, i) => {
        const s = seed + i * 13;
        const [a, b] = i < 8 ? [j.head, j.head] : segs[i % segs.length];
        const u = rnd(s + 1);
        const p0 = W3([lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)], [0, 0, 0], K3);
        const period = 0.45 + 0.35 * rnd(s + 2);
        const ph = fract(t / period + rnd(s + 3));
        const out = (0.06 + 0.1 * rnd(s + 4)) * (0.6 + 0.6 * amt);
        const ang = rnd(s + 5) * Math.PI * 2;
        const rise = ph * (0.25 + 0.35 * rnd(s + 6)) * (0.5 + 0.7 * amt);
        const p: V3 = [p0[0] + Math.cos(ang) * out + Math.sin(t * 7 + i) * 0.02, p0[1] + rise + (i < 8 ? HB.headR * K3 * 0.6 : 0), p0[2] + Math.sin(ang) * out];
        const w = (0.12 + 0.12 * rnd(s + 7)) * (1 - 0.6 * ph) * (0.6 + 0.5 * amt);
        const al = clamp(amt) * Math.sin(Math.PI * ph) * (0.35 + 0.25 * rnd(s + 8));
        return <Glow key={i} p={p} w={w} h={w * 1.4} color={i % 4 ? color : hot} a={al} />;
      })}
      {/* a soft halo round the body */}
      <Glow p={W3(j.chest, [0, 0, 0], K3)} w={1.6 + 0.8 * amt} h={2.2 + 0.8 * amt} color={color} a={0.16 * clamp(amt)} />
      <Glow p={W3(j.head, [0, 0, 0], K3)} w={0.9 + 0.4 * amt} h={0.9 + 0.4 * amt} color={color} a={0.14 * clamp(amt)} />
    </>
  );
};

/* ───────────── floor cracks: hot lines that grow out from under a foot, cool down to black ───────────── */

type CrackNet = {c: V3; seed: number; n: number; len: number}[];
const crackLines = (c: V3, seed: number, n: number, len: number) =>
  Array.from({length: n}, (_, i) => {
    let a = (i / n) * Math.PI * 2 + rnd(seed + i) * 0.6;
    const pts: V3[] = [c];
    let p = c;
    const L = len * (0.6 + 0.6 * rnd(seed + i * 3));
    for (let s = 0; s < 5; s++) {
      a += (rnd(seed + i * 7 + s) - 0.5) * 0.9;
      const d = (L / 5) * (0.7 + 0.6 * rnd(seed + i * 11 + s));
      p = [p[0] + Math.cos(a) * d, 0.006, p[2] + Math.sin(a) * d];
      pts.push(p);
    }
    return pts;
  });
const crackMats = new Map<number, Mat>();
const crackMat = (heat: number) => {
  const k = q(heat, 10);
  if (!crackMats.has(k)) crackMats.set(k, mat(mixHex('#05060a', '#ffd0a0', k), mixHex('#05060a', '#ff3a1e', k), {shade: mixHex('#000000', '#ff2a10', k), rim: mixHex('#2a3550', '#ffb080', k), rimAmt: 0.4, wrap: 1, emit: 1 + 1.2 * k}));
  return crackMats.get(k)!;
};
const Cracks: React.FC<{c: V3; seed: number; n: number; len: number; grow: number; heat: number; t: number}> = ({c, seed, n, len, grow, heat, t}) => {
  const lines = useMemo(() => crackLines(c, seed, n, len), [c[0], c[2], seed, n, len]);
  if (grow <= 0.01) return null;
  const m = crackMat(heat);
  return (
    <>
      {lines.flatMap((pts, li) => {
        const g = clamp(grow * 1.3 - li * 0.03) * (pts.length - 1);
        return pts.slice(0, -1).map((p, s) => {
          const k = clamp(g - s);
          if (k <= 0) return null;
          const e: V3 = [lerp(p[0], pts[s + 1][0], k), 0.006, lerp(p[2], pts[s + 1][2], k)];
          const r = 0.016 * (1 - s / 6);
          return <Limb key={`${li}-${s}`} a={p} b={e} r0={r} r1={r * 0.8} m={m} y0={0} y1={1} />;
        });
      })}
      {heat > 0.05 ? <Glow p={[c[0], 0.02, c[2]]} w={len * 2.6} h={len * 2.2} color="#ff3a1e" a={0.3 * heat * (0.8 + 0.2 * Math.sin(t * 11)) * clamp(grow * 2)} flat /> : null}
    </>
  );
};

/* ───────────── Obsession's arm: porcelain shards ───────────── */

const SHARD = mat('#ffffff', '#c9b6ff', {shade: '#6a5aa0', rim: '#e6dcff', rimAmt: 0.6, wrap: 0.8, emit: 1.05});
const Shards: React.FC<{t: number; from: V3; at: number}> = ({t, from, at}) => {
  const dt = t - at;
  if (dt < 0) return null;
  const top = TY * K3 + 0.01;
  return (
    <>
      {Array.from({length: 18}, (_, i) => {
        const a = rnd(i + 900) * Math.PI * 2;
        const v = 1.0 + 1.6 * rnd(i + 901);
        const vy = 1.2 + 1.8 * rnd(i + 902);
        const vx = Math.cos(a) * v + 0.6;
        const vz = Math.sin(a) * v * 0.7;
        // fall; land on the table (if over it) or the floor, slide to a stop
        const tl = 3.5;
        let tt = Math.min(dt, tl);
        let x = from[0] + vx * tt;
        let z = from[2] + vz * tt;
        let y = from[1] + vy * tt - 0.5 * G * tt * tt;
        const tab = tw(3);
        const onTop = Math.abs(x - tab[0]) < TOP.x * K3 && Math.abs(z - tab[2]) < TOP.z * K3;
        const floorY = onTop ? top : 0;
        const r = 0.012 + 0.018 * rnd(i + 903);
        if (y < floorY + r) {
          // time of landing, then a short slide
          const tland = (vy + Math.sqrt(Math.max(0, vy * vy + 2 * G * (from[1] - floorY - r)))) / G;
          tt = Math.min(dt, tland);
          const slide = Math.min(dt - tland, 0.35);
          x = from[0] + vx * tland + vx * 0.25 * slide * (1 - slide / 0.7);
          z = from[2] + vz * tland + vz * 0.25 * slide * (1 - slide / 0.7);
          y = floorY + r;
        }
        const s = r / 0.02;
        return <Ball key={i} p={[x, y, z]} r={r} s={[1.4 * s, 0.6 * s, 1 * s]} m={SHARD} y0={0} y1={2} />;
      })}
    </>
  );
};

/* ───────────── stars round a dazed head ───────────── */

const Stars: React.FC<{t: number; c: V3; on: number}> = ({t, c, on}) => {
  if (on < 0.02) return null;
  return (
    <>
      {[0, 1, 2, 3].map((i) => {
        const a = t * 4.2 + (i / 4) * Math.PI * 2;
        const p: V3 = [c[0] + Math.cos(a) * 0.08, c[1] + 0.3 + 0.03 * Math.sin(a * 2), c[2] + Math.sin(a) * 0.3];
        return (
          <React.Fragment key={i}>
            <Ball p={p} r={0.035 * on} m={GOLD} y0={p[1] - 0.05} y1={p[1] + 0.05} />
            <Glow p={p} w={0.2 * on} h={0.2 * on} color={TINT.gold} a={0.55 * on} />
          </React.Fragment>
        );
      })}
    </>
  );
};

/* ───────────── sparks off the clasp while two push ───────────── */

const ClaspSparks: React.FC<{t: number; p: V3; amt: number; colors: [string, string]; seed: number}> = ({t, p, amt, colors, seed}) => {
  if (amt < 0.03) return null;
  return (
    <>
      {Array.from({length: 22}, (_, i) => {
        const period = 0.3 + 0.3 * rnd(seed + i);
        const n = Math.floor(t / period + rnd(seed + i * 3));
        const ph = fract(t / period + rnd(seed + i * 3));
        const a = rnd(seed + i * 5 + n * 17) * Math.PI * 2;
        const v = 0.6 + 0.9 * rnd(seed + i * 7 + n);
        const x = p[0] + Math.cos(a) * v * ph * 0.5;
        const y = p[1] + Math.abs(Math.sin(a)) * v * ph * 0.45 - 3 * ph * ph * period;
        const z = p[2] + Math.sin(a * 1.7) * v * ph * 0.3;
        return <Glow key={i} p={[x, y, z]} w={0.045} h={0.045} color={i % 3 ? colors[i % 2] : '#fff4dc'} a={amt * (1 - ph)} />;
      })}
    </>
  );
};

/* ───────────── the world ───────────── */

/** 0..1: the shared clasp is being fought over at table i */
const fightAt = (t: number) => [
  [1.62, K.w1],
  [6.58, K.w2],
  [10.72, K.w3],
  [18.3, K.broke],
  [26.75, K.slam],
];

export const World: React.FC<{t: number}> = ({t}) => {
  const look = useLook();
  const sty = useSty();
  const L = lights(t);
  const st: State[] = CAST.map((f) => f(t));
  const js = st.map((s) => solveR(s.rig));
  const spent = st.map((s) => q(s.spent));
  const mats = useMemo(() => spent.map((k) => (k > 0 ? spentMat(k) : null)), spent);
  const egoHot = q(st[0].cracks ?? 0);
  const crackM = useMemo(() => redHot(1), []);
  void egoHot;
  const wins = [K.w1, K.w2, K.w3, K.broke];
  const shakes = [0, 1, 2, 3, 4].map((i) => (i < 4 ? hit(t, wins[i], 9) : hit(t, K.slam, 9)));
  const pools = [0, 1, 2, 3, 4].map((i) => {
    const c = tw(i);
    const flare = 0.6 * (i < 4 ? hit(t, wins[i], 5) : hit(t, K.slam, 4));
    const ego = i === 2 ? 0.35 * ss(t, 12.6, 13.6) * (1 - ss(t, 16, 16.5)) : i === 3 ? 0.3 * ss(t, 18.6, 19.5) * (1 - ss(t, 24.5, 25.5)) : i === 4 ? 0.3 * ss(t, K.sure, K.seen) * (1 - ss(t, K.seen, K.slam)) : 0;
    const blue = i === 4 ? 0.5 * ss(t, K.seen, K.slam) : 0;
    const col = mixHex(mixHex(sty.pool, TINT.ego, ego), TINT.dis, blue);
    return {c: [c[0] + 0.1, 0, c[2] + 0.1] as V3, r: 2.0, a: (0.16 + 0.1 * flare) * L.spots[i] * sty.poolAmt, color: col};
  });
  // Ego's own red glow on the floor in the dark, and wherever he is
  const egoW = W3(js[0].chest, [0, 0, 0], K3);
  pools.push({c: [egoW[0], 0, egoW[2]], r: 1.4, a: 0.1 * (1 - L.house) + 0.06 * st[0].aura, color: TINT.ego});

  // cracks: under Ego at Talent's table (losing), at Obsession's, under Ego at Discipline's; at the wall
  const egoFoot = (tt: number) => {
    const s = CAST[0](tt);
    const j = solveR(s.rig);
    return W3(j.ft[0], [0, 0, 0], K3);
  };
  const c3 = useMemo(() => egoFoot(13.5), []);
  const c4 = useMemo(() => egoFoot(22.8), []);
  const c5 = useMemo(() => egoFoot(28.8), []);
  const cWall: V3 = useMemo(() => [WALL.x * K3 + 0.25, 0, WALL.z * K3 - 0.08], []);

  // bursts on every win
  const tableC = (i: number) => add(tw(i), [0, TY * K3 + 0.25, 0]);
  const bursts: Burst[] = [
    {at: K.w1, p: tableC(0), n: 30, speed: 2.2, color: '#ff6a4a', life: 0.9, seed: 11, up: 0.4},
    {at: K.w1, p: tableC(0), n: 16, speed: 1.4, color: '#ffe0c0', life: 0.7, seed: 41, up: 0.8},
    {at: K.w2, p: tableC(1), n: 14, speed: 1.0, color: '#ff8a6a', life: 0.8, seed: 61, up: 0.3},
    {at: K.w3, p: tableC(2), n: 60, speed: 3.0, color: '#ff4a2a', life: 1.1, seed: 81, up: 0.6},
    {at: K.w3, p: tableC(2), n: 30, speed: 1.8, color: '#ffd0a0', life: 0.9, seed: 121, up: 0.9},
    {at: K.broke, p: tableC(3), n: 50, speed: 2.6, color: TINT.obs, life: 1.0, seed: 151, up: 0.6},
    {at: K.broke, p: tableC(3), n: 30, speed: 2.0, color: '#ff5a3a', life: 0.9, seed: 181, up: 0.5},
    {at: K.slam, p: tableC(4), n: 70, speed: 3.2, color: '#8fd8ff', life: 1.1, seed: 211, up: 0.6},
    {at: K.slam, p: tableC(4), n: 30, speed: 2.0, color: '#ffffff', life: 0.8, seed: 241, up: 0.8},
    {at: K.slam + 0.36, p: [WALL.x * K3 + 0.15, 0.6, WALL.z * K3 - 0.08], n: 40, speed: 2.2, color: '#bcd4ff', life: 1.0, seed: 271, up: 0.4},
  ];

  // the crown: on Ego's head until the slam, then it flies and rolls on the floor
  const crownFly = t > K.slam + 0.05;
  const crownP = (() => {
    const s0 = CAST[0](K.slam + 0.05);
    const j0 = solveR(s0.rig);
    const h0 = W3(j0.head, [0, 0, 0], K3);
    const dt = t - K.slam - 0.05;
    const v: V3 = [-1.4, 2.6, 0.9];
    const tl = (v[1] + Math.sqrt(v[1] * v[1] + 2 * G * (h0[1] + 0.12))) / G;
    if (dt < tl) return {p: [h0[0] + v[0] * dt, h0[1] + 0.2 + v[1] * dt - 0.5 * G * dt * dt, h0[2] + v[2] * dt] as V3, spin: dt * 14, roll: 0};
    const d = dt - tl;
    const roll = Math.min(d, 1.2);
    const e = roll - (roll * roll) / 2.4;
    return {p: [h0[0] + v[0] * tl + 0.5 * e, 0.07, h0[2] + v[2] * tl + 0.8 * e] as V3, spin: tl * 14 + e * 9, roll: Math.min(1, d * 3)};
  })();

  const dazed = ss(t, K.slam + 1.0, K.slam + 1.3);
  const egoHead = W3(js[0].head, [0, 0, 0], K3);

  const arena = !sty.env || sty.env === 'arena';
  return (
    <>
      {arena ? null : <EnvWorld env={sty.env!} t={t} />}
      {arena ? <Floor pools={pools} house={L.house} /> : null}
      {/* spot cones from the rig above */}
      {arena && [0, 1, 2, 3, 4].map((i) => {
        const c = tw(i);
        return <Cone key={`c${i}`} p={[c[0] + 0.1, 0, c[2] + 0.1]} r={1.7} h={7.5} color={pools[i].color} a={0.055 * sty.cone * L.spots[i] * (1 + 0.8 * (i < 4 ? hit(t, wins[i], 4) : hit(t, K.slam, 3)))} />;
      })}
      {arena && [0, 1, 2, 3, 4].map((i) => (
        <Glow key={`l${i}`} p={[tw(i)[0] + 0.1, 7.4, tw(i)[2] + 0.1]} w={0.6} h={0.35} color="#ffffff" a={0.8 * L.spots[i] * Math.min(1, sty.cone)} />
      ))}
      {arena && sty.crowdAmt > 0 ? <Glow p={[1.5, 2.6, -14]} w={22} h={8} color={look.bg.glow} a={0.35 * L.house} /> : null}
      {arena ? <Crowd t={t} house={L.house} /> : null}
      {arena ? <Score t={t} house={L.house} /> : null}
      <Wall t={t} house={L.house} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Table key={`t${i}`} i={i} shake={shakes[i]} color={TINTS[i + 1]} />
      ))}
      {st.map((s, i) => {
        const j = js[i];
        const body = mats[i] ?? look.a.body;
        const l: Look3 = {
          body,
          core: s.spent > 0.5 ? mixHex(s.tint, TINT.dead, s.spent) : s.tint,
          energy: Math.min(1.3, s.energy) * (0.25 + 0.75 * Math.max(L.house, i === 0 ? 0.6 : i >= 4 ? L.spots[i - 1] : 0)),
          noArm: s.noArm ? [true, false] : undefined,
          stumpMat: crackM,
          cracks: s.cracks,
          crackMat: crackM,
        };
        const c = W3(j.chest, [0, 0, 0], K3);
        const vis = Math.max(L.house, i === 0 ? 0.55 : i >= 4 ? L.spots[i - 1] : 0);
        return (
          <React.Fragment key={i}>
            <Shadows j={j} amp={vis * sty.shadow} />
            {sty.fig === 'porcelain' ? (
              <Man j={j} root={[0, 0, 0]} k={K3} l={l}>
                {i === 0 && !crownFly ? <Crown j={j} /> : null}
              </Man>
            ) : sty.fig === 'flat' || sty.fig === 'ink' || sty.fig === 'paper' ? null : (
              <>
                <ToonFig j={j} sty={sty} tint={s.tint} idx={i} energy={Math.min(1.3, s.energy) * vis} aura={s.aura} spent={s.spent} noArm={s.noArm} color={sty.fig === 'clay' || sty.fig === 'vinyl' ? CLAY[i] : undefined} />
                {i === 0 && !crownFly ? (
                  <group scale={[K3, K3, K3]}>
                    <Crown j={j} />
                  </group>
                ) : null}
              </>
            )}
            {sty.fig === 'clay' || sty.fig === 'ink' || sty.fig === 'paper' || !arena ? null : <Glow p={[c[0], 0.03, c[2]]} w={1.0} h={0.8} color={s.tint} a={(0.18 + 0.2 * Math.min(1.3, s.energy)) * (1 - s.spent) * vis} flat />}
            {sty.fig === 'flat' || sty.fig === 'ink' || sty.fig === 'paper' ? null : <Aura t={t} j={j} amt={s.aura * (i === 0 ? 1 : vis) * (sty.fig === 'clay' ? 0.5 : 1)} color={i === 0 ? '#ff3a22' : s.auraColor} seed={i * 1000} />}
          </React.Fragment>
        );
      })}
      {crownFly ? (
        <group position={crownP.p} rotation={[crownP.spin, 0, 0.3 + crownP.spin * 0.5]} scale={[K3, K3, K3]}>
          <Crown j={{head: [0, -HB.headR * 0.78 * K3, 0], up: [0, 1, 0], side: [1, 0, 0], fwd: [0, 0, 1]} as unknown as J3} />
        </group>
      ) : null}
      {/* sparks at the clasp in the hard fights */}
      {[
        {m: 2, on: ss(t, 12.2, 12.8) * (1 - ss(t, K.w3, K.w3 + 0.05)), c: [TINT.ego, TINT.tal] as [string, string]},
        {m: 3, on: ss(t, 18.5, 19) * (1 - ss(t, K.broke, K.broke + 0.05)), c: [TINT.ego, TINT.obs] as [string, string]},
        {m: 4, on: ss(t, K.sure, K.sure + 0.4) * (1 - ss(t, K.slam, K.slam + 0.05)) * 0.6, c: [TINT.ego, '#bfefff'] as [string, string]},
      ].map(({m, on, c}) => {
        const cl = clasp(0);
        const p = add(tw(m), mul([0, cl[1], 0], K3));
        return <ClaspSparks key={m} t={t} p={p} amt={on} colors={c} seed={m * 77} />;
      })}
      <Cracks c={c3} seed={3} n={9} len={0.75} grow={ss(t, 12.9, 15.0) + 0.4 * ss(t, K.w3, K.w3 + 0.2)} heat={ss(t, 12.9, 13.5) * (1 - ss(t, 16, 18))} t={t} />
      <Cracks c={c4} seed={7} n={8} len={0.6} grow={ss(t, K.wont, K.broke) + 0.5 * ss(t, K.broke, K.broke + 0.2)} heat={ss(t, K.wont, K.wont + 0.4) * (1 - ss(t, 25, 27))} t={t} />
      <Cracks c={c5} seed={13} n={8} len={0.55} grow={ss(t, K.sure + 0.3, K.slam)} heat={ss(t, K.sure + 0.3, K.seen) * (1 - ss(t, K.slam, K.slam + 0.6))} t={t} />
      <Cracks c={cWall} seed={21} n={7} len={0.5} grow={ss(t, K.slam + 0.36, K.slam + 0.5)} heat={0.6 * hit(t, K.slam + 0.4, 1.5)} t={t} />
      <Shards t={t} at={K.broke} from={W3(solveR(CAST[4](K.broke).rig).el[0], [0, 0, 0], K3)} />
      <Stars t={t} c={egoHead} on={dazed} />
      {bursts.map((b, i) => (
        <BurstFx key={i} t={t} b={b} />
      ))}
      {void fightAt}
    </>
  );
};
