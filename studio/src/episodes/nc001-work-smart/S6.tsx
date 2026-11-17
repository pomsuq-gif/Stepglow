import React from 'react';
import {STAND, back, clamp, easeInOut, fract, lerp, mixPose, pulse, rnd, seg, ss, wobble} from './anim';
import {Cam, Figure, Glow, Pose, Txt, project, useLook} from './kit3d';
import type {Look} from './looks';
import {Block, Floor, mixHex} from './world';

/** scene 6 · 26.87 – 33.50 · fail fast */
export const S6 = {from: 26.87, to: 33.5};

export const CAM6: Cam = {viewH: 8.4, cy: 2.1, pitch: 5};
export const cam6 = (t: number): Cam => ({...CAM6, viewH: 8.4 - ss(t, 31.6, 32.9) * 0.25});

const X0 = -0.15;
const SP = 1.75; // distance between pillars
const H0 = 0.8;
const HWIN = 2.22;
/** landings on the beat; from the fifth one the pace doubles */
const LAND = [27.8, 28.43, 29.07, 29.7, 30.02, 30.33, 30.65, 30.97, 31.6];
const AIR = [0.36, 0.36, 0.36, 0.36, 0.24, 0.24, 0.24, 0.24, 0.42];
const ARC = [0.8, 0.8, 0.8, 0.8, 0.45, 0.45, 0.45, 0.45, 1.0];
const WIN_AT = LAND[LAND.length - 1];
const GROW0 = 31.92;
const TOUCH = 32.78;

const CROUCH: Pose = {pelvis: [0, 0.7], lean: 26, head: [0.12, -0.05], handF: [-0.55, -0.45], elbowF: -1, handB: [-0.4, -0.5], elbowB: -1, footF: [0.14, 0], footB: [-0.14, 0]};
const AIRP: Pose = {pelvis: [0, 0.86], lean: 18, head: [0.1, 0], handF: [-0.72, -0.3], elbowF: -1, handB: [0.5, 0.25], elbowB: -1, footF: [0.5, 0.14], footB: [-0.55, 0.36]};
const READY: Pose = {...STAND, lean: 8, pelvis: [0, 0.95], handF: [0.3, -0.7], handB: [-0.3, -0.72]};

/** how many pillars are behind, and where in the current jump we are */
const jump = (t: number) => {
  for (let n = 0; n < LAND.length; n++) {
    const off = LAND[n] - AIR[n];
    if (t < off) return {done: n, k: 0, n: -1};
    if (t < LAND[n]) return {done: n, k: (t - off) / AIR[n], n};
  }
  return {done: LAND.length, k: 0, n: -1};
};

/** the count of failures: 1, 2, 3, 4, 5 … and then it races to a hundred */
const fails = (t: number) => {
  if (t < LAND[3]) return 1 + LAND.slice(0, 3).filter((l) => t >= l).length;
  if (t >= LAND[7]) return 100;
  return Math.round(5 * Math.pow(20, seg(t, LAND[3], LAND[7])));
};

export const World6: React.FC<{t: number}> = ({t}) => {
  const look = useLook();
  const j = jump(t);
  const prog = j.done + (j.n >= 0 ? easeInOut(j.k) : 0);
  const won = t >= WIN_AT;
  const grow = easeInOut(seg(t, GROW0, TOUCH - 0.05));
  const winH = lerp(H0, HWIN, grow);

  // the jumper
  const arc = j.n >= 0 ? 4 * ARC[j.n] * j.k * (1 - j.k) : 0;
  const lastLand = Math.max(-9, ...LAND.filter((l) => t >= l));
  const nextOff = LAND.map((l, n) => l - AIR[n]).find((o) => o > t) ?? 99;
  const crouch = Math.max(pulse(t, lastLand - 0.01, lastLand + 0.04, lastLand + 0.22), pulse(t, nextOff - 0.16, nextOff - 0.02, nextOff + 0.05));
  let pose: Pose = mixPose(READY, CROUCH, crouch);
  if (j.n >= 0) pose = mixPose(CROUCH, AIRP, ss(j.k, 0, 0.3) * (1 - ss(j.k, 0.8, 1)));
  const reachUp = ss(t, GROW0 + 0.15, TOUCH);
  if (won) {
    const calm = ss(t, WIN_AT + 0.15, WIN_AT + 0.45);
    pose = mixPose(pose, {...STAND, lean: -3, head: [-0.12, 0.08]}, calm);
    pose = mixPose(pose, {...STAND, lean: -4, head: [-0.16, 0.1], handB: [0.2, 0.97], elbowB: 1}, reachUp);
  }
  const fy = (won ? winH : H0) + arc;

  // every fail flashes red in the chest and is gone a moment later; the win stays
  const red = Math.max(0, ...LAND.slice(0, 8).map((l) => pulse(t, l - 0.01, l + 0.03, l + 0.3)));
  const touched = ss(t, TOUCH - 0.03, TOUCH + 0.12);
  let tint = mixHex(look.a.core, look.failCore, red);
  if (won) tint = mixHex(look.winCore, look.accent.top, touched);
  const burst = pulse(t, TOUCH - 0.02, TOUCH + 0.07, TOUCH + 0.75);
  const fast = ss(t, LAND[3], LAND[4]) * (1 - ss(t, LAND[7], LAND[7] + 0.3));
  const [sx, sy] = [X0 + 0.42, 4.2];

  return (
    <>
      <Glow p={[0, 2.4, -1.6]} w={6} h={7.5} color={look.bg.glow} a={look.bg.glowAmt * 0.75} />
      <Floor y={0} w={12} d={2.6} />

      {Array.from({length: LAND.length + 1}, (_, i) => {
        const x = X0 + (i - prog) * SP;
        if (Math.abs(x) > 3.4) return null;
        const landed = i === 0 ? -9 : LAND[i - 1];
        const isWin = i === LAND.length;
        const on = t >= landed;
        const hit = on ? wobble(t - landed, 11, 9) : 0;
        const flash = pulse(t, landed - 0.01, landed + 0.04, landed + 0.4);
        const m = !on ? look.mute : isWin ? look.win : look.fail;
        const h = isWin && on ? winH : H0;
        return (
          <React.Fragment key={i}>
            <Block x={x} w={0.74} h={h} m={flash > 0 ? {...m, emit: m.emit + flash * 0.7} : m} sy={1 - hit * 0.08} sx={1 + hit * 0.05} glow={on ? m.top : undefined} glowA={0.22 + flash * 0.5} />
            {flash > 0 ? <Glow p={[x, h + 0.02, 0.45]} w={0.8 + (1 - flash) * 1.4} h={0.12} color={isWin ? look.winCore : look.failCore} a={flash * 1.3} mode="line" /> : null}
          </React.Fragment>
        );
      })}

      <Figure pose={pose} cast={look.a} x={X0} y={fy} dir={1} yaw={24} roll={j.n >= 0 ? -5 * Math.sin(j.k * Math.PI) : 0} energy={0.78 + red * 0.25 + (won ? 0.22 : 0)} tint={tint} />

      {/* speed: when failing gets fast, the air starts to streak */}
      {fast > 0
        ? [0, 1, 2, 3, 4, 5].map((n) => {
            const k = fract(t * 2.3 + n * 0.37);
            return <Glow key={n} p={[2.4 - k * 5, 0.5 + rnd(n) * 2.6, -0.2 + rnd(n + 9) * 0.6]} w={0.9 + rnd(n + 4)} h={0.035} color={look.water.line} a={fast * 0.4 * Math.sin(k * Math.PI)} mode="line" />;
          })
        : null}

      {/* the pillar lifts, the hand meets the word */}
      {won ? <Glow p={[X0, winH * 0.5, -0.3]} w={1.6 + grow * 0.8} h={winH + 1.2} color={look.winCore} a={0.12 + grow * 0.22} /> : null}
      {burst > 0 ? (
        <>
          <Glow p={[sx, sy, 0.3]} w={2.2 + (1 - burst) * 4} h={2.2 + (1 - burst) * 4} color={look.accent.top} a={burst * 0.9} />
          <Glow p={[sx, sy, 0.35]} w={1 + (1 - burst) * 5} h={0.14} color={look.accent.top} a={burst * 1.5} mode="line" />
          {Array.from({length: 16}, (_, i) => {
            const k = seg(t, TOUCH, TOUCH + 0.8);
            const a = (i / 16) * Math.PI * 2 + rnd(i) * 0.5;
            const r = k * (0.7 + rnd(i + 3) * 1.1);
            return <Glow key={i} p={[sx + Math.cos(a) * r, sy + Math.sin(a) * r * 0.7 - k * k * 0.5, 0.5]} w={0.07} h={0.07} color="#ffffff" a={(1 - k) * 1.4} />;
          })}
        </>
      ) : null}
      {void clamp}
    </>
  );
};

export const Over6: React.FC<{t: number; look: Look; cam: Cam}> = ({t, look, cam}) => {
  const won = t >= WIN_AT;
  const lastLand = Math.max(S6.from, ...LAND.filter((l) => t >= l));
  const pop = t >= LAND[0] ? back(seg(t, lastLand, lastLand + 0.18), 2.4) : 1;
  const n = fails(t);
  const touched = ss(t, TOUCH - 0.03, TOUCH + 0.1);
  const burst = pulse(t, TOUCH - 0.02, TOUCH + 0.08, TOUCH + 0.6);
  const [lx, ly] = project(cam, X0, -0.52, 0.9);
  const [sx, sy] = project(CAM6, X0 + 0.42, 4.2, 0);
  const a = ss(t, S6.from + 0.15, S6.from + 0.6);
  return (
    <>
      <Txt look={look} x={540} y={238} size={45} o={a}>
        {'If you knew you had to fail\n100 times before you succeeded'}
      </Txt>
      <Txt look={look} x={540} y={376} size={41} o={ss(t, 28.9, 29.35)} color={look.b.core}>
        How fast would you want to fail?
      </Txt>
      <Txt look={look} x={sx} y={sy} size={62} o={a * (0.55 + touched * 0.45)} color={touched > 0.5 ? look.accent.top : undefined} scale={1 + burst * 0.2} glow={1 + touched * 1.2}>
        SUCCESS
      </Txt>
      {won ? (
        <Txt look={look} x={lx} y={ly} size={58} color={look.winText} scale={0.6 + 0.4 * pop} glow={1.4}>
          WIN
        </Txt>
      ) : (
        <>
          <Txt look={look} x={lx} y={ly} size={54} color={look.failText} scale={0.7 + 0.3 * pop} o={a}>
            FAIL
          </Txt>
          <Txt look={look} x={lx} y={ly + 62} size={n >= 100 ? 44 : 36} color={look.failText} o={a * 0.85} scale={n >= 100 ? 1 + pulse(t, LAND[7], LAND[7] + 0.08, LAND[7] + 0.5) * 0.3 : 1} weight={600}>
            {`× ${n}`}
          </Txt>
        </>
      )}
    </>
  );
};
