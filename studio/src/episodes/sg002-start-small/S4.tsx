import React from 'react';
import {clamp, easeInOut, lerp, poseAt, pulse, rnd, seg, ss, STAND} from '../nc001-work-smart/anim';
import {Cam, Figure, Glow, Pose, Txt, reach, solve, useLook} from '../nc001-work-smart/kit3d';
import type {Look} from '../nc001-work-smart/looks';
import {mixHex} from '../nc001-work-smart/world';
import {FLICK, LANDED, N, START, S as SPOS, at, h, th, tilts} from './chain';
import {allIdx, Domino} from './dominoes';
import {B, FACE, FLICK_X, HAND_R, HS, K, S_KNEEL, heroAt} from './hero34';
import {Mirror} from './mirror';
import {hit, hits, shake} from './grid';
import {Title} from './title';
import {S3} from './S3';
import type {Panel} from './Full';

/** scene 4 · 24.87 – 33.5 · Start Small: on hands and knees, one fingertip on the smallest domino; the wave brings down the giant */
export const S4 = {from: S3.to, to: 33.5, cut: true};

/* ── the pose on all fours: knees on the floor, one hand flat on it, the other at the domino ── */
const CRAWL0: Pose = {pelvis: [0, 0], pelvisY: 0.4, lean: 75, head: [0.15, -0.1], handF: [0, 0], elbowF: -1, handB: [0, 0], elbowB: -1, footF: [-0.46, 0], footB: [-0.5, 0]};
const H0L = h(0) / K; // domino height, local
const TOUCH_Y = H0L * 0.86;
const crawl = (fx: number): Pose => ({...CRAWL0, handF: reach(CRAWL0, B, fx, TOUCH_Y), handB: reach(CRAWL0, B, 0.36, HAND_R)});
const WATCH: Pose = {...STAND, lean: -6, head: [0.0, 0.22], footF: [0.1, 0], footB: [-0.12, 0]};
const KNEEL_UP: Pose = {pelvis: [0, 0], pelvisY: 0.42, lean: 4, head: [0.05, 0.12], handF: [0.15, -0.8], elbowF: -1, handB: [0.05, -0.82], elbowB: -1, footF: [-0.46, 0], footB: [-0.5, 0]};

/** the fingertip rides the top of the tipping domino for a moment, then lets go */
const fingerX = (t: number, tilt0: number) => {
  const contact = FLICK_X; // hand centre when touching the back face (domino upright)
  if (t < FLICK) return contact - 0.08 * (1 - ss(t, FLICK - 0.6, FLICK - 0.3));
  const follow = (h(0) * 0.86 * Math.sin(tilt0)) / K;
  return contact + Math.min(follow, 0.09) - 0.25 * ss(t, FLICK + 0.15, FLICK + 0.55);
};

/** the falling front, as a continuous domino index */
const front = (t: number) => {
  if (t < START[0]) return 0;
  for (let i = 0; i < N - 1; i++) if (t < START[i + 1]) return i + (t - START[i]) / (START[i + 1] - START[i]);
  return N - 1 + clamp((t - START[N - 1]) / (LANDED - START[N - 1]));
};
const smoothFront = (t: number) => [0, 0.1, 0.2, 0.3, 0.4, 0.5].reduce((s, d) => s + front(t - d), 0) / 6;
const sAt = (f: number) => {
  const i = Math.min(N - 2, Math.floor(f));
  return lerp(SPOS[i], SPOS[i + 1], f - i);
};

export const cam4 = (t: number): Cam => {
  const f = smoothFront(t);
  const hf = h(0) * Math.pow(1.6, f);
  const track = ss(t, FLICK + 0.25, FLICK + 1.4);
  const [mx, mz] = at(-0.18, -0.08);
  // close and low on the floor: him on all fours, the smallest dominoes, the chain growing away behind them
  const macro: Cam = {viewH: lerp(1.75, 1.45, ss(t, S4.from, FLICK)), cx: mx, cz: mz, cy: 0.32, pitch: 6, yaw: 42, fov: 32};
  // ride along the wave, low and close, growing with the dominoes
  const [rx, rz] = at(sAt(f) + hf * 0.4, 0.1);
  const ride: Cam = {viewH: 1.2 + 2.2 * hf, cx: rx, cz: rz, cy: 0.25 + hf * 0.5, pitch: 6 + f * 0.8, yaw: lerp(42, 16, f / (N - 1)), fov: 32};
  // after the giant lands: crane up over the whole chain
  const [ex, ez] = at(4.6);
  const end: Cam = {viewH: 13, cx: ex, cz: ez, cy: 0.3, pitch: 62, yaw: -18, fov: 30};
  const e = easeInOut(seg(t, LANDED - 0.45, 33.0));
  const mix = (a: Cam, b: Cam, q: number): Cam => ({
    viewH: lerp(a.viewH, b.viewH, q),
    cx: lerp(a.cx ?? 0, b.cx ?? 0, q),
    cz: lerp(a.cz ?? 0, b.cz ?? 0, q),
    cy: lerp(a.cy, b.cy, q),
    pitch: lerp(a.pitch ?? 0, b.pitch ?? 0, q),
    yaw: lerp(a.yaw ?? 0, b.yaw ?? 0, q),
    fov: lerp(a.fov ?? 16, b.fov ?? 16, q),
  });
  const c = mix(mix(macro, ride, track), end, e);
  // each big domino lands with a punch; the giant shakes the camera
  const punch = 0.05 * hit(t, FLICK, 6) + 0.035 * hits(t, START.slice(5), 5) + 0.06 * hit(t, LANDED, 3);
  const [sx, sy] = shake(t, 0.12 * hit(t, LANDED, 3.5));
  return {...c, viewH: c.viewH * (1 - punch), cx: (c.cx ?? 0) + sx, cy: c.cy + sy};
};

const World4: React.FC<{t: number}> = ({t}) => {
  const look = useLook();
  const tl = tilts(t);
  const {x, z} = heroAt(S_KNEEL);
  const fx = fingerX(t, tl[0]);
  const pose = poseAt(t, [
    [S4.from, {...STAND, lean: 10, head: [0.22, -0.42], footF: [0.1, 0], footB: [-0.1, 0]}],
    [S4.from + 0.45, crawl(FLICK_X - 0.08)],
    [FLICK + 0.55, crawl(FLICK_X - 0.08)],
    [FLICK + 1.0, KNEEL_UP],
    [FLICK + 1.6, WATCH],
  ]);
  // while on all fours the front hand follows the fingertip exactly (blended in and out, no jumps)
  const w = ss(t, S4.from + 0.3, S4.from + 0.5) * (1 - ss(t, FLICK + 0.45, FLICK + 0.65));
  const fh = crawl(fx).handF;
  const p2: Pose = {...pose, handF: [lerp(pose.handF[0], fh[0], w), lerp(pose.handF[1], fh[1], w)]};
  void solve;

  const lit = allIdx.map((i) => ss(t, START[i] + 0.04, START[i] + 0.22));
  const litN = lit.reduce((a, v) => a + v, 0) / N;
  const tint = mixHex('#38e8ff', '#ffd66b', litN);
  const energy = 0.7 + 0.3 * litN + pulse(t, FLICK, FLICK + 0.08, FLICK + 0.6) * 0.4;
  const boom = pulse(t, LANDED - 0.04, LANDED + 0.08, LANDED + 1.3);
  const [gx, gz] = at(SPOS[N - 1] + h(N - 1) * 0.55);
  const [tx, tz] = at(SPOS[0] - th(0) / 2, 0);
  return (
    <>
      <Mirror amt={0.55} center={at(3)} poolR={10} pool="#1d2b4c" far={34} />
      <Glow p={[gx, 4, gz - 3]} w={16} h={14} color={look.bg.glow} a={0.3} />
      {allIdx.map((i) => (
        <Domino key={i} i={i} tilt={tl[i]} lit={lit[i]} />
      ))}
      {/* the touch */}
      <Glow p={[tx, h(0) * 0.86, tz + 0.01]} w={0.12} h={0.12} color="#9ff0ff" a={pulse(t, FLICK - 0.3, FLICK, FLICK + 0.4) * 0.9} />
      {boom > 0 ? (
        <>
          <Glow p={[gx, 0.02, gz]} w={3 + seg(t, LANDED, LANDED + 1.3) * 18} h={2 + seg(t, LANDED, LANDED + 1.3) * 12} color="#ffd66b" a={boom * 0.5} flat />
          {Array.from({length: 26}, (_, i) => {
            const a = rnd(i + 3) * Math.PI * 2;
            const r = (1 + rnd(i) * 5) * seg(t, LANDED, LANDED + 1.3);
            return <Glow key={i} p={[gx + Math.cos(a) * r, 0.1 + rnd(i + 9) * 1.4 * seg(t, LANDED, LANDED + 1), gz + Math.sin(a) * r * 0.6]} w={0.14} h={0.14} color="#ffe2a0" a={boom * 0.8} />;
          })}
        </>
      ) : null}
      <Figure pose={p2} cast={look.b} x={x} z={z} s={HS} dir={1} yaw={FACE} energy={energy} tint={tint} />
    </>
  );
};

export const S4F: Panel = {cam: cam4, World: World4};

export const Over4: React.FC<{t: number; look: Look}> = ({t}) => (
  <Title x={540} y={300} t={t} at={S4.from - 1} out={33.0}>
    Start Small
  </Title>
);
