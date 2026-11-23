import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, easeInOut, lerp, seg, ss} from '../nc001-work-smart/anim';
import {type Cam, project, Stage} from '../nc001-work-smart/kit3d';
import {Watermark} from '../../channels/stepglow/Brand';
import {SG} from '../sg002-start-small/look';
import {K3, W3} from '../sg003-same-bar/rig3';
import {DROP, hit, shake} from './grid';
import {CAST, HD, NAMES, solveC, T, TINTS, TOPY, WALL_Z, XS} from './plan';
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
 * One continuous take up the wall, as in the reference: it opens on the ground, follows the climb
 * (Discipline's pace is the camera's pace), leans in on the three in the middle, lets Ego fall out of frame,
 * stops under the summit so the edge comes down into frame, closes in on the rescue, then opens on the top.
 */
const OPEN: C = {viewH: 8.4, cx: 0, cy: 2.2, pitch: 6, yaw: 0, roll: 0};
const follow = (t: number): C => ({viewH: 9.2, cx: 0.05, cy: Math.min(TOPY - 1.6, HD(t) + 0.9), pitch: 3, yaw: 7 * Math.sin(t * 0.15), roll: 1.6 * Math.sin(t * 0.23)});
const trio = (t: number): C => ({viewH: 5.4, cx: -0.85, cy: HD(t) + 0.55, pitch: 4, yaw: -14, roll: -3});
const TOPC: C = {viewH: 7.4, cx: 0.55, cy: TOPY - 0.6, pitch: 5, yaw: 6, roll: 1.5};
const RESCUE: C = {viewH: 5.2, cx: 1.0, cy: TOPY - 0.35, pitch: 12, yaw: 38, roll: 2};
const FIN: C = {viewH: 6.0, cx: 0.95, cy: TOPY + 0.95, pitch: 9, yaw: -5, roll: 0};
const FIN2: C = {...FIN, viewH: 5.3, cy: TOPY + 0.9, yaw: -9};

const camBase = (t: number): C => {
  if (t < 1.0) return OPEN;
  if (t < 3.2) return mixC(OPEN, follow(t), easeInOut(seg(t, 1.0, 3.2)));
  if (t < T.zoom) return follow(t);
  if (t < T.slip + 0.35) return mixC(follow(t), trio(t), easeInOut(seg(t, T.zoom, T.zoom + 1.0)));
  if (t < 34.6) return mixC(trio(t), follow(t), easeInOut(seg(t, T.slip + 0.35, T.slip + 1.6)));
  if (t < 36.5) return mixC(follow(t), TOPC, easeInOut(seg(t, 34.6, 36.3)));
  if (t < T.flash) return mixC(TOPC, RESCUE, easeInOut(seg(t, 36.5, T.reach + 0.3)));
  if (t < T.day1) return mixC(RESCUE, FIN, easeInOut(seg(t, T.flash, T.flash + 1.3)));
  return mixC(FIN, FIN2, easeInOut(seg(t, T.day1, SG005_SECONDS)));
};

const PUNCH: [number, number][] = [
  [DROP, 0.07],
  [T.quit, 0.03],
  [T.fly, 0.035],
  [T.crash, 0.05],
  [T.slip, 0.07],
  [T.fell, 0.05],
  [T.torn, 0.04],
  [T.top, 0.03],
  [T.flash, 0.1],
  [T.day1, 0.04],
];

export const cam = (t: number): Cam => {
  const c = camBase(t);
  const p = PUNCH.reduce((m, [at, a]) => m + a * hit(t, at, 5), 0);
  const [sx, sy] = shake(t, 0.03 * hit(t, T.slip, 4) + 0.06 * hit(t, T.fell, 3.5) + 0.02 * hit(t, DROP, 4) + 0.025 * hit(t, T.flash, 4));
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
      {/* Ego landed far below: the label rises with the dust at the bottom of the frame */}
      {t > T.fell ? (
        <div style={{position: 'absolute', left: project(c, XS[1], c.cy - c.viewH / 2, 0.6)[0], top: 1560 - 90 * (1 - Math.exp(-(t - T.fell) * 3)), transform: 'translate(-50%, -100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'Sora', fontWeight: 600, lineHeight: 1.05, whiteSpace: 'nowrap', opacity: clamp((t - T.fell) / 0.2) * (1 - ss(t, T.fell + 3.2, T.fell + 3.6))}}>
          <span style={{fontSize: 50, color: '#ff5a5a', transform: `scale(${1 + 0.6 * Math.exp(-(t - T.fell) * 6)})`, textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 18px #ff5a5a'}}>fell</span>
          <span style={{fontSize: 40, color: '#9aa4bc', letterSpacing: '0.04em', textShadow: '0 2px 8px rgba(0,0,0,0.9)'}}>Ego</span>
        </div>
      ) : null}
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
