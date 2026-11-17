import React from 'react';
import {clamp, easeOut, lerp, poseAt, pulse, seg, ss, STAND} from '../nc001-work-smart/anim';
import {BODIES, Cam, Figure, Glow, Label, Limb, Pose, solve, useLook, V3} from '../nc001-work-smart/kit3d';
import type {Look} from '../nc001-work-smart/looks';
import {Floor, mixHex} from '../nc001-work-smart/world';
import {Campfire, charred, chill, warm, WOOD} from './fire';
import {beat} from './grid';
import {sitPose, toWorld} from './rig';

/** scene 1 · 0 – 9.34 · Intensity / Consistency: one big log vs a stick every two beats */
export const S1 = {from: 0, to: beat(6)};

export const cam1 = (t: number): Cam => ({viewH: lerp(5.9, 5.5, ss(t, 0, 9.3)), cy: 1.2, pitch: 7});

const S = 0.95;
const LX = -1.02; // the intense one
const RX = 1.08; // the consistent one
const LF = -0.4; // fires
const RF = 0.46;
const SEAT = 0.24;
const YAW = 18;

const FLARE = 1.27; // the big log lands
const OUT = beat(0); // the blaze is gone when the bass comes in

/* ── the intense one ── */
const LOG_LOCAL: [number, number] = [0.42, 0.075];

const keysL = (b: typeof BODIES.core): [number, Pose][] => {
  const seat = SEAT / (S * b.s);
  const SIT = sitPose(b, seat, {handF: [0.74, -0.18], handB: [0.68, -0.24]});
  const LIFT: Pose = {pelvis: [0.02, 0.76], lean: 38, head: [0.1, -0.1], handF: [0.48, -0.94], elbowF: -1, handB: [0.42, -0.94], elbowB: -1, footF: [0.2, 0], footB: [-0.22, 0]};
  const OVER: Pose = {pelvis: [-0.04, 0.985], lean: -12, head: [0, 0.1], handF: [0.12, 0.97], elbowF: -1, handB: [0.02, 0.97], elbowB: -1, footF: [0.2, 0], footB: [-0.25, 0]};
  const THROW: Pose = {pelvis: [0.14, 0.9], lean: 24, head: [0.1, 0], handF: [0.9, 0.12], elbowF: -1, handB: [0.84, 0.06], elbowB: -1, footF: [0.48, 0], footB: [-0.28, 0.02]};
  const JOY: Pose = {pelvis: [0.06, 0.985], lean: -5, head: [0, 0.15], handF: [0.42, 0.88], elbowF: -1, handB: [-0.3, 0.86], elbowB: -1, footF: [0.2, 0], footB: [-0.15, 0]};
  const HOP: Pose = {...JOY, pelvis: [0.06, 1.12], footF: [0.18, 0.16], footB: [-0.14, 0.12]};
  const SHIELD: Pose = {pelvis: [-0.1, 0.95], lean: -15, head: [-0.25, -0.15], handF: [0.36, 0.6], elbowF: -1, handB: [-0.28, -0.74], elbowB: -1, footF: [0.2, 0], footB: [-0.4, 0]};
  const SHIELD2: Pose = {...SHIELD, lean: -19, handF: [0.3, 0.66], head: [-0.3, -0.1]};
  const LOOK: Pose = {pelvis: [0, 0.97], lean: 12, head: [0.2, -0.3], handF: [0.2, -0.82], elbowF: -1, handB: [0.1, -0.84], elbowB: -1, footF: [0.12, 0], footB: [-0.12, 0]};
  const COLD: Pose = {pelvis: [0, 0.96], lean: 9, head: [0.12, -0.28], handF: [0.36, -0.26], elbowF: -1, handB: [0.4, -0.2], elbowB: -1, footF: [0.08, 0], footB: [-0.08, 0]};
  const SCRATCH: Pose = {...COLD, lean: 4, head: [0.05, -0.05], handF: [0.12, 0.72], handB: [0.4, -0.22]};
  return [
    [0, SIT],
    [0.3, SIT],
    [0.52, STAND],
    [0.72, LIFT],
    [0.98, OVER],
    [1.13, THROW],
    [1.3, THROW],
    [1.5, HOP],
    [1.68, JOY],
    [1.9, HOP],
    [2.08, JOY],
    [2.4, SHIELD],
    [3.3, SHIELD2],
    [4.3, SHIELD],
    [4.85, LOOK],
    [OUT + 0.3, LOOK],
    [OUT + 0.9, COLD],
    [7.3, COLD],
    [7.65, SCRATCH],
    [8.4, SCRATCH],
    [8.8, COLD],
  ];
};

/* ── the consistent one: a stick lands on every other beat ── */
const TOSSES = [-6, -4, -2, 0, 2, 4].map(beat);
const keysR = (b: typeof BODIES.core, t: number): Pose => {
  const seat = SEAT / (S * b.s);
  const SIT = sitPose(b, seat, {handF: [0.74, -0.18], handB: [0.68, -0.24]});
  const REACH = sitPose(b, seat, {lean: 32, head: [0.15, -0.2], handF: [0.28, -0.98], handB: [0.66, -0.3]});
  const BRING = sitPose(b, seat, {lean: 4, handF: [0.55, 0.18], handB: [0.66, -0.26]});
  const TOSS = sitPose(b, seat, {lean: 16, handF: [0.95, -0.12], handB: [0.68, -0.26]});
  const L = TOSSES.find((x) => t < x + 0.45) ?? 99;
  return poseAt(t, [
    [L - 1.12, SIT],
    [L - 0.78, REACH],
    [L - 0.42, BRING],
    [L - 0.17, TOSS],
    [L + 0.12, TOSS],
    [L + 0.42, SIT],
  ]);
};

const intensityL = (t: number) => {
  const flare = easeOut(seg(t, FLARE, FLARE + 0.22));
  const big = lerp(0.85, 2.5, flare) - 0.55 * ss(t, FLARE + 0.4, 4.2);
  return big * (1 - ss(t, 4.25, OUT - 0.05));
};
const intensityR = (t: number) => 0.82 + 0.04 * ss(t, 0, 9) + TOSSES.reduce((s, L) => s + 0.32 * pulse(t, L, L + 0.1, L + 0.75), 0);

export const World1: React.FC<{t: number}> = ({t}) => {
  const look = useLook();
  const b = BODIES[look.kind];
  const k = S * b.s;
  const IL = intensityL(t);
  const IR = intensityR(t);

  /* intense: pose, the big log */
  const poseL = poseAt(t, keysL(b));
  const jl = solve(poseL, b);
  const figL = {x: LX, dir: 1 as const, yaw: YAW, s: S};
  const held = t >= 0.72 && t < 1.13;
  const handMid: [number, number] = [(jl.hF[0] + jl.hB[0]) / 2, (jl.hF[1] + jl.hB[1]) / 2];
  const relW = toWorld(solve(keysL(b)[5][1], b).hF, 0, figL, b);
  const fly = seg(t, 1.13, FLARE);
  const logOnFire: [V3, V3] = [[LF - 0.32, 0.15, 0.06], [LF + 0.3, 0.17, -0.05]];
  const flyC: V3 = [lerp(relW[0], LF, fly), lerp(relW[1], 0.16, fly) + Math.sin(fly * Math.PI) * 0.25, lerp(0.15, 0, fly)];
  const burnt = ss(t, 2.2, OUT);
  const coldL = ss(t, 4.4, OUT + 0.6);
  const tintL = t < FLARE ? '#ff8a2e' : coldL > 0 ? mixHex('#ffb43a', '#7f8fb0', coldL) : '#ffb43a';
  const energyL = t < FLARE ? 0.62 : lerp(lerp(1, 0.8, ss(t, 2, 4.2)), 0.18, coldL);
  const shiver = t > OUT + 0.6 ? Math.sin(t * 38) * 0.6 : 0;

  /* consistent: pose, sticks */
  const poseR = keysR(b, t);
  const jr = solve(poseR, b);
  const figR = {x: RX, dir: -1 as const, yaw: YAW, s: S};
  const next = TOSSES.find((x) => t < x + 0.45) ?? 99;
  const holding = t > next - 0.82 && t < next - 0.15;
  const relRw = toWorld(jr.hF, b.shZ, figR, b);
  const landed = TOSSES.filter((L) => t >= L);

  const warmL = Math.min(1, IL / 1.4) * 0.9;
  const warmR = Math.min(1, IR / 1.2) * 0.75;

  return (
    <>
      <Floor y={0} w={40} d={40} z={-12} />
      <Glow p={[LX + 0.3, 1.2, -2]} w={4} h={4.6} color={mixHex('#3b5a9a', '#ff7a2a', Math.min(1, IL / 2.5) * 0.7)} a={0.25} />
      <Glow p={[RX - 0.3, 1.2, -2]} w={4} h={4.6} color={mixHex('#3b5a9a', '#ff7a2a', 0.35)} a={0.22} />

      {/* intensity */}
      <Limb a={[LX - 0.05, 0.12, -0.3]} b={[LX + 0.02, 0.12, 0.28]} r0={0.12} r1={0.115} m={WOOD} y0={0} y1={0.26} />
      <Campfire x={LF} t={t} I={IL} seed={1.3} burnt={burnt} ember={t > OUT - 0.4 ? 1 - seg(t, OUT, 9.3) * 0.7 : 0} smoke={ss(t, OUT - 0.5, OUT + 0.3) * (1.6 - ss(t, 8.3, 9.3) * 0.6)} smokeT={t - OUT + 0.5} />
      {t >= FLARE ? <Limb a={logOnFire[0]} b={logOnFire[1]} r0={0.075} r1={0.07} m={charred(burnt)} y0={0.05} y1={0.25} /> : null}
      {t >= 1.13 && t < FLARE ? <Limb a={[flyC[0] - 0.3, flyC[1], flyC[2] + 0.05]} b={[flyC[0] + 0.3, flyC[1] + 0.02, flyC[2] - 0.05]} r0={0.075} r1={0.07} m={WOOD} y0={flyC[1] - 0.1} y1={flyC[1] + 0.1} /> : null}
      <Figure pose={poseL} cast={chill(warm(look.a, warmL), coldL)} x={LX + (shiver * 0.004)} dir={1} yaw={YAW} s={S} energy={energyL} tint={tintL}>
        {t < 0.72 ? <Limb a={[LOG_LOCAL[0], LOG_LOCAL[1], -0.32 / k]} b={[LOG_LOCAL[0], LOG_LOCAL[1], 0.32 / k]} r0={0.075 / k} r1={0.07 / k} m={WOOD} y0={0} y1={0.2} /> : null}
        {held ? <Limb a={[handMid[0] + 0.04, handMid[1], -0.32 / k]} b={[handMid[0] + 0.04, handMid[1], 0.32 / k]} r0={0.075 / k} r1={0.07 / k} m={WOOD} y0={0} y1={2} /> : null}
      </Figure>

      {/* consistency */}
      <Limb a={[RX + 0.05, 0.12, -0.3]} b={[RX - 0.02, 0.12, 0.28]} r0={0.12} r1={0.115} m={WOOD} y0={0} y1={0.26} />
      {/* the pile of sticks at his side */}
      {[0, 1, 2, 3].map((i) => (
        <Limb key={i} a={[RX - 0.12 + i * 0.03, 0.03 + (i % 2) * 0.03, 0.3]} b={[RX + 0.22 + i * 0.02, 0.03 + (i % 2) * 0.03, 0.42 - i * 0.03]} r0={0.022} r1={0.02} m={WOOD} y0={0} y1={0.1} />
      ))}
      <Campfire x={RF} t={t} I={IR} seed={4.1} burnt={0.4} />
      {landed.slice(-4).map((L, i) => {
        const a = (L * 2.3) % 1.4;
        const c: V3 = [RF + Math.cos(a) * 0.02, 0.13 + i * 0.01, 0.03];
        return <Limb key={L} a={[c[0] - Math.cos(a) * 0.17, c[1], c[2] - Math.sin(a) * 0.1]} b={[c[0] + Math.cos(a) * 0.17, c[1] + 0.02, c[2] + Math.sin(a) * 0.1]} r0={0.022} r1={0.02} m={charred(clamp((t - L) / 3))} y0={0} y1={0.2} />;
      })}
      {TOSSES.map((L) => {
        const u = seg(t, L - 0.15, L);
        if (u <= 0 || u >= 1) return null;
        const p: V3 = [lerp(relRw[0], RF, u), lerp(1.0, 0.16, u) + Math.sin(u * Math.PI) * 0.12, lerp(0.2, 0.03, u)];
        return <Limb key={L} a={[p[0] - 0.16, p[1] + 0.03, p[2]]} b={[p[0] + 0.16, p[1] - 0.03, p[2]]} r0={0.022} r1={0.02} m={WOOD} y0={0} y1={2} />;
      })}
      <Figure pose={poseR} cast={warm(look.b, warmR)} x={RX} dir={-1} yaw={YAW} s={S} energy={0.82 + 0.12 * Math.sin(t * 2.4)}>
        {holding ? <Limb a={[jr.hF[0] - 0.12, jr.hF[1] - 0.05, b.shZ + 0.05]} b={[jr.hF[0] + 0.18, jr.hF[1] + 0.05, b.shZ + 0.05]} r0={0.023 / k} r1={0.021 / k} m={WOOD} y0={0} y1={2} /> : null}
      </Figure>
    </>
  );
};

export const Over1: React.FC<{t: number; look: Look; cam: Cam}> = ({t, look, cam}) => {
  const o = ss(t, 0.05, 0.45) * (1 - ss(t, S1.to - 0.45, S1.to - 0.1));
  return (
    <>
      <Label look={look} cam={cam} at={[-0.78, 3.05, 0]} text="Intensity" o={o} />
      <Label look={look} cam={cam} at={[0.78, 3.05, 0]} text="Consistency" o={o} />
    </>
  );
};
