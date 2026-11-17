import React from 'react';
import {beat, easeIn, lerp, pulse, rnd, seg, ss, wobble} from './anim';
import {Cam, Glow, Limb, Txt, project, useLook} from './kit3d';
import type {Look, Mat} from './looks';
import {Block, Floor} from './world';

/** scene 2 · 5.07 – 10.67 · Multitasking / Focused */
export const S2 = {from: 5.07, to: 10.67};

const U = 0.29; // one block
const COLS = [-1.04, -0.52, 0, 0.52, 1.04];
const TOP_Y = 0.9;
const BOT_Y = -2.45;
const GOAL = 6;
/** eight blocks, one per beat */
const LAND = Array.from({length: 8}, (_, k) => beat(-14 + k));
const ORDER = [2, 4, 1, 3, 0, 1, 4, 2];
const HIT = LAND[GOAL - 1];

export const cam2 = (t: number): Cam => {
  const punch = pulse(t, HIT - 0.02, HIT + 0.08, HIT + 0.7);
  return {viewH: 8.2 - punch * 0.22 - ss(t, S2.from, S2.to) * 0.15, cy: 0 - punch * 0.25, pitch: 5};
};

/** a block dropping onto (x, restY) and landing at time tl */
const Drop: React.FC<{t: number; tl: number; x: number; restY: number; fromY: number; m: Mat; seed: number; glow: string}> = ({t, tl, x, restY, fromY, m, seed, glow}) => {
  const t0 = tl - 0.5;
  if (t < t0) return null;
  const fall = easeIn(seg(t, t0 + 0.08, tl));
  const startY = fromY;
  const y = lerp(startY, restY, fall);
  const appear = ss(t, t0, t0 + 0.12);
  const sq = wobble(t - tl, 10, 9) * 0.22;
  const sx = t >= tl ? 1 + sq : appear;
  const sy = t >= tl ? 1 - sq : appear;
  const spin = (1 - fall) * (rnd(seed) - 0.5) * 1.4;
  return (
    <group position={[x, y, 0]} rotation={[0, spin, spin * 0.6]}>
      <Block x={0} y={0} gy={y} w={0.31} h={U - 0.01} m={m} r={0.045} sx={sx} sy={sy} />
      {t < tl ? <Glow p={[0, 0.5, -0.1]} w={0.3} h={1.2 * (1 - fall) + 0.2} color={glow} a={0.25 * appear} mode="beam" rot={180} /> : null}
    </group>
  );
};

const Chart: React.FC<{y: number; h: number; lit: number}> = ({y, h, lit}) => {
  const look = useLook();
  return (
    <>
      <Floor y={y} w={3.3} d={1.1} z={0} />
      <Limb a={[-1.52, y, 0.2]} b={[-1.52, y + h, 0.2]} r0={0.012} r1={0.012} m={look.prop} y0={y} y1={y + h} />
      {COLS.map((x, i) => (
        <Block key={i} x={x} y={y} w={0.34} h={0.022} m={look.mute} r={0.01} />
      ))}
      {/* the goal */}
      {Array.from({length: 11}, (_, i) => (
        <Glow key={i} p={[-1.38 + i * 0.276, y + GOAL * U, 0.25]} w={0.2} h={0.045} color={lit > 0 ? look.accent2.top : look.water.line} a={0.28 + lit * 0.9} mode="line" />
      ))}
    </>
  );
};

export const World2: React.FC<{t: number}> = ({t}) => {
  const look = useLook();
  const hit = t >= HIT ? 1 : 0;
  const flash = pulse(t, HIT - 0.02, HIT + 0.06, HIT + 0.9);
  // top chart: how high each column already is when block k arrives
  const level: number[] = [];
  const count = [0, 0, 0, 0, 0];
  ORDER.forEach((c) => {
    level.push(count[c]);
    count[c] += 1;
  });
  const hot = {...look.accent2, emit: look.accent2.emit + hit * 0.25 + flash * 0.9};
  const towerH = LAND.filter((l) => t >= l).length * U;
  return (
    <>
      <Glow p={[0, TOP_Y + 0.9, -1.5]} w={5.5} h={4.2} color={look.bg.glow} a={look.bg.glowAmt * 0.55} />
      <Glow p={[0, BOT_Y + 1.2, -1.5]} w={5.5} h={4.6} color={look.bg.glow} a={look.bg.glowAmt * (0.6 + hit * 0.5)} />

      <Chart y={TOP_Y} h={GOAL * U + 0.15} lit={0} />
      {LAND.map((tl, k) => (
        <Drop key={k} t={t} tl={tl} x={COLS[ORDER[k]]} restY={TOP_Y + level[k] * U} fromY={TOP_Y + 1.72} m={look.accent} seed={k} glow={look.accent.top} />
      ))}

      <Chart y={BOT_Y} h={8 * U + 0.15} lit={hit} />
      {LAND.map((tl, k) => (
        <Drop key={k} t={t} tl={tl} x={0} restY={BOT_Y + k * U} fromY={Math.max(BOT_Y + 2.12, BOT_Y + k * U + 0.62)} m={hot} seed={k + 20} glow={look.accent2.top} />
      ))}
      {/* the tower lights up as it grows; at the goal it bursts */}
      <Glow p={[0, BOT_Y + towerH / 2, -0.25]} w={1.1 + towerH * 0.3} h={towerH + 0.9} color={look.accent2.top} a={0.12 + towerH * 0.1 + flash * 0.8} />
      {flash > 0 ? (
        <>
          <Glow p={[0, BOT_Y + GOAL * U, 0.4]} w={1 + (1 - flash) * 4.5} h={0.14} color={look.accent2.top} a={flash * 1.6} mode="line" />
          <Glow p={[0, BOT_Y + GOAL * U, 0.3]} w={3.4} h={3.4} color={look.accent2.top} a={flash * 0.9} />
          {Array.from({length: 14}, (_, i) => {
            const k = seg(t, HIT, HIT + 0.8);
            const a = (i / 14) * Math.PI * 2 + rnd(i) * 0.6;
            const r = k * (0.9 + rnd(i + 3) * 0.9);
            return <Glow key={i} p={[Math.cos(a) * r, BOT_Y + GOAL * U + Math.sin(a) * r * 0.8 + 0.1 - k * k * 0.5, 0.5]} w={0.07} h={0.07} color="#ffffff" a={(1 - k) * 1.4} />;
          })}
        </>
      ) : null}
    </>
  );
};

export const Over2: React.FC<{t: number; look: Look; cam: Cam}> = ({t, look, cam}) => {
  const hit = pulse(t, HIT - 0.02, HIT + 0.1, HIT + 0.8);
  const on = t >= HIT ? 1 : 0;
  const [, y1] = project(cam, 0, 3.2, 0);
  const [, y2] = project(cam, 0, 0.3, 0);
  return (
    <>
      <Txt look={look} x={540} y={y1} o={ss(t, S2.from + 0.15, S2.from + 0.55) * (1 - on * 0.35)}>
        Multitasking
      </Txt>
      <Txt look={look} x={540} y={y2} o={ss(t, S2.from + 0.3, S2.from + 0.7)} scale={1 + hit * 0.16} color={on ? look.accent2.top : undefined} glow={1 + hit * 1.5}>
        Focused
      </Txt>
    </>
  );
};
