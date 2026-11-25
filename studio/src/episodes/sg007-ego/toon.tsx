import React from 'react';
import * as THREE from 'three';
import type {V3} from '../nc001-work-smart/kit3d';
import {Glow} from '../nc001-work-smart/kit3d';
import {mixHex} from '../nc001-work-smart/world';
import {add, HB, K3, mul, W3, type J3} from '../sg003-same-bar/rig3';
import type {Sty} from './styles';

/**
 * SG007 style figures: one stickman drawn as capsules (cylinder + ball joints) with a toon / matte / marble shader,
 * and an inverted-hull outline (back faces of a slightly fatter copy) for the inked looks.
 */
const CYL = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true);
const SPH = new THREE.SphereGeometry(1, 28, 20);

const VERT = /* glsl */ `varying vec3 vN; varying vec3 vW;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
const FRAG = /* glsl */ `uniform vec3 uCol, uShade, uRim, uSpecC; uniform float uBands, uRimAmt, uSpec, uEmit; varying vec3 vN; varying vec3 vW;
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW); vec3 L = normalize(vec3(-0.45, 1.0, 0.65));
  float d = dot(N, L) * 0.5 + 0.5;
  if (uBands > 0.5) { float b1 = smoothstep(0.47, 0.5, d); float b2 = smoothstep(0.24, 0.27, d); d = 0.18 + 0.32 * b2 + 0.5 * b1; }
  else d = d * d * (3.0 - 2.0 * d);
  vec3 col = mix(uShade, uCol, d);
  float fr = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.6);
  col += uRim * fr * uRimAmt;
  vec3 H = normalize(L + V);
  col += uSpecC * pow(max(dot(N, H), 0.0), 60.0) * uSpec;
  gl_FragColor = vec4(col * uEmit, 1.0);
}`;

type M = {col: string; shade: string; rim: string; rimAmt: number; bands: boolean; spec: number; specC?: string; emit?: number};
const mats = new Map<string, THREE.ShaderMaterial>();
const shaderMat = (m: M) => {
  const key = JSON.stringify(m);
  let s = mats.get(key);
  if (!s) {
    s = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uCol: {value: new THREE.Color(m.col)},
        uShade: {value: new THREE.Color(m.shade)},
        uRim: {value: new THREE.Color(m.rim)},
        uSpecC: {value: new THREE.Color(m.specC ?? '#ffffff')},
        uBands: {value: m.bands ? 1 : 0},
        uRimAmt: {value: m.rimAmt},
        uSpec: {value: m.spec},
        uEmit: {value: m.emit ?? 1},
      },
    });
    mats.set(key, s);
  }
  return s;
};
const hulls = new Map<string, THREE.MeshBasicMaterial>();
const hullMat = (c: string) => {
  let h = hulls.get(c);
  if (!h) {
    h = new THREE.MeshBasicMaterial({color: new THREE.Color(c), side: THREE.BackSide});
    hulls.set(c, h);
  }
  return h;
};

const Y = new THREE.Vector3(0, 1, 0);
const Seg: React.FC<{a: V3; b: V3; r: number; m: THREE.Material}> = ({a, b, r, m}) => {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const L = d.length();
  if (L < 1e-5) return null;
  const q = new THREE.Quaternion().setFromUnitVectors(Y, d.clone().normalize());
  return <mesh geometry={CYL} material={m} position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} quaternion={q} scale={[r, L, r]} />;
};
const Dot: React.FC<{p: V3; r: number; m: THREE.Material; s?: V3}> = ({p, r, m, s = [1, 1, 1]}) => <mesh geometry={SPH} material={m} position={p} scale={[r * s[0], r * s[1], r * s[2]]} />;

/** proportions of the drawn figure (world units): slimmer limbs than the porcelain one, a round head */
const R = {head: HB.headR * K3 * 0.95, torso: 0.105, arm: 0.048, leg: 0.06};

export const ToonFig: React.FC<{j: J3; sty: Sty; tint: string; idx: number; energy: number; aura: number; spent: number; noArm?: boolean; color?: string}> = ({j, sty, tint, energy, aura, spent, noArm, color}) => {
  const w = (p: V3) => W3(p, [0, 0, 0], K3);
  const P = {head: w(j.head), shc: w(j.shc), pel: w(add(j.hip[0], mul(j.side, HB.hipZ))), sh: j.sh.map(w), el: j.el.map(w), hd: j.hd.map(w), hip: j.hip.map(w), kn: j.kn.map(w), ft: j.ft.map(w), chest: w(j.chest)};
  const fig = sty.fig;
  const base = color ?? sty.body[0];
  const dull = (c: string) => mixHex(c, '#6c7488', spent * 0.7);
  let body: THREE.Material;
  let joint: THREE.Material;
  if (fig === 'neon') {
    body = shaderMat({col: sty.body[0], shade: sty.body[1], rim: tint, rimAmt: 0.9, bands: false, spec: 0.3, specC: tint});
    joint = body;
  } else if (fig === 'clay') {
    const c = dull(base);
    body = shaderMat({col: c, shade: mixHex(c, '#3a2418', 0.45), rim: '#fff4e6', rimAmt: 0.18, bands: false, spec: 0.05});
    joint = body;
  } else if (fig === 'marble') {
    body = shaderMat({col: dull(sty.body[0]), shade: sty.body[1], rim: '#fff1d6', rimAmt: 0.25, bands: false, spec: 0.6, specC: '#fff6e8'});
    joint = shaderMat({col: '#ffe08a', shade: '#8a5410', rim: '#fff4c8', rimAmt: 0.6, bands: false, spec: 1.4, specC: '#fff8e0', emit: 1.05});
  } else {
    body = shaderMat({col: dull(sty.body[0]), shade: sty.body[1], rim: '#ffffff', rimAmt: 0.0, bands: true, spec: 0});
    joint = body;
  }
  const outline = sty.lineW > 0;
  const lineC = fig === 'neon' ? mixHex(tint, '#ffffff', 0.15) : aura > 0.25 && fig === 'toon' ? mixHex(sty.line, tint, Math.min(1, aura)) : sty.line;
  const hull = outline ? hullMat(fig === 'neon' ? lineC : mixHex(lineC, lineC, 0)) : null;
  const lw = sty.lineW * (fig === 'neon' ? 1 + 0.6 * Math.min(1, aura) : 1);
  const segs: [V3, V3, number][] = [
    [P.pel, P.shc, R.torso],
    [P.hip[0], P.kn[0], R.leg],
    [P.kn[0], P.ft[0], R.leg * 0.92],
    [P.hip[1], P.kn[1], R.leg],
    [P.kn[1], P.ft[1], R.leg * 0.92],
    ...(noArm ? [] : ([[P.sh[0], P.el[0], R.arm], [P.el[0], P.hd[0], R.arm * 0.92]] as [V3, V3, number][])),
    [P.sh[1], P.el[1], R.arm],
    [P.el[1], P.hd[1], R.arm * 0.92],
  ];
  const balls: [V3, number, boolean][] = [
    [P.pel, R.torso, false],
    [P.shc, R.torso, false],
    ...P.kn.map((p) => [p, R.leg * 1.02, true] as [V3, number, boolean]),
    ...P.ft.map((p) => [p, R.leg * 0.95, false] as [V3, number, boolean]),
    ...(noArm ? [P.el[1]] : P.el).map((p) => [p, R.arm * 1.05, true] as [V3, number, boolean]),
    ...(noArm ? [P.hd[1]] : P.hd).map((p) => [p, R.arm * 1.25, false] as [V3, number, boolean]),
    ...(noArm ? [P.sh[1]] : P.sh).map((p) => [p, R.arm * 1.05, true] as [V3, number, boolean]),
    ...P.hip.map((p) => [p, R.leg * 1.02, false] as [V3, number, boolean]),
  ];
  const coreP = add(P.chest, mul(j.fwd, R.torso * 0.95));
  const coreC = fig === 'clay' ? '#ffffff' : tint;
  return (
    <>
      {segs.map(([a, b, r], i) => (
        <React.Fragment key={`s${i}`}>
          <Seg a={a} b={b} r={r} m={body} />
          {hull ? <Seg a={a} b={b} r={r + lw} m={hull} /> : null}
        </React.Fragment>
      ))}
      {balls.map(([p, r, gold], i) => (
        <React.Fragment key={`b${i}`}>
          <Dot p={p} r={fig === 'marble' && gold ? r * 1.25 : r} m={gold ? joint : body} />
          {hull ? <Dot p={p} r={r + lw} m={hull} /> : null}
        </React.Fragment>
      ))}
      <Dot p={P.head} r={R.head} m={body} />
      {hull ? <Dot p={P.head} r={R.head + lw * 1.1} m={hull} /> : null}
      {/* the chest light: a lit dot on the chest and its glow */}
      {fig !== 'clay' ? <Dot p={coreP} r={0.045 + 0.01 * energy} m={shaderMat({col: mixHex(tint, '#ffffff', 0.35), shade: tint, rim: '#ffffff', rimAmt: 0.5, bands: false, spec: 0, emit: 1.5})} /> : null}
      {fig !== 'clay' ? <Glow p={coreP} w={0.55 + 0.25 * energy} h={0.55 + 0.25 * energy} color={coreC} a={(fig === 'neon' ? 0.5 : 0.35) * energy * (1 - spent * 0.8)} /> : null}
    </>
  );
};
