import React, {useMemo} from 'react';
import * as THREE from 'three';
import {Ball, Fade, Glow, Limb, Part, V3, roundedBox, useLook} from './kit3d';
import type {Mat} from './looks';

export const WATER = -0.34;

/** '#rrggbb' mix */
export const mixHex = (a: string, b: string, k: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * Math.min(1, Math.max(0, k))).toString(16).padStart(2, '0')).join('');
};

/* ───────────── ground ───────────── */

const bankGeo = (pts: [number, number][], depth: number) => {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  const curve = new THREE.SplineCurve(pts.map((p) => new THREE.Vector2(p[0], p[1])));
  curve.getPoints(90).forEach((p) => s.lineTo(p.x, p.y));
  s.lineTo(pts[pts.length - 1][0], -9);
  s.lineTo(pts[0][0], -9);
  const g = new THREE.ExtrudeGeometry(s, {depth, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 5, curveSegments: 24});
  g.translate(0, 0, -depth + 0.75);
  return g;
};

/** two shores with a gap of water between them */
export const Banks: React.FC = () => {
  const look = useLook();
  const left = useMemo(() => bankGeo([[-7, -0.07], [-2.2, -0.07], [-1.2, -0.07], [-0.78, -0.09], [-0.62, -0.2], [-0.66, -0.42], [-0.86, -0.62], [-1.3, -0.82], [-2.2, -1.0], [-7, -1.25]], 3.4), []);
  const right = useMemo(() => bankGeo([[7, -0.07], [2.2, -0.07], [0.95, -0.07], [0.6, -0.1], [0.47, -0.22], [0.52, -0.45], [0.74, -0.66], [1.25, -0.84], [2.2, -1.0], [7, -1.25]], 3.4), []);
  const fade: Fade = {y0: -0.1, y1: -1.15, max: 1, z0: -0.2, z1: -3.2, zmax: 0.75};
  return (
    <>
      <Part geo={left} m={look.ground} y0={-0.9} y1={0.02} fade={fade} />
      <Part geo={right} m={look.ground} y0={-0.9} y1={0.02} fade={fade} />
    </>
  );
};

/** a long slab to stand on: top surface at y */
export const Floor: React.FC<{y?: number; x?: number; w?: number; d?: number; m?: Mat; z?: number}> = ({y = 0, x = 0, w = 14, d = 2.6, m, z = -0.4}) => {
  const look = useLook();
  const geo = useMemo(() => roundedBox(w, 0.1, d, 0.04), [w, d]);
  return <Part geo={geo} m={m ?? look.ground} y0={y - 0.3} y1={y} position={[x, y - 0.1, z]} fade={{z0: z + 0.6, z1: z - 2.0, zmax: 0.7}} />;
};

export const Block: React.FC<{x: number; y?: number; z?: number; w: number; h: number; d?: number; m: Mat; r?: number; glow?: string; glowA?: number; sx?: number; sy?: number; gy?: number}> = ({x, y = 0, z = 0, w, h, d, m, r = 0.05, glow, glowA = 0.3, sx = 1, sy = 1, gy}) => {
  const geo = useMemo(() => roundedBox(w, h, d ?? w, Math.min(r, h / 2 - 0.001, w / 2 - 0.001)), [w, Math.round(h * 500), d, r]);
  return (
    <>
      <Part geo={geo} m={m} y0={(gy ?? y) - 0.2} y1={(gy ?? y) + Math.max(h, 0.6)} position={[x, y, z]} scale={[sx, sy, sx]} />
      {glow ? <Glow p={[x, y + 0.05, z + 0.5]} w={w * 3} h={0.9} color={glow} a={glowA} /> : null}
    </>
  );
};

/* ───────────── fish ───────────── */

const fishBody = new THREE.SphereGeometry(1, 32, 20);
const fishTail = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(-0.5, 0.15, -0.95, 0.62);
  s.quadraticCurveTo(-0.7, 0, -0.95, -0.62);
  s.quadraticCurveTo(-0.5, -0.15, 0, 0);
  const g = new THREE.ExtrudeGeometry(s, {depth: 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3});
  g.translate(0, 0, -0.04);
  return g;
})();
const fishFin = (() => {
  const s = new THREE.Shape();
  s.moveTo(-0.35, 0);
  s.quadraticCurveTo(-0.2, 0.55, 0.25, 0.1);
  s.lineTo(-0.35, 0);
  const g = new THREE.ExtrudeGeometry(s, {depth: 0.05, bevelEnabled: false});
  g.translate(0, 0, -0.025);
  return g;
})();

/** tilt: nose up in degrees; wag: tail angle in radians; deep: fade with depth like everything under water */
export const Fish: React.FC<{p: V3; s: number; dir: 1 | -1; tilt?: number; wag?: number; deep?: boolean; m?: Mat}> = ({p, s, dir, tilt = 0, wag = 0, deep = true, m}) => {
  const look = useLook();
  const mm = m ?? look.fish;
  const fade: Fade | undefined = deep ? {y0: WATER + 0.3, y1: -4.4, max: 0.9, z0: 0.6, z1: -2.2, zmax: 0.85} : undefined;
  const y0 = p[1] - 0.2 * s;
  const y1 = p[1] + 0.22 * s;
  return (
    <group position={p} rotation={[0, dir === 1 ? -0.35 : 0.35, 0]} scale={[s * dir, s, s]}>
      <group rotation={[0, 0, (tilt * Math.PI) / 180]}>
        <Part geo={fishBody} m={mm} y0={y0} y1={y1} fade={fade} scale={[0.38, 0.17, 0.1]} />
        <group position={[-0.3, 0, 0]} rotation={[0, wag, 0]}>
          <Part geo={fishTail} m={mm} y0={y0} y1={y1} fade={fade} scale={[0.26, 0.26, 0.6]} />
        </group>
        <Part geo={fishFin} m={mm} y0={y0} y1={y1} fade={fade} position={[0, 0.16, 0]} scale={[0.3, 0.26, 0.6]} />
        <Ball p={[0.2, 0.04, 0.085]} r={0.026} m={look.ground} y0={-99} y1={-98} fade={fade} />
      </group>
    </group>
  );
};

/* ───────────── props ───────────── */

/** deck chair in figure-local space: k = size, the lowest point of the sling sits at (sx, sy) */
export const Chair: React.FC<{k: number; sx: number; sy: number}> = ({k, sx, sy}) => {
  const look = useLook();
  const sling = useMemo(() => {
    const c = new THREE.SplineCurve([new THREE.Vector2(0.42, 0.44), new THREE.Vector2(0.2, 0.36), new THREE.Vector2(-0.02, 0.36), new THREE.Vector2(-0.22, 0.6), new THREE.Vector2(-0.46, 1.12)]);
    const pts = c.getPoints(40);
    const s = new THREE.Shape();
    const th = 0.022;
    const off = (i: number, kk: number) => {
      const t = c.getTangent(i / 40);
      return new THREE.Vector2(pts[i].x - t.y * th * kk, pts[i].y + t.x * th * kk);
    };
    s.moveTo(off(0, 1).x, off(0, 1).y);
    for (let i = 1; i <= 40; i++) s.lineTo(off(i, 1).x, off(i, 1).y);
    for (let i = 40; i >= 0; i--) s.lineTo(off(i, -1).x, off(i, -1).y);
    const g = new THREE.ExtrudeGeometry(s, {depth: 0.5, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 4});
    g.translate(0, 0, -0.25);
    return g;
  }, []);
  const slingM = useMemo(() => ({...look.ground, top: '#4a6aa8', bottom: '#1f3060', rimAmt: 0.3}), [look]);
  const r = 0.022;
  const legs: [V3, V3][] = [];
  for (const z of [-0.29, 0.29]) {
    legs.push([[0.46, 0.44, z], [-0.34, 0, z]]);
    legs.push([[-0.5, 1.16, z], [0.2, 0, z]]);
    legs.push([[-0.2, 0.62, z], [0.3, 0.62, z]]);
    legs.push([[0.3, 0.62, z], [0.33, 0.33, z]]);
  }
  legs.push([[0.46, 0.44, -0.29], [0.46, 0.44, 0.29]]);
  legs.push([[-0.5, 1.16, -0.29], [-0.5, 1.16, 0.29]]);
  return (
    <group position={[sx - 0.08 * k, sy - 0.36 * k, 0]} scale={k}>
      <Part geo={sling} m={slingM} y0={0.3} y1={1.2} />
      {legs.map(([a, b], i) => (
        <Limb key={i} a={a} b={b} r0={r} r1={r} m={look.prop} y0={0} y1={1.2} />
      ))}
    </group>
  );
};

const coneGeo = new THREE.ConeGeometry(0.06, 0.2, 20);
/** a spear through point p, pointing along ang (radians, in the XY plane): shaft from -back to +front */
export const Spear: React.FC<{p: V3; ang: number; back?: number; front?: number; fade?: Fade}> = ({p, ang, back = 0.3, front = 0.82, fade}) => {
  const look = useLook();
  const at = (t: number): V3 => [p[0] + Math.cos(ang) * t, p[1] + Math.sin(ang) * t, p[2]];
  return (
    <>
      <Limb a={at(-back)} b={at(front)} r0={0.016} r1={0.016} m={look.prop} y0={0} y1={2.2} fade={fade} />
      <Part geo={coneGeo} m={look.accent} y0={-1} y1={1.5} fade={fade} position={at(front + 0.07)} rotation={[0, 0, ang - Math.PI / 2]} />
    </>
  );
};

const mugGeo = new THREE.CylinderGeometry(0.05, 0.043, 0.1, 20);
export const Mug: React.FC<{p: V3}> = ({p}) => {
  const look = useLook();
  return <Part geo={mugGeo} m={look.accent} y0={p[1] - 0.3} y1={p[1] + 0.1} position={p} />;
};

/** trophy cup, base at p */
const cupGeo = (() => {
  const pts = [
    [0.0, 0], [0.11, 0], [0.11, 0.03], [0.035, 0.05], [0.028, 0.16], [0.05, 0.19], [0.13, 0.26], [0.165, 0.36], [0.17, 0.46], [0.15, 0.46], [0.14, 0.37], [0.1, 0.29], [0.0, 0.25],
  ].map(([x, y]) => new THREE.Vector2(Math.max(x, 0.0001), y));
  return new THREE.LatheGeometry(pts, 28);
})();
const handleGeo = (() => {
  const g = new THREE.TorusGeometry(0.07, 0.016, 10, 20, Math.PI * 1.1);
  g.rotateZ(-Math.PI * 0.55);
  return g;
})();
export const Trophy: React.FC<{p: V3; s?: number; glow?: number}> = ({p, s = 1, glow = 0.5}) => {
  const look = useLook();
  return (
    <group position={p} scale={s}>
      <Part geo={cupGeo} m={look.accent} y0={p[1]} y1={p[1] + 0.5 * s} />
      <Part geo={handleGeo} m={look.accent} y0={p[1]} y1={p[1] + 0.5 * s} position={[0.17, 0.36, 0]} />
      <Part geo={handleGeo} m={look.accent} y0={p[1]} y1={p[1] + 0.5 * s} position={[-0.17, 0.36, 0]} scale={[-1, 1, 1]} />
      <Glow p={[0, 0.3, 0.1]} w={1.3} h={1.3} color={look.accent.top} a={glow} />
    </group>
  );
};
