import React from 'react';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type {V3} from '../nc001-work-smart/kit3d';
import {mixHex} from '../nc001-work-smart/world';
import {add, cross, HB, K3, mul, norm, sub, W3, type J3} from '../sg003-same-bar/rig3';

/**
 * SG007 — the chosen look: toy-block stickmen. Every part is a bevelled block oriented with the body
 * (not just along the bone), soft 3-step toon light, a thin ink line, the torso in the character's colour,
 * limbs a shade deeper, gloves and boots darker still. No lights on the body.
 */
const RB = new RoundedBoxGeometry(1, 1, 1, 4, 0.14);
const grad = (() => {
  const d = new Uint8Array([96, 96, 96, 255, 176, 176, 176, 255, 236, 236, 236, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
const cache = new Map<string, THREE.Material>();
const C = (k: string, f: () => THREE.Material) => {
  if (!cache.has(k)) cache.set(k, f());
  return cache.get(k)!;
};
const toon = (c: string) => C(`t${c}`, () => new THREE.MeshToonMaterial({color: c, gradientMap: grad}));
const ink = (c: string) => C(`i${c}`, () => new THREE.MeshBasicMaterial({color: c, side: THREE.BackSide}));

const LINE = 0.011;

/** a block between a and b, its x axis along `side` (so limbs don't spin), size w (across) × d (depth) */
const Blk: React.FC<{a: V3; b: V3; w: number; d: number; side: V3; m: THREE.Material; line?: string; ext?: number}> = ({a, b, w, d, side, m, line = '#14100e', ext = 0}) => {
  const ax = sub(b, a);
  const L = Math.hypot(...ax);
  if (L < 1e-5) return null;
  const y = norm(ax);
  let x = sub(side, mul(y, side[0] * y[0] + side[1] * y[1] + side[2] * y[2]));
  if (Math.hypot(...x) < 1e-4) x = Math.abs(y[1]) < 0.9 ? norm(cross([0, 1, 0], y)) : [1, 0, 0];
  x = norm(x);
  const z = cross(x, y);
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...x), new THREE.Vector3(...y), new THREE.Vector3(...z)));
  const p: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const len = L + ext;
  return (
    <>
      <mesh geometry={RB} material={m} position={p} quaternion={q} scale={[w, len, d]} castShadow receiveShadow />
      <mesh geometry={RB} material={ink(line)} position={p} quaternion={q} scale={[w + 2 * LINE, len + 2 * LINE, d + 2 * LINE]} />
    </>
  );
};
/** a block at p with its own basis */
const Cube: React.FC<{p: V3; s: V3; basis: [V3, V3, V3]; m: THREE.Material; line?: string}> = ({p, s, basis, m, line = '#14100e'}) => {
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...basis[0]), new THREE.Vector3(...basis[1]), new THREE.Vector3(...basis[2])));
  return (
    <>
      <mesh geometry={RB} material={m} position={p} quaternion={q} scale={s} castShadow receiveShadow />
      <mesh geometry={RB} material={ink(line)} position={p} quaternion={q} scale={[s[0] + 2 * LINE, s[1] + 2 * LINE, s[2] + 2 * LINE]} />
    </>
  );
};

/** each character's toy colour */
export const BLOCK = ['#ef4b3f', '#f59a2e', '#3fc495', '#f2c531', '#9a6cf0', '#3ea2f0'];

export const BlockMan: React.FC<{j: J3; idx: number; spent: number; energy: number; noArm?: boolean; crown: boolean; light: string}> = ({j, idx, spent, energy, noArm, crown, light}) => {
  const w = (p: V3) => W3(p, [0, 0, 0], K3);
  const g = (c: string) => mixHex(c, '#7d8494', spent * 0.7);
  const base = g(BLOCK[idx]);
  const mTorso = toon(base);
  const mHead = toon(mixHex(base, '#ffffff', 0.03));
  const mLimb = toon(mixHex(base, '#1a1020', 0.14));
  const mGlove = toon(mixHex(base, '#1a1020', 0.42));
  const mBoot = toon(g('#2a2630'));
  const side = j.side;
  const up = j.up;
  const fwd = j.fwd;
  const pel = w(add(j.hip[0], mul(side, HB.hipZ)));
  const shc = w(j.shc);
  const head = w(add(j.head, mul(up, 0.02)));
  const arms = (noArm ? [1] : [0, 1]).map((i) => [w(j.sh[i]), w(j.el[i]), w(j.hd[i])] as [V3, V3, V3]);
  const legs = [0, 1].map((i) => [w(j.hip[i]), w(j.kn[i]), w(j.ft[i])] as [V3, V3, V3]);
  const flatF = norm([fwd[0], 0, fwd[2]]);
  const flatS = norm(cross([0, 1, 0], flatF));
  return (
    <>
      {/* torso: a wide block from the hips to the shoulders, with a belt */}
      <Blk a={add(pel, mul(up, -0.05))} b={add(shc, mul(up, 0.05))} w={0.31} d={0.18} side={side} m={mTorso} />
      <Blk a={add(pel, mul(up, -0.045))} b={add(pel, mul(up, 0.035))} w={0.325} d={0.195} side={side} m={toon(g('#2a2630'))} />
      {/* neck and head */}
      <Blk a={shc} b={add(shc, mul(up, 0.09))} w={0.08} d={0.08} side={side} m={mLimb} />
      <Cube p={head} s={[0.29, 0.28, 0.27]} basis={[side, up, fwd]} m={mHead} />
      {arms.map(([s, el, h], i) => (
        <React.Fragment key={`a${i}`}>
          <Blk a={s} b={el} w={0.095} d={0.095} side={side} m={mLimb} ext={0.05} />
          <Blk a={el} b={h} w={0.085} d={0.085} side={side} m={mLimb} ext={0.03} />
          <Cube p={h} s={[0.12, 0.12, 0.12]} basis={[side, norm(sub(h, el)), cross(side, norm(sub(h, el)))].map((v) => norm(v)) as [V3, V3, V3]} m={mGlove} />
        </React.Fragment>
      ))}
      {legs.map(([h, k, f], i) => (
        <React.Fragment key={`l${i}`}>
          <Blk a={h} b={k} w={0.12} d={0.12} side={side} m={mLimb} ext={0.05} />
          <Blk a={k} b={add(f, [0, 0.03, 0])} w={0.11} d={0.11} side={side} m={mLimb} ext={0.03} />
          <Cube p={add(f, add(mul(flatF, 0.05), [0, -0.02, 0]))} s={[0.13, 0.09, 0.22]} basis={[flatS, [0, 1, 0], flatF]} m={mBoot} />
        </React.Fragment>
      ))}
      {crown ? <Crown head={head} side={side} up={up} fwd={fwd} /> : null}
      {void light}
      {void energy}
    </>
  );
};

/** a blocky gold crown with five prongs */
const Crown: React.FC<{head: V3; side: V3; up: V3; fwd: V3}> = ({head, side, up, fwd}) => {
  const gold = C('gold', () => new THREE.MeshStandardMaterial({color: '#ffc93a', metalness: 0.9, roughness: 0.3, emissive: '#3a2400'}));
  const c = add(head, mul(up, 0.165));
  return (
    <>
      <Cube p={c} s={[0.24, 0.06, 0.23]} basis={[side, up, fwd]} m={gold} line="#3a2400" />
      {[-1, 0, 1].map((k) => (
        <React.Fragment key={k}>
          <Cube p={add(add(c, mul(side, k * 0.095)), mul(up, 0.07 + (k === 0 ? 0.02 : 0)))} s={[0.05, 0.08 + (k === 0 ? 0.04 : 0), 0.05]} basis={[side, up, fwd]} m={gold} line="#3a2400" />
          <Cube p={add(add(c, mul(fwd, k * 0.095)), mul(up, 0.07))} s={[0.05, 0.08, 0.05]} basis={[side, up, fwd]} m={gold} line="#3a2400" />
        </React.Fragment>
      ))}
    </>
  );
};
