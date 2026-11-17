import {BODIES} from '../nc001-work-smart/kit3d';
import {ALPHA, N, S as SPOS, at, h, th} from './chain';

/** the hero in the domino scenes: smaller, so the giant is ~6.5 heads of him */
export const HS = 0.8;
export const B = BODIES.core;
export const K = HS * B.s;
export const HAND_R = B.ar[2]; // local units
/** yaw (dir 1) that faces along the chain */
export const FACE = -(90 - (ALPHA * 180) / Math.PI);
/** standing beside the chain so the front hand works right on its axis */
export const SIDE = -B.shZ * K;

/** pushing the giant: hands flat on its back face at local x 0.42 */
export const PUSH_X = 0.42;
export const S_PUSH = SPOS[N - 1] - th(N - 1) / 2 - (PUSH_X + HAND_R) * K;

/** on hands and knees at the smallest one: the fingertip at local x 0.6 */
export const FLICK_X = 0.6;
export const S_KNEEL = SPOS[0] - th(0) / 2 - (FLICK_X + HAND_R) * K;

export const heroAt = (s: number, side = SIDE): {x: number; z: number} => {
  const [x, z] = at(s, side);
  return {x, z};
};
export {h};
