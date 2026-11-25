import React, {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {fract, rnd} from '../nc001-work-smart/anim';
import {Ball, Glow, Limb, Part, roundedBox, type V3} from '../nc001-work-smart/kit3d';
import {mat, type Mat} from '../nc001-work-smart/looks';
import {mixHex} from '../nc001-work-smart/world';
import {K3} from '../sg003-same-bar/rig3';
import {tw} from './plan';

/**
 * SG007 environments: each style gets its own world around the same five tables.
 * Tables run from (0,0,0) away to about (2.3, 0, −11) (world units); the camera looks from +z.
 */
export type Env = 'arena' | 'bar' | 'colosseum' | 'rooftop' | 'show' | 'paper' | 'comic';

const VERT = /* glsl */ `varying vec3 vW; varying vec2 vUv; varying vec3 vP;
void main(){ vUv = uv; vP = position; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const HASH = /* glsl */ `float h1(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h1(i), h1(i+vec2(1,0)), f.x), mix(h1(i+vec2(0,1)), h1(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * n2(p); p *= 2.03; a *= 0.5; } return s; }`;

/** a shader material made once per (fragment, uniforms) and disposed with the component */
const useShader = (frag: string, uniforms: Record<string, {value: unknown}>, opts: Partial<THREE.ShaderMaterialParameters> = {}) => {
  const m = useMemo(() => new THREE.ShaderMaterial({vertexShader: VERT, fragmentShader: frag, uniforms, ...opts}), [frag]);
  useEffect(() => () => m.dispose(), [m]);
  return m;
};
const col = (c: string) => new THREE.Color(c);

/* ───────────── sky dome: vertical gradient, a sun / moon, stars ───────────── */

const SKY = /* glsl */ `uniform vec3 uTop, uMid, uBot, uSun; uniform vec3 uSunDir; uniform float uSunAmt, uSunR, uStars; varying vec3 vP;
${HASH}
void main(){
  vec3 d = normalize(vP);
  float y = d.y;
  vec3 c = y > 0.08 ? mix(uMid, uTop, smoothstep(0.08, 0.6, y)) : mix(uBot, uMid, smoothstep(-0.2, 0.08, y));
  float s = dot(d, normalize(uSunDir));
  c += uSun * uSunAmt * (smoothstep(1.0 - uSunR, 1.0 - uSunR * 0.7, s) * 1.2 + pow(max(s, 0.0), 40.0) * 0.5 + pow(max(s, 0.0), 6.0) * 0.18);
  if (uStars > 0.0) { vec2 g = floor(vec2(atan(d.z, d.x) * 180.0, d.y * 160.0)); float st = step(0.996, h1(g)) * smoothstep(0.1, 0.4, y); c += vec3(st) * uStars; }
  gl_FragColor = vec4(c, 1.0);
}`;
const sphere = new THREE.SphereGeometry(70, 48, 24);
const Sky: React.FC<{top: string; mid: string; bot: string; sun?: string; sunDir?: V3; sunAmt?: number; sunR?: number; stars?: number}> = (p) => {
  const m = useShader(SKY, {uTop: {value: col(p.top)}, uMid: {value: col(p.mid)}, uBot: {value: col(p.bot)}, uSun: {value: col(p.sun ?? '#ffffff')}, uSunDir: {value: new THREE.Vector3(...(p.sunDir ?? [0, 0.1, -1]))}, uSunAmt: {value: p.sunAmt ?? 0}, uSunR: {value: p.sunR ?? 0.01}, uStars: {value: p.stars ?? 0}}, {side: THREE.BackSide, depthWrite: false});
  return <mesh geometry={sphere} material={m} position={[1, 0, -5]} renderOrder={-5} />;
};

/* ───────────── ground: one shader, several looks ───────────── */

const GROUND = /* glsl */ `uniform vec3 uA, uB, uC; uniform float uKind; uniform vec2 uCtr; varying vec3 vW;
${HASH}
void main(){
  vec2 p = vW.xz; vec3 c;
  if (uKind < 0.5) { // wood planks
    vec2 q = vec2(p.x * 3.2, p.y * 0.55 + floor(p.x * 3.2) * 0.37);
    float plank = h1(vec2(floor(q.x), floor(q.y)));
    float grain = fbm(vec2(q.x * 2.0, q.y * 18.0));
    c = mix(uA, uB, 0.35 + 0.4 * plank + 0.35 * grain);
    float seam = smoothstep(0.0, 0.04, abs(fract(q.x) - 0.5) * 2.0 - 0.92) + smoothstep(0.0, 0.02, abs(fract(q.y) - 0.5) * 2.0 - 0.985);
    c = mix(c, uC, clamp(seam, 0.0, 1.0) * 0.8);
  } else if (uKind < 1.5) { // sand with ripples and a raked ring
    float r = length(p - uCtr);
    float g = fbm(p * 1.3) * 0.6 + fbm(p * 9.0) * 0.4;
    c = mix(uA, uB, g);
    c = mix(c, uC, smoothstep(0.55, 0.75, sin(r * 5.0 + fbm(p * 2.0) * 3.0) * 0.5 + 0.5) * 0.25);
  } else if (uKind < 2.5) { // wet concrete roof with puddles
    float g = fbm(p * 0.8) * 0.6 + fbm(p * 7.0) * 0.4;
    c = mix(uA, uB, g);
    float pud = smoothstep(0.55, 0.62, fbm(p * 0.45 + 3.1));
    c = mix(c, uC, pud * 0.85);
    vec2 t = abs(fract(p * 0.5) - 0.5); c *= 1.0 - 0.25 * (1.0 - smoothstep(0.0, 0.01, min(t.x, t.y))) * (1.0 - pud);
  } else if (uKind < 3.5) { // glossy studio floor with rings
    float r = length(p - uCtr);
    c = mix(uA, uB, smoothstep(2.0, 14.0, r));
    float ring = 1.0 - smoothstep(0.0, 0.05, abs(fract(r * 0.42) - 0.5) * 2.0 - 0.9);
    c = mix(c, uC, ring * 0.35 * smoothstep(16.0, 4.0, r));
  } else if (uKind < 4.5) { // kraft paper
    float f = fbm(p * vec2(6.0, 40.0)) * 0.5 + fbm(p * 3.0) * 0.5;
    c = mix(uA, uB, f);
    c += (h1(floor(p * 200.0)) - 0.5) * 0.015;
  } else { // comic: flat colour, halftone dots darker toward the back
    float k = smoothstep(2.0, -14.0, p.y);
    vec2 g = fract(p * 6.0) - 0.5;
    float dot1 = 1.0 - smoothstep(0.18 * k + 0.02, 0.2 * k + 0.04, length(g));
    c = mix(uA, uB, dot1 * 0.9);
  }
  gl_FragColor = vec4(c, 1.0);
}`;
const groundGeo = new THREE.PlaneGeometry(140, 140);
const KIND = {wood: 0, sand: 1, roof: 2, gloss: 3, paper: 4, comic: 5};
const Ground: React.FC<{kind: keyof typeof KIND; a: string; b: string; c: string}> = ({kind, a, b, c}) => {
  const m = useShader(GROUND, {uA: {value: col(a)}, uB: {value: col(b)}, uC: {value: col(c)}, uKind: {value: KIND[kind]}, uCtr: {value: new THREE.Vector2(1.1, -5.5)}});
  return <mesh geometry={groundGeo} material={m} rotation={[-Math.PI / 2, 0, 0]} renderOrder={0} />;
};

/* ───────────── shared bits ───────────── */

const boxCache = new Map<string, THREE.BufferGeometry>();
const box = (w: number, h: number, d: number, r = 0.02) => {
  const k = [w, h, d, r].map((v) => v.toFixed(3)).join();
  if (!boxCache.has(k)) boxCache.set(k, roundedBox(w, h, d, r));
  return boxCache.get(k)!;
};
const Box: React.FC<{p: V3; s: V3; m: Mat; r?: number; rot?: number}> = ({p, s, m, r = 0.02, rot = 0}) => (
  <group position={p} rotation={[0, rot, 0]}>
    <Part geo={box(s[0], s[1], s[2], r)} m={m} y0={p[1] - s[1] / 2} y1={p[1] + s[1] / 2} />
  </group>
);
const matCache = new Map<string, Mat>();
const M = (top: string, bottom: string, o: Partial<Mat> = {}) => {
  const k = top + bottom + JSON.stringify(o);
  if (!matCache.has(k)) matCache.set(k, mat(top, bottom, {shade: mixHex(bottom, '#000000', 0.5), wrap: 0.6, ...o}));
  return matCache.get(k)!;
};

/** a soft volumetric cone of light from a lamp at height h down to the floor */
const CONE = /* glsl */ `uniform vec3 uC; uniform float uA; varying vec2 vUv; void main(){ float a = uA * pow(vUv.y, 1.3) * (0.35 + 0.65 * pow(sin(3.14159 * vUv.x), 2.0)); gl_FragColor = vec4(uC * a, a); }`;
const coneGeo = new THREE.ConeGeometry(1, 1, 40, 1, true);
const LightCone: React.FC<{p: V3; r: number; h: number; color: string; a: number}> = ({p, r, h, color, a}) => {
  const m = useShader(CONE, {uC: {value: col(color)}, uA: {value: a}}, {transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending});
  (m.uniforms.uC.value as THREE.Color).set(color);
  m.uniforms.uA.value = a;
  return <mesh geometry={coneGeo} material={m} position={[p[0], p[1] - h / 2, p[2]]} scale={[r, h, r]} renderOrder={7} />;
};

const TABLES = [0, 1, 2, 3, 4].map((i) => tw(i));
const CTR: V3 = [1.1, 0, -5.5];

/* ───────────── 1. dive bar ───────────── */

const BRICK = /* glsl */ `uniform vec3 uA, uB, uM; varying vec3 vW; ${HASH}
void main(){ vec2 p = vec2(vW.x + vW.z, vW.y) * vec2(3.2, 6.0); p.x += floor(p.y) * 0.5; vec2 f = fract(p); vec2 id = floor(p);
  float mortar = 1.0 - smoothstep(0.0, 0.06, min(min(f.x, 1.0 - f.x) * 0.6, min(f.y, 1.0 - f.y)));
  vec3 c = mix(uA, uB, h1(id) * 0.7 + fbm(vW.xy * 4.0) * 0.3);
  c = mix(c, uM, mortar); c *= 0.75 + 0.25 * fbm(vW.xy * 0.4 + 2.0); gl_FragColor = vec4(c, 1.0); }`;
const wallGeo = new THREE.PlaneGeometry(1, 1);
const Brick: React.FC<{p: V3; w: number; h: number; ry?: number}> = ({p, w, h, ry = 0}) => {
  const m = useShader(BRICK, {uA: {value: col('#3a160e')}, uB: {value: col('#6a2a18')}, uM: {value: col('#140a08')}});
  return <mesh geometry={wallGeo} material={m} position={p} rotation={[0, ry, 0]} scale={[w, h, 1]} />;
};
const NEON = (c: string) => M(c, c, {shade: '#ffffff', wrap: 1, emit: 2.2});
const Neon: React.FC<{pts: V3[]; color: string; t: number; flick?: number}> = ({pts, color, t, flick = 0}) => {
  const on = flick ? (Math.sin(t * 23) > 0.85 ? 0.3 : 1) : 1;
  return (
    <>
      {pts.slice(0, -1).map((a, i) => (
        <Limb key={i} a={a} b={pts[i + 1]} r0={0.025} r1={0.025} m={NEON(on > 0.5 ? color : mixHex(color, '#000000', 0.6))} y0={0} y1={1} />
      ))}
      <Glow p={pts[Math.floor(pts.length / 2)]} w={2.2} h={1.4} color={color} a={0.3 * on} />
    </>
  );
};
const circle = (c: V3, r: number, n = 20, a0 = 0, a1 = Math.PI * 2): V3[] => Array.from({length: n + 1}, (_, i) => {
  const a = a0 + ((a1 - a0) * i) / n;
  return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, c[2]];
});

const Bar: React.FC<{t: number}> = ({t}) => {
  const WOOD = M('#7a4a26', '#3a1e0e', {spec: 0.4, rim: '#ffb070', rimAmt: 0.2});
  const DARKW = M('#3a2214', '#1a0e08', {spec: 0.3});
  const SHADE = M('#2a3a2a', '#0e140e', {spec: 0.8, rim: '#c8ffc8', rimAmt: 0.3});
  const BOTTLES = ['#2f8a4a', '#8a5a1a', '#c8d8e8', '#7a1a1a', '#3a5a9a'];
  return (
    <>
      <Ground kind="wood" a="#5a3418" b="#2a160a" c="#0c0604" />
      <Brick p={[1.5, 3, -14]} w={26} h={6.5} />
      <Brick p={[-4.6, 3, -4]} w={22} h={6.5} ry={Math.PI / 2} />
      <Brick p={[8.5, 3, -4]} w={22} h={6.5} ry={-Math.PI / 2} />
      {/* the bar along the back wall: counter, shelves of glowing bottles, a mirror strip */}
      <Box p={[1.5, 0.55, -12.6]} s={[11, 1.1, 0.8]} m={WOOD} />
      <Box p={[1.5, 1.12, -12.4]} s={[11.2, 0.08, 1.0]} m={DARKW} />
      {[1.9, 2.5].map((y, r) => (
        <React.Fragment key={r}>
          <Box p={[1.5, y - 0.06, -13.75]} s={[9, 0.05, 0.35]} m={DARKW} />
          {Array.from({length: 22}, (_, i) => {
            const x = -2.6 + i * 0.38 + rnd(i + r * 30) * 0.08;
            const c = BOTTLES[Math.floor(rnd(i * 3 + r) * BOTTLES.length)];
            const h = 0.28 + 0.12 * rnd(i + 9 + r);
            return (
              <React.Fragment key={i}>
                <Limb a={[x, y, -13.7]} b={[x, y + h, -13.7]} r0={0.06} r1={0.05} m={M(mixHex(c, '#ffffff', 0.3), c, {shade: c, emit: 1.3, rim: '#ffffff', rimAmt: 0.5})} y0={y} y1={y + h} />
                <Glow p={[x, y + h * 0.5, -13.6]} w={0.25} h={0.4} color={c} a={0.25} />
              </React.Fragment>
            );
          })}
        </React.Fragment>
      ))}
      {/* neon on the brick: a crown over a heart-shaped "flex" arm (no words) and a buzzing strip */}
      <Neon pts={[[-0.6, 4.1, -13.9], [-0.3, 4.6, -13.9], [0.0, 4.25, -13.9], [0.3, 4.7, -13.9], [0.6, 4.25, -13.9], [0.9, 4.6, -13.9], [1.2, 4.1, -13.9], [-0.6, 4.1, -13.9]]} color="#ffd24a" t={t} />
      <Neon pts={circle([3.8, 4.2, -13.9], 0.55, 24)} color="#ff3a6a" t={t} flick={1} />
      <Neon pts={[[3.45, 4.2, -13.85], [3.8, 4.45, -13.85], [4.15, 4.0, -13.85]]} color="#ff3a6a" t={t} />
      <Neon pts={[[-3.8, 3.3, -13.9], [7.0, 3.3, -13.9]]} color="#3ae0ff" t={t} />
      {/* a pendant lamp over every table, its warm cone through the smoke */}
      {TABLES.map((c, i) => (
        <React.Fragment key={i}>
          <Limb a={[c[0], 6, c[2]]} b={[c[0], 2.35, c[2]]} r0={0.008} r1={0.008} m={DARKW} y0={0} y1={6} />
          <Limb a={[c[0], 2.35, c[2]]} b={[c[0], 2.05, c[2]]} r0={0.05} r1={0.32} m={SHADE} y0={2} y1={2.4} />
          <Ball p={[c[0], 2.06, c[2]]} r={0.08} m={NEON('#ffe2a8')} />
          <Glow p={[c[0], 2.0, c[2]]} w={0.9} h={0.5} color="#ffcf8a" a={0.8} />
          <LightCone p={[c[0], 2.05, c[2]]} r={1.35} h={2.05} color="#ffb86a" a={0.11} />
          <Glow p={[c[0], 0.01, c[2]]} w={3.2} h={2.6} color="#ffaa5a" a={0.28} flat />
        </React.Fragment>
      ))}
      {/* smoke drifting under the lamps */}
      {Array.from({length: 26}, (_, i) => {
        const x = -2 + rnd(i + 1) * 7 + Math.sin(t * 0.2 + i) * 0.4;
        const y = 1.3 + rnd(i + 2) * 1.2 + fract(t * 0.03 + rnd(i)) * 0.4;
        const z = -rnd(i + 3) * 12;
        return <Glow key={i} p={[x, y, z]} w={2.4} h={0.9} color="#c89a6a" a={0.05} />;
      })}
      {/* bar stools along the counter */}
      {Array.from({length: 6}, (_, i) => (
        <React.Fragment key={i}>
          <Limb a={[-1.5 + i * 1.3, 0, -11.7]} b={[-1.5 + i * 1.3, 0.75, -11.7]} r0={0.04} r1={0.04} m={DARKW} y0={0} y1={1} />
          <Limb a={[-1.5 + i * 1.3, 0.75, -11.7]} b={[-1.5 + i * 1.3, 0.82, -11.7]} r0={0.22} r1={0.22} m={M('#8a1a1a', '#3a0808', {spec: 0.6})} y0={0.7} y1={0.85} />
        </React.Fragment>
      ))}
    </>
  );
};

/* ───────────── 2. colosseum at sunset ───────────── */

const STONE = M('#e8cfa6', '#7a5a3a', {spec: 0.1, rim: '#ffd8a0', rimAmt: 0.25, wrap: 0.7});
const Colosseum: React.FC<{t: number}> = ({t}) => {
  const R = 13;
  const cols = Array.from({length: 26}, (_, i) => -Math.PI * 0.08 - (i / 25) * Math.PI * 0.84);
  return (
    <>
      <Sky top="#2a1a4a" mid="#e0704a" bot="#ffb46a" sun="#fff0c0" sunDir={[0.25, 0.05, -1]} sunAmt={1.4} sunR={0.012} />
      <Ground kind="sand" a="#c89a62" b="#e8c08a" c="#8a6a42" />
      {/* the low arena wall and two tiers of arches behind it */}
      {cols.map((a, i) => {
        const x = CTR[0] + Math.cos(a) * R;
        const z = CTR[2] + Math.sin(a) * R;
        const rot = -a - Math.PI / 2;
        return (
          <React.Fragment key={i}>
            <Box p={[x, 0.6, z]} s={[1.65, 1.2, 0.5]} m={STONE} rot={rot} />
            {[0, 1].map((tier) => {
              const rr = R + 1.2 + tier * 1.4;
              const xx = CTR[0] + Math.cos(a) * rr;
              const zz = CTR[2] + Math.sin(a) * rr;
              const y0 = 1.2 + tier * 3.2;
              return (
                <React.Fragment key={tier}>
                  <Limb a={[xx, y0, zz]} b={[xx, y0 + 2.6, zz]} r0={0.26} r1={0.22} m={STONE} y0={0} y1={8} />
                  <Box p={[xx, y0 + 2.85, zz]} s={[1.9, 0.45, 0.7]} m={STONE} rot={rot} />
                </React.Fragment>
              );
            })}
            {i % 3 === 0 ? (
              <>
                <Limb a={[x, 1.2, z + 0.3]} b={[x, 2.0, z + 0.3]} r0={0.04} r1={0.05} m={M('#5a3a1a', '#2a1a0a')} y0={1} y1={2} />
                <Glow p={[x, 2.15 + 0.04 * Math.sin(t * 13 + i), z + 0.3]} w={0.35 + 0.05 * Math.sin(t * 17 + i)} h={0.6} color="#ffb03a" a={0.9} />
                <Glow p={[x, 2.1, z + 0.3]} w={1.6} h={1.6} color="#ff8a2a" a={0.25} />
              </>
            ) : null}
          </React.Fragment>
        );
      })}
      {/* hanging banners, sun dust in the air */}
      {Array.from({length: 40}, (_, i) => {
        const x = -3 + rnd(i + 1) * 9;
        const y = 0.2 + fract(rnd(i + 2) + t * 0.05) * 3;
        const z = -rnd(i + 3) * 13;
        return <Glow key={i} p={[x, y, z]} w={0.05} h={0.05} color="#ffe0a0" a={0.5 * Math.sin(Math.PI * fract(rnd(i + 2) + t * 0.05))} />;
      })}
      <Glow p={[4, 1.5, -30]} w={40} h={14} color="#ff9a4a" a={0.25} />
    </>
  );
};

/* ───────────── 3. rooftop, city at night ───────────── */

const WIN = /* glsl */ `uniform vec3 uA, uW; uniform float uSeed; varying vec2 vUv; varying vec3 vP; ${HASH}
void main(){ vec2 g = vUv * vec2(8.0, 30.0); vec2 id = floor(g); vec2 f = fract(g);
  float lit = step(0.62, h1(id + uSeed)) * step(0.15, f.x) * step(f.x, 0.8) * step(0.2, f.y) * step(f.y, 0.75);
  vec3 c = uA + uW * lit * (0.5 + 0.5 * h1(id * 1.7 + uSeed));
  gl_FragColor = vec4(c, 1.0); }`;
const towerGeo = new THREE.BoxGeometry(1, 1, 1);
const Tower: React.FC<{p: V3; s: V3; seed: number}> = ({p, s, seed}) => {
  const m = useShader(WIN, {uA: {value: col('#05070f')}, uW: {value: col(rnd(seed) > 0.5 ? '#ffd9a0' : '#a8d4ff')}, uSeed: {value: seed}});
  return <mesh geometry={towerGeo} material={m} position={[p[0], s[1] / 2 + p[1], p[2]]} scale={s} />;
};
const Rooftop: React.FC<{t: number}> = ({t}) => {
  const CON = M('#4a5262', '#1c2028', {spec: 0.2});
  const towers = useMemo(
    () =>
      Array.from({length: 70}, (_, i) => {
        const a = -Math.PI * 0.05 - rnd(i + 1) * Math.PI * 0.9;
        const r = 24 + rnd(i + 2) * 22;
        return {p: [CTR[0] + Math.cos(a) * r, -14, CTR[2] + Math.sin(a) * r] as V3, s: [2 + rnd(i + 3) * 3, 8 + rnd(i + 4) * 26, 2 + rnd(i + 5) * 3] as V3, seed: i * 7.1};
      }),
    [],
  );
  return (
    <>
      <Sky top="#030614" mid="#14204a" bot="#3a2a5a" sun="#e8eeff" sunDir={[-0.35, 0.42, -1]} sunAmt={1.2} sunR={0.006} stars={0.8} />
      <Ground kind="roof" a="#1a1e28" b="#2a303c" c="#0a0c14" />
      {towers.map((tw2, i) => (
        <Tower key={i} {...tw2} />
      ))}
      {/* parapet round the roof, a water tank, an antenna with a red blink */}
      <Box p={[1.5, 0.45, -13.5]} s={[16, 0.9, 0.35]} m={CON} />
      <Box p={[-5.2, 0.45, -5.5]} s={[0.35, 0.9, 16]} m={CON} />
      <Box p={[8.2, 0.45, -5.5]} s={[0.35, 0.9, 16]} m={CON} />
      <Limb a={[6.2, 0, -11]} b={[6.2, 2.6, -11]} r0={1.0} r1={1.0} m={M('#5a3a2a', '#2a1a12', {spec: 0.2})} y0={0} y1={3} />
      <Limb a={[6.2, 2.6, -11]} b={[6.2, 3.3, -11]} r0={1.05} r1={0.1} m={M('#3a2a1a', '#1a120a')} y0={2.5} y1={3.4} />
      <Limb a={[-3.5, 0, -12]} b={[-3.5, 6.5, -12]} r0={0.05} r1={0.02} m={CON} y0={0} y1={7} />
      <Glow p={[-3.5, 6.55, -12]} w={0.5} h={0.5} color="#ff3a3a" a={Math.sin(t * 3) > 0.3 ? 1 : 0.15} />
      {/* string lights zig-zagging over the tables */}
      {Array.from({length: 6}, (_, s) => {
        const a: V3 = [s % 2 ? 7.5 : -4.5, 3.4, 1.5 - s * 2.8];
        const b: V3 = [s % 2 ? -4.5 : 7.5, 3.4, -1.3 - s * 2.8];
        return Array.from({length: 18}, (_, i) => {
          const k = i / 17;
          const p: V3 = [a[0] + (b[0] - a[0]) * k, a[1] - Math.sin(Math.PI * k) * 0.7, a[2] + (b[2] - a[2]) * k];
          const tw3 = 0.75 + 0.25 * Math.sin(t * 2 + i + s);
          return <Glow key={`${s}-${i}`} p={p} w={0.22} h={0.22} color="#ffd08a" a={0.9 * tw3} />;
        });
      })}
      {/* rain streaks */}
      {Array.from({length: 60}, (_, i) => {
        const x = -3 + rnd(i + 1) * 9;
        const z = -rnd(i + 2) * 12;
        const y = 4.5 - fract(rnd(i + 3) + t * 1.6) * 4.5;
        return <Glow key={`r${i}`} p={[x, y, z]} w={0.012} h={0.35} color="#a8c8ff" a={0.35} />;
      })}
    </>
  );
};

/* ───────────── 4. game show ───────────── */

const TORUS = new THREE.TorusGeometry(1, 0.06, 12, 80);
const Show: React.FC<{t: number}> = ({t}) => {
  const conf = ['#ff3aa0', '#3ae0ff', '#ffe03a', '#7dff8a', '#ffffff'];
  return (
    <>
      <Sky top="#2a0a4a" mid="#7a1a8a" bot="#ff4ab0" />
      <Ground kind="gloss" a="#3affe0" b="#0a3a5a" c="#ffffff" />
      {/* giant LED arches behind, chasing lights */}
      {[0, 1, 2].map((k) => {
        const r = 7 + k * 2.2;
        const color = ['#ff3aa0', '#ffe03a', '#3ae0ff'][k];
        return (
          <React.Fragment key={k}>
            <mesh geometry={TORUS} position={[CTR[0], 0, -14 - k * 1.5]} scale={[r, r, r]}>
              <meshBasicMaterial color={new THREE.Color(color).multiplyScalar(2)} />
            </mesh>
            {Array.from({length: 40}, (_, i) => {
              const a = (i / 39) * Math.PI;
              const on = Math.sin(t * 8 - i * 0.6 + k) > 0.2;
              return <Glow key={i} p={[CTR[0] + Math.cos(a) * r, Math.sin(a) * r, -13.9 - k * 1.5]} w={0.6} h={0.6} color={color} a={on ? 0.7 : 0.15} />;
            })}
          </React.Fragment>
        );
      })}
      {/* a podium ring of light round each table */}
      {TABLES.map((c, i) => (
        <React.Fragment key={i}>
          <mesh geometry={TORUS} position={[c[0], 0.03, c[2]]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.6, 1.6, 1.6]}>
            <meshBasicMaterial color={new THREE.Color(['#ff3aa0', '#ffe03a', '#3ae0ff', '#7dff8a', '#ffffff'][i]).multiplyScalar(1.6)} />
          </mesh>
          <Glow p={[c[0], 0.02, c[2]]} w={4} h={4} color="#ffffff" a={0.25} flat />
        </React.Fragment>
      ))}
      {/* confetti falling everywhere */}
      {Array.from({length: 140}, (_, i) => {
        const x = -3 + rnd(i + 1) * 9;
        const z = 2 - rnd(i + 2) * 14;
        const y = 5 - fract(rnd(i + 3) + t * (0.12 + 0.08 * rnd(i + 4))) * 5;
        const c = conf[i % conf.length];
        return (
          <mesh key={i} position={[x + Math.sin(t * 3 + i) * 0.1, y, z]} rotation={[t * 4 + i, t * 3 + i * 2, 0]}>
            <planeGeometry args={[0.07, 0.04]} />
            <meshBasicMaterial color={c} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
      {/* spot cones sweeping */}
      {[-3, 1.1, 5].map((x, i) => (
        <group key={i} position={[x, 8, -6]} rotation={[0, 0, Math.sin(t * 0.8 + i * 2) * 0.35]}>
          <LightCone p={[0, 0, 0]} r={1.6} h={8} color={['#ff3aa0', '#ffffff', '#3ae0ff'][i]} a={0.09} />
        </group>
      ))}
    </>
  );
};

/* ───────────── 5. paper theatre ───────────── */

const HILL = /* glsl */ `uniform vec3 uC, uE; uniform float uSeed, uAmp; varying vec2 vUv; ${HASH}
void main(){ float top = 0.55 + uAmp * (sin(vUv.x * 7.0 + uSeed) * 0.5 + sin(vUv.x * 17.0 + uSeed * 2.0) * 0.18 + fbm(vec2(vUv.x * 9.0, uSeed)) * 0.4);
  float a = step(vUv.y, top);
  float edge = smoothstep(top - 0.02, top, vUv.y);
  vec3 c = mix(uC, uE, edge * 0.6) * (0.92 + 0.08 * fbm(vUv * vec2(60.0, 20.0)));
  if (a < 0.5) discard; gl_FragColor = vec4(c, 1.0); }`;
const Card: React.FC<{p: V3; w: number; h: number; c: string; e: string; seed: number; amp?: number}> = ({p, w, h, c, e, seed, amp = 0.25}) => {
  const m = useShader(HILL, {uC: {value: col(c)}, uE: {value: col(e)}, uSeed: {value: seed}, uAmp: {value: amp}});
  return <mesh geometry={wallGeo} material={m} position={p} scale={[w, h, 1]} />;
};
const DISC = /* glsl */ `uniform vec3 uC; varying vec2 vUv; ${HASH} void main(){ float d = length(vUv - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(uC * (0.95 + 0.05 * fbm(vUv * 30.0)), 1.0); }`;
const Disc: React.FC<{p: V3; r: number; c: string}> = ({p, r, c}) => {
  const m = useShader(DISC, {uC: {value: col(c)}});
  return <mesh geometry={wallGeo} material={m} position={p} scale={[r * 2, r * 2, 1]} />;
};
const Paper: React.FC<{t: number}> = ({t}) => (
  <>
    <Sky top="#f3c98a" mid="#f7dcae" bot="#f7e6c8" />
    <Ground kind="paper" a="#c9a57a" b="#dcbf94" c="#000000" />
    <Disc p={[3.5, 7.5, -30]} r={2.6} c="#ff8a4a" />
    {/* layers of cut-paper hills, far to near, each a shade deeper */}
    <Card p={[1, 2.5, -28]} w={70} h={14} c="#e8a878" e="#f6c79a" seed={1} amp={0.18} />
    <Card p={[1, 1.4, -22]} w={60} h={10} c="#d27a5a" e="#e8a07a" seed={4} amp={0.22} />
    <Card p={[1, 0.6, -17]} w={50} h={7} c="#a64e4a" e="#c26a5e" seed={9} amp={0.25} />
    <Card p={[1, 0.1, -14.5]} w={40} h={4} c="#6e2e3e" e="#8a4450" seed={13} amp={0.3} />
    {/* paper clouds on sticks, swaying */}
    {[-3, 2, 6].map((x, i) => (
      <group key={i} position={[x + Math.sin(t * 0.6 + i) * 0.2, 5.5 + i * 0.4, -16 + i]}>
        <Disc p={[0, 0, 0]} r={0.7} c="#fff4e0" />
        <Disc p={[0.7, -0.15, 0.01]} r={0.5} c="#fff4e0" />
        <Disc p={[-0.65, -0.2, 0.01]} r={0.45} c="#fff4e0" />
      </group>
    ))}
    {/* a cut-paper crowd: rows of round heads on the near hill */}
    {Array.from({length: 40}, (_, i) => (
      <Disc key={i} p={[-6 + i * 0.36, 1.0 + 0.04 * Math.sin(t * 4 + i), -14.3 + (i % 2) * 0.05]} r={0.18} c={i % 3 ? '#4a1e2a' : '#5a2a36'} />
    ))}
  </>
);

/* ───────────── 6. comic pop ───────────── */

const BURST = /* glsl */ `uniform vec3 uA, uB, uD; uniform float uT; varying vec2 vUv;
void main(){ vec2 p = vUv - vec2(0.5, 0.45); float a = atan(p.y, p.x); float r = length(p);
  float ray = step(0.5, fract(a * 16.0 / 6.28318 + uT * 0.05));
  vec3 c = mix(uA, uB, ray);
  vec2 g = fract(vUv * vec2(90.0, 50.0)) - 0.5; float dotv = 1.0 - smoothstep(0.2, 0.26, length(g) / (0.3 + r * 1.2));
  c = mix(c, uD, dotv * 0.35);
  gl_FragColor = vec4(c, 1.0); }`;
const Comic: React.FC<{t: number}> = ({t}) => {
  const m = useShader(BURST, {uA: {value: col('#ffd22a')}, uB: {value: col('#ff9a1a')}, uD: {value: col('#d8301a')}, uT: {value: 0}});
  m.uniforms.uT.value = t;
  return (
    <>
      <mesh geometry={wallGeo} material={m} position={[1.1, 6, -24]} scale={[60, 34, 1]} />
      <Ground kind="comic" a="#fff1c8" b="#e8562a" c="#000000" />
      {/* black ink horizon line */}
      <mesh position={[1.1, 0.005, -16]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[80, 0.12]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
    </>
  );
};

export const EnvWorld: React.FC<{env: Env; t: number}> = ({env, t}) => {
  if (env === 'bar') return <Bar t={t} />;
  if (env === 'colosseum') return <Colosseum t={t} />;
  if (env === 'rooftop') return <Rooftop t={t} />;
  if (env === 'show') return <Show t={t} />;
  if (env === 'paper') return <Paper t={t} />;
  if (env === 'comic') return <Comic t={t} />;
  return null;
};
export {K3};
