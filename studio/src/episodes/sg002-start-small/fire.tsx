import React, {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {fract, rnd} from '../nc001-work-smart/anim';
import {Ball, Glow, Limb, V3, useLook} from '../nc001-work-smart/kit3d';
import {mat, type Cast, type Mat} from '../nc001-work-smart/looks';
import {mixHex} from '../nc001-work-smart/world';

/* ───────────── materials ───────────── */

export const WOOD = mat('#a8774f', '#4a2c1a', {shade: '#3a2318', rim: '#ffcf9a', rimAmt: 0.35, rimPow: 2.6, wrap: 0.6});
export const CHAR = mat('#2a2426', '#121014', {shade: '#2a2228', rim: '#7a6a70', rimAmt: 0.3, wrap: 0.6});
export const STONE = mat('#6e7a96', '#2a3044', {shade: '#2e3448', rim: '#b8c8e8', rimAmt: 0.4, rimPow: 2.4, wrap: 0.6});

export const charred = (k: number): Mat => {
  const q = Math.round(k * 20) / 20;
  return {...WOOD, top: mixHex(WOOD.top, CHAR.top, q), bottom: mixHex(WOOD.bottom, CHAR.bottom, q), rim: mixHex(WOOD.rim, '#ff7a3a', q * 0.6)};
};

/** porcelain lit by a fire: warm rim and shadow, k = 0..1 (quantised so materials are reused) */
const warmCache = new Map<string, Cast>();
export const warm = (c: Cast, k: number): Cast => {
  const q = Math.round(Math.max(0, Math.min(1, k)) * 20) / 20;
  const key = `${c.core}|${c.body.top}|${q}`;
  let r = warmCache.get(key);
  if (!r) {
    const body: Mat = {...c.body, top: mixHex(c.body.top, '#fff1e2', q), bottom: mixHex(c.body.bottom, '#c99a86', q * 0.8), rim: mixHex(c.body.rim, '#ffb46a', q), rimAmt: c.body.rimAmt + 0.35 * q, shade: mixHex(c.body.shade, '#6a4660', q * 0.7)};
    r = {...c, body, trim: body, mark: body};
    warmCache.set(key, r);
  }
  return r;
};

/** the same body gone cold and dim, k = 0..1 */
const chillCache = new Map<string, Cast>();
export const chill = (c: Cast, k: number): Cast => {
  const q = Math.round(Math.max(0, Math.min(1, k)) * 20) / 20;
  if (q === 0) return c;
  const key = `${c.core}|${c.body.top}|${q}`;
  let r = chillCache.get(key);
  if (!r) {
    const body: Mat = {...c.body, top: mixHex(c.body.top, '#9aa8c4', q), bottom: mixHex(c.body.bottom, '#46506a', q), rim: mixHex(c.body.rim, '#9fb8e8', q), rimAmt: c.body.rimAmt * (1 - 0.3 * q), emit: c.body.emit * (1 - 0.12 * q)};
    r = {...c, body, trim: body, mark: body};
    chillCache.set(key, r);
  }
  return r;
};

/* ───────────── flame shader ───────────── */

const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = /* glsl */ `
precision highp float; varying vec2 vUv;
uniform float uT, uSeed, uA; uniform vec3 uOut, uMid, uIn;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++){ s += a * n(p); p *= 2.03; a *= 0.5; } return s; }
void main(){
  float y = vUv.y; float x = vUv.x - 0.5;
  vec2 q = vec2(x * 3.0 + uSeed, y * 2.2 - uT * 2.6);
  float nn = fbm(q);
  float n2 = fbm(q * 1.7 + 4.1);
  float px = x + (nn - 0.5) * 0.34 * y + sin(uT * 3.1 + uSeed + y * 4.0) * 0.03 * y;
  float w = 0.46 * pow(clamp(y / 0.22, 0.0, 1.0), 0.45) * pow(clamp(1.0 - y, 0.0, 1.0), 1.15);
  float d = abs(px) / max(w, 1e-3);
  float top = y + (n2 - 0.5) * 0.42;
  float flame = smoothstep(1.0, 0.55, d) * smoothstep(0.98, 0.62, top);
  float core = smoothstep(0.62, 0.05, d) * smoothstep(0.7, 0.18, top);
  vec3 c = mix(uOut, uMid, smoothstep(0.0, 0.7, flame));
  c = mix(c, uIn, core);
  float a = clamp(flame * 1.15, 0.0, 1.0) * uA;
  gl_FragColor = vec4(c * a * 1.25, a);
}`;
const plane = new THREE.PlaneGeometry(1, 1);
plane.translate(0, 0.5, 0);

/** one flame sheet, standing on p */
export const Flame: React.FC<{p: V3; w: number; h: number; t: number; seed: number; a?: number; colors?: [string, string, string]}> = ({p, w, h, t, seed, a = 1, colors = ['#ff3d0e', '#ff9a24', '#fff0b4']}) => {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {uT: {value: 0}, uSeed: {value: seed}, uA: {value: a}, uOut: {value: new THREE.Color(colors[0])}, uMid: {value: new THREE.Color(colors[1])}, uIn: {value: new THREE.Color(colors[2])}},
      }),
    [seed, colors[0], colors[1], colors[2]],
  );
  useEffect(() => () => material.dispose(), [material]);
  material.uniforms.uT.value = t;
  material.uniforms.uA.value = a;
  return h > 0.01 ? <mesh geometry={plane} material={material} position={p} scale={[w, h, 1]} renderOrder={9} /> : null;
};

/* ───────────── campfire ───────────── */

/**
 * I    — size of the fire (0 = out, ~0.85 = a steady campfire, 2.5 = a blaze)
 * burnt — how charred the logs are; ember — glow left in the ashes; smoke — 0..1 of a smoke column
 */
export const Campfire: React.FC<{x: number; z?: number; t: number; I: number; seed: number; burnt?: number; ember?: number; smoke?: number; smokeT?: number}> = ({x, z = 0, t, I, seed, burnt = 0, ember = 0, smoke = 0, smokeT = 0}) => {
  const look = useLook();
  const wood = charred(burnt);
  const fl = I * (0.92 + 0.08 * Math.sin(t * 13 + seed) + 0.05 * Math.sin(t * 7.3 + seed * 2));
  const stones = Array.from({length: 10}, (_, i) => {
    const a = (i / 10) * Math.PI * 2 + seed;
    return [x + Math.cos(a) * 0.33, 0.035, z + Math.sin(a) * 0.2] as V3;
  });
  const logs: [V3, V3][] = [
    [[x - 0.26, 0.05, z + 0.08], [x + 0.24, 0.07, z - 0.06]],
    [[x + 0.25, 0.05, z + 0.1], [x - 0.22, 0.08, z - 0.08]],
    [[x - 0.05, 0.05, z + 0.2], [x + 0.03, 0.1, z - 0.18]],
  ];
  const sparks = Math.round(Math.min(26, 10 * I));
  return (
    <>
      {/* light on the ground and in the air */}
      {fl > 0.02 ? (
        <>
          <Glow p={[x, 0.01, z + 0.1]} w={2.4 * Math.sqrt(fl)} h={1.5 * Math.sqrt(fl)} color="#ff8a3a" a={0.5 * Math.min(1, fl)} flat />
          <Glow p={[x, 0.45 * fl, z - 0.35]} w={2.6 * Math.sqrt(fl)} h={2.6 * Math.sqrt(fl)} color="#ff7a2a" a={0.22 * Math.min(1.4, fl)} />
        </>
      ) : null}
      {stones.map((p, i) => (
        <Ball key={i} p={p} r={0.055 + rnd(i + seed) * 0.02} s={[1.1, 0.7, 1]} m={STONE} y0={-0.02} y1={0.09} />
      ))}
      {logs.map(([a, b], i) => (
        <Limb key={i} a={a} b={b} r0={0.045} r1={0.04} m={wood} y0={0} y1={0.14} />
      ))}
      {/* embers in the ashes */}
      {ember > 0.01
        ? Array.from({length: 9}, (_, i) => (
            <Glow key={i} p={[x + (rnd(i + 30) - 0.5) * 0.4, 0.08, z + 0.12 + (rnd(i + 40) - 0.5) * 0.1]} w={0.09} h={0.09} color="#ff5a1a" a={ember * (0.5 + 0.5 * Math.sin(t * (3 + rnd(i) * 4) + i))} />
          ))
        : null}
      {/* flames: a wide sheet, two side tongues and a bright heart */}
      <Flame p={[x, 0.04, z + 0.05]} w={0.62 * Math.pow(fl, 0.6)} h={0.95 * fl} t={t} seed={seed} />
      <Flame p={[x - 0.1 * Math.pow(fl, 0.5), 0.04, z + 0.08]} w={0.36 * Math.pow(fl, 0.6)} h={0.62 * fl} t={t * 1.13} seed={seed + 3.7} a={0.85} />
      <Flame p={[x + 0.11 * Math.pow(fl, 0.5), 0.04, z + 0.09]} w={0.34 * Math.pow(fl, 0.6)} h={0.55 * fl} t={t * 0.91} seed={seed + 7.1} a={0.85} />
      <Flame p={[x, 0.04, z + 0.12]} w={0.3 * Math.pow(fl, 0.6)} h={0.4 * fl} t={t * 1.3} seed={seed + 1.9} a={0.9} colors={['#ff7a1a', '#ffd06a', '#ffffff']} />
      {/* sparks */}
      {Array.from({length: sparks}, (_, i) => {
        const life = 0.9 + rnd(i + seed) * 0.8;
        const ph = fract(t / life + rnd(i + 11));
        const y = 0.15 + ph * (0.6 + 1.1 * Math.min(I, 2.2)) * (0.6 + rnd(i + 5) * 0.6);
        return <Glow key={i} p={[x + (rnd(i + 21) - 0.5) * 0.35 * Math.sqrt(I) + Math.sin(t * 3 + i) * 0.06 * ph, y, z + 0.15]} w={0.035} h={0.035} color={ph < 0.5 ? '#ffd27a' : '#ff6a2a'} a={(1 - ph) * 1.4} />;
      })}
      {/* smoke */}
      {smoke > 0.01
        ? Array.from({length: 12}, (_, i) => {
            const ph = fract(smokeT * 0.32 + i / 12);
            const r = 0.25 + ph * 0.9;
            return <Glow key={i} p={[x + Math.sin(ph * 5 + i) * 0.12 * ph + ph * 0.15, 0.15 + ph * 2.1, z]} w={r} h={r} color="#7d8cac" a={Math.min(1, smoke) * 0.42 * Math.sin(ph * Math.PI)} />;
          })
        : null}
      {void look}
    </>
  );
};
