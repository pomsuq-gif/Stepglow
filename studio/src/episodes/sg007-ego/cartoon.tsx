import React from 'react';
import * as THREE from 'three';
import type {V3} from '../nc001-work-smart/kit3d';
import {mixHex} from '../nc001-work-smart/world';
import {add, HB, K3, mul, W3, type J3} from '../sg003-same-bar/rig3';

/**
 * SG007 cartoon designs for the stickman (no faces): six different builds and shadings,
 * all with an inverted-hull outline where the design has one.
 *  cel2d   — 3D that reads as 2D: flat unlit fill, thick black ink line
 *  classic — the thin classic stickman: line limbs, round head, ink line
 *  bean    — chubby gummy bean, stubby limbs, soft 3-step toon in a pastel per character
 *  rubber  — 1930s rubber hose: black body, big white gloves and shoes, coloured shorts
 *  block   — chunky toy blocks: box limbs, rounded cube head, toon colours
 *  ring    — flat white figure drawn by a thick line in the character's own colour
 */
export type Design = 'cel2d' | 'classic' | 'bean' | 'rubber' | 'block' | 'ring';

const CYL = new THREE.CylinderGeometry(1, 1, 1, 24, 1);
const SPH = new THREE.SphereGeometry(1, 32, 22);
const BOX = new THREE.BoxGeometry(1, 1, 1);
const Y = new THREE.Vector3(0, 1, 0);

const cache = new Map<string, THREE.Material>();
const K = (k: string, f: () => THREE.Material) => {
  if (!cache.has(k)) cache.set(k, f());
  return cache.get(k)!;
};
const grad = (() => {
  const d = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
const flat = (c: string) => K(`f${c}`, () => new THREE.MeshBasicMaterial({color: c}));
const toon = (c: string) => K(`t${c}`, () => new THREE.MeshToonMaterial({color: c, gradientMap: grad}));
const hull = (c: string) => K(`h${c}`, () => new THREE.MeshBasicMaterial({color: c, side: THREE.BackSide}));

type Mm = {m: THREE.Material; line?: THREE.Material; w: number};
const Seg: React.FC<{a: V3; b: V3; r: number; mm: Mm; box?: boolean}> = ({a, b, r, mm, box}) => {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const L = d.length();
  if (L < 1e-5) return null;
  const q = new THREE.Quaternion().setFromUnitVectors(Y, d.normalize());
  const p: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const g = box ? BOX : CYL;
  const s = box ? 2 : 1;
  return (
    <>
      <mesh geometry={g} material={mm.m} position={p} quaternion={q} scale={[r * s, L, r * s]} castShadow />
      {mm.line ? <mesh geometry={g} material={mm.line} position={p} quaternion={q} scale={[(r + mm.w) * s, L + (box ? 2 * mm.w : 0), (r + mm.w) * s]} /> : null}
    </>
  );
};
const Ball: React.FC<{p: V3; r: number | V3; mm: Mm; q?: THREE.Quaternion; box?: boolean}> = ({p, r, mm, q, box}) => {
  const s: V3 = typeof r === 'number' ? [r, r, r] : r;
  const g = box ? BOX : SPH;
  const k = box ? 2 : 1;
  return (
    <>
      <mesh geometry={g} material={mm.m} position={p} quaternion={q} scale={[s[0] * k, s[1] * k, s[2] * k]} castShadow />
      {mm.line ? <mesh geometry={g} material={mm.line} position={p} quaternion={q} scale={[(s[0] + mm.w) * k, (s[1] + mm.w) * k, (s[2] + mm.w) * k]} /> : null}
    </>
  );
};

/** per-character colours */
const PASTEL = ['#ff6b5e', '#ffb85c', '#7fe0b4', '#ffe066', '#b99aff', '#6cc6ff'];
const SHORTS = ['#e8262a', '#ff9a1a', '#2ec48a', '#f4c430', '#8a5ae8', '#2a8ae8'];

export const CartoonMan: React.FC<{j: J3; design: Design; idx: number; spent: number; noArm?: boolean; crown: boolean}> = ({j, design, idx, spent, noArm, crown}) => {
  const w = (p: V3) => W3(p, [0, 0, 0], K3);
  const grey = (c: string) => mixHex(c, '#8a90a0', spent * 0.65);
  const pel = w(add(j.hip[0], mul(j.side, HB.hipZ)));
  const shc = w(j.shc);
  const head = w(j.head);
  const qb = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...j.side), new THREE.Vector3(...j.up), new THREE.Vector3(...j.fwd)));
  const arms = (noArm ? [1] : [0, 1]).map((i) => [w(j.sh[i]), w(j.el[i]), w(j.hd[i])] as [V3, V3, V3]);
  const legs = [0, 1].map((i) => [w(j.hip[i]), w(j.kn[i]), w(j.ft[i])] as [V3, V3, V3]);
  const tint = PASTEL[idx];
  const ink = hull('#0a0b10');
  // proportions and materials per design
  let body: Mm;
  let hand: Mm;
  let foot: Mm;
  let R = {head: 0.2, torso: 0.08, arm: 0.045, leg: 0.05, hand: 0.055, foot: [0.06, 0.045, 0.09] as V3};
  let box = false;
  let extra: React.ReactNode = null;
  if (design === 'cel2d') {
    body = {m: flat(grey('#ffffff')), line: ink, w: 0.022};
    hand = body;
    foot = body;
    extra = <Ball p={add(w(j.chest), mul(j.fwd, R.torso * 0.95))} r={[0.035, 0.035, 0.01]} q={qb} mm={{m: flat(PASTEL[idx]), line: ink, w: 0.012}} />;
  } else if (design === 'classic') {
    R = {head: 0.19, torso: 0.032, arm: 0.026, leg: 0.03, hand: 0.03, foot: [0.034, 0.03, 0.05]};
    body = {m: flat(grey('#ffffff')), line: ink, w: 0.016};
    hand = body;
    foot = body;
  } else if (design === 'bean') {
    R = {head: 0.21, torso: 0.17, arm: 0.07, leg: 0.08, hand: 0.085, foot: [0.09, 0.07, 0.12]};
    const c = grey(tint);
    body = {m: toon(c), line: hull(mixHex(c, '#000000', 0.55)), w: 0.012};
    hand = body;
    foot = {m: toon(mixHex(c, '#000000', 0.3)), line: body.line, w: 0.012};
  } else if (design === 'rubber') {
    R = {head: 0.2, torso: 0.11, arm: 0.035, leg: 0.04, hand: 0.1, foot: [0.1, 0.07, 0.17]};
    body = {m: toon(grey('#16161c')), line: ink, w: 0.012};
    hand = {m: toon('#ffffff'), line: ink, w: 0.012};
    foot = {m: toon(grey('#ffffff')), line: ink, w: 0.012};
    extra = (
      <>
        {/* coloured shorts with two buttons */}
        <Seg a={add(pel, mul(j.up, -0.07))} b={add(pel, mul(j.up, 0.07))} r={R.torso * 1.18} mm={{m: toon(grey(SHORTS[idx])), line: ink, w: 0.012}} />
        {[-1, 1].map((s) => (
          <Ball key={s} p={add(add(pel, mul(j.fwd, R.torso * 1.2)), add(mul(j.side, s * 0.045), mul(j.up, 0.02)))} r={0.022} mm={{m: toon('#ffffff'), line: ink, w: 0.008}} />
        ))}
      </>
    );
  } else if (design === 'block') {
    R = {head: 0.17, torso: 0.13, arm: 0.06, leg: 0.07, hand: 0.07, foot: [0.075, 0.055, 0.11]};
    box = true;
    const c = grey(tint);
    body = {m: toon(c), line: ink, w: 0.012};
    hand = body;
    foot = {m: toon(mixHex(c, '#000000', 0.35)), line: ink, w: 0.012};
  } else {
    body = {m: flat(grey('#ffffff')), line: hull(grey(SHORTS[idx])), w: 0.026};
    hand = body;
    foot = body;
  }
  const footQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...j.side), new THREE.Vector3(0, 1, 0), new THREE.Vector3(j.fwd[0], 0, j.fwd[2]).normalize()));
  const torsoTop = design === 'bean' ? add(shc, mul(j.up, 0.06)) : shc;
  return (
    <>
      <Seg a={pel} b={torsoTop} r={R.torso} mm={body} box={box} />
      {!box ? <Ball p={pel} r={R.torso} mm={body} /> : null}
      {!box ? <Ball p={torsoTop} r={R.torso} mm={body} /> : null}
      {design !== 'bean' ? <Seg a={shc} b={add(shc, mul(j.up, 0.1))} r={R.arm * 0.9} mm={body} box={box} /> : null}
      <Ball p={design === 'bean' ? add(head, mul(j.up, -0.04)) : head} r={box ? [R.head, R.head * 0.95, R.head * 0.95] : R.head} q={box ? qb : undefined} mm={body} box={box} />
      {arms.map(([s, e, h], i) => (
        <React.Fragment key={`a${i}`}>
          <Seg a={s} b={e} r={R.arm} mm={body} box={box} />
          {!box ? <Ball p={e} r={R.arm} mm={body} /> : null}
          {!box ? <Ball p={s} r={R.arm} mm={body} /> : null}
          <Seg a={e} b={h} r={R.arm * 0.95} mm={body} box={box} />
          <Ball p={h} r={R.hand} mm={hand} box={box} q={box ? qb : undefined} />
          {design === 'rubber' ? <Ball p={add(h, mul(j.up, 0.06))} r={0.035} mm={hand} /> : null}
        </React.Fragment>
      ))}
      {legs.map(([h, k, f], i) => (
        <React.Fragment key={`l${i}`}>
          <Seg a={h} b={k} r={R.leg} mm={body} box={box} />
          {!box ? <Ball p={k} r={R.leg} mm={body} /> : null}
          <Seg a={k} b={f} r={R.leg * 0.95} mm={body} box={box} />
          <Ball p={add(f, [j.fwd[0] * R.foot[2] * 0.4, -0.015, j.fwd[2] * R.foot[2] * 0.4])} r={R.foot} q={footQ} mm={foot} box={box} />
        </React.Fragment>
      ))}
      {extra}
      {crown ? <Crown head={head} j={j} r={R.head} /> : null}
    </>
  );
};

const Crown: React.FC<{head: V3; j: J3; r: number}> = ({head, j, r}) => {
  const gold: Mm = {m: toon('#ffcc33'), line: hull('#0a0b10'), w: 0.008};
  const c = add(head, mul(j.up, r * 0.88));
  const rr = r * 0.55;
  const pts = Array.from({length: 5}, (_, i) => {
    const a = (i / 5) * Math.PI * 2;
    return add(c, add(mul(j.side, Math.cos(a) * rr), mul(j.fwd, Math.sin(a) * rr)));
  });
  return (
    <>
      {pts.map((p, i) => (
        <React.Fragment key={i}>
          <Seg a={p} b={pts[(i + 1) % 5]} r={0.02} mm={gold} />
          <Seg a={p} b={add(p, mul(j.up, 0.09))} r={0.016} mm={gold} />
          <Ball p={add(p, mul(j.up, 0.095))} r={0.02} mm={gold} />
        </React.Fragment>
      ))}
    </>
  );
};
