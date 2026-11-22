import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, easeInOut, lerp, seg, ss} from '../nc001-work-smart/anim';
import {type Cam, project, Stage} from '../nc001-work-smart/kit3d';
import {mixHex} from '../nc001-work-smart/world';
import {Watermark} from '../../channels/stepglow/Brand';
import {SG} from '../sg002-start-small/look';
import {beat, gap, hit, shake} from './grid';
import {CAST, END_TXT, HURT, NAMES, OUT, TINT, UP, solveP} from './plan';
import {K3, W3} from '../sg003-same-bar/rig3';
import {World} from './World';

export const SG004_FPS = 60;
export const SG004_SECONDS = 20.06;
export const SG004_FRAMES = Math.round(SG004_SECONDS * SG004_FPS);

const B = beat;
type C = {viewH: number; cx: number; cy: number; cz: number; pitch: number; yaw: number; fov: number; roll: number};
const mixC = (a: C, b: C, k: number): C => ({
  viewH: lerp(a.viewH, b.viewH, k),
  cx: lerp(a.cx, b.cx, k),
  cy: lerp(a.cy, b.cy, k),
  cz: lerp(a.cz, b.cz, k),
  pitch: lerp(a.pitch, b.pitch, k),
  yaw: lerp(a.yaw, b.yaw, k),
  fov: lerp(a.fov, b.fov, k),
  roll: lerp(a.roll, b.roll, k),
});

/**
 * One continuous take as in the reference, but never still: a dutch tilt that leans and swings,
 * a slow dolly toward the near lanes, a jolt on every fall, a whip-in on the hurt, a heartbeat on the stutter,
 * a hard punch and a swing to the heroic side on the drop, then a crane up and out.
 */
const OPEN: C = {viewH: 6.6, cx: -0.5, cy: 0.4, cz: -2.6, pitch: 62, yaw: -42, fov: 24, roll: -10};
const WIDE: C = {viewH: 7.3, cx: -0.4, cy: 0.35, cz: -2.45, pitch: 47, yaw: -30, fov: 24, roll: -7};
const MID: C = {viewH: 5.6, cx: -0.5, cy: 0.4, cz: -1.7, pitch: 44, yaw: -38, fov: 24, roll: -4};
const CLOSE: C = {viewH: 3.7, cx: -0.6, cy: 0.55, cz: -0.7, pitch: 38, yaw: -50, fov: 24, roll: 5};
const ORBIT: C = {viewH: 4.1, cx: -0.55, cy: 0.62, cz: -0.6, pitch: 24, yaw: -70, fov: 24, roll: -3};
const END: C = {viewH: 6.4, cx: -0.4, cy: 0.4, cz: -1.95, pitch: 56, yaw: -34, fov: 24, roll: -8};

export const cam = (t: number): Cam => {
  let c: C;
  if (t < 2.3) c = mixC(OPEN, WIDE, easeInOut(seg(t, 0.2, 2.3)));
  else if (t < B(-4)) c = mixC(WIDE, MID, easeInOut(seg(t, 2.3, B(-4))));
  else if (t < UP) c = mixC(MID, CLOSE, easeInOut(seg(t, B(-4), HURT + 0.15)));
  else if (t < B(8)) c = mixC(CLOSE, ORBIT, easeInOut(seg(t, UP, B(8))));
  else c = mixC(ORBIT, END, easeInOut(seg(t, B(8), B(11.3))));
  // a slow breathing sway of the tilt, always
  c = {...c, roll: c.roll + 1.2 * Math.sin(t * 0.9)};
  // punches: every fall, the hurt (a whip in), each gap of the stutter (a heartbeat), the drop (hard)
  const punch = OUT.reduce((m, o) => m + 0.07 * hit(t, o + 0.08, 6), 0) + 0.1 * hit(t, HURT, 5) + 0.05 * gap(t) + 0.16 * hit(t, UP, 3.2);
  c.viewH *= 1 - punch;
  c.roll += OUT.reduce((m, o, i) => m + (i % 2 ? 2.2 : -2.2) * hit(t, o + 0.08, 5), 0) + 4 * hit(t, HURT, 4) - 6 * hit(t, UP, 3);
  const [sx, sy] = shake(t, 0.025 * hit(t, HURT, 4) + 0.015 * gap(t) + 0.05 * hit(t, UP, 4) + OUT.reduce((m, o) => m + 0.018 * hit(t, o + 0.15, 7), 0));
  return {...c, cx: c.cx + sx, cy: c.cy + sy};
};

/* ───────────── captions ───────────── */

const shadow = '0 3px 2px rgba(0,0,0,0.55), 0 6px 26px rgba(0,0,0,0.85)';

/** two lines, the second in an accent; each line pops in on its own beat */
const Cap: React.FC<{t: number; y: number; at: [number, number]; out?: number; lines: [string, string]; accent: string; size?: number}> = ({t, y, at, out = 1e9, lines, accent, size = 88}) => {
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

/** the broadcast strip from the reference: a live dot and the clock, centred */
const Live: React.FC<{t: number}> = ({t}) => {
  const o = ss(t, 0.3, 0.7);
  const s = Math.floor(t);
  const blink = 0.55 + 0.45 * (Math.sin(t * Math.PI * 2 * (1 / (2 * 0.51954))) > 0 ? 1 : 0.2);
  return (
    <div style={{position: 'absolute', left: 540, top: 128, transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'Sora', fontWeight: 600, fontSize: 30, letterSpacing: '0.12em', color: '#c9d4ec', opacity: o * 0.85, textShadow: shadow}}>
      <div style={{width: 14, height: 14, borderRadius: 7, background: '#ff3b30', opacity: blink, boxShadow: '0 0 14px #ff3b30'}} />
      <span>LIVE</span>
      <span style={{color: '#7c88a6', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.06em'}}>{`0:${String(s).padStart(2, '0')}`}</span>
    </div>
  );
};

const Over: React.FC<{t: number}> = ({t}) => {
  const c = cam(t);
  const ppu = 1920 / c.viewH;
  const st = CAST.map((f) => f(t));
  return (
    <AbsoluteFill>
      {st.map((s, i) => {
        const hd = W3(solveP(s.rig).head, s.root, K3);
        const [x, y] = project(c, hd[0] - 0.05, hd[1] + 0.3, hd[2]);
        const size = clamp(0.1 * ppu, 30, 54);
        const outAt = i < 3 ? OUT[i] : 1e9;
        const outK = clamp((t - outAt - 0.08) / 0.22);
        const pop = outK > 0 ? Math.exp(-(t - outAt - 0.08) * 7) : 0;
        const isEgo = i === 3;
        const red = isEgo ? ss(t, HURT - 0.05, HURT + 0.15) : 0;
        const egoPop = isEgo ? hit(t, HURT, 6) + 0.8 * hit(t, UP, 5) : 0;
        const color = isEgo ? mixHex('#e8eefc', '#ff5a4a', red) : s.active ? '#e8eefc' : '#7c88a6';
        const o = ss(t, 0.35, 0.8) * (1 - ss(y, 1560, 1640)) * ss(y, 210, 260);
        return (
          <div key={i} style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${1 + 0.25 * egoPop})`, display: 'flex', gap: size * 0.45, alignItems: 'baseline', fontFamily: 'Sora', fontWeight: 600, fontSize: size, letterSpacing: '0.04em', opacity: o, textShadow: `0 2px 8px rgba(0,0,0,0.85)${isEgo && red > 0 ? ', 0 0 22px #ff3a1eaa' : s.active ? `, 0 0 16px ${s.tint}55` : ''}`}}>
            <span style={{color}}>{NAMES[i]}</span>
            {outK > 0 ? <span style={{color: '#ff5a5a', opacity: outK, transform: `scale(${1 + 0.5 * pop})`, display: 'inline-block', textShadow: `0 2px 8px rgba(0,0,0,0.85), 0 0 ${10 + 20 * pop}px #ff3a1e`}}>out</span> : null}
          </div>
        );
      })}
      <Live t={t} />
      <Cap t={t} y={300} at={[0.36, 0.62]} out={B(-19.75)} lines={['Who lasts', 'longest?']} accent="#ff5a5a" />
      <Cap t={t} y={300} at={[END_TXT, END_TXT + 0.52]} lines={['A hurt ego', 'is unbeatable.']} accent="#ff5a4a" />
    </AbsoluteFill>
  );
};

const darkness = (t: number) => Math.max(0.9 * (1 - seg(t, 0.25, 0.55)), seg(t, SG004_SECONDS - 0.35, SG004_SECONDS - 0.02));

export const SG004Full: React.FC<{withAudio?: boolean}> = ({withAudio = true}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const flash = 0.45 * hit(t, UP - 0.02, 7);
  const red = 0.14 * hit(t, HURT, 3) + 0.06 * gap(t) + 0.1 * hit(t, UP, 2.5);
  return (
    <AbsoluteFill style={{background: SG.bg.edge}}>
      <Stage look={SG} cam={cam(t)}>
        <World t={t} />
      </Stage>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,40,20,0) 42%, rgba(255,40,20,1) 100%)', opacity: red, mixBlendMode: 'screen'}} />
      <Over t={t} />
      <AbsoluteFill style={{background: '#fff0ea', opacity: flash}} />
      <AbsoluteFill style={{background: SG.bg.edge, opacity: darkness(t)}} />
      <Watermark />
      {withAudio ? <Audio src={staticFile('sg004/music.m4a')} /> : null}
      {void TINT}
    </AbsoluteFill>
  );
};
