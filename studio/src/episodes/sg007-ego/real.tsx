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

/**
 * SG007 "real" looks: physically lit 3D sets (PBR materials, spot lights with soft shadows, an environment map for
 * reflections, filmic tone mapping) and cartoon 3D stickmen (glossy vinyl, big eyes, mitten hands, round boots).
 */
export type RealEnv = 'hall' | 'pub' | 'garage' | 'gym';

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
      <Bx p={X(0, 0.18, 0)} s={[0.62 * s, 0.04, 0.04]} m={frame} />
      <Bx p={X(0, 0.18, 0)} s={[0.04, 0.04, 0.62 * s]} m={frame} />
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

const EXPO: Record<RealEnv, [number, number]> = {hall: [1.0, 0.25], pub: [1.05, 0.15], garage: [1.1, 0.1], gym: [0.95, 0.5]};
const PAL = ['#ff5a4a', '#ffa83a', '#5fd8a0', '#ffd84a', '#a77cff', '#4ab8ff'];

export const RealScene: React.FC<{t: number; env: RealEnv; colored: boolean; design?: Design}> = ({t, env, colored, design}) => {
  const st = CAST.map((f) => f(t));
  return (
    <>
      <Setup exposure={EXPO[env][0]} envAmt={EXPO[env][1]} />
      {env === 'hall' ? <Hall /> : env === 'pub' ? <Pub /> : env === 'garage' ? <Garage /> : <Gym />}
      {[0, 1, 2, 3, 4].map((i) => (
        <ArmTable key={i} i={i} pad={['#e8a020', '#2aa070', '#e8c020', '#7a4ad8', '#2a7ad8'][i]} />
      ))}
      {design
        ? st.map((s, i) => <CartoonMan key={i} j={solveR(s.rig)} design={design} idx={i} spent={s.spent} noArm={s.noArm} crown={i === 0 && t < 30.1} />)
        : st.map((s, i) => (
        <CartoonFig key={i} j={solveR(s.rig)} color={colored ? PAL[i] : '#f4f6fb'} tint={TINTS[i]} idx={i} spent={s.spent} aura={s.aura} noArm={s.noArm} crown={i === 0 && t < 30.1} t={t} />
      ))}
    </>
  );
};
