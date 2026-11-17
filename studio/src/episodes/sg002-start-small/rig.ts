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

/** world point → figure-local (x forward, y up, z side), the inverse of toWorld */
export const toLocal = (w: V3, f: {x: number; y?: number; z?: number; dir: 1 | -1; yaw: number; s?: number}, b: Body): V3 => {
  const k = (f.s ?? 1) * b.s;
  const r = ((f.dir === 1 ? -f.yaw : f.yaw) * Math.PI) / 180;
  const dx = w[0] - f.x;
  const dz = w[2] - (f.z ?? 0);
  const lx = dx * Math.cos(r) - dz * Math.sin(r);
  const lz = dx * Math.sin(r) + dz * Math.cos(r);
  return [lx / (k * f.dir), (w[1] - (f.y ?? 0)) / k, lz / k];
};

/** yaw (dir 1) that puts world point w into the plane of a hand (local z = side), solved numerically near yaw0 */
export const yawFor = (w: V3, side: number, f: {x: number; z?: number; s?: number}, b: Body, yaw0: number): number => {
  const g = (y: number) => toLocal(w, {...f, dir: 1, yaw: y}, b)[2] - side;
  let lo = yaw0 - 70;
  let hi = yaw0 + 70;
  const glo = g(lo);
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (Math.sign(g(m)) === Math.sign(glo)) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
};
