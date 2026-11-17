import React from 'react';
import {back, easeInOut, gait, lerp, mixPose, poseAt, pulse, seg, ss, STAND} from '../nc001-work-smart/anim';
import {Cam, Figure, Glow, Pose, Txt, useLook} from '../nc001-work-smart/kit3d';
import type {Look} from '../nc001-work-smart/looks';
import {Floor, mixHex} from '../nc001-work-smart/world';
import {N, S as SPOS, at, h, th} from './chain';
import {allIdx, Domino} from './dominoes';
import {beat} from './grid';

/** scene 3 · 18.22 – 24.87 · Dream Big: the giant won't move; walking back, the chain grows out of the floor */
export const S3 = {from: beat(20), to: 24.87};

const GIVE_UP = beat(24.3); // 20.94
const WALK0 = 21.55;
const WALK1 = 24.15;
const HS = 1; // hero scale

const GI = N - 1;
const PUSH_S = SPOS[GI] - th(GI) / 2 - 0.42; // where the hero stands to push the giant
const END_S = -0.42; // next to the smallest one

const heroS = (t: number) => (t < WALK0 ? PUSH_S - 0.18 * ss(t, GIVE_UP, GIVE_UP + 0.4) : lerp(PUSH_S - 0.18, END_S, easeInOut(seg(t, WALK0, WALK1))));

/** when the walker passes each domino, it grows out of the floor behind him */
export const APPEAR: number[] = allIdx.map((i) => {
  if (i === GI) return -1;
  const target = SPOS[i] + 0.25;
  let lo = WALK0;
  let hi = WALK1;
  for (let k = 0; k < 30; k++) {
    const m = (lo + hi) / 2;
    if (heroS(m) > target) lo = m;
    else hi = m;
  }
  return lo;
});

export const cam3 = (t: number): Cam => {
  const k = easeInOut(seg(t, 21.0, 24.4));
  const [gx, gz] = at(SPOS[GI] - 1.2);
  const [mx, mz] = at(3.0);
  return {
    viewH: lerp(12, 9.5, k) - 0.5 * ss(t, S3.from, 21),
    cx: lerp(gx, mx, k),
    cz: lerp(gz, mz, k),
    cy: lerp(4.3, 2.3, k),
    pitch: lerp(-6, 15, k),
    yaw: lerp(2, -12, k),
    fov: lerp(34, 30, k),
  };
};

const PUSH: Pose = {pelvis: [-0.32, 0.9], lean: 36, head: [0.12, 0.05], handF: [0.96, 0.22], elbowF: -1, handB: [0.92, 0.12], elbowB: -1, footF: [0.05, 0], footB: [-0.55, 0]};
const PUSH2: Pose = {...PUSH, pelvis: [-0.38, 0.86], lean: 42, footB: [-0.62, 0], handF: [0.98, 0.18]};
const LOOKUP: Pose = {pelvis: [0, 0.985], lean: -12, head: [-0.1, 0.35], handF: [0.1, -0.86], elbowF: -1, handB: [-0.08, -0.86], elbowB: -1, footF: [0.09, 0], footB: [-0.09, 0]};
const HUNCH: Pose = {...STAND, lean: 8, head: [0.15, -0.25]};

export const World3: React.FC<{t: number}> = ({t}) => {
  const look = useLook();
  const s = heroS(t);
  const [hx, hz] = at(s);
  const [gx, gz] = at(SPOS[GI]);
  const walking = t >= WALK0 && t < WALK1;
  const facingBack = t >= WALK0 - 0.25;
  const strain = pulse(t, S3.from, S3.from + 0.3, GIVE_UP + 0.1);
  const pushes = Math.sin(((t - S3.from) / 0.6338) * Math.PI) ** 2;
  let pose: Pose;
  if (t < GIVE_UP) pose = mixPose(PUSH, PUSH2, pushes);
  else if (t < WALK0) pose = poseAt(t, [[GIVE_UP, PUSH], [GIVE_UP + 0.35, LOOKUP], [WALK0, LOOKUP]]);
  else if (walking) pose = mixPose(gait((t - WALK0) * 2.4, {stride: 0.5, lift: 0.22, lean: 12, arm: 0.5, crouch: 0.93}), HUNCH, ss(t, WALK1 - 0.3, WALK1));
  else pose = poseAt(t, [[WALK1, HUNCH], [WALK1 + 0.4, {...HUNCH, head: [0.2, -0.45], lean: 14}]]);
  const yaw = facingBack ? lerp(128, -52, ss(t, WALK1 - 0.15, WALK1 + 0.6)) : -52;
  // red while straining against the giant, cooling to blue on the way back
  const tint = t < GIVE_UP ? mixHex('#ff8a2e', '#ff3b3b', 0.5 + 0.5 * pushes) : mixHex('#ff3b3b', '#38e8ff', ss(t, WALK0, WALK1));
  const energy = t < GIVE_UP ? 0.55 + 0.4 * pushes * strain : lerp(0.3, 0.8, ss(t, WALK0, WALK1));

  return (
    <>
      <Floor y={0} w={80} d={80} z={-20} />
      <Glow p={[gx, 4.2, gz - 2]} w={16} h={14} color={look.bg.glow} a={0.35} />
      {allIdx.map((i) => {
        const ap = APPEAR[i];
        const rise = i === GI ? 1 : back(seg(t, ap, ap + 0.32), 1.4);
        const flash = i === GI ? 0 : pulse(t, ap, ap + 0.08, ap + 0.6) * 0.8;
        // the giant shudders a little with every push, and doesn't move
        const tilt = i === GI && t < GIVE_UP ? pushes * strain * 0.004 : 0;
        return <Domino key={i} i={i} tilt={tilt} rise={rise} flash={flash} />;
      })}
      {/* strain: red sparks where the hands meet the giant */}
      {t < GIVE_UP
        ? [0, 1, 2].map((k) => {
            const [x, z] = at(SPOS[GI] - th(GI) / 2 - 0.02, 0.1 - k * 0.12);
            return <Glow key={k} p={[x, 1.15 + k * 0.06, z]} w={0.25} h={0.25} color="#ff5a5a" a={0.6 * pushes * strain} />;
          })
        : null}
      <Figure pose={pose} cast={look.a} x={hx} z={hz} dir={1} yaw={yaw} s={HS} energy={energy} tint={tint} />
      {void h}
    </>
  );
};

export const Over3: React.FC<{t: number; look: Look; cam: Cam}> = ({t, look}) => {
  const o1 = ss(t, S3.from + 0.1, S3.from + 0.55) * (1 - ss(t, 23.9, 24.3));
  const o2 = ss(t, 24.35, 24.75);
  return (
    <>
      <Txt look={look} x={540} y={300} o={o1}>
        Dream Big
      </Txt>
      <Txt look={look} x={540} y={300} o={o2}>
        Start Small
      </Txt>
    </>
  );
};
