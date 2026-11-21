import React, {createContext, useContext, useEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {ThreeCanvas} from '@remotion/three';
import {useFrame, useThree} from '@react-three/fiber';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {AbsoluteFill, staticFile} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {Cast, Kind, Look, Mat, mat} from './looks';

export const W = 1080;
export const H = 1920;

const font = (family: string, file: string, weight: string) => loadFont({family, url: staticFile(`fonts/${file}.woff2`), weight, format: 'woff2'});
font('Fraunces', 'fraunces-latin-600-normal', '600');
font('DM Serif Display', 'dm-serif-display-latin-400-normal', '400');
font('Space Grotesk', 'space-grotesk-latin-600-normal', '600');
font('Unbounded', 'unbounded-latin-600-normal', '600');
font('Fredoka', 'fredoka-latin-600-normal', '600');
font('Sora', 'sora-latin-600-normal', '600');
font('Inter', 'inter-latin-600-normal', '600');
font('Barlow Condensed', 'barlow-condensed-latin-600-normal', '600');
font('Barlow Condensed', 'barlow-condensed-latin-700-normal', '700');
font('Nunito', 'nunito-latin-900-normal', '900');

/* ───────────────────────── camera ───────────────────────── */

/** aspect: frame width / height (default the 1080×1920 Short) */
/** cz: depth of the point the camera looks at; yaw: orbit around that point, degrees (+ = camera moves to +x) */
export type Cam = {viewH: number; cy: number; cx?: number; cz?: number; pitch?: number; yaw?: number; fov?: number; aspect?: number};

export const makeCamera = (c: Cam) => {
  const fov = c.fov ?? 16;
  const cam = new THREE.PerspectiveCamera(fov, c.aspect ?? W / H, 0.1, 600);
  const d = c.viewH / 2 / Math.tan((fov * Math.PI) / 360);
  const p = ((c.pitch ?? 4) * Math.PI) / 180;
  const y = ((c.yaw ?? 0) * Math.PI) / 180;
  const cz = c.cz ?? 0;
  cam.position.set((c.cx ?? 0) + d * Math.cos(p) * Math.sin(y), c.cy + d * Math.sin(p), cz + d * Math.cos(p) * Math.cos(y));
  cam.lookAt(c.cx ?? 0, c.cy, cz);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return cam;
};

/** world point → pixel in the 1080×1920 frame (for HTML labels) */
export const project = (c: Cam, x: number, y: number, z = 0, fw = W, fh = H): [number, number] => {
  const v = new THREE.Vector3(x, y, z).project(makeCamera(c));
  return [(v.x * 0.5 + 0.5) * fw, (1 - (v.y * 0.5 + 0.5)) * fh];
};

/* ───────────────────────── shader ───────────────────────── */

type Ctx = {look: Look; px: number};
const LookCtx = createContext<Ctx>(null as unknown as Ctx);
export const useLook = () => useContext(LookCtx).look;

const VERT = /* glsl */ `
varying vec3 vN; varying vec3 vV; varying vec3 vW; varying vec3 vO;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz; vO = position;
  vec4 mv = viewMatrix * w;
  vN = normalize(normalMatrix * normal);
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
precision highp float;
varying vec3 vN; varying vec3 vV; varying vec3 vW; varying vec3 vO;
uniform vec3 uTop, uBottom, uShade, uRim, uFog, uLight, uCore;
uniform float uY0, uY1, uLocal, uRimAmt, uRimPow, uWrap, uSpec, uIri, uSpeckle, uEmit;
uniform float uCoreY, uCoreR, uCoreAmt;
uniform float uFadeY0, uFadeY1, uFadeMax, uZ0, uZ1, uZMax;
float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
vec3 pal(float t){ return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67))); }
void main(){
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(vV); vec3 L = normalize(uLight);
  float ndl = dot(N, L);
  float lit = clamp((ndl + uWrap) / (1.0 + uWrap), 0.0, 1.0);
  // colour runs top→bottom in the world, or along the part itself (colour-dipped limbs)
  float g = smoothstep(uY0, uY1, mix(vW.y, vO.y, uLocal));
  vec3 base = mix(uBottom, uTop, g);
  if (uSpeckle > 0.0) base *= 1.0 + (hash(floor(vO * 90.0)) - 0.5) * uSpeckle * 2.0;
  vec3 col = mix(base * uShade, base, lit);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fr = pow(1.0 - ndv, uRimPow);
  if (uIri > 0.0) {
    vec3 ir = pal(fr * 0.9 + N.y * 0.18 + N.x * 0.12 + 0.55);
    col = mix(col, col * (0.35 + 1.1 * ir), uIri);
  }
  col += uRim * fr * uRimAmt;
  if (uSpec > 0.0) {
    vec3 Hh = normalize(L + V);
    col += uRim * pow(max(dot(N, Hh), 0.0), 38.0) * uSpec;
  }
  col *= uEmit;
  // a light inside the chest, seen through the body
  if (uCoreAmt > 0.0) {
    float d = (vO.y - uCoreY) / uCoreR;
    float gl = exp(-d * d) * pow(ndv, 1.6) * uCoreAmt;
    col = mix(col, uCore * 1.25, clamp(gl, 0.0, 1.0) * 0.9);
    col += uCore * gl * 0.9;
  }
  float f = smoothstep(uFadeY0, uFadeY1, vW.y) * uFadeMax;
  f = max(f, smoothstep(uZ0, uZ1, vW.z) * uZMax);
  col = mix(col, uFog, f);
  gl_FragColor = vec4(col, 1.0);
}`;

export type Fade = {y0?: number; y1?: number; max?: number; z0?: number; z1?: number; zmax?: number};
export type CoreLight = {color: string; y: number; r: number; amt: number};

const col = (s: string) => new THREE.Color(s);
export const light = (c: string, emit = 1.7): Mat => mat(c, c, {shade: '#ffffff', wrap: 1, emit});

export const useMat = (m: Mat, y0: number, y1: number, fade?: Fade, local = false, core?: CoreLight) => {
  const {look} = useContext(LookCtx);
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        side: THREE.DoubleSide,
        uniforms: {
          uTop: {value: col(m.top)},
          uBottom: {value: col(m.bottom)},
          uShade: {value: col(m.shade)},
          uRim: {value: col(m.rim)},
          uFog: {value: col(look.bg.edge)},
          uLight: {value: new THREE.Vector3(-0.45, 0.75, 0.6).normalize()},
          uCore: {value: col(core?.color ?? '#000000')},
          uCoreY: {value: core?.y ?? 0},
          uCoreR: {value: core?.r ?? 1},
          uCoreAmt: {value: core?.amt ?? 0},
          uY0: {value: y0},
          uY1: {value: y1},
          uLocal: {value: local ? 1 : 0},
          uRimAmt: {value: m.rimAmt},
          uRimPow: {value: m.rimPow},
          uWrap: {value: m.wrap},
          uSpec: {value: m.spec},
          uIri: {value: m.iri},
          uSpeckle: {value: m.speckle},
          uEmit: {value: m.emit},
          // fade to the background colour: below fadeY0 → fadeY1 (depth of water), and behind z0 → z1 (distance)
          uFadeY0: {value: fade?.y0 ?? -1e5},
          uFadeY1: {value: fade?.y1 ?? -1e5 - 1},
          uFadeMax: {value: fade?.max ?? 0},
          uZ0: {value: fade?.z0 ?? -1e5},
          uZ1: {value: fade?.z1 ?? -1e5 - 1},
          uZMax: {value: fade?.zmax ?? 0},
        },
      }),
    [m, y0, y1, look, fade?.y0, fade?.y1, fade?.max, fade?.z0, fade?.z1, fade?.zmax, local, core?.color, core?.y, core?.r, core?.amt],
  );
};

type PartProps = {
  geo: THREE.BufferGeometry;
  m: Mat;
  y0?: number;
  y1?: number;
  fade?: Fade;
  /** gradient along the part's own axis instead of world height */
  local?: boolean;
  core?: CoreLight;
  position?: [number, number, number];
  rotation?: [number, number, number];
  quaternion?: THREE.Quaternion;
  scale?: [number, number, number] | number;
};

/** one shaded mesh */
export const Part: React.FC<PartProps> = ({geo, m, y0 = 0, y1 = 1, fade, local, core, position, rotation, quaternion, scale}) => {
  const material = useMat(m, y0, y1, fade, local, core);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh geometry={geo} material={material} position={position} rotation={rotation} quaternion={quaternion} scale={scale} />;
};

/* ───────────────────────── geometry helpers ───────────────────────── */

/** capsule along +Y from 0 to len, radius r0 at the bottom and r1 at the top */
export const capsuleGeo = (len: number, r0: number, r1: number, seg = 28) => {
  const pts: THREE.Vector2[] = [];
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(a) * r0, Math.sin(a) * r0));
  }
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(a) * r1, len + Math.sin(a) * r1));
  }
  pts[0].x = 0.0001;
  pts[pts.length - 1].x = 0.0001;
  return new THREE.LatheGeometry(pts, seg);
};

const UP = new THREE.Vector3(0, 1, 0);
export type V3 = [number, number, number];
const quat = (a: V3, b: V3) => new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize());
const dist = (a: V3, b: V3) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);

type Seg = {a: V3; b: V3; m: Mat; y0?: number; y1?: number; fade?: Fade; local?: boolean};

/** tapered capsule between two points */
export const Limb: React.FC<Seg & {r0: number; r1: number}> = ({a, b, r0, r1, ...rest}) => {
  const len = dist(a, b);
  const geo = useMemo(() => capsuleGeo(len, r0, r1), [Math.round(len * 1000), r0, r1]);
  return <Part geo={geo} position={a} quaternion={quat(a, b)} {...rest} />;
};

const sphereGeo = new THREE.SphereGeometry(1, 40, 28);
export const Ball: React.FC<{p: V3; r: number; m: Mat; y0?: number; y1?: number; fade?: Fade; s?: V3}> = ({p, r, s = [1, 1, 1], ...rest}) => (
  <Part geo={sphereGeo} position={p} scale={[r * s[0], r * s[1], r * s[2]]} {...rest} />
);

export const roundedBox = (w: number, h: number, d: number, r: number, bevelSeg = 6) => {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = 0;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, {depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.999, bevelOffset: -r, bevelSegments: bevelSeg, curveSegments: bevelSeg + 2});
  g.translate(0, 0, -(d - 2 * r) / 2);
  return g;
};

/* ───────────────────────── the stickman ───────────────────────── */

export type Body = {
  headR: number;
  headS: V3;
  gap: number;
  torso: number;
  arm: number;
  fore: number;
  thigh: number;
  shin: number;
  shZ: number;
  hipZ: number;
  ankle: number;
  s: number;
  /** torso radii: hips, chest, depth squash */
  tr: [number, number, number];
  /** limb radii: root, middle, tip */
  ar: [number, number, number];
  lr: [number, number, number];
  hand: number;
  foot: [number, number] | null;
};

/** proportions per design: a head worth looking at, a solid body, short strong limbs */
export const BODIES: Record<Kind, Body> = {
  core: {headR: 0.2, headS: [1, 1, 1], gap: 0.045, torso: 0.48, arm: 0.25, fore: 0.24, thigh: 0.35, shin: 0.35, shZ: 0.17, hipZ: 0.075, ankle: 0.066, s: 1.03, tr: [0.135, 0.15, 0.86], ar: [0.062, 0.057, 0.052], lr: [0.08, 0.073, 0.066], hand: 0, foot: null},
  dipped: {headR: 0.225, headS: [1, 1, 1], gap: 0.03, torso: 0.42, arm: 0.21, fore: 0.21, thigh: 0.28, shin: 0.28, shZ: 0.185, hipZ: 0.085, ankle: 0.07, s: 1.16, tr: [0.15, 0.158, 0.9], ar: [0.068, 0.064, 0.06], lr: [0.088, 0.082, 0.076], hand: 0.078, foot: [0.2, 0.07]},
  joint: {headR: 0.18, headS: [0.94, 1.1, 0.94], gap: 0.075, torso: 0.48, arm: 0.26, fore: 0.25, thigh: 0.36, shin: 0.36, shZ: 0.175, hipZ: 0.085, ankle: 0.06, s: 1.02, tr: [0.105, 0.158, 0.8], ar: [0.058, 0.048, 0.04], lr: [0.08, 0.06, 0.046], hand: 0.05, foot: [0.17, 0.05]},
  visor: {headR: 0.215, headS: [1, 0.97, 1], gap: 0.03, torso: 0.45, arm: 0.23, fore: 0.23, thigh: 0.31, shin: 0.31, shZ: 0.175, hipZ: 0.08, ankle: 0.07, s: 1.1, tr: [0.138, 0.148, 0.88], ar: [0.062, 0.058, 0.054], lr: [0.08, 0.074, 0.068], hand: 0.07, foot: [0.19, 0.068]},
  neon: {headR: 0.2, headS: [1, 1, 1], gap: 0.045, torso: 0.48, arm: 0.25, fore: 0.24, thigh: 0.35, shin: 0.35, shZ: 0.17, hipZ: 0.075, ankle: 0.066, s: 1.03, tr: [0.135, 0.15, 0.86], ar: [0.062, 0.057, 0.052], lr: [0.08, 0.073, 0.066], hand: 0, foot: null},
};

export type P2 = [number, number];
/** a pose in body-relative units, so one pose fits every body */
export type Pose = {
  /** x in leg lengths; y: 1 = standing straight */
  pelvis: P2;
  /** absolute pelvis height override (sitting on something) */
  pelvisY?: number;
  /** torso lean in degrees, + = forward */
  lean: number;
  /** head offset in head radii */
  head?: P2;
  /** hands relative to the shoulder, in arm lengths */
  handF: P2;
  handB: P2;
  /** feet: x from the body origin, y above the ground — in leg lengths */
  footF: P2;
  footB: P2;
  elbowF?: number;
  elbowB?: number;
  kneeF?: number;
  kneeB?: number;
};

const ik = (h: P2, t: P2, l1: number, l2: number, bend: number): [P2, P2] => {
  let dx = t[0] - h[0];
  let dy = t[1] - h[1];
  let d = Math.hypot(dx, dy);
  const max = (l1 + l2) * 0.999;
  if (d > max) {
    dx *= max / d;
    dy *= max / d;
    d = max;
  }
  const a = Math.atan2(dy, dx);
  const c = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const m: P2 = [h[0] + Math.cos(a + c * bend) * l1, h[1] + Math.sin(a + c * bend) * l1];
  return [m, [h[0] + dx, h[1] + dy]];
};

/** joint positions in figure-local 2D (x forward, y up) */
export const solve = (p: Pose, b: Body) => {
  const L = b.thigh + b.shin;
  const A = b.arm + b.fore;
  const l = (p.lean * Math.PI) / 180;
  const t: P2 = [Math.sin(l), Math.cos(l)];
  const pel: P2 = [p.pelvis[0] * L, p.pelvisY ?? b.ankle + L * p.pelvis[1]];
  const chest: P2 = [pel[0] + t[0] * b.torso, pel[1] + t[1] * b.torso];
  const sh: P2 = [pel[0] + t[0] * b.torso * 0.92, pel[1] + t[1] * b.torso * 0.92];
  const hd = p.head ?? [0, 0];
  const hh = b.gap + b.headR * b.headS[1];
  const head: P2 = [chest[0] + t[0] * hh + hd[0] * b.headR, chest[1] + t[1] * hh + hd[1] * b.headR];
  const [elF, hF] = ik(sh, [sh[0] + p.handF[0] * A, sh[1] + p.handF[1] * A], b.arm, b.fore, p.elbowF ?? -1);
  const [elB, hB] = ik(sh, [sh[0] + p.handB[0] * A, sh[1] + p.handB[1] * A], b.arm, b.fore, p.elbowB ?? -1);
  const [knF, fF] = ik(pel, [p.footF[0] * L, b.ankle + p.footF[1] * L], b.thigh, b.shin, p.kneeF ?? 1);
  const [knB, fB] = ik(pel, [p.footB[0] * L, b.ankle + p.footB[1] * L], b.thigh, b.shin, p.kneeB ?? 1);
  return {pel, chest, sh, head, t, elF, hF, elB, hB, knF, fF, knB, fB};
};
export type Joints = ReturnType<typeof solve>;

/** hand target for a point given in figure-local units (x forward, y up) */
export const reach = (p: Pose, b: Body, x: number, y: number): P2 => {
  const A = b.arm + b.fore;
  const {sh} = solve(p, b);
  return [(x - sh[0]) / A, (y - sh[1]) / A];
};

export const torsoGeo = (hips: number, chest: number, L: number) => {
  const pts: THREE.Vector2[] = [];
  const prof = (u: number) => hips + (chest - hips) * (u * u * (3 - 2 * u));
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(a) * prof(0), Math.sin(a) * prof(0) * 0.9));
  }
  for (let i = 1; i < 14; i++) pts.push(new THREE.Vector2(prof(i / 14), (i / 14) * L));
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(a) * prof(1), L + Math.sin(a) * prof(1) * 0.8));
  }
  pts[0].x = 0.0001;
  pts[pts.length - 1].x = 0.0001;
  return new THREE.LatheGeometry(pts, 36);
};
const TORSO = Object.fromEntries(Object.entries(BODIES).map(([k, b]) => [k, torsoGeo(b.tr[0], b.tr[1], b.torso - 0.06)])) as unknown as Record<Kind, THREE.BufferGeometry>;
const ringGeo = (() => {
  const g = new THREE.TorusGeometry(0.1, 0.03, 14, 36);
  g.rotateX(Math.PI / 2);
  return g;
})();

export type FigureProps = {
  pose: Pose;
  cast: Cast;
  x?: number;
  y?: number;
  z?: number;
  /** 1 = faces +x, -1 = faces -x */
  dir?: 1 | -1;
  /** turn toward the camera, degrees */
  yaw?: number;
  s?: number;
  fade?: Fade;
  roll?: number;
  /** brightness of the chest light / eyes, 0..1 */
  energy?: number;
  /** shift of the body's colour gradient when the pose itself travels upward (climbing, hanging) */
  gy?: number;
  /** colour of the signature (chest light, dipped limbs, joints, scarf) for this moment */
  tint?: string;
  /** props in figure-local space (x forward, y up, z toward the viewer's side) */
  children?: React.ReactNode;
};

export const Figure: React.FC<FigureProps> = ({pose, cast, x = 0, y = 0, z = 0, dir = 1, yaw = 22, s = 1, fade, roll = 0, energy = 1, tint, gy = 0, children}) => {
  const look = useLook();
  const kind = look.kind;
  const b = BODIES[kind];
  const k = s * b.s;
  const j = solve(pose, b);
  const y0 = y + gy - 0.1;
  const y1 = y + gy + 1.7 * s;
  const z3 = (p: P2, zz: number): V3 => [p[0], p[1], zz];
  const q = new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(j.t[0], j.t[1], 0).normalize());
  const at = (u: number): V3 => [j.pel[0] + j.t[0] * u, j.pel[1] + j.t[1] * u, 0];
  const c = {y0, y1, fade};
  const sig = tint ?? cast.core;
  const B = {m: cast.body, ...c};
  const mark = useMemo(() => (tint ? {...cast.mark, top: tint, bottom: tint} : cast.mark), [cast.mark, tint]);
  const T = {m: mark, ...c};
  const R = b.headR;
  const hd: V3 = [j.head[0], j.head[1], 0];
  const sides: [number, P2, P2, P2, P2, P2][] = [
    [-1, j.elB, j.hB, j.knB, j.fB, j.sh],
    [1, j.elF, j.hF, j.knF, j.fF, j.sh],
  ];
  // colour-dipped: the lower half of each limb soaks into the signature colour
  const dipM = useMemo(() => ({...cast.body, top: mark.top, bottom: cast.body.bottom, emit: 1.0}), [cast.body, mark]);
  const dip = kind === 'dipped';
  const tipM = dip ? mark : kind === 'visor' ? cast.trim : kind === 'joint' ? mark : cast.body;
  const coreL = kind === 'core' ? {color: sig, y: b.torso * 0.52, r: 0.115, amt: 0.35 + 0.75 * energy} : undefined;

  return (
    <group position={[x, y, z]} rotation={[0, ((dir === 1 ? -yaw : yaw) * Math.PI) / 180, (roll * Math.PI) / 180]} scale={[k * dir, k, k]}>
      {sides.map(([sg, el, h, kn, f, sh]) => {
        const hz = sg * b.hipZ;
        const sz = sg * b.shZ;
        return (
          <React.Fragment key={sg}>
            <Limb a={z3(j.pel, hz)} b={z3(kn, hz)} r0={b.lr[0]} r1={b.lr[1]} {...B} />
            {dip ? <Limb a={z3(kn, hz)} b={z3(f, hz)} r0={b.lr[1]} r1={b.lr[2]} m={dipM} y0={b.shin * 0.25} y1={b.shin * 0.9} local fade={fade} /> : <Limb a={z3(kn, hz)} b={z3(f, hz)} r0={b.lr[1]} r1={b.lr[2]} {...B} />}
            {b.foot ? <Ball p={[f[0] + b.foot[0] * 0.3, f[1] - b.ankle + b.foot[1], hz]} r={1} s={[b.foot[0] * 0.62, b.foot[1], b.foot[1] * 1.2]} m={tipM} {...c} /> : null}
            <Limb a={z3(sh, sz)} b={z3(el, sz)} r0={b.ar[0]} r1={b.ar[1]} {...B} />
            {dip ? <Limb a={z3(el, sz)} b={z3(h, sz)} r0={b.ar[1]} r1={b.ar[2]} m={dipM} y0={b.fore * 0.2} y1={b.fore * 0.9} local fade={fade} /> : <Limb a={z3(el, sz)} b={z3(h, sz)} r0={b.ar[1]} r1={b.ar[2]} {...B} />}
            {b.hand ? <Ball p={z3(h, sz)} r={b.hand} m={kind === 'visor' ? cast.body : tipM} {...c} /> : null}
            {kind === 'joint' ? (
              <>
                <Ball p={z3(sh, sz)} r={b.ar[0] * 1.2} {...T} />
                <Ball p={z3(el, sz)} r={b.ar[1] * 1.22} {...T} />
                <Ball p={z3(j.pel, hz)} r={b.lr[0] * 1.12} {...T} />
                <Ball p={z3(kn, hz)} r={b.lr[1] * 1.22} {...T} />
              </>
            ) : null}
          </React.Fragment>
        );
      })}

      <Part geo={TORSO[kind]} {...B} core={coreL} position={at(0.02)} quaternion={q} scale={[1, 1, b.tr[2]]} />
      {coreL ? <Glow p={[at(b.torso * 0.54)[0], at(b.torso * 0.54)[1], 0.1]} w={1.25} h={1.25} color={sig} a={0.2 + 0.4 * energy} /> : null}
      {kind === 'joint' ? <Limb a={at(b.torso - 0.04)} b={hd} r0={0.05} r1={0.046} {...B} /> : null}
      {kind === 'joint' || kind === 'visor' ? <Part geo={ringGeo} {...T} position={at(b.torso + (kind === 'joint' ? 0.045 : 0.0))} quaternion={q} scale={kind === 'joint' ? [0.62, 0.7, 0.62] : [1.12, 1.25, 1.02]} /> : null}

      <Ball p={hd} r={R} s={b.headS} {...B} />
      {kind === 'visor' ? (
        <>
          <Ball p={[hd[0] + R * 0.5, hd[1] + R * 0.02, 0]} r={R} s={[0.56, 0.42, 0.84]} m={cast.trim} {...c} />
          {[-1, 1].map((e) => (
            <Ball key={e} p={[hd[0] + R * 1.035, hd[1] + R * 0.03, e * R * 0.3]} r={R} s={[0.05, 0.15 * (0.3 + 0.7 * energy), 0.09]} m={light(sig, 1.9)} {...c} />
          ))}
          <Glow p={[hd[0] + R * 1.1, hd[1], 0]} w={R * 2.2} h={R * 1.3} color={sig} a={0.16 * energy} />
        </>
      ) : null}
      {children}
    </group>
  );
};

/* ───────────────────────── glows / backdrop ───────────────────────── */

const GLOW_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const GLOW_FRAG = /* glsl */ `
precision highp float; varying vec2 vUv; uniform vec3 uC; uniform float uA; uniform float uMode;
void main(){
  float a;
  if (uMode < 0.5) { float d = length(vUv - 0.5) * 2.0; a = pow(clamp(1.0 - d, 0.0, 1.0), 2.2); }
  else if (uMode < 1.5) { float w = 1.0 - abs(vUv.x - 0.5) * 2.0; a = pow(clamp(w, 0.0, 1.0), 1.6) * pow(vUv.y, 1.5); }
  else { float w = 1.0 - abs(vUv.y - 0.5) * 2.0; float e = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x); a = pow(clamp(w, 0.0, 1.0), 2.5) * e; }
  gl_FragColor = vec4(uC * a * uA, a * uA);
}`;
const planeGeo = new THREE.PlaneGeometry(1, 1);

/** additive light sprite: 'radial' blob, 'beam' (bright at the top, fades down), 'line' (horizontal streak) */
export const Glow: React.FC<{p: V3; w: number; h: number; color: string; a?: number; mode?: 'radial' | 'beam' | 'line'; rot?: number; flat?: boolean}> = ({p, w, h, color, a = 1, mode = 'radial', rot = 0, flat = false}) => {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: GLOW_VERT,
        fragmentShader: GLOW_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {uC: {value: col(color)}, uA: {value: a}, uMode: {value: mode === 'radial' ? 0 : mode === 'beam' ? 1 : 2}},
      }),
    [color, a, mode],
  );
  return <mesh geometry={planeGeo} material={material} position={p} rotation={flat ? [-Math.PI / 2, 0, 0] : [0, 0, (rot * Math.PI) / 180]} scale={[w, h, 1]} renderOrder={8} />;
};

const BG_FRAG = /* glsl */ `
precision highp float; varying vec2 vUv; uniform vec3 uA, uB, uG; uniform float uGA; uniform vec2 uC;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 q = (vUv - uC) * vec2(1.0, 1.78);
  float d = length(q);
  vec3 c = mix(uA, uB, smoothstep(0.0, 0.85, d));
  c += uG * uGA * pow(clamp(1.0 - d * 1.9, 0.0, 1.0), 2.4);
  c += (h(gl_FragCoord.xy) - 0.5) / 255.0 * 1.5;
  gl_FragColor = vec4(c, 1.0);
}`;

const Backdrop: React.FC<{cam: Cam}> = ({cam}) => {
  const look = useLook();
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: GLOW_VERT,
        fragmentShader: BG_FRAG,
        depthWrite: false,
        uniforms: {uA: {value: col(look.bg.center)}, uB: {value: col(look.bg.edge)}, uG: {value: col(look.bg.glow)}, uGA: {value: look.bg.glowAmt}, uC: {value: new THREE.Vector2(0.5, 0.56)}},
      }),
    [look],
  );
  // a camera-facing card far behind the stage
  const c = makeCamera(cam);
  const d = Math.max(c.position.length(), c.position.distanceTo(new THREE.Vector3(cam.cx ?? 0, cam.cy, cam.cz ?? 0))) + 30;
  const hh = 2 * Math.tan((c.fov * Math.PI) / 360) * d * 1.02;
  const dirv = new THREE.Vector3();
  c.getWorldDirection(dirv);
  const pos = c.position.clone().add(dirv.multiplyScalar(d));
  return <mesh geometry={planeGeo} material={material} position={pos} quaternion={c.quaternion} scale={[hh * (cam.aspect ?? W / H), hh, 1]} renderOrder={-10} />;
};

/* ───────────────────────── post ───────────────────────── */

const Post: React.FC<{cam: Cam}> = ({cam}) => {
  const look = useLook();
  const {gl, scene, camera, size} = useThree();
  // the camera of this frame; read at draw time so it never lags behind the scene
  const camRef = useRef(cam);
  camRef.current = cam;
  const composer = useMemo(() => {
    const pr = gl.getPixelRatio();
    const rt = new THREE.WebGLRenderTarget(size.width * pr, size.height * pr, {type: THREE.HalfFloatType, samples: 4});
    const c = new EffectComposer(gl, rt);
    c.addPass(new RenderPass(scene, camera));
    if (look.bloom.strength > 0) c.addPass(new UnrealBloomPass(new THREE.Vector2(size.width, size.height), look.bloom.strength, look.bloom.radius, look.bloom.threshold));
    c.addPass(new OutputPass());
    return c;
  }, [gl, scene, camera, look, size.width, size.height]);
  useEffect(() => () => composer.dispose(), [composer]);
  useFrame(() => {
    const c = makeCamera(camRef.current);
    const pc = camera as THREE.PerspectiveCamera;
    pc.position.copy(c.position);
    pc.quaternion.copy(c.quaternion);
    pc.fov = c.fov;
    pc.aspect = camRef.current.aspect ?? W / H;
    pc.updateProjectionMatrix();
    pc.updateMatrixWorld();
    composer.render();
  }, 1);
  return null;
};

/* ───────────────────────── stage ───────────────────────── */

const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='360'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='7'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0.9 0 0 0 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
)}")`;

export const Stage: React.FC<{look: Look; cam: Cam; px?: number; children: React.ReactNode; overlay?: React.ReactNode; dark?: number; width?: number; height?: number}> = ({look, cam, px = 1, children, overlay, dark = 0, width = W, height = H}) => {
  const ctx = useMemo(() => ({look, px}), [look, px]);
  const camera = useMemo(() => makeCamera(cam), []);
  return (
    <AbsoluteFill style={{background: look.bg.edge}}>
      <ThreeCanvas width={width} height={height} camera={camera} gl={{antialias: true, preserveDrawingBuffer: true}} flat>
        <LookCtx.Provider value={ctx}>
          <Backdrop cam={cam} />
          {children}
          <Post cam={cam} />
        </LookCtx.Provider>
      </ThreeCanvas>
      <AbsoluteFill style={{background: `radial-gradient(ellipse 75% 62% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,${look.vignette}) 100%)`}} />
      {overlay}
      {dark > 0 ? <AbsoluteFill style={{background: look.bg.edge, opacity: dark}} /> : null}
      <AbsoluteFill style={{backgroundImage: GRAIN, opacity: look.grain, mixBlendMode: 'overlay'}} />
    </AbsoluteFill>
  );
};

type TxtStyle = {size?: number; color?: string; o?: number; weight?: number; glow?: number; scale?: number; align?: 'center' | 'left' | 'right'; tracking?: number};

/** caption at a pixel of the 1080×1920 frame */
export const Txt: React.FC<{look: Look; x: number; y: number; children: React.ReactNode} & TxtStyle> = ({look, x, y, children, size, color, o = 1, weight, glow = 1, scale = 1, align = 'center', tracking}) => {
  const t = look.text;
  const c = color ?? t.color;
  const g = color ? color : null;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(${align === 'center' ? '-50%' : align === 'left' ? '0' : '-100%'}, -50%) scale(${scale})`,
        transformOrigin: align === 'center' ? '50% 50%' : align === 'left' ? '0 50%' : '100% 50%',
        whiteSpace: 'pre',
        textAlign: align,
        fontFamily: t.family,
        fontWeight: weight ?? t.weight,
        fontSize: size ?? t.size,
        lineHeight: 1.22,
        letterSpacing: `${tracking ?? t.tracking}em`,
        color: c,
        opacity: o,
        textShadow: glow > 0 ? `0 0 ${22 * glow}px ${g ? g + '99' : t.glow}, 0 0 ${60 * glow}px ${g ? g + '55' : t.glow}` : 'none',
      }}
    >
      {children}
    </div>
  );
};

/** caption pinned to a world point */
export const Label: React.FC<{look: Look; cam: Cam; at: V3; text: string} & TxtStyle> = ({look, cam, at, text, ...st}) => {
  const [x, y] = project(cam, ...at);
  return (
    <Txt look={look} x={x} y={y} {...st}>
      {text}
    </Txt>
  );
};
