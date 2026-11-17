import type {Pose, P2} from './kit3d';

/** music grid of the reference track: the drop is beat 0 */
export const BEAT = 0.6325;
export const DROP = 14.51;
export const beat = (k: number) => DROP + k * BEAT;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** 0→1 between a and b, clamped */
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const ss = (t: number, a: number, b: number) => {
  const k = seg(t, a, b);
  return k * k * (3 - 2 * k);
};
export const easeOut = (k: number) => 1 - Math.pow(1 - clamp(k), 3);
export const easeIn = (k: number) => Math.pow(clamp(k), 3);
export const easeInOut = (k: number) => {
  const c = clamp(k);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};
/** overshoot and settle */
export const back = (k: number, s = 1.7) => {
  const c = clamp(k) - 1;
  return 1 + c * c * ((s + 1) * c + s);
};
/** damped bounce that starts at 1 and dies out: for landings and pops */
export const wobble = (t: number, freq = 9, decay = 6) => (t < 0 ? 0 : Math.cos(t * freq * Math.PI * 2 * 0.16) * Math.exp(-t * decay));
/** up-and-back pulse: 0 at a, 1 at the peak, 0 at b */
export const pulse = (t: number, a: number, peak: number, b: number) => (t <= a || t >= b ? 0 : t < peak ? ss(t, a, peak) : 1 - ss(t, peak, b));
export const fract = (x: number) => x - Math.floor(x);
export const rnd = (i: number) => fract(Math.sin(i * 127.1 + 311.7) * 43758.5453);

const m2 = (a: P2, b: P2, k: number): P2 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
export const mixPose = (a: Pose, b: Pose, k: number): Pose => {
  const c = clamp(k);
  const pick = c < 0.5 ? a : b;
  return {
    pelvis: m2(a.pelvis, b.pelvis, c),
    pelvisY: a.pelvisY !== undefined && b.pelvisY !== undefined ? lerp(a.pelvisY, b.pelvisY, c) : pick.pelvisY,
    lean: lerp(a.lean, b.lean, c),
    head: m2(a.head ?? [0, 0], b.head ?? [0, 0], c),
    handF: m2(a.handF, b.handF, c),
    handB: m2(a.handB, b.handB, c),
    footF: m2(a.footF, b.footF, c),
    footB: m2(a.footB, b.footB, c),
    elbowF: pick.elbowF,
    elbowB: pick.elbowB,
    kneeF: pick.kneeF,
    kneeB: pick.kneeB,
  };
};

/** chain of poses on a timeline: keys = [time, pose], eased between neighbours */
export const poseAt = (t: number, keys: [number, Pose][], ease: (k: number) => number = easeInOut): Pose => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [ta, pa] = keys[i];
    const [tb, pb] = keys[i + 1];
    if (t <= tb) return mixPose(pa, pb, ease((t - ta) / (tb - ta)));
  }
  return keys[keys.length - 1][1];
};

export const STAND: Pose = {pelvis: [0, 0.985], lean: 2, handF: [0.1, -0.86], elbowF: -1, handB: [-0.08, -0.86], elbowB: -1, footF: [0.09, 0], footB: [-0.09, 0]};

/** walk / run in place: phase in cycles, stride in leg lengths */
export const gait = (phase: number, o: {stride?: number; lift?: number; lean?: number; bob?: number; arm?: number; armY?: number; crouch?: number} = {}): Pose => {
  const {stride = 0.42, lift = 0.16, lean = 6, bob = 0.02, arm = 0.34, armY = -0.72, crouch = 0.955} = o;
  const foot = (p: number): P2 => {
    const f = fract(p);
    if (f < 0.55) return [lerp(stride, -stride, f / 0.55), 0]; // stance: the foot slides back under the body
    const k = (f - 0.55) / 0.45; // swing: forward through the air
    return [lerp(-stride, stride, k * k * (3 - 2 * k)), Math.sin(k * Math.PI) * lift];
  };
  const sw = Math.sin(phase * Math.PI * 2);
  return {
    pelvis: [0, crouch + Math.abs(Math.cos(phase * Math.PI * 2)) * bob],
    lean,
    handF: [-sw * arm, armY + Math.abs(sw) * 0.06],
    handB: [sw * arm, armY + Math.abs(sw) * 0.06],
    elbowF: -1,
    elbowB: -1,
    footF: foot(phase),
    footB: foot(phase + 0.5),
    head: [0.05, 0],
  };
};
