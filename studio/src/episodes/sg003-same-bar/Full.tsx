import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, easeInOut, lerp, pulse, seg, ss} from '../nc001-work-smart/anim';
import {Cam, project, Stage} from '../nc001-work-smart/kit3d';
import {mixHex} from '../nc001-work-smart/world';
import {Watermark} from '../../channels/stepglow/Brand';
import {SG} from '../sg002-start-small/look';
import {Title} from '../sg002-start-small/title';
import {beat, hit, shake} from './grid';
import {CAST, DIS_GOLD, NAMES, OBS_REL, OBS_SNAP, TINT, XS, egoShow} from './plan';
import {HB, K3, solve3, W3} from './rig3';
import {World} from './World';

export const SG003_FPS = 60;
export const SG003_SECONDS = 28.85;
export const SG003_FRAMES = Math.round(SG003_SECONDS * SG003_FPS);

const B = beat;
type C = Required<Pick<Cam, 'viewH' | 'cx' | 'cy' | 'pitch' | 'yaw' | 'fov'>>;
const mixC = (a: C, b: C, k: number): C => ({viewH: lerp(a.viewH, b.viewH, k), cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), pitch: lerp(a.pitch, b.pitch, k), yaw: lerp(a.yaw, b.yaw, k), fov: lerp(a.fov, b.fov, k)});
const WIDE: C = {viewH: 7.9, cx: 0, cy: 1.75, pitch: 6, yaw: 0, fov: 22};

/** one take broken by hard cuts on the beat: wide lineup → (drop, flash) medium on Obsession → each quitter → Obsession's fall → Discipline → wide */
export const cam = (t: number): Cam => {
  let c: C;
  if (t < B(0)) {
    const open = easeInOut(seg(t, 0, 1.7));
    c = {...WIDE, viewH: lerp(7.2, 7.9, open) - 0.9 * ss(t, B(-4), B(-0.05)), cx: 0.1 * ss(t, B(-4), B(0)), cy: lerp(1.9, 1.75, open), yaw: lerp(-5, 5, seg(t, 0, B(0)))};
  } else if (t < B(12.5)) {
    const follow = pulse(t, B(2.8), B(3.8), B(5.6));
    c = {viewH: lerp(3.9, 4.3, ss(t, B(0), B(12.5))) + 0.5 * follow, cx: 0.05 - 0.15 * follow, cy: 2.0 - 0.45 * follow, pitch: 3 + 4 * follow, yaw: lerp(14, -12, ss(t, B(3), B(12.5))), fov: 24};
    c.viewH *= 1 - 0.1 * hit(t, B(0), 3) - 0.06 * hit(t, OBS_SNAP, 5);
  } else if (t < B(22)) {
    const k = ss(t, B(12.5), B(22));
    c = {viewH: lerp(4.9, 4.4, k), cx: lerp(-0.5, -0.4, k), cy: 1.62, pitch: 2, yaw: lerp(-24, -15, k), fov: 26};
  } else if (t < B(32)) {
    const k = ss(t, B(22), B(32));
    c = {viewH: lerp(4.9, 4.4, k), cx: lerp(1.25, 1.12, k), cy: 1.62, pitch: 2, yaw: lerp(24, 15, k), fov: 26};
  } else if (t < B(39.5)) {
    const f = ss(t, OBS_REL, OBS_REL + 1.3);
    c = {viewH: lerp(4.0, 4.3, f), cx: lerp(0.05, 0.2, f), cy: lerp(2.0, 1.45, f), pitch: lerp(3, 10, f), yaw: lerp(-8, 6, ss(t, B(32), B(39.5))), fov: 24};
    c.viewH *= 1 - 0.05 * hit(t, OBS_REL + 1.0, 6);
  } else {
    const k = easeInOut(seg(t, B(41.3), B(44.6)));
    const hero: C = {viewH: lerp(3.3, 3.0, ss(t, B(39.5), B(41.5))), cx: 0.82, cy: 1.95, pitch: -5, yaw: lerp(12, 6, ss(t, B(39.5), B(41.5))), fov: 26};
    c = mixC(hero, {...WIDE, viewH: 7.9, cy: 1.7, pitch: 7, yaw: -4}, k);
  }
  const [sx, sy] = shake(t, 0.05 * hit(t, OBS_SNAP, 4) + 0.03 * hit(t, B(0), 5) + 0.025 * hit(t, OBS_REL + 1.0, 6));
  return {...c, cx: c.cx + sx, cy: c.cy + sy};
};

/* ───────────── overlay: counters over the heads, names under the feet, captions ───────────── */

const pxPerUnit = (c: Cam) => 1920 / c.viewH;

const Num: React.FC<{x: number; y: number; size: number; color: string; glow: string; o: number; pop: number; children: React.ReactNode}> = ({x, y, size, color, glow, o, pop, children}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      transform: `translate(-50%, -50%) scale(${1 + 0.32 * pop})`,
      fontFamily: 'Sora',
      fontWeight: 600,
      fontSize: size,
      color,
      opacity: o,
      letterSpacing: '-0.01em',
      fontVariantNumeric: 'tabular-nums',
      textShadow: `0 3px 10px rgba(0,0,0,0.7), 0 0 ${18 + 24 * pop}px ${glow}`,
      whiteSpace: 'pre',
    }}
  >
    {children}
  </div>
);

const Over: React.FC<{t: number}> = ({t}) => {
  const c = cam(t);
  const ppu = pxPerUnit(c);
  const st = CAST.map((f) => f(t));
  const gold = ss(t, DIS_GOLD, DIS_GOLD + 0.5);
  return (
    <AbsoluteFill>
      {st.map((s, i) => {
        const [x, y] = project(c, XS[i], 2.98, 0);
        const [nx, ny] = project(c, XS[i], 0, 1.15);
        const pop = Math.exp(-Math.max(0, t - s.last) * 9) * (t >= s.last ? 1 : 0);
        let color = s.active ? '#ffffff' : '#7c88a6';
        let glow = s.active ? s.tint + 'aa' : 'rgba(0,0,0,0)';
        if (i === 2 && t >= B(0)) {
          color = mixHex('#ff5a4a', '#5a2a30', ss(t, B(32), OBS_REL + 0.6));
          glow = t < OBS_REL ? '#ff3a1eaa' : 'rgba(0,0,0,0)';
        }
        if (i === 3) {
          color = mixHex('#ffffff', TINT.gold, gold);
          glow = mixHex(TINT.dis, TINT.gold, gold) + 'cc';
        }
        const size = clamp(0.2 * ppu, 44, 84);
        const nsize = clamp(0.105 * ppu, 24, 44);
        const nameO = (s.active ? 0.9 : 0.5) * (1 - ss(ny, 1590, 1650));
        return (
          <React.Fragment key={i}>
            <Num x={x} y={y} size={size} color={color} glow={glow} o={(s.active ? 1 : 0.62) * ss(y, 320, 400)} pop={s.active || i === 2 ? pop : 0}>
              {s.count}
            </Num>
            <div style={{position: 'absolute', left: nx, top: ny, transform: 'translate(-50%, -50%)', fontFamily: 'Sora', fontWeight: 600, fontSize: nsize, color: i === 3 ? mixHex('#e8eefc', TINT.gold, gold) : '#c9d4ec', opacity: nameO, letterSpacing: '0.01em', textShadow: '0 2px 8px rgba(0,0,0,0.8)'}}>{NAMES[i]}</div>
          </React.Fragment>
        );
      })}
      {/* Ego: "Too easy." while he does them one-handed, then "?!" when the arm goes */}
      {(() => {
        const [x, y] = project(c, XS[1], 2.98, 0);
        const o = egoShow(t);
        const size = clamp(0.085 * ppu, 24, 40);
        const e = st[1];
        const head = W3(solve3(e.rig).head, e.root, K3);
        const [hx, hy] = project(c, head[0] + 0.34, head[1] + 0.3, head[2]);
        const q = pulse(t, B(2.3), B(2.6), B(4.6));
        const qpop = Math.exp(-Math.max(0, t - B(2.3)) * 8);
        return (
          <>
            {o > 0.01 ? <div style={{position: 'absolute', left: x, top: y + size * 1.55, transform: 'translate(-50%, -50%)', fontFamily: 'Sora', fontWeight: 600, fontSize: size, color: '#ffe6fb', opacity: o, textShadow: `0 2px 8px rgba(0,0,0,0.8), 0 0 18px ${TINT.ego}88`}}>Too easy.</div> : null}
            {q > 0.01 ? <Num x={hx} y={hy} size={clamp(0.2 * ppu, 50, 90)} color="#ffffff" glow={TINT.ego + 'cc'} o={q} pop={qpop}>?!</Num> : null}
          </>
        );
      })()}
      {/* Motivation: "…" once he sits */}
      {(() => {
        const m = st[0];
        const head = W3(solve3(m.rig).head, m.root, K3);
        const [hx, hy] = project(c, head[0], head[1] + HB.headR * K3 + 0.18, head[2]);
        const o = ss(t, B(-1.6), B(-1));
        if (o <= 0) return null;
        const dots = Math.min(3, 1 + Math.floor(((t - B(-1.6)) / 0.4) % 4));
        return <div style={{position: 'absolute', left: hx, top: hy, transform: 'translate(-50%, -50%)', fontFamily: 'Sora', fontWeight: 600, fontSize: clamp(0.11 * ppu, 28, 54), color: '#aab6d2', opacity: o * 0.85, textShadow: '0 2px 8px rgba(0,0,0,0.8)'}}>{'.'.repeat(dots).padEnd(3, ' ')}</div>;
      })()}
      <Title x={540} y={250} t={t} at={0.15} out={1.55}>Same bar.</Title>
      <Title x={540} y={250} t={t} at={B(4)} out={B(10.5)}>He didn't stop.</Title>
      <Title x={540} y={270} t={t} at={B(12.5)} out={B(19.5)}>{'Ego quit the moment\nit got real.'}</Title>
      <Title x={540} y={250} t={t} at={B(22)} out={B(29)}>Talent got bored.</Title>
      <Title x={540} y={250} t={t} at={B(32)} out={B(39)}>Obsession burns out.</Title>
      <Title x={540} y={250} t={t} at={B(39.5)}>Discipline never stops.</Title>
      {t > B(41.5) ? (
        <div style={{position: 'absolute', left: 540, top: 335, transform: 'translate(-50%, -50%)', fontFamily: 'Sora', fontWeight: 600, fontSize: 40, color: '#dfe7fb', opacity: ss(t, B(41.5), B(42.2)), textShadow: '0 3px 2px rgba(0,0,0,0.55), 0 6px 26px rgba(0,0,0,0.85)'}}>Which one are you?</div>
      ) : null}
    </AbsoluteFill>
  );
};

const darkness = (t: number) => Math.max(1 - seg(t, 0, 0.25), seg(t, SG003_SECONDS - 0.35, SG003_SECONDS - 0.02));

export const SG003Full: React.FC<{withAudio?: boolean}> = ({withAudio = true}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const flash = 0.92 * hit(t, B(0) - 0.03, 5.5);
  const red = pulse(t, B(0), B(0.5), B(3)) * 0.1 + 0.18 * hit(t, OBS_SNAP, 4);
  return (
    <AbsoluteFill style={{background: SG.bg.edge}}>
      <Stage look={SG} cam={cam(t)}>
        <World t={t} />
      </Stage>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 60% at 50% 45%, rgba(255,40,20,0) 40%, rgba(255,40,20,1) 100%)', opacity: red, mixBlendMode: 'screen'}} />
      <Over t={t} />
      <AbsoluteFill style={{background: '#fff4f0', opacity: flash}} />
      <AbsoluteFill style={{background: SG.bg.edge, opacity: darkness(t)}} />
      <Watermark />
      {withAudio ? <Audio src={staticFile('sg003/music.m4a')} /> : null}
    </AbsoluteFill>
  );
};
