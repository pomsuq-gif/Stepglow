import React, {useEffect, useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {rnd} from '../nc001-work-smart/anim';
import type {V3} from '../nc001-work-smart/kit3d';
import {mixHex} from '../nc001-work-smart/world';
import {add, HB, K3, mul, W3, type J3} from '../sg003-same-bar/rig3';
import {CAST, TINTS, tw} from './plan';
import {PEG, solveR, TOP, TY} from './rig';
import {CartoonMan, type Design} from './cartoon';
import {Cracks, lights} from './World';
import {K as KT, hit} from './grid';
import {WALL} from './plan';
import {BlockMan} from './blockman';

/**
 * SG007 "real" looks: physically lit 3D sets (PBR materials, spot lights with soft shadows, an environment map for
 * reflections, filmic tone mapping) and cartoon 3D stickmen (glossy vinyl, big eyes, mitten hands, round boots).
 */
export type RealEnv = 'hall' | 'pub' | 'garage' | 'gym' | 'pro';

/* ───────────── renderer setup: shadows, tone mapping, reflections ───────────── */

const Setup: React.FC<{exposure: number; envAmt: number}> = ({exposure, envAmt}) => {
  const {gl, scene} = useThree();
  useMemo(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = exposure;
  }, [gl, exposure]);
  const env = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const tex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    return tex;
  }, [gl]);
  useEffect(() => {
    scene.environment = env;
    scene.environmentIntensity = envAmt;
    return () => {
      scene.environment = null;
    };
  }, [scene, env, envAmt]);
  scene.environment = env;
  scene.environmentIntensity = envAmt;
  return null;
};

/* ───────────── procedural textures (canvas) ───────────── */

const texCache = new Map<string, THREE.CanvasTexture>();
const canvasTex = (key: string, size: number, draw: (g: CanvasRenderingContext2D, s: number) => void, rep: [number, number], srgb = true) => {
  let t = texCache.get(key);
  if (!t) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d')!, size);
    t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    texCache.set(key, t);
  }
  t.repeat.set(rep[0], rep[1]);
  return t;
};
const R = (i: number) => rnd(i * 1.37 + 0.11);
const noise = (g: CanvasRenderingContext2D, s: number, n: number, a: number, dark = true) => {
  for (let i = 0; i < n; i++) {
    g.fillStyle = dark ? `rgba(0,0,0,${a * R(i)})` : `rgba(255,255,255,${a * R(i)})`;
    const r = 1 + R(i + 5) * 3;
    g.fillRect(R(i + 1) * s, R(i + 2) * s, r, r);
  }
};
const planks = (base: string, alt: string, line: string) => (g: CanvasRenderingContext2D, s: number) => {
  const rows = 8;
  const h = s / rows;
  for (let r = 0; r < rows; r++) {
    let x = -R(r) * s * 0.5;
    while (x < s) {
      const w = s * (0.35 + R(r * 13 + x) * 0.45);
      g.fillStyle = mixHex(base, alt, R(r * 7 + Math.floor(x)));
      g.fillRect(x, r * h, w, h);
      // grain
      for (let k = 0; k < 18; k++) {
        g.strokeStyle = `rgba(40,20,8,${0.05 + 0.08 * R(k + r * 3 + x)})`;
        g.lineWidth = 1 + R(k) * 2;
        g.beginPath();
        const y = r * h + R(k * 5 + x) * h;
        g.moveTo(x, y);
        g.bezierCurveTo(x + w * 0.3, y + (R(k) - 0.5) * 6, x + w * 0.6, y + (R(k + 1) - 0.5) * 6, x + w, y + (R(k + 2) - 0.5) * 4);
        g.stroke();
      }
      g.fillStyle = line;
      g.fillRect(x, r * h, 2, h);
      x += w;
    }
    g.fillStyle = line;
    g.fillRect(0, r * h, s, 2);
  }
  noise(g, s, 4000, 0.08);
};
const concrete = (base: string, stains: boolean) => (g: CanvasRenderingContext2D, s: number) => {
  g.fillStyle = base;
  g.fillRect(0, 0, s, s);
  for (let i = 0; i < 260; i++) {
    const r = 20 + R(i) * 120;
    const gr = g.createRadialGradient(R(i + 1) * s, R(i + 2) * s, 0, R(i + 1) * s, R(i + 2) * s, r);
    const d = R(i + 3) > 0.5;
    gr.addColorStop(0, d ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, s, s);
  }
  if (stains)
    for (let i = 0; i < 10; i++) {
      const r = 30 + R(i + 40) * 90;
      const gr = g.createRadialGradient(R(i + 41) * s, R(i + 42) * s, 0, R(i + 41) * s, R(i + 42) * s, r);
      gr.addColorStop(0, 'rgba(10,8,6,0.45)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, s, s);
    }
  noise(g, s, 9000, 0.12);
  noise(g, s, 4000, 0.08, false);
  // expansion joints
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(0, 0, s, 3);
  g.fillRect(0, 0, 3, s);
};
const bricks = (base: string, alt: string, mortar: string, bw = 8, bh = 16) => (g: CanvasRenderingContext2D, s: number) => {
  g.fillStyle = mortar;
  g.fillRect(0, 0, s, s);
  const w = s / bw;
  const h = s / bh;
  for (let r = 0; r < bh; r++)
    for (let c = -1; c < bw + 1; c++) {
      const x = c * w + (r % 2) * w * 0.5;
      g.fillStyle = mixHex(base, alt, R(r * 31 + c));
      g.fillRect(x + 2, r * h + 2, w - 4, h - 4);
    }
  noise(g, s, 8000, 0.15);
};
const rubber = (g: CanvasRenderingContext2D, s: number) => {
  g.fillStyle = '#26282c';
  g.fillRect(0, 0, s, s);
  for (let i = 0; i < 6000; i++) {
    const c = ['#3a3e46', '#4a5060', '#1a1c20', '#5a3a3a', '#3a4a5a'][Math.floor(R(i) * 5)];
    g.fillStyle = c;
    g.fillRect(R(i + 1) * s, R(i + 2) * s, 2 + R(i + 3) * 3, 2 + R(i + 3) * 2);
  }
  g.fillStyle = 'rgba(0,0,0,0.5)';
  g.fillRect(0, 0, s, 3);
  g.fillRect(0, 0, 3, s);
};

/* ───────────── PBR material cache ───────────── */

const pbr = new Map<string, THREE.Material>();
const P = (key: string, make: () => THREE.Material) => {
  if (!pbr.has(key)) pbr.set(key, make());
  return pbr.get(key)!;
};
const std = (color: string, rough = 0.6, metal = 0, extra: THREE.MeshStandardMaterialParameters = {}) => P(`s${color}${rough}${metal}${JSON.stringify(extra)}`, () => new THREE.MeshStandardMaterial({color, roughness: rough, metalness: metal, ...extra}));
const glossy = (color: string, emissive = '#000000', ei = 0) =>
  P(`v${color}${emissive}${ei}`, () => new THREE.MeshPhysicalMaterial({color, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.18, sheen: 0.4, sheenColor: new THREE.Color('#ffffff'), emissive, emissiveIntensity: ei}));

const CYL = new THREE.CylinderGeometry(1, 1, 1, 28, 1);
const SPH = new THREE.SphereGeometry(1, 40, 28);
const BOX = new THREE.BoxGeometry(1, 1, 1);
const Y = new THREE.Vector3(0, 1, 0);
const Seg: React.FC<{a: V3; b: V3; r: number; m: THREE.Material; cast?: boolean}> = ({a, b, r, m, cast = true}) => {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const L = d.length();
  if (L < 1e-5) return null;
  const q = new THREE.Quaternion().setFromUnitVectors(Y, d.normalize());
  return <mesh geometry={CYL} material={m} position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} quaternion={q} scale={[r, L, r]} castShadow={cast} receiveShadow />;
};
const Sph: React.FC<{p: V3; r: number | V3; m: THREE.Material; q?: THREE.Quaternion; cast?: boolean}> = ({p, r, m, q, cast = true}) => (
  <mesh geometry={SPH} material={m} position={p} quaternion={q} scale={typeof r === 'number' ? [r, r, r] : r} castShadow={cast} receiveShadow />
);
const Bx: React.FC<{p: V3; s: V3; m: THREE.Material; ry?: number; cast?: boolean}> = ({p, s, m, ry = 0, cast = true}) => (
  <mesh geometry={BOX} material={m} position={p} rotation={[0, ry, 0]} scale={s} castShadow={cast} receiveShadow />
);

/* ───────────── the cartoon stickman ───────────── */

const C = {head: HB.headR * K3 * 1.12, torso: 0.12, arm: 0.052, leg: 0.064, hand: 0.075, foot: [0.085, 0.07, 0.13] as V3};

export const CartoonFig: React.FC<{j: J3; color: string; tint: string; idx: number; spent: number; aura: number; noArm?: boolean; crown: boolean; t: number}> = ({j, color, tint, idx, spent, aura, noArm, crown, t}) => {
  const w = (p: V3) => W3(p, [0, 0, 0], K3);
  const body = glossy(mixHex(color, '#8c93a6', spent * 0.6));
  const dark = std('#14161c', 0.4);
  const white = glossy('#ffffff');
  const pel = w(add(j.hip[0], mul(j.side, HB.hipZ)));
  const shc = w(j.shc);
  const head = w(add(j.head, mul(j.up, 0.06)));
  const qb = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...j.side), new THREE.Vector3(...j.up), new THREE.Vector3(...j.fwd)));
  // eyes: big, on the front of the head, looking where the body faces; Ego's brows are angry, pupils sharp
  const eye = (s: number): V3 => add(add(add(head, mul(j.fwd, C.head * 0.78)), mul(j.side, s * C.head * 0.36)), mul(j.up, C.head * 0.12));
  const blink = Math.sin(t * 1.7 + idx * 2) > 0.985 || spent > 0.7 ? 0.15 : 1;
  const arms: [V3, V3, V3][] = noArm ? [[w(j.sh[1]), w(j.el[1]), w(j.hd[1])]] : [0, 1].map((i) => [w(j.sh[i]), w(j.el[i]), w(j.hd[i])] as [V3, V3, V3]);
  const legs = [0, 1].map((i) => [w(j.hip[i]), w(j.kn[i]), w(j.ft[i])] as [V3, V3, V3]);
  const footQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...j.side), new THREE.Vector3(0, 1, 0), new THREE.Vector3(j.fwd[0], 0, j.fwd[2]).normalize()));
  const angry = idx === 0 ? 1 : 0;
  const glowP = add(w(j.chest), mul(j.fwd, C.torso * 0.96));
  return (
    <>
      {/* a bean body */}
      <Seg a={pel} b={shc} r={C.torso} m={body} />
      <Sph p={pel} r={C.torso} m={body} />
      <Sph p={shc} r={C.torso} m={body} />
      <Seg a={shc} b={add(shc, mul(j.up, 0.08))} r={0.045} m={body} />
      {/* head + eyes */}
      <Sph p={head} r={C.head} m={body} />
      {[-1, 1].map((s) => {
        const e = eye(s);
        return (
          <React.Fragment key={s}>
            <Sph p={e} r={[C.head * 0.27, C.head * 0.34 * blink, C.head * 0.14]} q={qb} m={white} cast={false} />
            <Sph p={add(e, mul(j.fwd, C.head * 0.09))} r={[C.head * 0.13, C.head * 0.17 * blink, C.head * 0.08]} q={qb} m={dark} cast={false} />
            <Sph p={add(add(e, mul(j.fwd, C.head * 0.15)), add(mul(j.up, C.head * 0.07), mul(j.side, -C.head * 0.04)))} r={C.head * 0.04 * blink} m={white} cast={false} />
            {/* brows: Ego angry (slanted in), the rest calm */}
            <Seg a={add(add(e, mul(j.up, C.head * (0.42 - 0.1 * angry))), mul(j.side, s * C.head * 0.2))} b={add(add(e, mul(j.up, C.head * (0.42 + 0.06 * angry))), mul(j.side, -s * C.head * 0.18))} r={C.head * 0.05} m={dark} cast={false} />
          </React.Fragment>
        );
      })}
      {/* limbs with mitten hands and round boots */}
      {arms.map(([s, e, h], i) => (
        <React.Fragment key={`a${i}`}>
          <Seg a={s} b={e} r={C.arm} m={body} />
          <Sph p={e} r={C.arm} m={body} />
          <Seg a={e} b={h} r={C.arm * 0.95} m={body} />
          <Sph p={h} r={C.hand} m={body} />
          <Sph p={s} r={C.arm * 1.05} m={body} />
        </React.Fragment>
      ))}
      {legs.map(([h, k, f], i) => (
        <React.Fragment key={`l${i}`}>
          <Seg a={h} b={k} r={C.leg} m={body} />
          <Sph p={k} r={C.leg} m={body} />
          <Seg a={k} b={f} r={C.leg * 0.95} m={body} />
          <Sph p={add(f, [j.fwd[0] * 0.04, -0.01, j.fwd[2] * 0.04])} r={C.foot} q={footQ} m={dark} />
        </React.Fragment>
      ))}
      {/* the chest light, now a glowing emblem */}
      <Sph p={glowP} r={[0.05, 0.05, 0.02]} q={qb} m={glossy(tint, tint, 2.2 * (1 - spent))} cast={false} />
      <pointLight position={add(glowP, mul(j.fwd, 0.15))} color={tint} intensity={0.25 + 0.6 * aura} distance={1.6} decay={2} />
      {crown ? <Crown head={head} j={j} /> : null}
    </>
  );
};

const Crown: React.FC<{head: V3; j: J3}> = ({head, j}) => {
  const gold = P('gold', () => new THREE.MeshPhysicalMaterial({color: '#ffcf4a', metalness: 1, roughness: 0.25, clearcoat: 0.6}));
  const c = add(head, mul(j.up, C.head * 0.86));
  const rr = C.head * 0.55;
  const pts = Array.from({length: 6}, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    return add(c, add(mul(j.side, Math.cos(a) * rr), mul(j.fwd, Math.sin(a) * rr)));
  });
  return (
    <>
      {pts.map((p, i) => (
        <React.Fragment key={i}>
          <Seg a={p} b={pts[(i + 1) % 6]} r={0.018} m={gold} />
          <Seg a={p} b={add(p, mul(j.up, 0.09))} r={0.014} m={gold} />
          <Sph p={add(p, mul(j.up, 0.095))} r={0.016} m={gold} />
        </React.Fragment>
      ))}
    </>
  );
};

/* ───────────── a real arm-wrestling table ───────────── */

const ArmTable: React.FC<{i: number; pad: string}> = ({i, pad}) => {
  const c = tw(i);
  const s = K3;
  const y = TY * s;
  const frame = std('#1a1c22', 0.35, 0.8);
  const vinyl = P('vinyl', () => new THREE.MeshPhysicalMaterial({color: '#202228', roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.3}));
  const chrome = std('#d8dde6', 0.15, 1);
  const X = (x: number, yy: number, z: number): V3 => [c[0] + x * s, yy, c[2] + z * s];
  const legs: [number, number][] = [
    [-0.3, -0.3],
    [0.3, -0.3],
    [-0.3, 0.3],
    [0.3, 0.3],
  ];
  return (
    <>
      {legs.map(([x, z], k) => (
        <Bx key={k} p={X(x, y / 2 - 0.03, z)} s={[0.05, y - 0.06, 0.05]} m={frame} />
      ))}
      {/* a rail round the legs near the floor */}
      {[-1, 1].map((k) => (
        <React.Fragment key={k}>
          <Bx p={X(0, 0.15, k * 0.3)} s={[0.6 * s + 0.05, 0.035, 0.035]} m={frame} />
          <Bx p={X(k * 0.3, 0.15, 0)} s={[0.035, 0.035, 0.6 * s + 0.05]} m={frame} />
        </React.Fragment>
      ))}
      <Bx p={X(0, y - 0.035, 0)} s={[TOP.x * 2 * s, 0.07, TOP.z * 2 * s]} m={vinyl} />
      {/* elbow pads (Ego red, the opponent in his colour) and the two hand pads */}
      <Bx p={X(-0.125, y + 0.012, 0)} s={[0.2 * s, 0.025, 0.2 * s]} m={std('#c8202a', 0.5)} />
      <Bx p={X(0.125, y + 0.012, 0)} s={[0.2 * s, 0.025, 0.2 * s]} m={std(pad, 0.5)} />
      {[-1, 1].map((sd) => (
        <React.Fragment key={sd}>
          <Bx p={X(sd * PEG[0], y + 0.015, sd * PEG[2])} s={[0.16 * s, 0.03, 0.12 * s]} m={vinyl} />
          <Seg a={X(sd * PEG[0], y, sd * PEG[2])} b={X(sd * PEG[0], (PEG[1] + 0.06) * s, sd * PEG[2])} r={0.018} m={chrome} />
          <Sph p={X(sd * PEG[0], (PEG[1] + 0.06) * s, sd * PEG[2])} r={0.024} m={chrome} />
        </React.Fragment>
      ))}
    </>
  );
};

/* ───────────── sets ───────────── */

const floorGeo = new THREE.PlaneGeometry(60, 60);
const Floor: React.FC<{m: THREE.Material}> = ({m}) => <mesh geometry={floorGeo} material={m} rotation={[-Math.PI / 2, 0, 0]} position={[1, 0, -5]} receiveShadow />;
const Wall: React.FC<{p: V3; w: number; h: number; m: THREE.Material; ry?: number}> = ({p, w, h, m, ry = 0}) => (
  <mesh position={p} rotation={[0, ry, 0]} receiveShadow>
    <planeGeometry args={[w, h]} />
    <primitive object={m} attach="material" />
  </mesh>
);

/** a spot from a lamp over a table, with soft shadows */
const Spot: React.FC<{p: V3; target: V3; color: string; intensity: number; angle?: number; shadow?: boolean}> = ({p, target, color, intensity, angle = 0.62, shadow = true}) => {
  const tgt = useMemo(() => new THREE.Object3D(), []);
  tgt.position.set(...target);
  tgt.updateMatrixWorld();
  return (
    <>
      <primitive object={tgt} />
      <spotLight position={p} target={tgt} color={color} intensity={intensity} angle={angle} penumbra={0.6} decay={0} castShadow={shadow} shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-0.0004} shadow-radius={6} />
    </>
  );
};

const DomeLamp: React.FC<{p: V3; color: string; m: THREE.Material}> = ({p, color, m}) => (
  <>
    <Seg a={[p[0], p[1] + 3, p[2]]} b={[p[0], p[1] + 0.2, p[2]]} r={0.008} m={std('#111', 0.6)} cast={false} />
    <mesh position={[p[0], p[1] + 0.12, p[2]]} material={m}>
      <sphereGeometry args={[0.34, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
    </mesh>
    <Sph p={[p[0], p[1] + 0.06, p[2]]} r={0.09} m={P(`bulb${color}`, () => new THREE.MeshBasicMaterial({color: new THREE.Color(color).multiplyScalar(3)}))} cast={false} />
  </>
);

const TABLES = [0, 1, 2, 3, 4].map(tw);

const Hall: React.FC = () => {
  const floor = std('#ffffff', 0.35, 0, {map: canvasTex('parquet', 1024, planks('#b8834a', '#d8a868', '#5a3a1a'), [6, 6])});
  const wall = std('#2a3040', 0.9);
  const seat = std('#1f4aa8', 0.5);
  const shade = std('#2a2d33', 0.4, 0.7, {side: THREE.DoubleSide});
  return (
    <>
      <color attach="background" args={['#0c0e14']} />
      <Floor m={floor} />
      <Wall p={[1, 4, -15]} w={40} h={8} m={wall} />
      {/* bleachers: steps of blue seats */}
      {Array.from({length: 6}, (_, r) => (
        <React.Fragment key={r}>
          <Bx p={[1, 0.25 + r * 0.45, -12.6 - r * 0.5]} s={[22, 0.5 + r * 0.9, 0.5]} m={std('#3a3f4c', 0.8)} cast={false} />
          {Array.from({length: 30}, (_, k) => (
            <Bx key={k} p={[-9.5 + k * 0.72, 0.62 + r * 0.9 - (r ? 0 : 0) + 0.0, -12.45 - r * 0.5]} s={[0.5, 0.12, 0.38]} m={seat} cast={false} />
          ))}
        </React.Fragment>
      ))}
      {/* a long banner in colour stripes, no words */}
      <Bx p={[1, 6.2, -14.8]} s={[16, 1.1, 0.05]} m={std('#c8202a', 0.7)} cast={false} />
      <Bx p={[1, 6.2, -14.75]} s={[16, 0.18, 0.05]} m={std('#f4c430', 0.6)} cast={false} />
      {TABLES.map((c, i) => (
        <React.Fragment key={i}>
          <DomeLamp p={[c[0], 3.6, c[2]]} color="#fff2d8" m={shade} />
          <Spot p={[c[0], 3.6, c[2]]} target={[c[0], 0, c[2]]} color="#fff0d8" intensity={i < 3 ? 9 : 6} shadow={i === 0 || i === 2} />
        </React.Fragment>
      ))}
      <hemisphereLight args={['#9fb4ff', '#3a2a1a', 0.35]} />
    </>
  );
};

const Pub: React.FC = () => {
  const floor = std('#ffffff', 0.55, 0, {map: canvasTex('pubwood', 1024, planks('#4a2a14', '#6a3e1e', '#1a0c04'), [5, 5])});
  const brick = std('#ffffff', 0.9, 0, {map: canvasTex('brick', 1024, bricks('#7a3420', '#9a4a2a', '#2a1a14'), [8, 3])});
  const wood = std('#5a3218', 0.4);
  const shade = std('#1e3a2a', 0.3, 0.6, {side: THREE.DoubleSide});
  const bottles = ['#2f7a3a', '#7a4a12', '#b8c8d8', '#6a1414', '#2a4a8a'];
  return (
    <>
      <color attach="background" args={['#0a0604']} />
      <Floor m={floor} />
      <Wall p={[1, 4, -14]} w={30} h={8} m={brick} />
      <Wall p={[-5, 4, -4]} w={24} h={8} m={brick} ry={Math.PI / 2} />
      <Bx p={[1, 0.55, -12.8]} s={[10, 1.1, 0.8]} m={wood} />
      <Bx p={[1, 1.13, -12.7]} s={[10.3, 0.06, 1.0]} m={std('#2a1608', 0.25)} />
      {[1.8, 2.4, 3.0].map((y, r) => (
        <React.Fragment key={r}>
          <Bx p={[1, y - 0.04, -13.8]} s={[8, 0.04, 0.3]} m={wood} cast={false} />
          {Array.from({length: 20}, (_, k) => {
            const x = -2.8 + k * 0.4;
            const col = bottles[Math.floor(R(k + r * 20) * 5)];
            return <Seg key={k} a={[x, y, -13.8]} b={[x, y + 0.28 + 0.1 * R(k * 3 + r), -13.8]} r={0.05} m={P(`gl${col}`, () => new THREE.MeshPhysicalMaterial({color: col, roughness: 0.08, metalness: 0, transmission: 0.6, thickness: 0.1, emissive: col, emissiveIntensity: 0.25}))} cast={false} />;
          })}
        </React.Fragment>
      ))}
      {TABLES.map((c, i) => (
        <React.Fragment key={i}>
          <DomeLamp p={[c[0], 2.6, c[2]]} color="#ffcf8a" m={shade} />
          <Spot p={[c[0], 2.6, c[2]]} target={[c[0], 0, c[2]]} color="#ffc078" intensity={i < 3 ? 8 : 5} angle={0.75} shadow={i === 0 || i === 2} />
        </React.Fragment>
      ))}
      <pointLight position={[1, 2.2, -12]} color="#ff9a4a" intensity={6} distance={9} decay={2} />
      <hemisphereLight args={['#ffb070', '#1a0a04', 0.25]} />
    </>
  );
};

const Garage: React.FC = () => {
  const floor = std('#ffffff', 0.8, 0, {map: canvasTex('concrete', 1024, concrete('#6a6a68', true), [5, 5])});
  const block = std('#ffffff', 0.95, 0, {map: canvasTex('block', 1024, bricks('#7a7c80', '#8a8c90', '#4a4c50', 4, 8), [8, 3])});
  const pipe = std('#8a4a2a', 0.5, 0.6);
  return (
    <>
      <color attach="background" args={['#050506']} />
      <Floor m={floor} />
      <Wall p={[1, 4, -14]} w={30} h={8} m={block} />
      <Wall p={[-5, 4, -4]} w={24} h={8} m={block} ry={Math.PI / 2} />
      {[2.6, 3.0].map((y, k) => (
        <Seg key={k} a={[-12, y, -13.85 + k * 0.05]} b={[14, y, -13.85 + k * 0.05]} r={0.07} m={pipe} cast={false} />
      ))}
      {/* a stack of tyres and a workbench */}
      {[0, 1, 2, 3].map((k) => (
        <mesh key={k} position={[-3.2, 0.12 + k * 0.24, -11.5]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow material={std('#111214', 0.85)}>
          <torusGeometry args={[0.42, 0.13, 16, 40]} />
        </mesh>
      ))}
      <Bx p={[4.5, 0.45, -13.3]} s={[3, 0.9, 0.8]} m={std('#5a5048', 0.7)} />
      <Bx p={[4.5, 0.92, -13.3]} s={[3.1, 0.06, 0.9]} m={std('#3a2a1a', 0.6)} />
      {TABLES.map((c, i) => (
        <React.Fragment key={i}>
          <Seg a={[c[0], 6, c[2]]} b={[c[0], 2.5, c[2]]} r={0.006} m={std('#111', 0.6)} cast={false} />
          <Sph p={[c[0], 2.45, c[2]]} r={0.07} m={P('bare', () => new THREE.MeshBasicMaterial({color: new THREE.Color('#ffe4b0').multiplyScalar(4)}))} cast={false} />
          <pointLight position={[c[0], 2.4, c[2]]} color="#ffd9a0" intensity={i < 3 ? 9 : 5} distance={6} decay={2} castShadow={i === 0 || i === 2} shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-0.001} />
        </React.Fragment>
      ))}
      <hemisphereLight args={['#6a7a9a', '#1a1612', 0.15]} />
    </>
  );
};

const Gym: React.FC = () => {
  const floor = std('#ffffff', 0.9, 0, {map: canvasTex('rubber', 1024, rubber, [12, 12])});
  const wall = std('#d8dce4', 0.85);
  const win = P('win', () => new THREE.MeshBasicMaterial({color: new THREE.Color('#dfeeff').multiplyScalar(1.6)}));
  return (
    <>
      <color attach="background" args={['#cfd8e6']} />
      <Floor m={floor} />
      <Wall p={[1, 4, -14]} w={30} h={8} m={wall} />
      {/* tall windows letting the sun in */}
      {Array.from({length: 6}, (_, k) => (
        <React.Fragment key={k}>
          <mesh position={[-5 + k * 2.4, 3.2, -13.95]} material={win}>
            <planeGeometry args={[1.7, 3.6]} />
          </mesh>
          <Bx p={[-5 + k * 2.4, 3.2, -13.9]} s={[0.08, 3.6, 0.06]} m={std('#2a2d33', 0.4, 0.6)} cast={false} />
        </React.Fragment>
      ))}
      {/* dumbbell rack */}
      <Bx p={[1, 0.4, -12.9]} s={[6, 0.08, 0.6]} m={std('#1a1c20', 0.4, 0.8)} />
      {Array.from({length: 10}, (_, k) => (
        <React.Fragment key={k}>
          <Seg a={[-1.6 + k * 0.58, 0.52, -13.1]} b={[-1.6 + k * 0.58, 0.52, -12.7]} r={0.02} m={std('#c8ccd4', 0.2, 1)} />
          <Seg a={[-1.6 + k * 0.58, 0.52, -13.15]} b={[-1.6 + k * 0.58, 0.52, -13.05]} r={0.08 + k * 0.004} m={std('#16181c', 0.6)} />
          <Seg a={[-1.6 + k * 0.58, 0.52, -12.75]} b={[-1.6 + k * 0.58, 0.52, -12.65]} r={0.08 + k * 0.004} m={std('#16181c', 0.6)} />
        </React.Fragment>
      ))}
      <directionalLight position={[-4, 9, -18]} intensity={3.2} color="#fff4e0" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-bias={-0.0004} />
      <hemisphereLight args={['#dfe8ff', '#5a5048', 0.9]} />
    </>
  );
};

/* ───────────── the scene ───────────── */

const EXPO: Record<RealEnv, [number, number]> = {hall: [1.0, 0.25], pub: [1.05, 0.15], garage: [1.1, 0.1], gym: [0.95, 0.5], pro: [1.05, 0.22]};
const PAL = ['#ff5a4a', '#ffa83a', '#5fd8a0', '#ffd84a', '#a77cff', '#4ab8ff'];

/** each opponent comes on at his turn, as in the reference (Obsession and Discipline with their spots in the dark) */
const APPEAR = [0, 0, 0, 0, 16.72, KT.more];

export const RealScene: React.FC<{t: number; env: RealEnv; colored: boolean; design?: Design; neck?: number}> = ({t, env, colored, design, neck}) => {
  const st = CAST.map((f) => f(t));
  return (
    <>
      <Setup exposure={EXPO[env][0]} envAmt={EXPO[env][1] * (env === 'pro' ? 0.15 + 0.85 * lights(t).house : 1)} />
      {env === 'pro' ? <HallPro t={t} /> : env === 'hall' ? <Hall /> : env === 'pub' ? <Pub /> : env === 'garage' ? <Garage /> : <Gym />}
      {[0, 1, 2, 3, 4].map((i) => (
        <ArmTable key={i} i={i} pad={['#e8a020', '#2aa070', '#e8c020', '#7a4ad8', '#2a7ad8'][i]} />
      ))}
      {env === 'pro' ? <BlockFx t={t} /> : null}
      {env === 'pro' ? <ProFx t={t} st={st} /> : null}
      {env === 'pro'
        ? st.map((s, i) => t < APPEAR[i] ? null : <BlockMan key={i} j={solveR(s.rig)} idx={i} spent={s.spent} energy={s.energy} noArm={s.noArm} crown={i === 0 && t < 30.1} light={TINTS[i]} neck={neck} />)
        : design
        ? st.map((s, i) => <CartoonMan key={i} j={solveR(s.rig)} design={design} idx={i} spent={s.spent} noArm={s.noArm} crown={i === 0 && t < 30.1} />)
        : st.map((s, i) => (
        <CartoonFig key={i} j={solveR(s.rig)} color={colored ? PAL[i] : '#f4f6fb'} tint={TINTS[i]} idx={i} spent={s.spent} aura={s.aura} noArm={s.noArm} crown={i === 0 && t < 30.1} t={t} />
      ))}
    </>
  );
};

/* ───────────── the chosen set: a real tournament hall, built out ───────────── */

/** court lines painted on the parquet */
const courtLines = (g: CanvasRenderingContext2D, s: number) => {
  g.clearRect(0, 0, s, s);
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.lineWidth = 10;
  g.strokeRect(40, 40, s - 80, s - 80);
  g.beginPath();
  g.arc(s / 2, s / 2, s * 0.16, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = 'rgba(40,120,220,0.9)';
  g.lineWidth = 8;
  g.strokeRect(80, 80, s - 160, s - 160);
};

/** spectators made of blocks, instanced */
const CrowdBlocks: React.FC<{t: number}> = ({t}) => {
  const n = 420;
  const data = useMemo(
    () =>
      Array.from({length: n}, (_, i) => {
        const r = Math.floor(i / 70);
        const k = i % 70;
        return {x: -12 + k * 0.36 + (R(i) - 0.5) * 0.16, y: 0.62 + r * 0.9, z: -20.45 - r * 0.55, c: ['#5a6a8a', '#8a5a5a', '#6a8a6a', '#8a7a5a', '#6a5a8a', '#4a5a6a', '#9a9aa8'][Math.floor(R(i + 9) * 7)], s: 0.9 + 0.2 * R(i + 3), seed: i, skip: R(i + 1) < 0.12};
      }),
    [],
  );
  const bodyGeo = useMemo(() => new THREE.BoxGeometry(0.34, 0.3, 0.2), []);
  const headGeo = useMemo(() => new THREE.BoxGeometry(0.19, 0.18, 0.18), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({roughness: 0.85, color: '#c8c8d0'}), []);
  const refs = React.useRef<[THREE.InstancedMesh | null, THREE.InstancedMesh | null]>([null, null]);
  const m4 = new THREE.Matrix4();
  const col = new THREE.Color();
  React.useLayoutEffect(() => {
    const [b, h] = refs.current;
    if (!b || !h) return;
    data.forEach((p, i) => {
      const cheer = Math.max(0, Math.sin(t * 6 + p.seed)) * 0.04 * (R(p.seed + 2) > 0.6 ? 1 : 0);
      const sc = p.skip ? 0 : p.s;
      const lean = (R(p.seed + 5) - 0.5) * 0.3;
      const rot = new THREE.Matrix4().makeRotationZ(lean);
      m4.makeScale(sc, sc, sc).premultiply(rot).setPosition(p.x, p.y + 0.27 + cheer, p.z);
      b.setMatrixAt(i, m4);
      m4.makeScale(sc, sc, sc).premultiply(new THREE.Matrix4().makeRotationZ(lean * 1.5 + (R(p.seed + 6) - 0.5) * 0.4)).setPosition(p.x - lean * 0.25, p.y + 0.54 * p.s + cheer, p.z + (R(p.seed + 7) - 0.5) * 0.05);
      h.setMatrixAt(i, m4);
      col.set(p.c);
      b.setColorAt(i, col);
      col.set(['#e8c8a8', '#c89a78', '#8a6248', '#f0d8c0'][Math.floor(R(p.seed + 8) * 4)]);
      h.setColorAt(i, col);
    });
    b.instanceMatrix.needsUpdate = h.instanceMatrix.needsUpdate = true;
    if (b.instanceColor) b.instanceColor.needsUpdate = true;
    if (h.instanceColor) h.instanceColor.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={(r) => void (refs.current[0] = r)} args={[bodyGeo, mat, n]} />
      <instancedMesh ref={(r) => void (refs.current[1] = r)} args={[headGeo, mat, n]} />
    </>
  );
};

/** a box truss beam from a to b at height y (four chords and zig-zag braces) */
const Truss: React.FC<{a: V3; b: V3}> = ({a, b}) => {
  const m = std('#9aa0aa', 0.35, 0.9);
  const h = 0.16;
  const L = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const n = Math.round(L / 0.35);
  const dir: V3 = [(b[0] - a[0]) / L, 0, (b[2] - a[2]) / L];
  const perp: V3 = [-dir[2], 0, dir[0]];
  const off = (u: number, v: number): V3 => [perp[0] * u * h, v * h, perp[2] * u * h];
  const chords = [off(-1, -1), off(1, -1), off(-1, 1), off(1, 1)];
  return (
    <>
      {chords.map((o, i) => (
        <Seg key={i} a={add(a, o)} b={add(b, o)} r={0.018} m={m} cast={false} />
      ))}
      {Array.from({length: n}, (_, i) => {
        const p0 = add(a, mul(dir, (L * i) / n));
        const p1 = add(a, mul(dir, (L * (i + 1)) / n));
        return (
          <React.Fragment key={i}>
            <Seg a={add(p0, off(-1, -1))} b={add(p1, off(-1, 1))} r={0.008} m={m} cast={false} />
            <Seg a={add(p0, off(1, -1))} b={add(p1, off(1, 1))} r={0.008} m={m} cast={false} />
          </React.Fragment>
        );
      })}
    </>
  );
};

/** a par-can light hanging under the truss, its beam in the haze */
const ParCan: React.FC<{p: V3; to: V3; color: string; a: number}> = ({p, to, color, a}) => {
  const d = norm3(sub3(to, p));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(...d));
  const L = Math.hypot(to[0] - p[0], to[1] - p[1], to[2] - p[2]);
  return (
    <>
      <mesh position={p} quaternion={q} material={std('#15161a', 0.4, 0.7)}>
        <cylinderGeometry args={[0.11, 0.14, 0.26, 20]} />
      </mesh>
      <mesh position={add(p, mul(d, 0.135))} quaternion={q} material={P(`lens${color}`, () => new THREE.MeshBasicMaterial({color: new THREE.Color(color).multiplyScalar(3)}))}>
        <circleGeometry args={[0.1, 20]} />
      </mesh>
      <mesh position={add(p, mul(d, L / 2))} quaternion={q} renderOrder={7} material={beamMat(color, a)}>
        <cylinderGeometry args={[0.1, 0.75, L, 32, 1, true]} />
      </mesh>
    </>
  );
};
const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm3 = (a: V3): V3 => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const BEAM_FRAG = `uniform vec3 uC; uniform float uA; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 1.6); float a = uA * f * (0.25 + 0.75 * vUv.y); gl_FragColor = vec4(uC * a, a); }`;
const BEAM_VERT = `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`;
const beamMat = (c: string, a: number) => P(`beam${c}${a}`, () => new THREE.ShaderMaterial({vertexShader: BEAM_VERT, fragmentShader: BEAM_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: {uC: {value: new THREE.Color(c)}, uA: {value: a}}, fog: false}));

/** the runway along the row of tables: centre and angle */
const RC: V3 = [6.3, 0, -1.4];
const RA = Math.atan2(2.68, 12.57);

export const HallPro: React.FC<{t: number}> = ({t}) => {
  const L = lights(t);
  const q = (x: number) => Math.round(x * 20) / 20;
  const floor = P('parquetPro', () => new THREE.MeshPhysicalMaterial({map: canvasTex('parquet2', 1024, planks('#b5824c', '#d6a76c', '#6a4422'), [7, 7]), roughness: 0.38, clearcoat: 0.55, clearcoatRoughness: 0.22}));
  const lines = P('court', () => new THREE.MeshBasicMaterial({map: canvasTex('court', 1024, courtLines, [1, 1]), transparent: true, depthWrite: false, opacity: 0.7}));
  const carpet = P('carpet', () => new THREE.MeshStandardMaterial({color: '#7a1218', roughness: 0.95}));
  const goldTrim = std('#d8a83a', 0.35, 0.8);
  const board = std('#121620', 0.6, 0.2);
  const seat = std('#14244a', 0.7);
  const stand = std('#16181e', 0.9);
  const screen = P('screen', () => new THREE.MeshBasicMaterial({color: new THREE.Color('#1a3a8a').multiplyScalar(1.4)}));
  const led = (c: string) => P(`led${c}`, () => new THREE.MeshBasicMaterial({color: new THREE.Color(c).multiplyScalar(2.2)}));
  const z0 = -5.5;
  return (
    <>
      <color attach="background" args={['#07080d']} />
      <fog attach="fog" args={['#0b0a10', 15, 44]} />
      <Floor m={floor} />
      {/* court lines and the red runway with gold edges along the tables */}
      <mesh position={[RC[0], 0.002, RC[2]]} rotation={[-Math.PI / 2, 0, RA]} material={lines}>
        <planeGeometry args={[22, 9]} />
      </mesh>
      <mesh position={[RC[0], 0.004, RC[2]]} rotation={[-Math.PI / 2, 0, RA]} material={carpet} receiveShadow>
        <planeGeometry args={[17, 3.2]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[RC[0] + s * 1.62 * Math.sin(RA), 0.006, RC[2] + s * 1.62 * Math.cos(RA)]} rotation={[-Math.PI / 2, 0, RA]} material={goldTrim}>
          <planeGeometry args={[17, 0.06]} />
        </mesh>
      ))}
      {/* barrier boards with an LED strip */}
      <Bx p={[1.2, 0.45, -12.15]} s={[20, 0.9, 0.12]} m={board} />
      <mesh position={[1.2, 0.82, -12.08]} material={led('#3aa0ff')}>
        <planeGeometry args={[20, 0.05]} />
      </mesh>
      {Array.from({length: 8}, (_, k) => (
        <mesh key={k} position={[-7 + k * 2.4, 0.45, -12.08]} material={P(`panel${k}`, () => new THREE.MeshStandardMaterial({color: ['#c8202a', '#1e3e8a', '#f4c430', '#1e3e8a'][k % 4], roughness: 0.5, emissive: ['#c8202a', '#1e3e8a', '#f4c430', '#1e3e8a'][k % 4], emissiveIntensity: 0.25}))}>
          <planeGeometry args={[2.1, 0.55]} />
        </mesh>
      ))}
      {/* stands, seats, the crowd */}
      {Array.from({length: 6}, (_, r) => (
        <React.Fragment key={r}>
          <Bx p={[1, 0.25 + r * 0.45, -20.6 - r * 0.55]} s={[26, 0.5 + r * 0.9, 0.5]} m={stand} cast={false} />
          <Bx p={[1, 0.62 + r * 0.9, -20.42 - r * 0.55]} s={[25.5, 0.1, 0.36]} m={seat} cast={false} />
        </React.Fragment>
      ))}
      <CrowdBlocks t={t} />
      {/* the big screen and its frame */}
      <Bx p={[1.1, 8.2, -25.2]} s={[13, 4.4, 0.2]} m={std('#0c0d12', 0.5, 0.6)} cast={false} />
      <mesh position={[1.1, 8.2, -25.08]} material={screen} visible={L.house > 0.3}>
        <planeGeometry args={[12.5, 4.0]} />
      </mesh>
      {Array.from({length: 5}, (_, k) => (
        <mesh key={k} position={[1.1 + (k - 2) * 2.2, 8.2, -25.06]} material={led(['#ef4b3f', '#f59a2e', '#3fc495', '#f2c531', '#9a6cf0'][k])}>
          <planeGeometry args={[1.6, 1.6]} />
        </mesh>
      ))}
      {/* truss over the tables, a par can over each, two cool back lights */}
      <Truss a={[-2.2, 4.8, 0.9]} b={[15, 4.8, -2.6]} />
      <Truss a={[-2.2, 4.8, -2.4]} b={[15, 4.8, -5.9]} />
      {TABLES.map((c, i) => {
        const p: V3 = [c[0] - 0.1, 4.62, c[2] + 0.55];
        return (
          <React.Fragment key={i}>
            <ParCan p={p} to={[c[0], 0, c[2]]} color="#ffe8c8" a={q(0.06 * L.spots[i])} />
            <Spot p={p} target={[c[0], 0.6, c[2]]} color="#ffe6c4" intensity={6 * L.spots[i]} angle={0.5} shadow={i === 0 || i === 2 || i === 4} />
          </React.Fragment>
        );
      })}
      {[1.5, 10.5].map((x, k) => (
        <React.Fragment key={k}>
          <ParCan p={[x, 4.4, -3]} to={[1.1, 0, -5 - 2 * k]} color="#5a8aff" a={q(0.05 * L.house)} />
          <Spot p={[x, 4.4, -3]} target={[1.1, 0.8, -5]} color="#6a96ff" intensity={4 * L.house} angle={0.7} shadow={false} />
        </React.Fragment>
      ))}
      <Spot p={[1.1, 3, 6]} target={[1.1, 0.8, -2]} color="#ffd8b0" intensity={1.6 * L.house} angle={0.6} shadow={false} />
      <hemisphereLight args={['#8aa0d8', '#3a2414', 0.06 + 0.24 * L.house]} />
      <Spot p={[WALL.x * K3 + 1.2, 4.4, WALL.z * K3 + 0.6]} target={[WALL.x * K3 + 0.3, 0.4, WALL.z * K3]} color="#ffe6c4" intensity={5 * L.house * (t > KT.slam ? 1 : 0.4)} angle={0.5} shadow={false} />
      {/* the side board Ego is thrown into */}
      <Bx p={[WALL.x * K3 - 0.07, 0.45, WALL.z * K3 + 0.4]} s={[0.12, 0.9, 3.4]} m={board} />
      <mesh position={[WALL.x * K3 - 0.005, 0.82, WALL.z * K3 + 0.4]} rotation={[0, Math.PI / 2, 0]} material={led('#3aa0ff')}>
        <planeGeometry args={[3.4, 0.05]} />
      </mesh>
      {/* dust in the beams */}
      {Array.from({length: 60}, (_, i) => {
        const c = TABLES[i % 5];
        const y = 0.3 + ((R(i + 2) + t * 0.03) % 1) * 3.8;
        return (
          <mesh key={`d${i}`} position={[c[0] + (R(i + 3) - 0.5) * 1.2, y, c[2] + (R(i + 4) - 0.5) * 1.2]} material={P('dust', () => new THREE.MeshBasicMaterial({color: '#fff0d8', transparent: true, opacity: 0.6}))}>
            <sphereGeometry args={[0.008, 6, 4]} />
          </mesh>
        );
      })}
    </>
  );
};

/* ───────────── block effects: the arm breaking into cubes, the crown flying, stars round a dazed head ───────────── */

const G9 = 9.8;
export const BlockFx: React.FC<{t: number}> = ({t}) => {
  const purple = P('shardP', () => new THREE.MeshToonMaterial({color: '#9a6cf0'}));
  const gold = P('shardG', () => new THREE.MeshStandardMaterial({color: '#ffc93a', metalness: 0.9, roughness: 0.3, emissive: '#3a2400'}));
  const star = P('star', () => new THREE.MeshBasicMaterial({color: new THREE.Color('#ffd84a').multiplyScalar(1.4)}));
  const out: React.ReactNode[] = [];
  // Obsession's arm bursts into cubes at the snap
  const dt = t - KT.broke;
  if (dt >= 0) {
    const j = solveR(CAST[4](KT.broke).rig);
    const from = W3(j.el[0], [0, 0, 0], K3);
    const top = TY * K3 + 0.02;
    const tab = tw(3);
    for (let i = 0; i < 16; i++) {
      const a = R(i + 900) * Math.PI * 2;
      const v = 0.9 + 1.4 * R(i + 901);
      const vy = 1.2 + 1.6 * R(i + 902);
      const vx = Math.cos(a) * v + 0.5;
      const vz = Math.sin(a) * v * 0.7;
      const s = 0.03 + 0.03 * R(i + 903);
      let x = from[0] + vx * dt;
      let z = from[2] + vz * dt;
      let y = from[1] + vy * dt - 0.5 * G9 * dt * dt;
      const onTop = Math.abs(x - tab[0]) < TOP.x * K3 && Math.abs(z - tab[2]) < TOP.z * K3;
      const fl = (onTop ? top : 0) + s / 2;
      let spin = dt * 9;
      if (y < fl) {
        const tl = (vy + Math.sqrt(Math.max(0, vy * vy + 2 * G9 * (from[1] - fl)))) / G9;
        const sl = Math.min(dt - tl, 0.4);
        x = from[0] + vx * tl + vx * 0.2 * sl;
        z = from[2] + vz * tl + vz * 0.2 * sl;
        y = fl;
        spin = tl * 9;
      }
      out.push(<Bx key={`s${i}`} p={[x, y, z]} s={[s, s, s]} m={purple} ry={spin + i} />);
    }
  }
  // the crown flies off at the hit and tumbles to the floor
  const ct = t - KT.slam - 0.05;
  if (ct >= 0) {
    const j = solveR(CAST[0](KT.slam + 0.05).rig);
    const h0 = W3(j.head, [0, 0, 0], K3);
    const v: V3 = [-1.2, 2.4, 0.8];
    const tl = (v[1] + Math.sqrt(v[1] * v[1] + 2 * G9 * (h0[1] + 0.1))) / G9;
    const k = Math.min(ct, tl);
    const roll = Math.max(0, Math.min(ct - tl, 0.9));
    const e = roll - (roll * roll) / 1.8;
    const p: V3 = ct < tl ? [h0[0] + v[0] * ct, h0[1] + 0.1 + v[1] * ct - 0.5 * G9 * ct * ct, h0[2] + v[2] * ct] : [h0[0] + v[0] * tl + 0.4 * e, 0.035, h0[2] + v[2] * tl + 0.6 * e];
    out.push(
      <group key="crown" position={p} rotation={[k * 12 * (ct < tl ? 1 : 0) + (ct < tl ? 0 : 0.0), k * 5 + e * 4, ct < tl ? k * 7 : Math.PI / 2 * Math.min(1, roll * 4)]}>
        <Bx p={[0, 0, 0]} s={[0.24, 0.06, 0.23]} m={gold} />
        {[-1, 0, 1].map((n) => (
          <React.Fragment key={n}>
            <Bx p={[n * 0.095, 0.06, 0]} s={[0.05, 0.08, 0.05]} m={gold} />
            <Bx p={[0, 0.06, n * 0.095]} s={[0.05, 0.08, 0.05]} m={gold} />
          </React.Fragment>
        ))}
      </group>,
    );
  }
  // stars round Ego's head once he sits against the board
  const on = Math.min(1, Math.max(0, (t - KT.slam - 1.0) / 0.3));
  if (on > 0) {
    const j = solveR(CAST[0](t).rig);
    const hd = add(W3(j.shc, [0, 0, 0], K3), mul(j.up, 0.23));
    for (let i = 0; i < 4; i++) {
      const a = t * 4 + (i / 4) * Math.PI * 2;
      const sz = 0.085 * on;
      out.push(<Bx key={`st${i}`} p={[hd[0] + Math.cos(a) * 0.1, hd[1] + 0.27 + 0.03 * Math.sin(a * 2), hd[2] + Math.sin(a) * 0.28]} s={[sz, sz, sz * 0.5]} m={star} ry={a * 2} />);
    }
  }
  return <>{out}</>;
};

/* ───────────── what the reference has around the fights: flame auras, cracks in the floor ───────────── */

const footAt = (tt: number): V3 => {
  const j = solveR(CAST[0](tt).rig);
  return W3(j.ft[0], [0, 0, 0], K3);
};
const ProFx: React.FC<{t: number; st: ReturnType<typeof CAST[0]>[]}> = ({t, st}) => {
  const ss2 = (a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
  const sm = (a: number, b: number) => {
    const k = ss2(a, b);
    return k * k * (3 - 2 * k);
  };
  const c3 = useMemo(() => footAt(13.5), []);
  const c4 = useMemo(() => footAt(22.8), []);
  const c5 = useMemo(() => footAt(28.8), []);
  const cw: V3 = useMemo(() => [WALL.x * K3 + 0.3, 0, WALL.z * K3 - 0.08], []);
  const COL = ['#ff3a22', '#ffb347', '#6fe0b4', '#ffd66b', '#b77cff', '#7fd8ff'];
  return (
    <>
      {st.map((s, i) => {
        if (t < APPEAR[i]) return null;
        // Ego always carries a little of his red; the rest only in the fight
        const amt = i === 0 ? Math.max(0.18, s.aura) * (t > KT.slam + 0.3 ? 0.3 : 1) : s.aura;
        if (amt < 0.03) return null;
        const jj = solveR(s.rig);
        // twice over: the flames read against the lit hall
        return (
          <React.Fragment key={i}>
            <FlameAura t={t} j={jj} amt={amt} color={COL[i]} seed={i * 1000} />
          </React.Fragment>
        );
      })}
      <Cracks c={c3} seed={3} n={9} len={0.7} grow={sm(12.9, 15.0) + 0.4 * sm(KT.w3, KT.w3 + 0.2)} heat={0.25 * sm(12.9, 13.5) * (1 - sm(16, 17))} t={t} />
      <Cracks c={c4} seed={7} n={8} len={0.6} grow={sm(KT.wont, KT.broke) + 0.5 * sm(KT.broke, KT.broke + 0.2)} heat={0.25 * sm(KT.wont, KT.wont + 0.4) * (1 - sm(25, 26))} t={t} />
      <Cracks c={c5} seed={13} n={8} len={0.55} grow={sm(KT.seen, KT.slam)} heat={0.2 * sm(KT.seen, KT.seen + 0.4) * (1 - sm(KT.slam, KT.slam + 0.4))} t={t} />
      <Cracks c={cw} seed={21} n={7} len={0.45} grow={sm(KT.slam + 0.36, KT.slam + 0.5)} heat={0} t={t} />
    </>
  );
};

/* ───────────── the flame aura: soft coloured flames painted round the body (not light), as in the reference ───────────── */

const FL_VERT = /* glsl */ `varying vec2 vUv; varying float vA; varying float vK;
void main(){ vUv = uv; vA = instanceColor.r; vK = instanceColor.g;
  vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float s = length(instanceMatrix[0].xyz);
  c.xy += position.xy * s * vec2(1.0, 1.35);
  gl_Position = projectionMatrix * c; }`;
const FL_FRAG = /* glsl */ `uniform vec3 uC, uH; varying vec2 vUv; varying float vA; varying float vK;
void main(){ vec2 p = (vUv - 0.5) * 2.0; float d = length(p * vec2(1.0, 0.8 + 0.4 * (p.y + 1.0) * 0.5));
  float a = smoothstep(1.0, 0.15, d) * vA; if (a < 0.003) discard;
  vec3 c = mix(uC, uH, vK * smoothstep(0.6, 0.0, d)); gl_FragColor = vec4(c, a); }`;
const FL_N = 140;
const flameMats = new Map<string, THREE.ShaderMaterial>();
const flameMat = (c: string) => {
  let m = flameMats.get(c);
  if (!m) {
    m = new THREE.ShaderMaterial({vertexShader: FL_VERT, fragmentShader: FL_FRAG, transparent: true, depthWrite: false, uniforms: {uC: {value: new THREE.Color(c)}, uH: {value: new THREE.Color(mixHex(c, '#ffffff', 0.6))}}});
    flameMats.set(c, m);
  }
  return m;
};
const flameGeo = new THREE.PlaneGeometry(1, 1);
const FlameAura: React.FC<{t: number; j: J3; amt: number; color: string; seed: number}> = ({t, j, amt, color, seed}) => {
  const ref = React.useRef<THREE.InstancedMesh>(null);
  const segs: [V3, V3][] = [
    [j.shc, add(j.hip[0], mul(j.side, HB.hipZ))],
    [j.sh[0], j.el[0]],
    [j.el[0], j.hd[0]],
    [j.sh[1], j.el[1]],
    [j.el[1], j.hd[1]],
    [j.hip[0], j.kn[0]],
    [j.kn[0], j.ft[0]],
    [j.hip[1], j.kn[1]],
    [j.kn[1], j.ft[1]],
    [j.head, j.head],
    [j.head, j.head],
    [j.chest, j.chest],
  ];
  const m4 = new THREE.Matrix4();
  const col = new THREE.Color();
  React.useLayoutEffect(() => {
    const im = ref.current;
    if (!im) return;
    const a = Math.min(1.3, amt);
    for (let i = 0; i < FL_N; i++) {
      const sd = seed + i * 17;
      const [p0, p1] = segs[i % segs.length];
      const u = R(sd + 1);
      const base = W3([p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u, p0[2] + (p1[2] - p0[2]) * u], [0, 0, 0], K3);
      const period = 0.5 + 0.4 * R(sd + 2);
      const ph = ((t / period + R(sd + 3)) % 1 + 1) % 1;
      const ang = R(sd + 4) * Math.PI * 2;
      const out = (0.09 + 0.12 * R(sd + 5)) * (0.7 + 0.5 * a);
      const rise = ph * (0.25 + 0.3 * R(sd + 6)) * (0.6 + 0.6 * a);
      const size = (0.16 + 0.14 * R(sd + 7)) * (1 - 0.55 * ph) * (0.7 + 0.5 * a);
      const x = base[0] + Math.cos(ang) * out + Math.sin(t * 5 + i) * 0.02;
      const y = base[1] + rise + (i % segs.length >= 9 ? 0.12 : 0);
      const z = base[2] + Math.sin(ang) * out * 0.6;
      m4.makeScale(size, size, size).setPosition(x, y, z);
      im.setMatrixAt(i, m4);
      const alpha = Math.min(1, a) * Math.sin(Math.PI * ph) * (0.22 + 0.2 * R(sd + 8));
      col.setRGB(alpha, R(sd + 9) > 0.7 ? 1 : 0, 0);
      im.setColorAt(i, col);
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[flameGeo, flameMat(color), FL_N]} frustumCulled={false} renderOrder={6} />;
};
