import React from 'react';
import {back, lerp, mixPose, poseAt, pulse, rnd, seg, ss, STAND, easeInOut} from '../nc001-work-smart/anim';
import {Cam, Figure, Glow, Pose, Txt, reach, useLook} from '../nc001-work-smart/kit3d';
import type {Look} from '../nc001-work-smart/looks';
import {mixHex} from '../nc001-work-smart/world';
import {N, S as SPOS, at, h, th} from './chain';
import {allIdx, Domino} from './dominoes';
import {beat} from './grid';
import {B, FACE, HS, K, PUSH_X, S_KNEEL, S_PUSH, heroAt} from './hero34';
import {Mirror} from './mirror';
import type {Panel} from './Full';

/**
 * scene 3 · 18.22 – 24.87 · Dream Big. A: he pushes the giant, it doesn't move, he gives up and looks up at it.
 * Hard cut on the beat to B: from behind him at the start — the chain grows out of the floor from the giant toward his feet.
 */
export const S3 = {from: beat(20), to: 24.87};
const CUT = beat(26); // 22.02
const GIVE_UP = beat(24.5); // 21.07
/** each domino rises in turn, big to small, on a fast pulse */
export const RISE_AT = allIdx.map((i) => (i === N - 1 ? -1 : beat(26.45 + (N - 2 - i) * 0.42)));

const GI = N - 1;

export const cam3 = (t: number): Cam => {
  if (t < CUT) {
    const k = easeInOut(seg(t, S3.from, GIVE_UP));
    const up = easeInOut(seg(t, GIVE_UP, CUT));
    const [x, z] = at(S_PUSH + 1.4, -0.6);
    return {viewH: lerp(10.6, 9.6, k) + 0.6 * up, cx: x, cz: z, cy: lerp(4.2, 3.9, k) + 0.9 * up, pitch: lerp(-3, -2, k) - 3 * up, yaw: lerp(-18, -10, k), fov: 32};
  }
  const k = easeInOut(seg(t, CUT, S3.to + 0.3));
  const [x, z] = at(lerp(3.3, 2.5, k), 0.2);
  return {viewH: lerp(10, 8.4, k), cx: x, cz: z, cy: lerp(2.7, 2.1, k), pitch: lerp(15, 17, k), yaw: lerp(-31, -25, k), fov: 32};
};

const PUSH0: Pose = {pelvis: [-0.34, 0.9], lean: 36, head: [0.12, 0.05], handF: [0, 0], elbowF: -1, handB: [0, 0], elbowB: -1, footF: [0.0, 0], footB: [-0.55, 0]};
const LOOKUP: Pose = {pelvis: [0, 0.985], lean: -14, head: [-0.12, 0.38], handF: [0.1, -0.86], elbowF: -1, handB: [-0.08, -0.86], elbowB: -1, footF: [0.09, 0], footB: [-0.12, 0]};
const DOWN: Pose = {...STAND, lean: 10, head: [0.22, -0.42], footF: [0.1, 0], footB: [-0.1, 0]};

const WorldA: React.FC<{t: number}> = ({t}) => {
  const look = useLook();
  // hands flat on the giant at local x = PUSH_X, both pushes on the beat
  const beats = (t - S3.from) / 0.6338;
  const push = Math.pow(Math.sin(beats * Math.PI), 2);
  const hY = 1.05 + 0.04 * push;
  const P1: Pose = {...PUSH0, handF: reach(PUSH0, B, PUSH_X, hY), handB: reach(PUSH0, B, PUSH_X, hY - 0.06)};
  const P2b: Pose = {...PUSH0, pelvis: [-0.4, 0.86], lean: 42, footB: [-0.62, 0]};
  const P2: Pose = {...P2b, handF: reach(P2b, B, PUSH_X, hY), handB: reach(P2b, B, PUSH_X, hY - 0.06)};
  const step = ss(t, GIVE_UP, GIVE_UP + 0.45) * 0.32;
  const pose = t < GIVE_UP ? mixPose(P1, P2, push) : poseAt(t, [[GIVE_UP, P1], [GIVE_UP + 0.4, LOOKUP], [CUT - 0.25, LOOKUP], [CUT, {...LOOKUP, head: [-0.05, 0.3]}]]);
  const {x, z} = heroAt(S_PUSH - step);
  const strain = t < GIVE_UP ? push : 0;
  const tint = mixHex('#ff8a2e', '#ff3b3b', 0.4 + 0.6 * strain);
  const [gx, gz] = at(SPOS[GI]);
  const [hx, hz] = at(SPOS[GI] - th(GI) / 2 - 0.02, -0.14);
  return (
    <>
      <Mirror amt={0.55} center={[gx, gz]} poolR={9} pool="#1d2b4c" far={34} />
      {/* a spotlight on the dream */}
      <Glow p={[gx, 9, gz]} w={7} h={16} color="#9fb8f0" a={0.1} mode="beam" />
      <Glow p={[gx, 4, gz - 3]} w={16} h={14} color={look.bg.glow} a={0.32} />
      <Domino i={GI} tilt={0.0015 * strain} />
      {/* strain where the hands meet the giant */}
      {t < GIVE_UP ? <Glow p={[hx, hY * K, hz]} w={0.35} h={0.35} color="#ff6a5a" a={0.55 * strain} /> : null}
      {t < GIVE_UP
        ? [0, 1, 2].map((i) => {
            const ph = (beats * 0.5 + i / 3) % 1;
            const [fx, fz] = at(S_PUSH - 0.5 * K, -0.14 + (i - 1) * 0.05);
            return <Glow key={i} p={[fx - ph * 0.15, 0.03 + ph * 0.12, fz]} w={0.08 + ph * 0.2} h={0.06 + ph * 0.12} color="#8fa6d8" a={(1 - ph) * 0.35} />;
          })
        : null}
      <Figure pose={pose} cast={look.a} x={x} z={z} s={HS} dir={1} yaw={FACE} energy={0.55 + 0.4 * strain} tint={tint} />
    </>
  );
};

const WorldB: React.FC<{t: number}> = ({t}) => {
  const look = useLook();
  const [gx, gz] = at(SPOS[GI]);
  const {x, z} = heroAt(S_KNEEL);
  // he watches the chain come toward him, then looks down at the smallest one
  const look2 = ss(t, RISE_AT[2], RISE_AT[0] + 0.3);
  const pose = mixPose({...STAND, lean: -6, head: [-0.05, 0.22]}, DOWN, look2);
  const tint = mixHex('#ff3b3b', '#38e8ff', ss(t, CUT, S3.to));
  return (
    <>
      <Mirror amt={0.55} center={at(3)} poolR={10} pool="#1d2b4c" far={34} />
      <Glow p={[gx, 9, gz]} w={7} h={16} color="#9fb8f0" a={0.08} mode="beam" />
      <Glow p={[gx, 4, gz - 3]} w={16} h={14} color={look.bg.glow} a={0.3} />
      {allIdx.map((i) => {
        const r = RISE_AT[i];
        const rise = i === GI ? 1 : back(seg(t, r, r + 0.3), 1.3);
        const flash = i === GI ? 0 : pulse(t, r, r + 0.06, r + 0.55);
        return <Domino key={i} i={i} tilt={0} rise={rise} flash={flash * 0.7} />;
      })}
      {/* a spark runs ahead along the floor to where the next one will rise */}
      {allIdx.slice(0, GI).map((i) => {
        const r = RISE_AT[i];
        const u = seg(t, r - 0.27, r);
        if (u <= 0 || u >= 1) return null;
        const [ax, az] = at(lerp(SPOS[i + 1], SPOS[i], u));
        return <Glow key={i} p={[ax, 0.02, az]} w={0.35 * h(i) + 0.15} h={0.35 * h(i) + 0.15} color={look.accent2.top} a={0.8} flat />;
      })}
      <Figure pose={pose} cast={look.a} x={x} z={z} s={HS} dir={1} yaw={FACE} energy={0.4 + 0.4 * ss(t, CUT, S3.to)} tint={tint} />
      {void rnd}
    </>
  );
};

const World3: React.FC<{t: number}> = ({t}) => (t < CUT ? <WorldA t={t} /> : <WorldB t={t} />);

export const S3F: Panel = {cam: cam3, World: World3};

export const Over3: React.FC<{t: number; look: Look}> = ({t, look}) => {
  const o1 = ss(t, S3.from + 0.1, S3.from + 0.5) * (1 - ss(t, CUT - 0.3, CUT - 0.05));
  const o2 = ss(t, RISE_AT[0] + 0.1, RISE_AT[0] + 0.45);
  return (
    <>
      <Txt look={look} x={540} y={300} o={o1} glow={0.5}>
        Dream Big
      </Txt>
      <Txt look={look} x={540} y={300} o={o2} glow={0.5}>
        Start Small
      </Txt>
    </>
  );
};
