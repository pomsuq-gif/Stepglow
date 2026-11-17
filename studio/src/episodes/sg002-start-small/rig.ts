import type {Body, P2, Pose, V3} from '../nc001-work-smart/kit3d';

/** figure-local point (x forward, y up, z to the side) → world, for props that leave the hand */
export const toWorld = (p: P2, lz: number, f: {x: number; y?: number; z?: number; dir: 1 | -1; yaw: number; s?: number}, b: Body): V3 => {
  const k = (f.s ?? 1) * b.s;
  const r = (((f.dir === 1 ? -f.yaw : f.yaw) * Math.PI) / 180) as number;
  const lx = k * f.dir * p[0];
  const lzz = k * lz;
  return [f.x + lx * Math.cos(r) + lzz * Math.sin(r), (f.y ?? 0) + k * p[1], (f.z ?? 0) - lx * Math.sin(r) + lzz * Math.cos(r)];
};

/** pelvis height for sitting on something of height y (figure-local, before scale) */
export const sitPose = (b: Body, seat: number, o: Partial<Pose> = {}): Pose => ({
  pelvis: [0, 0],
  pelvisY: seat + b.lr[0] * 0.9,
  lean: 6,
  head: [0.05, 0],
  handF: [0.62, -0.42],
  elbowF: -1,
  handB: [0.55, -0.48],
  elbowB: -1,
  footF: [0.5, 0],
  footB: [0.38, 0],
  ...o,
});
