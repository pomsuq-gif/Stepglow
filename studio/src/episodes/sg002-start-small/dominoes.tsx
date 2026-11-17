import React, {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {Glow, Part, roundedBox, useLook, useMat} from '../nc001-work-smart/kit3d';
import {mat, type Mat} from '../nc001-work-smart/looks';
import {DIR, N, ALPHA, S, at, h, th, wd} from './chain';

export const IVORY = mat('#e6e4de', '#8a93ae', {shade: '#4a5578', rim: '#dce6ff', rimAmt: 0.32, rimPow: 2.6, wrap: 0.62, emit: 0.8});
const PIP_DARK = mat('#1c2440', '#0c1124', {shade: '#20283c', rim: '#3a4a70', rimAmt: 0.2, wrap: 0.5});
const PIP_LIT = mat('#fff3c4', '#ffb02e', {shade: '#ffffff', rim: '#fff3c4', rimAmt: 0.3, wrap: 1, emit: 1.6});

/** chain axis as a rotation about y: local +x runs along the chain */
export const CHAIN_ROT = Math.PI / 2 - ALPHA;

/** pip positions in a unit square (-1..1) for a value 0..6 */
const PIPS: [number, number][][] = [
  [],
  [[0, 0]],
  [[-1, 1], [1, -1]],
  [[-1, 1], [0, 0], [1, -1]],
  [[-1, 1], [1, 1], [-1, -1], [1, -1]],
  [[-1, 1], [1, 1], [0, 0], [-1, -1], [1, -1]],
  [[-1, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [1, -1]],
];
const VALUES: [number, number][] = [[1, 2], [3, 1], [2, 4], [5, 3], [4, 4], [6, 2], [5, 5], [6, 4], [5, 6], [6, 6]];

const pipGeo = new THREE.SphereGeometry(1, 20, 14);
const barGeo = new THREE.BoxGeometry(1, 1, 1);

const Pips: React.FC<{i: number; m: Mat}> = ({i, m}) => {
  const H = h(i);
  const material = useMat(m, -1, 1);
  useEffect(() => () => material.dispose(), [material]);
  const W = wd(i);
  const T = th(i);
  const r = W * 0.085;
  const g = W * 0.27;
  const meshes: React.ReactNode[] = [];
  VALUES[i].forEach((v, half) => {
    const cy = H * (half === 0 ? 0.25 : 0.75);
    PIPS[v].forEach(([a, b], k) => {
      for (const face of [-1, 1]) meshes.push(<mesh key={`${half}-${k}-${face}`} geometry={pipGeo} material={material} position={[face * (T / 2 + r * 0.05), cy + b * g, a * g]} scale={[r * 0.35, r, r]} />);
    });
  });
  for (const face of [-1, 1]) meshes.push(<mesh key={`bar${face}`} geometry={barGeo} material={material} position={[face * (T / 2 + 0.0005), H / 2, 0]} scale={[T * 0.02 + 0.002, H * 0.012, W * 0.7]} />);
  return <>{meshes}</>;
};

/**
 * one domino, standing at chain position S[i]
 * tilt — radians toward +chain; rise — 0..1 grows out of the floor; lit — 0..1 the pips light up gold
 */
export const Domino: React.FC<{i: number; tilt: number; rise?: number; lit?: number; flash?: number}> = ({i, tilt, rise = 1, lit = 0, flash = 0}) => {
  const look = useLook();
  const H = h(i);
  const T = th(i);
  const W = wd(i);
  const geo = useMemo(() => roundedBox(T, H, W, Math.min(T, W) * 0.16, 4), [i]);
  useEffect(() => () => geo.dispose(), [geo]);
  if (rise <= 0.001) return null;
  const pv = S[i] + T / 2; // pivot: front-bottom edge
  const [px, pz] = at(pv);
  const [cx, cz] = at(S[i]);
  const m = lit > 0.5 ? PIP_LIT : PIP_DARK;
  return (
    <>
      <group position={[px, 0, pz]} rotation={[0, CHAIN_ROT, 0]}>
        <group rotation={[0, 0, -tilt]} scale={[1, rise, 1]}>
          <group position={[-T / 2, 0, 0]}>
            <Part geo={geo} m={IVORY} y0={-H * 0.15} y1={H * 1.05} local />
            <Pips i={i} m={m} />
          </group>
        </group>
      </group>
      {/* soft pool of light under it, and a glow when it lights up */}
      <Glow p={[cx, 0.005, cz]} w={W * 2.6} h={W * 2.6} color={look.bg.glow} a={0.25 * rise} flat />
      {lit > 0 ? <Glow p={[cx + DIR[0] * H * 0.5 * Math.sin(tilt), H * 0.5 * Math.cos(tilt), cz + DIR[1] * H * 0.5 * Math.sin(tilt) + W * 0.3]} w={H * 0.9} h={H * 0.9} color="#ffc65a" a={0.07 * lit} /> : null}
      {flash > 0 ? <Glow p={[cx, 0.02, cz]} w={W * 4} h={W * 4} color={look.accent2.top} a={flash} flat /> : null}
      {flash > 0 ? <Glow p={[cx, H * 0.4, cz + 0.05]} w={H * 1.0} h={H * 1.3} color={look.accent2.top} a={flash * 0.25} /> : null}
    </>
  );
};

export const allIdx = Array.from({length: N}, (_, i) => i);
