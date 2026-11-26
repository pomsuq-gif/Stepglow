import {clamp, easeInOut, lerp} from '../nc001-work-smart/anim';
import type {Cam, V3} from '../nc001-work-smart/kit3d';
import {add, K3, mul, W3} from '../sg003-same-bar/rig3';
import {hit, K, SECONDS, shake} from './grid';
import {CAST, tw, WALL} from './plan';
import {clasp, PIN, solveR} from './rig';

/**
 * SG007 v4 — directed camera. Every beat of the story gets its own framing (wide, medium, close, insert, low hero angles),
 * moving with the characters. Shots blend into each other (0.4 s) except where a hard cut hits harder:
 * the wins, the comeback, the lights going out, the snap, the hit.
 */
type C = {viewH: number; cx: number; cy: number; cz: number; pitch: number; yaw: number; fov: number; roll: number};
const mixC = (a: C, b: C, k: number): C => ({
  viewH: lerp(a.viewH, b.viewH, k),
  cx: lerp(a.cx, b.cx, k),
  cy: lerp(a.cy, b.cy, k),
  cz: lerp(a.cz, b.cz, k),
  pitch: lerp(a.pitch, b.pitch, k),
  yaw: lerp(a.yaw, b.yaw, k),
  fov: lerp(a.fov, b.fov, k),
  roll: lerp(a.roll, b.roll, k),
});
type O = {viewH: number; pitch?: number; yaw?: number; fov?: number; roll?: number};
const aim = (p: V3, o: O): C => ({viewH: o.viewH, cx: p[0], cy: p[1], cz: p[2], pitch: o.pitch ?? 6, yaw: o.yaw ?? 0, fov: o.fov ?? 36, roll: o.roll ?? 0});

/* where things are (world) */
const J = (i: number, t: number) => solveR(CAST[i](t).rig);
const W = (p: V3) => W3(p, [0, 0, 0], K3);
const chest = (i: number, t: number) => W(J(i, t).chest);
const head = (i: number, t: number) => W(J(i, t).head);
const table = (i: number, y = 1.0): V3 => [tw(i)[0], y, tw(i)[2]];
const fist = (i: number): V3 => {
  const c = clasp(PIN);
  return [tw(i)[0] + c[0] * K3, c[1] * K3, tw(i)[2] + c[2] * K3];
};
const mid = (a: V3, b: V3, k = 0.5): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const yawTo = (from: V3, to: V3) => (Math.atan2(to[0] - from[0], to[2] - from[2]) * 180) / Math.PI;
/** a smoothed target (average of the last 0.4 s) so tracking shots glide */
const glide = (f: (t: number) => V3, t: number): V3 => {
  let s: V3 = [0, 0, 0];
  let n = 0;
  for (let k = 0; k < 8; k++) {
    const w = 8 - k;
    s = add(s, mul(f(Math.max(0, t - k * 0.05)), w));
    n += w;
  }
  return mul(s, 1 / n);
};

/** where Ego's crown comes to rest (same throw as in real.tsx BlockFx) */
const crownRest = (): V3 => {
  const h0 = W(J(0, K.slam + 0.05).head);
  const v: V3 = [-1.2, 2.4, 0.8];
  const tl = (v[1] + Math.sqrt(v[1] * v[1] + 2 * 9.8 * (h0[1] + 0.1))) / 9.8;
  return [h0[0] + v[0] * tl + 0.4 * 0.45, 0.04, h0[2] + v[2] * tl + 0.6 * 0.45];
};
let crownCache: V3 | null = null;
const crown = () => (crownCache ??= crownRest());

type Shot = {at: number; cut?: boolean; c: (t: number, k: number) => C};
const B = K;
const SHOTS: Shot[] = [
  // 0 · the hook: low and close on Ego striding in, crown first; the camera arcs round as he passes
  {at: 0, c: (t, k) => aim(add(glide((tt) => chest(0, tt), t), [0, 0.15, 0]), {viewH: lerp(2.6, 3.2, k), pitch: -9, yaw: lerp(-150, -118, easeInOut(k)), fov: 42, roll: lerp(-6, -2, k)})},
  // 1 · table 1, three-quarter from Motivation's side, pushing in as he burns out
  {at: 1.55, cut: true, c: (t, k) => aim(table(0, 1.0), {viewH: lerp(3.6, 2.9, easeInOut(k)), pitch: 7, yaw: lerp(34, 24, k), fov: 36})},
  // 1b · the win: a hard insert on the fists going down
  {at: B.w1 - 0.06, cut: true, c: (t, k) => aim(add(fist(0), [0, 0.12, 0]), {viewH: lerp(1.75, 1.95, k), pitch: 14, yaw: 8, fov: 30})},
  // 2 · "Next." — low angle on Ego, Motivation flat behind him
  {at: B.w1 + 0.42, cut: true, c: (t, k) => aim(add(chest(0, t), [0.2, 0.1, 0]), {viewH: lerp(2.7, 2.5, k), pitch: -11, yaw: lerp(-28, -20, k), fov: 38, roll: 3})},
  // 2b · he walks on: a side dolly that keeps pace with him
  {at: 4.95, c: (t) => aim(add(glide((tt) => chest(0, tt), t), [0, -0.05, 0]), {viewH: 3.2, pitch: 5, yaw: -78, fov: 38})},
  // 3 · Laziness: high and flat (nothing is happening), slow drift
  {at: 6.25, c: (t, k) => aim(table(1, 0.95), {viewH: lerp(3.6, 3.2, k), pitch: 32, yaw: lerp(-26, -14, k), fov: 36})},
  // 3b · he just flops: close on him going down
  {at: B.w2 + 0.1, cut: true, c: (t, k) => aim(add(chest(2, t), [0, 0.15, 0]), {viewH: lerp(2.0, 2.3, k), pitch: 10, yaw: 48, fov: 34})},
  // 4 · "Too easy." — low over the sleeper at Ego
  {at: B.w2 + 0.75, c: (t, k) => aim(mid(chest(0, t), chest(2, t), 0.5), {viewH: lerp(4.2, 4.4, k), pitch: -3, yaw: 30, fov: 38})},
  // 4b · walking into table 3: behind Ego, Talent waiting at the end of the shot
  {at: 9.35, c: (t) => aim(mid(glide((tt) => chest(0, tt), t), chest(3, t), 0.45), {viewH: 3.6, pitch: 7, yaw: -10, fov: 36})},
  // 5 · Talent: square profile — an even fight
  {at: B.t3 + 0.25, c: (t, k) => aim(table(2, 1.02), {viewH: lerp(3.3, 3.0, k), pitch: 3, yaw: 0, fov: 34})},
  // 6 · "Ego was losing…" — close, low, tilted, slowly closing in on his strain
  {at: B.losing, cut: true, c: (t, k) => aim(mid(chest(0, t), fist(2), 0.35), {viewH: lerp(2.9, 2.5, easeInOut(k)), pitch: -6, yaw: -36, fov: 34, roll: lerp(5, 8, k)})},
  // 7 · the comeback: hard cut to a low hero wide, arms up
  {at: B.w3 + 0.05, cut: true, c: (t, k) => aim(add(chest(0, t), [0.15, 0.35, 0]), {viewH: lerp(3.3, 3.6, k), pitch: -15, yaw: lerp(-16, -30, k), fov: 40, roll: -4})},
  // 8 · lights out: over Ego's shoulder, the two spots ahead of him
  {at: B.dark, cut: true, c: (t, k) => {
    const tgt: V3 = [tw(3)[0] - 0.4, 1.1, tw(3)[2] - 1.2];
    const e = chest(0, 16.4);
    return aim(tgt, {viewH: lerp(5.2, 4.6, k), pitch: 6, yaw: yawTo(tgt, e) + 6, fov: 40});
  }},
  // 9 · Obsession: three-quarter from his side, low, arcing
  {at: B.t4, cut: true, c: (t, k) => aim(table(3, 1.05), {viewH: lerp(3.3, 2.9, k), pitch: 2, yaw: lerp(42, 30, k), fov: 36})},
  // 10 · "never stops" — close on Obsession grinding
  {at: B.never, c: (t, k) => aim(mid(chest(4, t), fist(3), 0.35), {viewH: lerp(2.9, 2.6, k), pitch: 2, yaw: 52, fov: 34, roll: -7})},
  // 11 · "won't lose" — close on Ego, the other side
  {at: B.wont, cut: true, c: (t, k) => aim(mid(chest(0, t), fist(3), 0.35), {viewH: lerp(2.8, 2.5, k), pitch: -4, yaw: -44, fov: 34, roll: 8})},
  // 12 · the snap: medium, a touch high, shards flying
  {at: B.broke - 0.04, cut: true, c: (t, k) => aim(table(3, 0.95), {viewH: lerp(3.2, 3.6, k), pitch: 14, yaw: 14, fov: 36})},
  // 13 · "Is that all?" — low on Ego, Obsession on his knees in front
  {at: B.s4, c: (t, k) => aim(mid(chest(0, t), chest(4, t), 0.35), {viewH: lerp(3.0, 3.2, k), pitch: -8, yaw: 66, fov: 38})},
  // 14 · the last table: Discipline in the middle of the frame, Ego walking in
  {at: 25.6, c: (t, k) => aim(add(chest(5, t), [-0.2, 0.05, 0]), {viewH: lerp(3.4, 2.9, k), pitch: 4, yaw: -8, fov: 32})},
  // 15 · "so sure" — medium on Ego's side, his fire filling the frame
  {at: B.sure, cut: true, c: (t, k) => aim(table(4, 1.05), {viewH: lerp(3.0, 2.7, k), pitch: 4, yaw: lerp(-40, -34, k), fov: 36})},
  // 16 · "had seen it all" — a slow push into Discipline: calm
  {at: B.seen, c: (t, k) => aim(add(head(5, t), [0, -0.15, 0]), {viewH: lerp(2.8, 2.0, easeInOut(k)), pitch: 2, yaw: lerp(44, 38, k), fov: 32})},
  // 17 · the hit: side on, the flight across the floor
  {at: B.slam, cut: true, c: () => aim([(WALL.x * K3 + tw(4)[0]) / 2 - 0.2, 1.45, tw(4)[2]], {viewH: 5.6, pitch: 6, yaw: 4, fov: 32})},
  // 18 · at the board: slumped, stars
  {at: B.blink, cut: true, c: (t, k) => aim([WALL.x * K3 + 0.55, 0.7, tw(4)[2]], {viewH: lerp(3.2, 2.6, k), pitch: 11, yaw: lerp(40, 32, k), fov: 30})},
  // 19 · the crane down the row: the beaten on the floor, Discipline standing at the end in his light
  {at: B.all, cut: true, c: (t, k) => aim([tw(2)[0] + 0.2, 0.8, tw(2)[2]], {viewH: lerp(7.0, 7.8, easeInOut(k)), pitch: lerp(12, 17, k), yaw: lerp(-8, -4, k), fov: 40})},
  // 20 · the end: low hero on Discipline, from the front, wide lens
  {at: B.end - 0.1, cut: true, c: (t, k) => {
    void crown;
    const d = chest(5, t);
    return aim(add(d, [0, -0.25, 0]), {viewH: lerp(3.2, 2.9, k), pitch: -6, yaw: lerp(-45, -38, k), fov: 55});
  }},
];

const BLEND = 0.4;
export const cam = (t: number): Cam => {
  let i = SHOTS.length - 1;
  while (i > 0 && t < SHOTS[i].at) i--;
  const s = SHOTS[i];
  const end = i + 1 < SHOTS.length ? SHOTS[i + 1].at : SECONDS;
  const k = clamp((t - s.at) / (end - s.at));
  let c = s.c(t, k);
  // a soft blend from the shot before (no blend into a cut)
  if (!s.cut && i > 0 && t < s.at + BLEND) {
    const p = SHOTS[i - 1];
    const pend = s.at;
    const pk = clamp((t - p.at) / (pend - p.at));
    c = mixC(p.c(t, pk), c, easeInOut((t - s.at) / BLEND));
  }
  // punches on the wins and the hit
  const wins = [K.w1, K.w2, K.w3, K.broke];
  const punch = wins.reduce((m, w) => m + 0.07 * hit(t, w + 0.02, 6), 0) + 0.12 * hit(t, K.slam + 0.36, 5);
  c = {...c, viewH: c.viewH * (1 - punch)};
  const [sx, sy] = shake(t, 0.01 * hit(t, K.slam + 0.36, 8) + 0.006 * hit(t, K.broke, 8));
  return {...c, cx: c.cx + sx, cy: c.cy + sy};
};
