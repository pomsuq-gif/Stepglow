import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, easeInOut, lerp, seg, ss} from '../nc001-work-smart/anim';
import {type Cam, project, Stage} from '../nc001-work-smart/kit3d';
import {Watermark} from '../../channels/stepglow/Brand';
import {SG} from '../sg002-start-small/look';
import {K3, W3} from '../sg003-same-bar/rig3';
import {beat, DROP, hit, shake} from './grid';
import {CAST, DAY_SLIP, HD, NAMES, solveC, T, TINTS, TOPY, WALL_Z, XS} from './plan';
import {World} from './World';

export const SG005_FPS = 60;
export const SG005_SECONDS = 44.98;
export const SG005_FRAMES = Math.round(SG005_SECONDS * SG005_FPS);

type C = {viewH: number; cx: number; cy: number; pitch: number; yaw: number; roll: number};
const mixC = (a: C, b: C, k: number): C => ({
  viewH: lerp(a.viewH, b.viewH, k),
  cx: lerp(a.cx, b.cx, k),
  cy: lerp(a.cy, b.cy, k),
  pitch: lerp(a.pitch, b.pitch, k),
  yaw: lerp(a.yaw, b.yaw, k),
  roll: lerp(a.roll, b.roll, k),
});

/**
 * The reference is one take; ours cuts on the strong beats between shots that each sit on one event:
 * low angle on the ground → crane up → Motivation's fist / Ego's pose → the upside-down → the quit →
 * Obsession's burning hands → orbit → "I can fly" and the fall → the race → Day 1 slips → the three →
 * Ego's fall (the camera looks down after him) → he hits the ground → up at the summit → torn → the top → the rescue → the end.
 */
const B = beat;
const hOf = (i: number, t: number) => CAST[i](t).h;
const E = easeInOut;
type Shot = [number, (t: number) => C];
const SHOTS: Shot[] = [
  // the ground, a little from below; then the camera rises with them
  [0, (t) => ({viewH: lerp(8.4, 8.0, seg(t, 0, T.jump)), cx: 0, cy: 2.0, pitch: -4, yaw: -3, roll: 0})],
  [T.jump, (t) => {
    const k = E(seg(t, T.jump, DROP));
    return {viewH: 8.8, cx: 0.05, cy: lerp(2.0, HD(t) + 1.0, k), pitch: lerp(-3, 3, k), yaw: lerp(-10, 6, k), roll: 0};
  }],
  // the drop: everyone, a slow drift across
  [DROP, (t) => ({viewH: lerp(8.8, 8.0, seg(t, DROP, B(13))), cx: 0.1, cy: HD(t) + 1.2, pitch: 3, yaw: lerp(8, -8, E(seg(t, DROP, B(13)))), roll: 1})],
  // Motivation quits
  [B(13), (t) => ({viewH: 5.6, cx: XS[0] + 0.9, cy: lerp(hOf(0, B(15)), hOf(0, t), 0.3) + 0.2, pitch: 3, yaw: -12, roll: -1})],
  // in toward Obsession's burning hands and out again
  [B(17), (t) => {
    const k = Math.sin(Math.PI * seg(t, B(17), B(27)));
    return {viewH: lerp(8.2, 5.4, k), cx: lerp(0.1, XS[2], k), cy: lerp(HD(t) + 1.0, hOf(2, t) + 0.3, k), pitch: 3, yaw: lerp(-6, 10, seg(t, B(17), B(27))), roll: 0};
  }],
  // "I can fly", and the camera drops a little with his fall
  [B(27), (t) => {
    const h = hOf(5, t);
    const follow = t < T.fall ? h - 0.3 : Math.max(hOf(4, t) + 1.0, lerp(hOf(5, T.fall) - 0.3, h, 0.5));
    return {viewH: 6.4, cx: XS[5] - 0.9, cy: follow, pitch: 3, yaw: 12, roll: 1};
  }],
  // the race, a little from the side
  [B(36), (t) => ({viewH: lerp(8.0, 7.2, seg(t, B(36), B(46))), cx: -0.1, cy: HD(t) + 0.5, pitch: 3, yaw: lerp(-16, -8, seg(t, B(36), B(46))), roll: -1})],
  // the three; Ego falls and the camera tips down after him
  [B(46), (t) => {
    const k = E(seg(t, T.slip + 0.2, T.slip + 1.4));
    return {viewH: lerp(5.6, 7.6, k), cx: lerp(-0.85, -0.6, k), cy: HD(t) + 0.55 - 1.2 * k, pitch: lerp(4, 26, k), yaw: -12, roll: -2};
  }],
  // he hits the ground
  [B(54), (t) => ({viewH: 5.2, cx: XS[1] - 0.3, cy: 1.0, pitch: 3, yaw: -10, roll: 0})],
  // the summit comes into view; Obsession burns out
  [B(56), (t) => ({viewH: 7.4, cx: 0.0, cy: HD(t) + 1.3, pitch: -6, yaw: lerp(-12, -4, seg(t, B(56), B(64))), roll: -1})],
  // Discipline climbs out
  [B(64), (t) => ({viewH: lerp(6.2, 5.6, seg(t, B(64), B(70))), cx: XS[3] + 0.3, cy: TOPY - 0.3, pitch: 8, yaw: -18, roll: -1})],
  [B(70), (t) => mixC(RESCUE, {...RESCUE, viewH: 4.9}, seg(t, B(70), T.flash))],
  [T.flash, (t) => mixC(FIN, FIN2, E(seg(t, T.flash, SG005_SECONDS)))],
];
const RESCUE: C = {viewH: 5.4, cx: 1.0, cy: TOPY - 0.35, pitch: 10, yaw: 30, roll: 1};
const FIN: C = {viewH: 6.4, cx: 0.95, cy: TOPY + 0.95, pitch: 9, yaw: -5, roll: 0};
const FIN2: C = {...FIN, viewH: 5.3, cy: TOPY + 0.9, yaw: -10};

const camBase = (t: number): C => {
  let f = SHOTS[0][1];
  for (const [at, fn] of SHOTS) if (t >= at) f = fn;
  return f(t);
};

const PUNCH: [number, number][] = [
  [DROP, 0.07],
  [T.quit, 0.03],
  [T.fly, 0.035],
  [T.crash, 0.05],
  [T.slip, 0.07],
  [T.fell, 0.05],
  [T.torn, 0.04],
  [DAY_SLIP, 0.03],
  [T.top, 0.03],
  [T.flash, 0.1],
  [T.day1, 0.04],
];

export const cam = (t: number): Cam => {
  const c = camBase(t);
  const p = PUNCH.reduce((m, [at, a]) => m + a * hit(t, at, 5), 0);
  const [sx, sy] = shake(t, 0.03 * hit(t, T.slip, 4) + 0.04 * hit(t, DAY_SLIP, 5) + 0.06 * hit(t, T.fell, 3.5) + 0.02 * hit(t, DROP, 4) + 0.025 * hit(t, T.flash, 4));
  return {viewH: c.viewH * (1 - p), cx: c.cx + sx, cy: c.cy + sy, cz: 0, pitch: c.pitch, yaw: c.yaw, roll: c.roll + 3 * hit(t, T.slip, 3) - 2 * hit(t, T.torn, 3), fov: 24};
};

/* ───────────── captions ───────────── */

const shadow = '0 3px 2px rgba(0,0,0,0.55), 0 6px 26px rgba(0,0,0,0.85)';

const Cap: React.FC<{t: number; y: number; at: [number, number]; out?: number; lines: [string, string]; accent: string; size?: number}> = ({t, y, at, out = 1e9, lines, accent, size = 86}) => {
  const fadeOut = 1 - clamp((t - out) / 0.3);
  return (
    <>
      {lines.map((s, i) => {
        const k = clamp((t - at[i]) / 0.3);
        const e = 1 - Math.pow(1 - k, 3);
        const o = e * fadeOut;
        if (o <= 0.001) return null;
        const col = i ? accent : '#f6f9ff';
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 540,
              top: y + i * size * 1.12,
              transform: `translate(-50%, -50%) scale(${1 + 0.2 * (1 - e)})`,
              whiteSpace: 'pre',
              fontFamily: 'Sora',
              fontWeight: 600,
              fontSize: size,
              letterSpacing: `${0.01 + 0.05 * (1 - e)}em`,
              color: col,
              opacity: o,
              filter: `blur(${(1 - e) * 6}px)`,
              textShadow: `${shadow}, 0 0 34px ${i ? accent + '88' : 'rgba(140,190,255,0.4)'}`,
            }}
          >
            {s}
          </div>
        );
      })}
    </>
  );
};

const Over: React.FC<{t: number}> = ({t}) => {
  const c = cam(t);
  const ppu = 1920 / c.viewH;
  const st = CAST.map((f) => f(t));
  const size = clamp(0.13 * ppu, 40, 56);
  return (
    <AbsoluteFill>
      {st.map((s, i) => {
        const j = solveC(s.rig);
        const hd = W3(j.head, [XS[i], 0, 0], K3);
        const top = Math.max(hd[1], W3(j.hd[0], [XS[i], 0, 0], K3)[1], W3(j.hd[1], [XS[i], 0, 0], K3)[1]);
        const [x, y] = project(c, hd[0], Math.max(hd[1] + 0.34 + (i === 1 ? 0.14 : 0), top + 0.12), hd[2]);
        const o = ss(t, 0.35, 0.8) * ss(y, 150, 230) * (1 - ss(y, 1580, 1660)) * s.label * (1 - ss(t, T.flash + 0.8, T.flash + 1.3));
        if (o < 0.01) return null;
        const at = s.status?.at ?? 1e9;
        const sk = clamp((t - at) / 0.22);
        const pop = sk > 0 ? Math.exp(-(t - at) * 6) : 0;
        const dim = i === 0 ? ss(t, T.quit, T.quit + 0.5) : i === 2 ? ss(t, T.torn, T.torn + 0.5) : 0;
        return (
          <div key={i} style={{position: 'absolute', left: x, top: y, transform: 'translate(-50%, -100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'Sora', fontWeight: 600, opacity: o, lineHeight: 1.05, whiteSpace: 'nowrap'}}>
            {sk > 0 ? (
              <span style={{fontSize: size * 0.95, color: s.status!.color, opacity: sk, transform: `scale(${1 + 0.6 * pop})`, letterSpacing: '0.02em', textShadow: `0 2px 8px rgba(0,0,0,0.9), 0 0 ${12 + 22 * pop}px ${s.status!.color}`}}>{s.status!.text}</span>
            ) : null}
            <span style={{fontSize: size * 0.78, color: dim > 0 ? '#9aa4bc' : TINTS[i], letterSpacing: '0.04em', textShadow: `0 2px 8px rgba(0,0,0,0.9), 0 0 16px ${TINTS[i]}66`}}>{NAMES[i]}</span>
          </div>
        );
      })}
      {/* height marks on the wall, right side */}
      {[0.25, 0.5, 0.75].map((m) => {
        const [x, y] = project(c, 3.15, TOPY * m, WALL_Z + 0.02);
        const o = ss(y, 120, 260) * (1 - ss(y, 1560, 1660)) * 0.75;
        if (o < 0.01) return null;
        return (
          <div key={m} style={{position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', fontFamily: 'Sora', fontWeight: 600, fontSize: 34, color: '#9fb2dc', opacity: o, textShadow: '0 2px 8px rgba(0,0,0,0.9)'}}>
            {`${m * 100}%`}
          </div>
        );
      })}
      <Cap t={t} y={290} at={[0.1, 0.42]} out={2.6} lines={['Who reaches', 'the top?']} accent="#ffd66b" />
      <Cap t={t} y={300} at={[T.day1, T.day1 + 0.46]} out={T.end - 0.3} lines={['Everyone starts', 'at Day 1.']} accent="#4dffd2" />
      <Cap t={t} y={300} at={[T.end, T.end + 0.46]} lines={['Discipline gets you', 'to the top.']} accent="#ffd66b" />
    </AbsoluteFill>
  );
};

const darkness = (t: number) => Math.max(0.9 * (1 - seg(t, 0.0, 0.25)), seg(t, SG005_SECONDS - 0.35, SG005_SECONDS - 0.02));

export const SG005Full: React.FC<{withAudio?: boolean}> = ({withAudio = true}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const c = cam(t);
  const flash = 0.32 * hit(t, T.drugJump, 8) + 0.85 * hit(t, T.flash - 0.02, 4.5);
  return (
    <AbsoluteFill style={{background: SG.bg.edge}}>
      <Stage look={SG} cam={c}>
        <World t={t} cam={c} />
      </Stage>
      <Over t={t} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 70% 50% at 60% 45%, #fffaf0 0%, #fff4dc 60%, #ffe6b8 100%)', opacity: clamp(flash)}} />
      <AbsoluteFill style={{background: SG.bg.edge, opacity: darkness(t)}} />
      <Watermark />
      {withAudio ? <Audio src={staticFile('sg005/music.m4a')} /> : null}
    </AbsoluteFill>
  );
};
