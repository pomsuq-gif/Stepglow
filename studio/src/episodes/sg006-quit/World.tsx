import React, {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {clamp, fract, rnd, ss} from '../nc001-work-smart/anim';
import {Ball, Glow, Limb, Part, useLook, type Cam, type V3} from '../nc001-work-smart/kit3d';
import {mat, type Mat} from '../nc001-work-smart/looks';
import {mixHex} from '../nc001-work-smart/world';
import {add, HB, K3, Man, W3, type Look3} from '../sg003-same-bar/rig3';
import {BurstFx, Crown, GOLD, Puff, redHot, Ring, spentMat, type Burst} from '../sg005-top/World';
import {hit, hits, beat} from './grid';
import {CAST, D, N, NARROW, NO, PL, R, solveC, SR, STAIR_W, T, TINT, TOP_Y, treadY, treadZ, XS, type State} from './plan';

const B = beat;
const q = (x: number, n = 16) => Math.round(clamp(x) * n) / n;

/* ───────────── the stair: one mesh, a shader lit by the chest lights, glowing footsteps ───────────── */

const STAIR_VERT = /* glsl */ `varying vec3 vW; varying vec3 vN; void main(){ vW = (modelMatrix * vec4(position, 1.0)).xyz; vN = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const STAIR_FRAG = /* glsl */ `
uniform vec3 uLP[6]; uniform vec3 uLC[6]; uniform float uLI[6];
uniform float uLaneX[4]; uniform float uLaneN[4]; uniform vec3 uLaneC[4]; uniform float uLaneE[4];
uniform float uD, uR, uFlash, uSnow; varying vec3 vW; varying vec3 vN;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
void main(){
  vec3 nrm = normalize(vN);
  float top = step(0.5, nrm.y);
  float side = step(0.5, abs(nrm.x));
  // stone: worn treads, darker risers and cliff sides, a slow noise
  float tex = n2(vW.xz * 3.1) * 0.6 + n2(vW.xz * 11.0) * 0.4;
  vec3 col = mix(vec3(0.0042, 0.0058, 0.012), vec3(0.0105, 0.0135, 0.024), tex);
  col *= mix(0.55, 1.0, top);
  if (side > 0.5) col = mix(vec3(0.0016, 0.002, 0.0045), vec3(0.004, 0.005, 0.009), n2(vW.zy * vec2(1.6, 2.4)));
  // the moon from up-left behind: the nosing of every tread catches it
  float k = vW.z / uD;
  float nose = top * (1.0 - smoothstep(0.0, 0.09, fract(k))) ;
  col += vec3(0.03, 0.04, 0.07) * nose * (1.0 - side);
  // dusting of snow on the treads, more toward the edges
  float edge = smoothstep(${(STAIR_W - 0.5).toFixed(2)}, ${STAIR_W.toFixed(2)}, abs(vW.x));
  col += vec3(0.02, 0.024, 0.036) * top * uSnow * smoothstep(0.55, 0.85, n2(vW.xz * 5.0) + edge * 0.4);
  // chest lights
  vec3 lit = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    vec3 d = vW - uLP[i];
    lit += uLC[i] * uLI[i] * exp(-dot(d, d) / 0.55);
  }
  col += lit * (0.05 + 0.08 * top);
  // footsteps: the treads each climber has walked glow in their colour and fade behind them
  float tread = floor(vW.z / uD) + 1.0;
  for (int i = 0; i < 4; i++) {
    float lane = 1.0 - smoothstep(0.2, 0.34, abs(vW.x - uLaneX[i]));
    float behind = uLaneN[i] - tread;
    float g = (behind > -0.6 ? exp(-max(behind, 0.0) * 0.16) : 0.0) * step(0.5, uLaneN[i]) * step(0.5, tread);
    col += uLaneC[i] * g * lane * top * 0.07 * uLaneE[i] * (0.65 + 0.35 * tex);
    col += uLaneC[i] * g * lane * (1.0 - top) * (1.0 - side) * 0.025 * uLaneE[i];
  }
  col *= 1.0 + uFlash * 5.0;
  col += vec3(0.04, 0.05, 0.09) * uFlash * top;
  gl_FragColor = vec4(col, 1.0);
}`;

/** treads + risers + the two cliff sides for a stair from tread j0 to j1 at x ∈ [x0, x1] */
const stairGeo = (j0: number, j1: number, x0: number, x1: number, narrow: boolean, deep = 26) => {
  const pos: number[] = [];
  const nrm: number[] = [];
  const quad = (a: V3, b: V3, c: V3, d: V3, n: V3) => {
    pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (let i = 0; i < 6; i++) nrm.push(...n);
  };
  for (let j = j0; j <= j1; j++) {
    const y = treadY(j, narrow);
    const yp = treadY(j - 1, narrow);
    const za = (j - 1) * D;
    const zb = j * D;
    quad([x0, y, za], [x0, y, zb], [x1, y, zb], [x1, y, za], [0, 1, 0]);
    if (y > yp) quad([x0, yp, za], [x0, y, za], [x1, y, za], [x1, yp, za], [0, 0, -1]);
    // cliff sides: down from the tread far below
    const bot = y - deep;
    quad([x0, bot, za], [x0, bot, zb], [x0, y, zb], [x0, y, za], [-1, 0, 0]);
    quad([x1, bot, za], [x1, y, za], [x1, y, zb], [x1, bot, zb], [1, 0, 0]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return g;
};

type Lights = {p: V3; c: string; i: number}[];
type Lanes = {n: number; c: string; e: number}[];

const useStairMat = (lights: Lights, lanes: Lanes, flash: number, snow: number) => {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: STAIR_VERT,
        fragmentShader: STAIR_FRAG,
        side: THREE.DoubleSide,
        uniforms: {
          uLP: {value: Array.from({length: 6}, () => new THREE.Vector3())},
          uLC: {value: Array.from({length: 6}, () => new THREE.Color())},
          uLI: {value: new Array(6).fill(0)},
          uLaneX: {value: [...XS]},
          uLaneN: {value: [0, 0, 0, 0]},
          uLaneC: {value: Array.from({length: 4}, () => new THREE.Color())},
          uLaneE: {value: [1, 1, 1, 1]},
          uD: {value: D},
          uR: {value: R},
          uFlash: {value: 0},
          uSnow: {value: 0},
        },
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  const u = material.uniforms;
  for (let i = 0; i < 6; i++) {
    const l = lights[i];
    (u.uLP.value[i] as THREE.Vector3).set(...(l ? l.p : ([0, -99, 0] as V3)));
    (u.uLC.value[i] as THREE.Color).set(l ? l.c : '#000000');
    u.uLI.value[i] = l ? l.i : 0;
  }
  lanes.forEach((l, i) => {
    u.uLaneN.value[i] = l.n;
    (u.uLaneC.value[i] as THREE.Color).set(l.c);
    u.uLaneE.value[i] = l.e;
  });
  u.uFlash.value = flash;
  u.uSnow.value = snow;
  return material;
};

const Stair: React.FC<{lights: Lights; lanes: Lanes; flash: number; snow: number}> = ({lights, lanes, flash, snow}) => {
  const main = useMemo(() => stairGeo(1, N + PL, -STAIR_W, STAIR_W, false), []);
  const endless = useMemo(() => stairGeo(N + PL + 1, N + PL + 70, NARROW.x - NARROW.w, NARROW.x + NARROW.w, true, 40), []);
  useEffect(
    () => () => {
      main.dispose();
      endless.dispose();
    },
    [main, endless],
  );
  const m = useStairMat(lights, lanes, flash, snow);
  return (
    <>
      <mesh geometry={main} material={m} renderOrder={1} />
      <mesh geometry={endless} material={m} renderOrder={1} />
    </>
  );
};

/* ───────────── the plateau at the foot of the stair, and the crowd ───────────── */

const BASE_FRAG = /* glsl */ `
uniform float uFlash, uCrowd; varying vec3 vW;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  float d = length((vW.xz - vec2(0.0, -3.2)) * vec2(0.55, 0.8));
  vec3 col = mix(vec3(0.011, 0.014, 0.026), vec3(0.0015, 0.002, 0.004), smoothstep(0.4, 3.2, d));
  col += vec3(0.02, 0.026, 0.05) * exp(-d * d * 0.9) * uCrowd;
  col *= 1.0 + 4.0 * uFlash;
  gl_FragColor = vec4(col, 1.0);
}`;
const BASE_VERT = /* glsl */ `varying vec3 vW; void main(){ vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const Base: React.FC<{flash: number; crowd: number}> = ({flash, crowd}) => {
  const material = useMemo(() => new THREE.ShaderMaterial({vertexShader: BASE_VERT, fragmentShader: BASE_FRAG, uniforms: {uFlash: {value: 0}, uCrowd: {value: 1}}}), []);
  const geo = useMemo(() => new THREE.PlaneGeometry(40, 30).rotateX(-Math.PI / 2).translate(0, 0, -15), []);
  useEffect(
    () => () => {
      material.dispose();
      geo.dispose();
    },
    [material, geo],
  );
  material.uniforms.uFlash.value = flash;
  material.uniforms.uCrowd.value = crowd;
  return <mesh geometry={geo} material={material} renderOrder={0} />;
};

const SHADOW = mat('#0c101b', '#03050a', {shade: '#020306', rim: '#5d74a8', rimAmt: 0.45, rimPow: 2.8, wrap: 0.3});
/** the crowd at the foot of the stair: dark silhouettes, phones up; they leave one by one when the climb gets long */
const CROWD = Array.from({length: 46}, (_, i) => {
  const row = Math.floor(i / 12);
  const x = (i % 12) / 11 - 0.5;
  return {
    x: x * (6.5 + row * 1.8) + (rnd(i + 1) - 0.5) * 0.4,
    z: -5.0 - row * 1.0 - rnd(i + 2) * 0.4,
    h: 0.7 + 0.16 * rnd(i + 3),
    phone: rnd(i + 4) > 0.25,
    leave: T.crowdOff + rnd(i + 5) * 1.25,
    seed: i,
  };
});
const Crowd: React.FC<{t: number}> = ({t}) => (
  <>
    {CROWD.map((c, i) => {
      const gone = ss(t, c.leave, c.leave + 0.35);
      if (gone >= 1) return null;
      const s = c.h;
      const bob = 0.02 * Math.sin(t * 5 + c.seed) * (1 - gone);
      const p: V3 = [c.x, -0.45 - 0.6 * gone, c.z];
      const head: V3 = add(p, [0, 1.3 * s + bob, 0]);
      const ph: V3 = add(p, [0.12 * s, 1.42 * s + bob, 0.2]);
      const flash = c.phone ? hit(t, Math.floor((t + rnd(i) * 3) / (1.9 + rnd(i + 9) * 2.2)) * (1.9 + rnd(i + 9) * 2.2) - rnd(i) * 3, 9) : 0;
      return (
        <React.Fragment key={i}>
          <Limb a={add(p, [0, 0.35, 0])} b={add(p, [0, 1.02 * s, 0])} r0={0.15 * s} r1={0.24 * s} m={SHADOW} y0={0} y1={1.6} />
          <Ball p={head} r={0.17 * s} m={SHADOW} y0={0} y1={1.6} />
          {c.phone ? (
            <>
              <Limb a={add(p, [0.1 * s, 1.1 * s, 0.04])} b={ph} r0={0.04} r1={0.035} m={SHADOW} y0={0} y1={1.6} />
              <Glow p={add(ph, [0, 0.04, 0.03])} w={0.09} h={0.13} color="#dfe9ff" a={(0.75 + 2.5 * flash) * (1 - gone)} />
              {flash > 0.05 ? <Glow p={add(ph, [0, 0.04, 0.06])} w={1.1} h={1.1} color="#eaf2ff" a={0.55 * flash * (1 - gone)} /> : null}
            </>
          ) : null}
        </React.Fragment>
      );
    })}
  </>
);

/* ───────────── stones ───────────── */

const STONE = mat('#5c6684', '#1a2032', {shade: '#0b0e18', rim: '#a9bfff', rimAmt: 0.5, rimPow: 2.2, wrap: 0.55, spec: 0.25});
const rockGeo = (seed: number) => {
  const g = new THREE.IcosahedronGeometry(1, 2).toNonIndexed();
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const cache = new Map<string, number>();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    let k = cache.get(key);
    if (k === undefined) {
      k = 0.86 + 0.2 * rnd(seed + v.x * 13.1 + v.y * 7.7 + v.z * 3.3) + 0.08 * Math.sin(v.x * 3 + seed) * Math.cos(v.z * 2.5);
      cache.set(key, k);
    }
    v.multiplyScalar(k);
    v.y *= 0.88;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
};
const ROCKS = [0, 1, 2, 3].map((i) => rockGeo(i * 17 + 3));

const Stone: React.FC<{i: number; s: State['stone']; t: number; mats: {hot: Mat}}> = ({i, s, t, mats}) => {
  const g = s.glow ?? 0;
  const m = g > 0.02 ? mats.hot : STONE;
  return (
    <>
      <Part geo={ROCKS[i]} m={m} y0={s.p[1] - SR} y1={s.p[1] + SR} position={s.p} rotation={[s.rot, i * 1.3, 0.2 * i]} scale={[SR, SR, SR]} />
      {g > 0 ? (
        <>
          <Glow p={add(s.p, [0, 0.05, 0.1])} w={2.6 + 0.4 * Math.sin(t * 5)} h={2.6} color={TINT.gold} a={0.55 * g} />
          <Glow p={add(s.p, [0, 0.1, 0.12])} w={0.9} h={0.9} color="#fff4d0" a={0.7 * g} />
        </>
      ) : null}
    </>
  );
};

/* ───────────── sky: the moon, far ranges, the giant peak, the storm ───────────── */

/** mountain ranges as silhouette cards on a ring around the stair, each facing the middle; snow on the crests */
const RIDGE_FRAG = /* glsl */ `
uniform float uSeed, uFar, uFlash, uPeak; uniform vec3 uFog; varying vec2 vUv;
float h(float x){ return fract(sin(x * 127.1 + uSeed) * 43758.5453); }
float n1(float x){ float i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(h(i), h(i+1.0), f); }
void main(){
  float x = vUv.x;
  float top = 0.38 + 0.22 * n1(x * 5.0) + 0.1 * n1(x * 13.0) + 0.035 * n1(x * 41.0);
  // the giant: one tall peak in the middle of its card
  top = mix(top, 0.97 - abs(x - 0.5) * 1.55 + 0.04 * n1(x * 23.0) + 0.02 * n1(x * 61.0), uPeak);
  if (vUv.y > top) discard;
  float below = top - vUv.y;
  vec3 col = mix(vec3(0.003, 0.0045, 0.009), uFog, uFar);
  // snow on the crest, streaky
  float snow = (1.0 - smoothstep(0.0, mix(0.05, 0.2, uPeak), below)) * smoothstep(0.35, 0.7, n1(x * 70.0 + vUv.y * 30.0) + 0.3);
  col += vec3(0.05, 0.065, 0.11) * snow * (1.0 - 0.6 * uFar);
  col += vec3(0.12, 0.15, 0.3) * uFlash * (0.3 + snow) * (1.0 - 0.5 * uFar);
  gl_FragColor = vec4(col, 1.0);
}`;
const RIDGE_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const cardPlane = new THREE.PlaneGeometry(1, 1);
const Ridge: React.FC<{p: V3; w: number; h: number; seed: number; far: number; flash: number; peak?: number}> = ({p, w, h, seed, far, flash, peak = 0}) => {
  const material = useMemo(
    () => new THREE.ShaderMaterial({vertexShader: RIDGE_VERT, fragmentShader: RIDGE_FRAG, uniforms: {uSeed: {value: seed}, uFar: {value: far}, uFlash: {value: 0}, uPeak: {value: peak}, uFog: {value: new THREE.Color('#0a1222')}}}),
    [seed, far, peak],
  );
  useEffect(() => () => material.dispose(), [material]);
  material.uniforms.uFlash.value = flash;
  // face the middle of the scene
  const ang = Math.atan2(CENTER[0] - p[0], CENTER[2] - p[2]);
  return <mesh geometry={cardPlane} material={material} position={[p[0], p[1] + h / 2, p[2]]} rotation={[0, ang, 0]} scale={[w, h, 1]} renderOrder={-5} />;
};
const CENTER: V3 = [0, 0, 8];
/** the giant peak the endless stair climbs toward */
export const GIANT: V3 = [NARROW.x + 2, -34, 175];
const RING = (r: number, n: number, y: number, hgt: number, far: number, off: number) =>
  Array.from({length: n}, (_, i) => {
    const a = ((i + off) / n) * Math.PI * 2;
    return {p: [CENTER[0] + Math.sin(a) * r, y, CENTER[2] + Math.cos(a) * r] as V3, w: (2 * Math.PI * r) / n * 1.25, h: hgt, seed: i * 7.3 + r, far};
  });
const RIDGES = [...RING(120, 10, -26, 40, 0.75, 0.5), ...RING(75, 9, -22, 30, 0.35, 0)];
const Ranges: React.FC<{flash: number}> = ({flash}) => (
  <>
    {RIDGES.map((k, i) => (
      <Ridge key={i} {...k} flash={flash} />
    ))}
    <Ridge p={GIANT} w={120} h={74} seed={3} far={0.3} flash={flash} peak={1} />
  </>
);

/** lanterns along both edges of the stair every few treads, up into the clouds */
const LANTERN = mat('#2a3248', '#0b0f1a', {shade: '#06080e', rim: '#ffcf9a', rimAmt: 0.4, rimPow: 2.4, wrap: 0.5});
const LAMPS: {p: V3; narrow: boolean}[] = [
  ...Array.from({length: 10}, (_, k) => k * 4 + 2).flatMap((j) => [-1, 1].map((s) => ({p: [s * (STAIR_W - 0.12), treadY(j), treadZ(j)] as V3, narrow: false}))),
  ...Array.from({length: 17}, (_, k) => N + PL + 2 + k * 4).flatMap((j) => [-1, 1].map((s) => ({p: [NARROW.x + s * (NARROW.w - 0.06), treadY(j, true), treadZ(j)] as V3, narrow: true}))),
];
const Lamps: React.FC<{t: number; storm: number; cz: number}> = ({t, storm, cz}) => (
  <>
    {LAMPS.map((l, i) => {
      if (Math.abs(l.p[2] - cz) > 45) return null;
      const fl = 0.85 + 0.15 * Math.sin(t * 13 + i * 2.1) * Math.sin(t * 7.3 + i) - 0.25 * storm * (0.5 + 0.5 * Math.sin(t * 21 + i));
      const top = add(l.p, [0, 0.34, 0]);
      return (
        <React.Fragment key={i}>
          <Limb a={l.p} b={top} r0={0.022} r1={0.018} m={LANTERN} y0={l.p[1]} y1={top[1]} />
          <Ball p={add(top, [0, 0.035, 0])} r={0.035} m={GOLD} y0={top[1] - 0.05} y1={top[1] + 0.08} />
          <Glow p={add(top, [0, 0.04, 0.02])} w={0.75} h={0.75} color="#ffb565" a={0.42 * fl} />
          <Glow p={[l.p[0], l.p[1] + 0.015, l.p[2]]} w={1.0} h={0.8} color="#ffa04a" a={0.16 * fl} flat />
        </React.Fragment>
      );
    })}
  </>
);

/** soft cloud banks drifting through, thicker in the storm */
const BANKS = Array.from({length: 26}, (_, i) => ({
  x: (rnd(i + 21) - 0.5) * 18,
  y: -2 + rnd(i + 22) * 12,
  z: -6 + rnd(i + 23) * 30,
  w: 3 + rnd(i + 24) * 5,
  v: 0.2 + 0.4 * rnd(i + 25),
  storm: rnd(i + 26) > 0.35,
}));
const Clouds: React.FC<{t: number; storm: number; clear: number}> = ({t, storm, clear}) => (
  <>
    {BANKS.map((c, i) => {
      const a = (c.storm ? storm : 0.35) * (1 - clear * 0.85);
      if (a < 0.02) return null;
      const x = ((c.x + c.v * t * (1 + 2.5 * storm) + 9) % 18 + 18) % 18 - 9;
      return <Puff key={i} p={[x, c.y + 0.3 * Math.sin(t * 0.3 + i), c.z]} w={c.w} h={c.w * 0.35} color={c.storm ? '#2e3650' : '#283048'} a={0.55 * a} seed={i * 1.7} />;
    })}
  </>
);

/** driving snow around the camera's point of interest */
const Snow: React.FC<{t: number; amt: number; c: V3}> = ({t, amt, c}) => {
  if (amt < 0.02) return null;
  return (
    <>
      {Array.from({length: 110}, (_, i) => {
        const sp = 2.5 + 2.5 * rnd(i + 1);
        const ph = fract(t * sp * 0.18 + rnd(i + 2));
        const x = c[0] + 4.5 - ph * 9 + (rnd(i + 3) - 0.5) * 2;
        const y = c[1] + 4 - fract(rnd(i + 4) + t * 0.11 * sp) * 8;
        const z = c[2] + (rnd(i + 5) - 0.5) * 5;
        const s = 0.025 + 0.03 * rnd(i + 6);
        return <Glow key={i} p={[x, y, z]} w={s * 9} h={s} color="#dfe8ff" a={0.7 * amt * Math.sin(Math.PI * ph)} mode="line" rot={-14} />;
      })}
    </>
  );
};

/** a jagged bolt from the sky, regenerated per strike */
const Bolt: React.FC<{t: number; at: number; p: V3; len: number; seed: number}> = ({t, at, p, len, seed}) => {
  const dt = t - at;
  if (dt < 0 || dt > 0.32) return null;
  const a = (dt < 0.06 ? 1 : dt < 0.1 ? 0.35 : dt < 0.14 ? 0.9 : 1 - (dt - 0.14) / 0.18) * 1;
  const pts: V3[] = [];
  let x = p[0];
  for (let k = 0; k <= 12; k++) {
    pts.push([x, p[1] - (len * k) / 12, p[2]]);
    x += (rnd(seed + k) - 0.5) * 1.4;
  }
  return (
    <>
      {pts.slice(0, -1).map((q0, k) => {
        const q1 = pts[k + 1];
        const mid: V3 = [(q0[0] + q1[0]) / 2, (q0[1] + q1[1]) / 2, q0[2]];
        const L = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]);
        const ang = (Math.atan2(q1[1] - q0[1], q1[0] - q0[0]) * 180) / Math.PI;
        return (
          <React.Fragment key={k}>
            <Glow p={mid} w={L * 1.25} h={0.22} color="#ffffff" a={a} mode="line" rot={ang} />
            <Glow p={mid} w={L * 1.4} h={1.4} color="#8fb0ff" a={0.35 * a} mode="line" rot={ang} />
          </React.Fragment>
        );
      })}
    </>
  );
};

/** lightning strikes on the strong beats of the storm */
export const STRIKES = [B(20), B(22), B(24), B(25.5), B(28), B(29.5)];
export const lightning = (t: number) => hits(t, STRIKES, 9) + 0.6 * hits(t, STRIKES.map((s) => s + 0.11), 14);

/* ───────────── the world ───────────── */

export const World: React.FC<{t: number; cam: Cam}> = ({t, cam}) => {
  const look = useLook();
  const st: State[] = CAST.map((f) => f(t));
  const js = st.map((s) => solveC(s.rig));
  const roots: V3[] = XS.map((x) => [x, 0, 0]);
  const w = (i: number, p: V3) => W3(p, roots[i], K3);
  const spentQ = st.map((s) => q(s.spent));
  const crackQ = q(st[2].cracks ?? 0);
  const mats = useMemo(
    () => ({
      sp: spentQ.map((k) => spentMat(k)),
      crack: mat('#fff0d0', '#ff5a20', {shade: '#a01a08', rim: '#ffd0a0', rimAmt: 0.6, wrap: 1, emit: 1.6}),
      fore: redHot(0.55 * crackQ),
      hot: mat('#fff6c8', '#ffb23a', {shade: '#b8621a', rim: '#fffbe6', rimAmt: 0.8, rimPow: 2, wrap: 0.9, emit: 1.35}),
    }),
    [spentQ.join(','), crackQ],
  );
  const storm = ss(t, T.storm - 1.4, T.storm) * (1 - ss(t, T.ignite, T.ignite + 2.2));
  const clear = ss(t, T.ignite, T.ignite + 2.2);
  const flash = lightning(t) * (t < T.ignite ? 1 : 0);
  const beacon = st[3].stone.glow ?? 0;
  const lights: Lights = st.map((s, i) => ({p: w(i, js[i].chest), c: s.tint, i: Math.min(1.4, s.energy)}));
  lights.push({p: st[3].stone.p, c: TINT.gold, i: 2.2 * beacon});
  // the spotlight on Ego (until the crowd leaves)
  const spot = 1 - ss(t, T.crowdOff + 0.2, T.crowdOff + 0.45);
  const egoC = w(1, js[1].chest);
  lights.push({p: add(egoC, [0, 0.4, 0.3]), c: '#fff1d6', i: 1.1 * spot});
  const lanes: Lanes = st.map((s, i) => ({n: i === 0 ? Math.min(12, Math.max(0, s.z / D + 1.2)) : Math.max(0, s.z / D + 1.2), c: s.tint, e: Math.min(1.2, s.energy) * (i === 2 ? 1 : 1)}));
  const crowd = 1 - ss(t, T.crowdOff, T.crowdOff + 1.6);
  const cyz: V3 = [cam.cx ?? 0, cam.cy, cam.cz ?? 0];
  const bursts: Burst[] = [
    // the weight lands: dust at every pair of feet
    ...XS.map((x, i): Burst => ({at: T.slam, p: [x, 0.05, 0.1], n: 14, speed: 0.9, color: '#8e9ab8', life: 0.7, seed: 11 + i * 17, up: 0.2, g: 2, size: 0.08})),
    // Motivation's light leaves him
    {at: T.motDrop, p: w(0, js[0].chest), n: 22, speed: 0.6, color: TINT.mot, life: 1.4, seed: 201, up: 1.0, g: 0.3},
    // Ego: the spotlight bangs off
    {at: T.crowdOff + 0.25, p: add(egoC, [0, 0.9, 0]), n: 12, speed: 0.8, color: '#fff1d6', life: 0.6, seed: 241, up: 0.8, g: 2},
    {at: T.egoDrop + 0.1, p: w(1, js[1].chest), n: 18, speed: 0.6, color: TINT.ego, life: 1.2, seed: 261, up: 1.0, g: 0.3},
    // the beacon
    {at: T.ignite, p: st[3].stone.p, n: 60, speed: 2.6, color: '#fff1c8', life: 1.5, seed: 501, up: 0.7, g: 2.5},
    {at: T.ignite, p: st[3].stone.p, n: 36, speed: 1.6, color: TINT.gold, life: 1.6, seed: 551, up: 1.0, g: 1.5},
  ];
  // stones hitting the stair: a puff of grit where they first land
  const DUST: [number, number][] = [
    [T.motDrop + 0.32, 0],
    [T.egoDrop + 0.3, 1],
  ];
  return (
    <>
      <Ranges flash={flash} />
      <Clouds t={t} storm={storm} clear={clear} />
      <Base flash={flash} crowd={crowd} />
      {crowd > 0 || t < T.crowdOff + 2 ? <Crowd t={t} /> : null}
      <Stair lights={lights} lanes={lanes} flash={flash} snow={0.4 + 0.6 * storm} />
      <Lamps t={t} storm={storm} cz={cam.cz ?? 0} />
      {/* the spotlight beam from the crowd up to Ego */}
      {spot > 0.01 ? (
        <>
          <Glow p={add(egoC, [0, 0.2, -0.2])} w={1.7} h={2.6} color="#fff1d6" a={0.13 * spot} />
          <Glow p={[XS[1], treadY(Math.max(0, Math.round(st[1].z / D))) + 0.02, st[1].z + 0.05]} w={1.6} h={1.1} color="#fff1d6" a={0.35 * spot} flat />
        </>
      ) : null}
      {st.map((s, i) => {
        const j = js[i];
        const l: Look3 = {
          body: spentQ[i] > 0 ? mats.sp[i] : look.a.body,
          core: s.tint,
          energy: Math.min(1.4, s.energy),
          cracks: i === 2 ? crackQ : undefined,
          crackMat: mats.crack,
          foreMat: i === 2 && crackQ > 0 ? [mats.fore, mats.fore] : undefined,
        };
        const c = w(i, j.chest);
        if (Math.abs(c[2] - (cam.cz ?? 0)) > 40) return null;
        return (
          <React.Fragment key={i}>
            <Glow p={add(c, [0, 0.05, -0.2])} w={1.6} h={1.9} color={s.tint} a={0.1 * Math.min(1.3, s.energy)} />
            <Man j={j} root={roots[i]} k={K3} l={l} body={HB}>
              {i === 1 ? <Crown j={j} /> : null}
            </Man>
            <Stone i={i} s={s.stone} t={t} mats={mats} />
          </React.Fragment>
        );
      })}
      {DUST.map(([at, i]) => {
        const dt = t - at;
        if (dt < 0 || dt > 1.6) return null;
        const p = CAST[i](at + 0.001).stone.p;
        return [0, 1, 2, 3, 4].map((k) => {
          const e = 1 - Math.pow(1 - clamp(dt / 1.2), 3);
          return <Puff key={`${i}-${k}`} p={[p[0] + (rnd(k + i * 9) - 0.5) * 0.8 * e, p[1] - SR + 0.1 + e * 0.35 * rnd(k + 3), p[2] + 0.1 + 0.02 * k]} w={0.5 + e * 0.9} h={0.35 + e * 0.5} color="#6c748c" a={0.55 * (1 - clamp(dt / 1.6))} seed={k * 2.3} />;
        });
      })}
      <Snow t={t} amt={storm} c={cyz} />
      {STRIKES.map((s, k) => (
        <Bolt key={k} t={t} at={s} p={[(k % 2 ? 1 : -1) * (4 + 3 * rnd(k + 40)), st[2].y + 14, st[2].z + 10 + 8 * rnd(k + 41)]} len={16} seed={k * 13 + 7} />
      ))}
      <Ring t={t} at={T.ignite} p={add(st[3].stone.p, [0, 0, 0.3])} r={1.8} color="#fff4d8" life={1.0} />
      <Ring t={t} at={T.ignite + 0.1} p={add(st[3].stone.p, [0, 0, 0.3])} r={1.1} color={TINT.gold} life={0.8} />
      {beacon > 0 ? <Glow p={add(st[3].stone.p, [0, 7, -0.2])} w={0.9 + 0.3 * Math.sin(t * 7)} h={14} color={TINT.gold} a={0.5 * beacon * ss(t, T.ignite, T.ignite + 0.4)} mode="beam" /> : null}
      {beacon > 0 ? <Glow p={[st[3].stone.p[0], TOP_Y + 0.02, st[3].stone.p[2]]} w={5} h={3} color={TINT.gold} a={0.3 * beacon} flat /> : null}
      {bursts.map((b, i) => (
        <BurstFx key={i} t={t} b={b} />
      ))}
      {/* Obsession's sweat of sparks while he sprints, worse as the cracks open */}
      {t > B(12) && t < T.end
        ? Array.from({length: 10}, (_, k) => {
            const per = 0.5 + 0.3 * rnd(k);
            const ph = fract(t / per + rnd(k + 3));
            const c0 = w(2, js[2].chest);
            const a = (st[2].cracks ?? 0) * (1 - ph);
            return <Glow key={`o${k}`} p={[c0[0] + (rnd(k + Math.floor(t / per)) - 0.5) * 0.5, c0[1] + 0.2 + ph * 0.6, c0[2] - 0.1 - ph * 0.3]} w={0.05} h={0.05} color={k % 2 ? TINT.hot : '#ffd0a0'} a={0.9 * a} />;
          })
        : null}
    </>
  );
};

export {treadZ, GOLD, NO};
