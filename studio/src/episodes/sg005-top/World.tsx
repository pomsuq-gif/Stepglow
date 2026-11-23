import React, {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {clamp, fract, rnd, ss} from '../nc001-work-smart/anim';
import {Ball, Glow, Limb, Part, useLook, useMat, type Cam, type V3} from '../nc001-work-smart/kit3d';
import {mat, type Mat} from '../nc001-work-smart/looks';
import {mixHex} from '../nc001-work-smart/world';
import {add, HB, K3, Man, mul, W3, type J3, type Look3} from '../sg003-same-bar/rig3';
import {PoolFloor} from '../sg004-hurt-ego/fx';
import {hit} from './grid';
import {BEAM_Y, CAST, DAY_SLIP, HO, ROPE_BOT, RZ, solveC, T, TINT, TOPY, WALL_Z, XS, MEET_W, type State} from './plan';
import {Gantry} from './env';

const G = 9.8;
const ROPE = mat('#b9b2a4', '#6a665e', {shade: '#2a2a38', rim: '#fff4dc', rimAmt: 0.3, rimPow: 2.4, wrap: 0.6, emit: 0.7});
const STEEL = mat('#a6b2cc', '#3c465e', {shade: '#232a3c', rim: '#d6e2ff', rimAmt: 0.5, rimPow: 2.2, wrap: 0.6, spec: 0.6});
const ROCK = mat('#3a4560', '#141a2a', {shade: '#0d111c', rim: '#ffcf9a', rimAmt: 0.35, rimPow: 2.6, wrap: 0.6});
const GOLD = mat('#fff0b0', '#ffb22e', {shade: '#a85a14', rim: '#fff6d6', rimAmt: 0.7, rimPow: 2, wrap: 0.8, spec: 0.8, emit: 1.2});
const BAND = mat('#e8f6ff', '#3cc8ff', {shade: '#1a4a9a', rim: '#ffffff', rimAmt: 0.5, wrap: 0.8, emit: 1.15});
const FLAG = mat('#ffd27a', '#d0701a', {shade: '#4a1a06', rim: '#fff0c0', rimAmt: 0.35, rimPow: 2.4, wrap: 0.25, emit: 0.92});

const q = (x: number, n = 16) => Math.round(clamp(x) * n) / n;
/** porcelain going red-hot (burnt hands) */
const redHot = (k: number): Mat => mat(mixHex('#ffffff', '#d8402e', k), mixHex('#a9b9d6', '#8a0e0a', k), {shade: mixHex('#56688f', '#4a0606', k), rim: mixHex('#dcebff', '#ff6a50', k), rimAmt: 0.45, rimPow: 2.2, wrap: 0.7, emit: 0.96 - 0.16 * k});
/** porcelain gone cold */
const spentMat = (k: number): Mat => mat(mixHex('#ffffff', '#b4bccc', k), mixHex('#a9b9d6', '#4a5266', k), {shade: mixHex('#56688f', '#2a3040', k), rim: mixHex('#dcebff', '#8a96b4', k), rimAmt: 0.5 - 0.15 * k, rimPow: 2.4, wrap: 0.75, emit: 0.96 - 0.2 * k});

/* ───────────── soft puffs with normal blending (clouds, dust) ───────────── */

const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const PUFF = /* glsl */ `uniform vec3 uC; uniform float uA, uSeed; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  float d = length(p) + (n(vUv * 5.0) - 0.5) * 0.35 + (n(vUv * 11.0) - 0.5) * 0.12;
  float a = uA * (1.0 - smoothstep(0.35, 1.0, d));
  vec3 c = uC * (0.85 + 0.3 * (1.0 - vUv.y));
  gl_FragColor = vec4(c, a);
}`;
const plane = new THREE.PlaneGeometry(1, 1);

const Puff: React.FC<{p: V3; w: number; h: number; color: string; a: number; seed?: number}> = ({p, w, h, color, a, seed = 0}) => {
  const material = useMemo(() => new THREE.ShaderMaterial({vertexShader: VERT, fragmentShader: PUFF, transparent: true, depthWrite: false, uniforms: {uC: {value: new THREE.Color()}, uA: {value: 0}, uSeed: {value: 0}}}), []);
  useEffect(() => () => material.dispose(), [material]);
  (material.uniforms.uC.value as THREE.Color).set(color);
  material.uniforms.uA.value = a;
  material.uniforms.uSeed.value = seed;
  return <mesh geometry={plane} material={material} position={p} scale={[w, h, 1]} renderOrder={6} />;
};

/* ───────────── the wall: dark stone with rows of dashes, lit by every chest light ───────────── */

const WALL = /* glsl */ `
uniform vec3 uLP[6]; uniform vec3 uLC[6]; uniform float uLI[6]; uniform float uTop; uniform vec3 uMarks; varying vec3 vW;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 p = vW.xy;
  vec3 col = mix(vec3(0.0016, 0.0024, 0.0058), vec3(0.0032, 0.0046, 0.011), 0.5 + 0.5 * sin(p.y * 0.21 + 1.3));
  // rows of short dashes (the reference's dotted wall), every row offset
  vec2 cell = vec2(0.34, 0.27);
  float row = floor(p.y / cell.y);
  vec2 q = vec2(p.x / cell.x + 0.5 * mod(row, 2.0), p.y / cell.y);
  vec2 id = floor(q); vec2 f = fract(q);
  float dash = (1.0 - smoothstep(0.03, 0.05, abs(f.y - 0.5))) * (1.0 - smoothstep(0.14, 0.2, abs(f.x - 0.5)));
  float r = h(id);
  dash *= step(0.18, r);
  // big slow stone blocks
  vec2 bq = vec2(p.x / 1.9 + 0.5 * mod(floor(p.y / 1.25), 2.0), p.y / 1.25);
  vec2 bf = fract(bq);
  float seam = 1.0 - smoothstep(0.0, 0.012, min(min(bf.x, 1.0 - bf.x) * 1.9, min(bf.y, 1.0 - bf.y) * 1.25));
  col *= 1.0 - 0.35 * seam;
  col += vec3(0.002, 0.003, 0.006) * h(floor(bq));
  vec3 lit = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    vec2 d = p - uLP[i].xy;
    float k = uLI[i] * exp(-dot(d, d) / 0.9);
    lit += uLC[i] * k;
  }
  col += lit * lit * 0.05 + lit * 0.012;
  col += (vec3(0.012, 0.016, 0.03) * (0.4 + 0.6 * r) + lit * 0.5) * dash;
  // height marks on the right: 25 %, 50 %, 75 %
  for (int i = 0; i < 3; i++) {
    float m = uMarks[i];
    float line = exp(-pow((p.y - m) / 0.018, 2.0)) * smoothstep(1.5, 2.6, p.x) * (1.0 - smoothstep(3.6, 4.2, p.x));
    col += vec3(0.1, 0.14, 0.24) * line;
  }
  // warm light from the summit spilling over the top
  col += vec3(0.2, 0.08, 0.025) * exp(-(uTop - p.y) * 1.8);
  gl_FragColor = vec4(col, 1.0);
}`;
const WALL_VERT = /* glsl */ `varying vec3 vW; void main(){ vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const Wall: React.FC<{lights: {p: V3; c: string; i: number}[]}> = ({lights}) => {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: WALL_VERT,
        fragmentShader: WALL,
        uniforms: {
          uLP: {value: Array.from({length: 6}, () => new THREE.Vector3())},
          uLC: {value: Array.from({length: 6}, () => new THREE.Color())},
          uLI: {value: new Array(6).fill(0)},
          uTop: {value: TOPY},
          uMarks: {value: new THREE.Vector3(TOPY * 0.25, TOPY * 0.5, TOPY * 0.75)},
        },
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  const u = material.uniforms;
  lights.forEach((l, i) => {
    (u.uLP.value[i] as THREE.Vector3).set(...l.p);
    (u.uLC.value[i] as THREE.Color).set(l.c);
    u.uLI.value[i] = l.i;
  });
  const geo = useMemo(() => new THREE.PlaneGeometry(30, TOPY + 1.4), []);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={material} position={[0, (TOPY - 2.6) / 2, WALL_Z]} renderOrder={1} />;
};

/** the summit: a flat top lit by the dawn, its lip, stars and the warm horizon */
const Summit: React.FC<{t: number; show: number}> = ({t, show}) => {
  const topMat = useMemo(() => mat('#1d2133', '#06080f', {shade: '#06070c', rim: '#ff9a5a', rimAmt: 0.08, rimPow: 3, wrap: 0.5}), []);
  const geo = useMemo(() => new THREE.BoxGeometry(30, 0.6, 14), []);
  useEffect(() => () => geo.dispose(), [geo]);
  if (show <= 0) return null;
  return (
    <>
      <Part geo={geo} m={topMat} y0={TOPY - 0.6} y1={TOPY} position={[0, TOPY - 0.3, WALL_Z - 7]} />
      <Limb a={[-15, TOPY - 0.04, WALL_Z - 0.02]} b={[15, TOPY - 0.04, WALL_Z - 0.02]} r0={0.06} r1={0.06} m={ROCK} y0={TOPY - 0.2} y1={TOPY + 0.1} />
      <Gantry />
      {/* the horizon: a band of warm light far away, the sky above it */}
      <Glow p={[0, TOPY + 0.2, -26]} w={70} h={7} color="#ff8a3a" a={0.55} />
      <Glow p={[0, TOPY - 0.3, -26]} w={50} h={2.2} color="#ffc27a" a={0.4} />
      <Glow p={[1.5, TOPY + 6, -30]} w={40} h={20} color="#3a2a5a" a={0.35} />
      {Array.from({length: 140}, (_, i) => {
        const x = (rnd(i + 1) - 0.5) * 34;
        const y = TOPY + 1 + rnd(i + 2) * 22;
        const tw = 0.6 + 0.4 * Math.sin(t * (1.5 + rnd(i) * 3) + i);
        const s = 0.04 + 0.08 * rnd(i + 3) ** 3;
        return <Glow key={i} p={[x, y, -24]} w={s * 4} h={s * 4} color={rnd(i + 4) > 0.8 ? '#ffd9a8' : '#dfe8ff'} a={0.9 * tw * clamp((y - TOPY - 1) / 3)} />;
      })}
    </>
  );
};

/** a flag on the summit: gold, waving */
const Flag: React.FC<{t: number; p: V3}> = ({t, p}) => {
  const geo = useMemo(() => new THREE.PlaneGeometry(0.8, 0.5, 16, 6), []);
  useEffect(() => () => geo.dispose(), [geo]);
  const material = useMat(FLAG, p[1] + 1.1, p[1] + 1.6);
  useEffect(() => () => material.dispose(), [material]);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const base = useMemo(() => Float32Array.from(pos.array as Float32Array), [geo]);
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3] + 0.4;
    const y = base[i * 3 + 1];
    const w = Math.sin(x * 7 - t * 7.5) * 0.13 * x + Math.sin(x * 3.1 - t * 4.2 + y * 2) * 0.05 * x;
    pos.setXYZ(i, x, y - 0.06 * x * x, w);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return (
    <>
      <Limb a={p} b={add(p, [0, 1.62, 0])} r0={0.028} r1={0.022} m={STEEL} y0={p[1]} y1={p[1] + 1.6} />
      <Ball p={add(p, [0, 1.64, 0])} r={0.045} m={GOLD} y0={p[1] + 1.5} y1={p[1] + 1.7} />
      <mesh geometry={geo} material={material} position={add(p, [0.01, 1.32, 0])} rotation={[0, -0.55, 0]} />
      <Glow p={add(p, [0.45, 1.3, 0.05])} w={1.6} h={1.2} color={TINT.gold} a={0.22 + 0.05 * Math.sin(t * 3)} />
    </>
  );
};

/** one rope per climber, hanging from the gantry beam high over the summit */
const Ropes: React.FC = () => (
  <>
    {XS.map((x, i) => (
      <React.Fragment key={i}>
        <Limb a={[x, ROPE_BOT, RZ]} b={[x, BEAM_Y, RZ]} r0={0.015} r1={0.015} m={ROPE} y0={0} y1={TOPY} />
        <Ball p={[x, ROPE_BOT, RZ]} r={0.03} m={ROPE} y0={0} y1={1} />
        <Ball p={[x, BEAM_Y - 0.02, RZ]} r={0.05} m={STEEL} y0={BEAM_Y - 0.1} y1={BEAM_Y + 0.1} />
      </React.Fragment>
    ))}
  </>
);

/** drifting clouds between ~35 % and 85 % of the climb, some in front of the climbers, some behind */
const CLOUDS = Array.from({length: 16}, (_, i) => ({
  y: 6.5 + rnd(i + 11) * 13.5,
  x: (rnd(i + 12) - 0.5) * 9,
  z: rnd(i + 13) > 0.55 ? 1.0 + rnd(i + 14) * 1.2 : -0.25,
  w: 1.8 + rnd(i + 15) * 2.4,
  v: 0.06 + 0.1 * rnd(i + 16),
  seed: i * 3.7,
}));
const Clouds: React.FC<{t: number; cy: number}> = ({t, cy}) => (
  <>
    {CLOUDS.map((c, i) => {
      if (Math.abs(c.y - cy) > 7) return null;
      const x = ((c.x + c.v * t * (i % 2 ? 1 : -1) + 7) % 14 + 14) % 14 - 7;
      const front = c.z > 0.5;
      return (
        <React.Fragment key={i}>
          <Puff p={[x, c.y, c.z]} w={c.w} h={c.w * 0.32} color={front ? '#4a5470' : '#3a4460'} a={front ? 0.26 : 0.5} seed={c.seed} />
          <Puff p={[x + c.w * 0.25, c.y + 0.12, c.z + 0.01]} w={c.w * 0.6} h={c.w * 0.26} color={front ? '#56607e' : '#46506e'} a={front ? 0.22 : 0.42} seed={c.seed + 1} />
        </React.Fragment>
      );
    })}
  </>
);

/* ───────────── signature props ───────────── */

const Crown: React.FC<{j: J3}> = ({j}) => {
  const c = add(j.head, mul(j.up, HB.headR * 0.78));
  const s = j.side;
  const f = j.fwd;
  const R = HB.headR * 0.62;
  const pts = Array.from({length: 5}, (_, i) => {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    return add(c, add(mul(s, Math.cos(a) * R), mul(f, Math.sin(a) * R)));
  });
  return (
    <>
      {pts.map((p, i) => (
        <React.Fragment key={i}>
          <Limb a={p} b={pts[(i + 1) % 5]} r0={0.026} r1={0.026} m={GOLD} y0={c[1] - 0.1} y1={c[1] + 0.2} />
          <Limb a={p} b={add(p, mul(j.up, 0.13))} r0={0.024} r1={0.008} m={GOLD} y0={c[1] - 0.1} y1={c[1] + 0.2} />
          <Ball p={add(p, mul(j.up, 0.135))} r={0.018} m={GOLD} y0={c[1]} y1={c[1] + 0.2} />
        </React.Fragment>
      ))}
    </>
  );
};

/* ───────────── particles ───────────── */

type Burst = {at: number; p: V3; n: number; speed: number; color: string; life: number; seed: number; up?: number; size?: number; g?: number};
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
        const k = 1 - dt / life;
        const w = (b.size ?? 0.06) * (0.6 + k);
        return <Glow key={i} p={[b.p[0] + Math.cos(a) * v * dt, b.p[1] + el * v * dt - 0.5 * (b.g ?? G) * dt * dt, b.p[2] + Math.sin(a) * v * dt * 0.6]} w={w} h={w} color={b.color} a={0.95 * k} />;
      })}
    </>
  );
};

/** a ring of light in the frame plane (the rescue) */
const Ring: React.FC<{t: number; at: number; p: V3; r: number; color: string; life?: number}> = ({t, at, p, r, color, life = 0.9}) => {
  const k = (t - at) / life;
  if (k < 0 || k > 1) return null;
  const e = 1 - Math.pow(1 - k, 3);
  const R = 0.1 + r * e;
  const n = 64;
  return (
    <>
      {Array.from({length: n}, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        return <Glow key={i} p={[p[0] + Math.cos(a) * R, p[1] + Math.sin(a) * R, p[2] + 0.2]} w={0.09 + 0.05 * e} h={0.09 + 0.05 * e} color={color} a={0.8 * (1 - k)} />;
      })}
    </>
  );
};

/** sparks off hands that slide down a rope */
const Friction: React.FC<{t: number; p: V3; amt: number; seed: number; color?: string}> = ({t, p, amt, seed, color = '#ffb46a'}) => {
  if (amt <= 0.02) return null;
  return (
    <>
      {Array.from({length: 16}, (_, i) => {
        const period = 0.35 + 0.3 * rnd(seed + i);
        const ph = fract(t / period + rnd(seed + i * 3));
        const a = rnd(seed + i * 5 + Math.floor(t / period)) * Math.PI * 2;
        const v = 0.8 + 0.8 * rnd(seed + i * 7);
        const x = p[0] + Math.cos(a) * v * ph * 0.5;
        const y = p[1] + Math.abs(Math.sin(a)) * v * ph * 0.35 - 2.5 * ph * ph * period;
        return <Glow key={i} p={[x, y, p[2] + 0.06]} w={0.04} h={0.04} color={i % 3 ? color : '#fff1d0'} a={amt * (1 - ph)} />;
      })}
    </>
  );
};

/** every grip of Obsession's burning hands leaves a glowing mark on the rope; drops fall from his hands */
const STEP_O = 0.22;
const A_H = 0.56;
const BurnMarks: React.FC<{t: number; cy: number; s: State}> = ({t, cy, s}) => {
  if (t < T.bleed) return null;
  const x = XS[2];
  const top = Math.min(HO(t), HO(T.spent)) / K3 + A_H;
  const from = HO(T.bleed) / K3 + A_H;
  const out: React.ReactNode[] = [];
  const k0 = Math.ceil(from / STEP_O);
  const k1 = Math.floor(top / STEP_O);
  for (let k = k0; k <= k1; k++) {
    const y = k * STEP_O * K3;
    if (Math.abs(y - cy) > 6) continue;
    const tg = T.jump + 0.3 + (y - A_H * K3 - 1.5) / 0.7;
    const age = Math.max(0, t - tg);
    const cool = 0.35 + 0.65 * Math.exp(-age * 0.5);
    out.push(<Glow key={k} p={[x, y, RZ + 0.02]} w={0.07} h={0.13} color="#ff3a22" a={0.85 * cool} />);
    out.push(<Glow key={`d${k}`} p={[x, y - 0.12, RZ + 0.02]} w={0.03} h={0.2} color="#ff2a14" a={0.6 * cool} />);
  }
  // drops from the hands
  const DT = 0.21;
  const n = Math.floor((t - T.bleed) / DT);
  for (let i = Math.max(0, n - 8); i <= n; i++) {
    const ts = T.bleed + i * DT + rnd(i) * 0.05;
    if (ts > t || ts > T.torn + 2.3) continue;
    const st = CAST[2](ts);
    const j = solveC(st.rig);
    const hp = W3(j.hd[i % 2], [x, 0, 0], K3);
    const dt = t - ts;
    if (dt > 1.6) continue;
    out.push(<Glow key={`f${i}`} p={[hp[0] + (rnd(i + 3) - 0.5) * 0.04, hp[1] - 0.06 - 0.5 * G * dt * dt, hp[2]]} w={0.035} h={0.06} color="#ff4a2a" a={0.9 * s.burn!} />);
  }
  return <>{out}</>;
};

/** dust rising from far below, at the bottom edge of the frame (Ego landed) */
const Plume: React.FC<{t: number; at: number; x: number; bottom: number}> = ({t, at, x, bottom}) => {
  const dt = t - at;
  if (dt < 0 || dt > 3.2) return null;
  const fade = 1 - ss(dt, 2.0, 3.2);
  return (
    <>
      {Array.from({length: 9}, (_, i) => {
        const d = Math.min(1, dt / (0.6 + 0.5 * rnd(i + 2)));
        const e = 1 - Math.pow(1 - d, 3);
        const w = (0.7 + 0.7 * rnd(i + 3)) * (0.5 + 0.9 * e);
        const px = x + (rnd(i + 4) - 0.5) * 1.1 * (0.4 + e);
        const py = bottom - 0.6 + e * (0.6 + 1.3 * rnd(i + 5));
        return <Puff key={i} p={[px, py, 0.35 + 0.02 * i]} w={w} h={w * 0.85} color="#8e92a2" a={0.7 * fade} seed={i * 2.1} />;
      })}
    </>
  );
};

/* ───────────── the world ───────────── */

export const World: React.FC<{t: number; cam: Cam}> = ({t, cam}) => {
  const look = useLook();
  const st: State[] = CAST.map((f) => f(t));
  const js = st.map((s) => solveC(s.rig));
  const roots: V3[] = XS.map((x) => [x, 0, 0]);
  const w = (i: number, p: V3) => W3(p, roots[i], K3);
  const spentQ = st.map((s) => q(s.spent));
  const burnQ = q((st[2].burn ?? 0) * (1 - 0.55 * st[2].spent));
  const mats = useMemo(() => ({sp: spentQ.map((k) => spentMat(k)), burn: redHot(burnQ)}), [spentQ.join(','), burnQ]);
  const cy = cam.cy;
  const lights = st.map((s, i) => ({p: w(i, js[i].chest), c: s.tint, i: Math.min(1.3, s.energy) * (Math.abs(w(i, js[i].chest)[1] - cy) < 9 ? 1 : 0)}));
  const showTop = cy + cam.viewH > TOPY - 2 ? 1 : 0;
  const egoHand = w(1, js[1].hd[0]);
  const bursts: Burst[] = [
    // Ego: the crown glints on the beat, the hand rips off the rope
    {at: T.slip, p: egoHand, n: 26, speed: 1.6, color: '#ffc06a', life: 0.8, seed: 101, up: 0.6},
    {at: T.slip + 0.05, p: w(1, js[1].head), n: 14, speed: 1.0, color: TINT.gold, life: 0.7, seed: 131, up: 0.9, size: 0.05},
    // Motivation quits: the light leaves him
    {at: T.quit, p: w(0, js[0].chest), n: 16, speed: 0.7, color: TINT.mot, life: 1.1, seed: 201, up: 0.9, g: 1},
    // Obsession burns out
    {at: T.spent, p: w(2, js[2].chest), n: 22, speed: 0.8, color: TINT.obs, life: 1.2, seed: 301, up: 0.8, g: 0.6},
    // the drugged one lets go: green sparkle
    {at: T.fly, p: w(5, js[5].chest), n: 24, speed: 1.4, color: TINT.drug, life: 1.0, seed: 401, up: 0.6, g: 1.5},
    // the rescue
    {at: T.flash, p: MEET_W, n: 50, speed: 2.4, color: '#fff1c8', life: 1.3, seed: 501, up: 0.6, g: 3},
    {at: T.flash, p: MEET_W, n: 30, speed: 1.5, color: TINT.gold, life: 1.1, seed: 551, up: 0.9, g: 2},
    // Day 1 raises his arms
    {at: T.day1, p: add(w(4, js[4].head), [0, 0.3, 0]), n: 36, speed: 1.6, color: TINT.gold, life: 1.6, seed: 601, up: 1.0, g: 1.6},
  ];
  return (
    <>
      <Wall lights={lights} />
      <Summit t={t} show={showTop} />
      {showTop ? <Flag t={t} p={[XS[2] + 0.15, TOPY, WALL_Z - 1.25]} /> : null}
      {/* the ground under the ropes, only at the start */}
      {cy < 6 ? (
        <>
          <PoolFloor c={[0, 0.3]} r={4.5} edge={0.15} pool="#1a2236" base="#03050a" />
          {st.map((s, i) => (
            <Glow key={i} p={[XS[i], 0.02, 0.25]} w={1.3} h={0.8} color={s.tint} a={0.35 * Math.min(1, s.energy) * clamp(1 - s.h / 6)} flat />
          ))}
          <Glow p={[0, 0.4, 0.6]} w={12} h={1.2} color="#3b5a9a" a={0.25} />
        </>
      ) : null}
      <Ropes />
      <Clouds t={t} cy={cy} />
      {st.map((s, i) => {
        const j = js[i];
        const l: Look3 = {
          body: spentQ[i] > 0 ? mats.sp[i] : look.a.body,
          core: s.tint,
          energy: Math.min(1.3, s.energy),
          foreMat: i === 2 && burnQ > 0 ? [mats.burn, mats.burn] : undefined,
        };
        const c = w(i, j.chest);
        if (Math.abs(c[1] - cy) > 13) return null;
        return (
          <React.Fragment key={i}>
            {/* the coloured aura behind every climber, as in the reference — softer and in depth */}
            <Glow p={add(c, [0, 0.05, -0.15])} w={1.9} h={2.2} color={s.tint} a={0.11 * Math.min(1.2, s.energy)} />
            <Man j={j} root={roots[i]} k={K3} l={l} body={HB}>
              {i === 1 ? <Crown j={j} /> : null}
            </Man>
          </React.Fragment>
        );
      })}
      <BurnMarks t={t} cy={cy} s={st[2]} />
      {/* sliding hands: Motivation, Obsession, Ego's slip */}
      <Friction t={t} p={w(4, js[4].hd[1])} amt={ss(t, DAY_SLIP, DAY_SLIP + 0.04) * (1 - ss(t, DAY_SLIP + 0.25, DAY_SLIP + 0.45))} seed={333} />
      {[0, 2, 1].map((i) => (
        <Friction key={i} t={t} p={w(i, js[i].hd[1])} amt={(st[i].slide ?? 0) * (i === 1 ? 1 : 0.8)} seed={i * 50} color={i === 2 ? '#ff6a3a' : '#ffb46a'} />
      ))}
      {/* Ego's crown: a glint on every second beat while he shows off */}
      {t > T.jump && t < T.slip ? <Glow p={add(w(1, js[1].head), [0.05, 0.28, 0.1])} w={0.5} h={0.5} color="#fff3c0" a={0.8 * hit(t, Math.floor((t - 4.649) / (2 * 0.46304)) * 2 * 0.46304 + 4.649, 9)} /> : null}
      <Plume t={t} at={T.fell} x={XS[1] - 0.45} bottom={0.55} />
      <Ring t={t} at={T.flash} p={MEET_W} r={1.3} color="#fff4d8" />
      <Ring t={t} at={T.flash + 0.1} p={MEET_W} r={0.8} color={TINT.gold} life={0.7} />
      {bursts.map((b, i) => (
        <BurstFx key={i} t={t} b={b} />
      ))}
      {/* the summit glows warmer once Discipline is up */}
      {showTop ? <Glow p={[XS[3] + 0.4, TOPY + 0.02, WALL_Z - 0.9]} w={3.6} h={1.6} color={TINT.gold} a={0.25 * ss(t, T.top - 0.3, T.top + 0.5) + 0.25 * ss(t, T.flash, T.flash + 0.6)} flat /> : null}
    </>
  );
};
