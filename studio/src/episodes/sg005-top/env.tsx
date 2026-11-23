import React from 'react';
import {Limb, type V3} from '../nc001-work-smart/kit3d';
import {mat} from '../nc001-work-smart/looks';
import {BEAM_Y, RZ, TOPY, WALL_Z} from './plan';

/* ───────────── the gantry the ropes hang from ───────────── */

const STEEL = mat('#a6b2cc', '#3c465e', {shade: '#232a3c', rim: '#d6e2ff', rimAmt: 0.5, rimPow: 2.2, wrap: 0.6, spec: 0.6});
const GX = 3.05;
export const Gantry: React.FC = () => {
  const zp = WALL_Z - 0.4;
  const y0 = TOPY;
  const y1 = BEAM_Y + 0.08;
  const legs: [V3, V3][] = [
    [[-GX, y0, zp], [-GX, y1, zp]],
    [[GX, y0, zp], [GX, y1, zp]],
    [[-GX, y1, zp], [-GX, y1, RZ]],
    [[GX, y1, zp], [GX, y1, RZ]],
    [[-GX, BEAM_Y, RZ], [GX, BEAM_Y, RZ]],
    // braces
    [[-GX, y1 - 0.6, zp], [-GX, y1, zp + 0.35]],
    [[GX, y1 - 0.6, zp], [GX, y1, zp + 0.35]],
  ];
  return (
    <>
      {legs.map(([a, b], i) => (
        <Limb key={i} a={a} b={b} r0={i === 4 ? 0.045 : 0.05} r1={i === 4 ? 0.045 : 0.045} m={STEEL} y0={TOPY} y1={BEAM_Y} />
      ))}
    </>
  );
};
