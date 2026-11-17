import React from 'react';
import {clamp, easeInOut, lerp, poseAt, pulse, rnd, seg, ss, STAND} from '../nc001-work-smart/anim';
import {BODIES, Cam, Figure, Glow, Pose, Txt, reach, useLook} from '../nc001-work-smart/kit3d';
import type {Look} from '../nc001-work-smart/looks';
import {Floor, mixHex} from '../nc001-work-smart/world';
import {FLICK, LANDED, N, START, S as SPOS, at, h, th, tilts} from './chain';
import {allIdx, Domino} from './dominoes';
import {S3} from './S3';

/** scene 4 · 24.87 – 33.5 · Start Small: one finger on the smallest domino, and the chain brings down the giant */
export const S4 = {from: S3.to, to: 33.5, cut: true};

const HERO_S = -0.42;
const HS = 1;

/** the falling front, as a continuous domino index */
const front = (t: number) => {
  if (t < START[0]) return 0;
  for (let i = 0; i < N - 1; i++) if (t < START[i + 1]) return i + (t - START[i]) / (START[i + 1] - START[i]);
  return N - 1 + clamp((t - START[N - 1]) / (LANDED - START[N - 1]));
};
const smoothFront = (t: number) => [0, 0.12, 0.24, 0.36, 0.48].reduce((s, d) => s + front(t - d), 0) / 5;
const sAt = (f: number) => {
  const i = Math.min(N - 2, Math.floor(f));
  return lerp(SPOS[i], SPOS[i + 1], f - i);
};

export const cam4 = (t: number): Cam => {
  const f = smoothFront(t);
  const hf = h(0) * Math.pow(1.6, f);
  // close on the hand, then ride along the wave, then rise over the whole fallen chain
  const track = ss(t, FLICK + 0.15, FLICK + 1.2);
  const s = lerp(HERO_S + 0.4, sAt(f) + hf * 0.55, track);
  const [x, z] = at(s);
  const close: Cam = {viewH: 2.9, cx: x, cz: z, cy: 0.72, pitch: 10, yaw: 48, fov: 26};
  const ride: Cam = {viewH: 1.7 + 3.0 * hf, cx: x, cz: z, cy: 0.3 + hf * 0.55, pitch: 12 + f * 1.2, yaw: lerp(35, 8, f / (N - 1)), fov: 28};
  const k = track;
  const [ex, ez] = at(5.4);
  const end: Cam = {viewH: 13.5, cx: ex, cz: ez, cy: 0.2, pitch: 58, yaw: -12, fov: 30};
  const e = easeInOut(seg(t, LANDED - 0.35, 33.4));
  const mixC = (a: Cam, b: Cam, q: number): Cam => ({
    viewH: lerp(a.viewH, b.viewH, q),
    cx: lerp(a.cx ?? 0, b.cx ?? 0, q),
    cz: lerp(a.cz ?? 0, b.cz ?? 0, q),
    cy: lerp(a.cy, b.cy, q),
    pitch: lerp(a.pitch ?? 0, b.pitch ?? 0, q),
    yaw: lerp(a.yaw ?? 0, b.yaw ?? 0, q),
    fov: lerp(a.fov ?? 16, b.fov ?? 16, q),
  });
  return mixC(mixC(close, ride, k), end, e);
};

export const World4: React.FC<{t: number}> = ({t}) => {
  const look = useLook();
  const b = BODIES[look.kind];
  const k = HS * b.s;
  const [hx, hz] = at(HERO_S);
  const tl = tilts(t);

  // kneel, reach out one finger, flick, stand up and watch
  const top0 = (SPOS[0] - th(0) / 2 - HERO_S) / k;
  const KNEEL: Pose = {pelvis: [-0.12, 0.5], lean: 34, head: [0.18, -0.25], handF: [0.6, -0.45], elbowF: -1, handB: [0.25, -0.7], elbowB: -1, footF: [0.3, 0], footB: [-0.55, 0.0], kneeB: 1};
  const touch = reach(KNEEL, b, top0 - 0.01, h(0) / k + 0.01);
  const REACH: Pose = {...KNEEL, handF: touch};
  const FLICKED: Pose = {...KNEEL, handF: reach(KNEEL, b, top0 + 0.06, h(0) / k + 0.02)};
  const WATCH: Pose = {...STAND, lean: -4, head: [0.05, 0.12]};
  const pose = poseAt(t, [
    [S4.from, {...STAND, lean: 8, head: [0.2, -0.45]}],
    [S4.from + 0.45, KNEEL],
    [FLICK - 0.28, REACH],
    [FLICK, REACH],
    [FLICK + 0.1, FLICKED],
    [FLICK + 0.55, FLICKED],
    [FLICK + 1.1, WATCH],
  ]);

  const lit = allIdx.map((i) => ss(t, START[i] + 0.04, START[i] + 0.22));
  const litCount = lit.reduce((a, v) => a + v, 0);
  const tint = mixHex('#38e8ff', '#ffd66b', clamp(litCount / N));
  const energy = 0.7 + 0.3 * clamp(litCount / N) + pulse(t, FLICK, FLICK + 0.1, FLICK + 0.6) * 0.3;
  const boom = pulse(t, LANDED - 0.05, LANDED + 0.1, LANDED + 1.4);
  const [gx, gz] = at(SPOS[N - 1] + h(N - 1) * 0.6);
  const [fx, fz] = at(SPOS[0] - th(0) / 2 - 0.01);

  return (
    <>
      <Floor y={0} w={80} d={80} z={-20} />
      {allIdx.map((i) => (
        <Domino key={i} i={i} tilt={tl[i]} lit={lit[i]} />
      ))}
      {/* a spark where the finger touches */}
      <Glow p={[fx, h(0), fz]} w={0.18} h={0.18} color="#7fe7ff" a={pulse(t, FLICK - 0.05, FLICK + 0.03, FLICK + 0.45)} />
      {/* the giant lands: a ring of light and dust across the floor */}
      {boom > 0 ? (
        <>
          <Glow p={[gx, 0.03, gz]} w={4 + seg(t, LANDED, LANDED + 1.4) * 16} h={2 + seg(t, LANDED, LANDED + 1.4) * 9} color="#ffd66b" a={boom * 0.55} flat />
          {Array.from({length: 22}, (_, i) => {
            const a = rnd(i + 3) * Math.PI * 2;
            const r = (1.5 + rnd(i) * 5) * seg(t, LANDED, LANDED + 1.4);
            return <Glow key={i} p={[gx + Math.cos(a) * r, 0.15 + rnd(i + 9) * 1.2 * seg(t, LANDED, LANDED + 1), gz + Math.sin(a) * r * 0.6]} w={0.18} h={0.18} color="#ffe2a0" a={boom * 0.8} />;
          })}
        </>
      ) : null}
      <Figure pose={pose} cast={look.b} x={hx} z={hz} dir={1} yaw={-52 + 18 * ss(t, FLICK + 0.5, FLICK + 1.2)} s={HS} energy={energy} tint={tint} />
      {litCount > 0.5 ? <Glow p={[hx, 0.9, hz + 0.2]} w={1.6} h={1.6} color={tint} a={0.18 * clamp(litCount / N)} /> : null}
    </>
  );
};

export const Over4: React.FC<{t: number; look: Look; cam: Cam}> = ({t, look}) => {
  const o = 1 - ss(t, 33.0, 33.4);
  return (
    <Txt look={look} x={540} y={300} o={o}>
      Start Small
    </Txt>
  );
};

