import React from 'react';
import {BEAT, beat, clamp, easeOut, fract, gait, lerp, pulse, seg, ss, wobble} from './anim';
import {BODIES, Ball, Cam, Figure, Glow, Part, Pose, Txt, project, reach, roundedBox, useLook} from './kit3d';
import type {Look} from './looks';
import {Block, Floor, mixHex} from './world';

/** scene 4 · 16.93 – 21.20 · Today / In a month / In a year */
export const S4 = {from: 16.93, to: 21.2};

export const cam4 = (t: number): Cam => ({viewH: 8.8 - ss(t, S4.from, S4.to) * 0.2, cy: 0, pitch: 5});

const ROWS = [1.9, -0.25, -2.4];
const FX = -0.62; // the pusher
const K = 0.9;
const SIDE = 0.86;
const T0 = beat(4); // 17.04

const roundGeo = roundedBox(SIDE, SIDE, SIDE, 0.24);
const ringGeoBall = null;
void ringGeoBall;

/** marks on the floor sliding back: how fast this row is really moving */
const Dashes: React.FC<{y: number; travel: number}> = ({y, travel}) => {
  const look = useLook();
  return (
    <>
      {Array.from({length: 7}, (_, i) => {
        const x = fract((i * 0.55 - travel) / 3.85) * 3.85 - 1.92;
        const edge = ss(x, -1.92, -1.5) * (1 - ss(x, 1.5, 1.92));
        return edge > 0.05 ? <Block key={i} x={x} y={y} z={0.55} w={0.22 * edge} h={0.016} d={0.07} m={look.prop} r={0.006} /> : null;
      })}
    </>
  );
};

const PUSH: Pose = {pelvis: [-0.12, 0.8], lean: 36, head: [0.2, -0.1], handF: [0.8, 0], handB: [0.8, -0.15], elbowF: -1, elbowB: -1, footF: [-0.05, 0], footB: [-0.75, 0]};

export const World4: React.FC<{t: number}> = ({t}) => {
  const look = useLook();
  const b = BODIES[look.kind];
  const k = K * b.s;
  const tt = t - T0;

  /* ── today: the cube tips, and falls back ── */
  const cyc = BEAT * 2;
  const u = fract(tt / cyc) * cyc;
  const tip = easeOut(seg(u, 0.05, 0.62)) * (1 - ss(u, 0.74, 0.92));
  const thud = u > 0.92 ? wobble(u - 0.92, 12, 10) * 0.035 : 0;
  const a1 = tip * 0.44 + thud;
  const px = FX + 0.5 + SIDE; // far bottom edge of the cube = the pivot
  const hand1x = px + (-SIDE * Math.cos(a1) + SIDE * 0.62 * Math.sin(a1));
  const hand1y = SIDE * Math.sin(a1) + SIDE * 0.62 * Math.cos(a1);
  const slip = fract(tt * 3.2);
  let p1: Pose = {...PUSH, lean: 34 + tip * 8, pelvis: [-0.12 + tip * 0.1, 0.8 - tip * 0.04], footF: [lerp(0.08, -0.3, slip), 0], footB: [lerp(-0.45, -0.85, fract(slip + 0.5)), 0]};
  const h1 = reach(p1, b, (hand1x - FX) / k, hand1y / k);
  p1 = {...p1, handF: h1, handB: [h1[0] - 0.02, h1[1] - 0.2]};
  const e1 = 0.3 + tip * 0.35;

  /* ── in a month: it rolls, one face per beat ── */
  const q = tt / BEAT;
  const roll = Math.floor(q) + ss(fract(q), 0.12, 0.88);
  const a2 = -roll * (Math.PI / 2);
  const c2y = SIDE / 2 + 0.115 * Math.abs(Math.sin(2 * a2));
  const lift2 = Math.abs(Math.sin(2 * a2));
  let p2: Pose = {...gait(roll * 1.0, {stride: 0.34, lift: 0.1, lean: 24, crouch: 0.9}), head: [0.14, -0.05]};
  const h2 = reach(p2, b, 0.5 / k + 0.02, (SIDE * 0.62 + lift2 * 0.12) / k);
  p2 = {...p2, handF: h2, handB: [h2[0] - 0.02, h2[1] - 0.2]};

  /* ── in a year: the same weight is a ball now, and it runs ahead ── */
  const v3 = 3.1;
  const a3 = -(tt * v3) / (SIDE / 2);
  const run = tt * 2.7;
  const kick = Math.sin(run * Math.PI * 2) * 0.05;
  const p3: Pose = {...gait(run, {stride: 0.6, lift: 0.3, lean: 15, bob: 0.05, arm: 0.5, armY: -0.5, crouch: 0.9}), head: [0.08, 0]};

  const row = (i: number) => ROWS[i];
  return (
    <>
      <Glow p={[0, 0, -1.6]} w={6} h={9} color={look.bg.glow} a={look.bg.glowAmt * 0.6} />
      {ROWS.map((y, i) => (
        <React.Fragment key={i}>
          <Floor y={y} w={3.9} d={1.5} z={0} />
          <Dashes y={y} travel={i === 0 ? 0 : i === 1 ? roll * SIDE : tt * v3} />
        </React.Fragment>
      ))}

      {/* today */}
      <Figure pose={p1} cast={look.a} x={FX} y={row(0)} s={K} dir={1} yaw={20} energy={e1} tint={mixHex(look.a.core, '#ff3a24', 0.6)} />
      <group position={[px, row(0), 0]} rotation={[0, 0, -a1]}>
        <Block x={-SIDE / 2} y={0} gy={row(0)} w={SIDE} h={SIDE} m={look.prop} r={0.035} />
      </group>
      {[0, 1, 2].map((n) => {
        const kk = seg(u, 0.3 + n * 0.09, 0.75 + n * 0.09);
        return kk > 0 && kk < 1 ? <Glow key={n} p={[FX - 0.1 - kk * (0.3 + n * 0.1), row(0) + 1.5 * K + Math.sin(kk * Math.PI) * 0.22 - kk * 0.2, 0.3]} w={0.06} h={0.09} color={look.water.line} a={(1 - kk) * 0.9} /> : null;
      })}

      {/* in a month */}
      <Figure pose={p2} cast={look.a} x={FX} y={row(1)} s={K} dir={1} yaw={20} energy={0.62} tint={mixHex(look.a.core, look.accent.top, 0.6)} />
      <group position={[FX + 0.5 + SIDE / 2, row(1) + c2y, 0]} rotation={[0, 0, a2]}>
        <Part geo={roundGeo} m={look.prop} y0={-SIDE / 2 - 0.1} y1={SIDE / 2} local position={[0, -SIDE / 2, 0]} />
      </group>

      {/* in a year */}
      <Figure pose={p3} cast={look.b} x={FX + 0.05} y={row(2)} s={K} dir={1} yaw={20} energy={1} />
      <group position={[FX + 1.12 + kick, row(2) + SIDE / 2, 0]} rotation={[0, 0, a3]}>
        <Ball p={[0, 0, 0]} r={SIDE / 2} m={look.prop} y0={row(2) - 0.1} y1={row(2) + SIDE} />
        {[0, 1, 2, 3].map((n) => (
          <Ball key={n} p={[Math.cos((n * Math.PI) / 2) * SIDE * 0.47, Math.sin((n * Math.PI) / 2) * SIDE * 0.47, 0]} r={0.07} s={[1, 1, 3.4]} m={look.accent2} y0={-9} y1={-8} />
        ))}
      </group>
      {[0, 1, 2, 3, 4].map((n) => {
        const kk = fract(tt * 1.6 + n * 0.2);
        return <Glow key={n} p={[FX - 0.2 - kk * 1.2, row(2) + 0.25 + n * 0.28, 0.2]} w={0.5 + kk * 0.5} h={0.03} color={look.b.core} a={(1 - kk) * 0.35} mode="line" />;
      })}
      {void clamp}
      {void pulse}
    </>
  );
};

export const Over4: React.FC<{t: number; look: Look; cam: Cam}> = ({t, look, cam}) => {
  const names = ['Today', 'In a month', 'In a year'];
  return (
    <>
      {names.map((n, i) => {
        const [, y] = project(cam, 0, ROWS[i] + 1.72, 0);
        const o = ss(t, S4.from + 0.12 + i * 0.16, S4.from + 0.5 + i * 0.16);
        return (
          <Txt key={n} look={look} x={84 - (1 - o) * 20} y={y} align="left" size={50} o={o} color={i === 2 ? look.b.core : undefined}>
            {n}
          </Txt>
        );
      })}
    </>
  );
};
