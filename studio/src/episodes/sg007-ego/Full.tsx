import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, easeInOut, lerp, seg, ss} from '../nc001-work-smart/anim';
import {type Cam, project, Stage} from '../nc001-work-smart/kit3d';
import {Watermark} from '../../channels/stepglow/Brand';
import {SG} from '../sg002-start-small/look';
import {K3, W3} from '../sg003-same-bar/rig3';
import {hit, K, SECONDS, shake} from './grid';
import {CAST, TINT, tw, WALL} from './plan';
import {solveR} from './rig';
import {World} from './World';
import {FlatFigs} from './flat2d';
import {STY, StyCtx, type Sty} from './styles';

export const SG007_FPS = 60;
export const SG007_SECONDS = SECONDS;
export const SG007_FRAMES = Math.round(SECONDS * SG007_FPS);

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
/** a camera on table i: look-at offset, framing height, angles */
const on = (i: number, o: Partial<C> & {dx?: number; dz?: number} = {}): C => {
  const c = tw(i);
  return {viewH: 3, cy: 0.95, pitch: 12, yaw: -16, fov: 30, roll: 0, ...o, cx: c[0] + (o.dx ?? 0), cz: c[2] + (o.dz ?? 0)};
};
const egoAt = (t: number) => W3(solveR(CAST[0](t).rig).chest, [0, 0, 0], K3);

/** the shots, cut on the reference's beats; each one moves from a to b */
const SHOTS: [number, C, C][] = [
  [0, {...on(0, {dx: 0.2, dz: -1.2}), viewH: 5.6, cy: 0.75, pitch: 20, yaw: -32, fov: 34, roll: -3}, {...on(0, {dx: 0.1, dz: -0.8}), viewH: 4.4, cy: 0.85, pitch: 17, yaw: -24, fov: 34, roll: -1}],
  [K.t1, on(0, {viewH: 4.3, yaw: -22, roll: -2, cy: 0.85}), on(0, {viewH: 3.8, yaw: -10, roll: 1, cy: 0.85})],
  [K.w1, on(0, {viewH: 2.9, dx: -0.6, yaw: -8, pitch: 6, cy: 0.9}), on(0, {viewH: 3.6, dx: -0.4, dz: -0.9, yaw: -14, pitch: 9, cy: 0.9})],
  [K.t2, on(1, {viewH: 3.3, yaw: 18, roll: 2}), on(1, {viewH: 2.9, yaw: 8, roll: 0})],
  [K.w2, on(1, {viewH: 3.4, dx: 0.3, yaw: 26, pitch: 7, cy: 0.75}), on(1, {viewH: 3.8, dx: 0.1, dz: -0.6, yaw: 18, pitch: 10, cy: 0.8})],
  [K.t3, on(2, {viewH: 3.3, yaw: -20}), on(2, {viewH: 2.9, yaw: -12})],
  [K.losing, on(2, {viewH: 4.1, yaw: -34, pitch: 6, cy: 0.85, roll: 5}), on(2, {viewH: 3.7, yaw: -28, pitch: 5, cy: 0.85, roll: 7})],
  [K.w3, on(2, {viewH: 3.0, dx: -0.6, yaw: -10, pitch: -9, cy: 1.15, roll: -5}), on(2, {viewH: 3.3, dx: -0.6, yaw: -16, pitch: -7, cy: 1.15, roll: -3})],
  [K.dark, {...on(2, {dx: 0.4, dz: -1.6}), viewH: 6.2, cy: 0.9, pitch: 18, yaw: -14, fov: 32, roll: 0}, {...on(2, {dx: 0.4, dz: -2.0}), viewH: 5.4, cy: 0.9, pitch: 15, yaw: -10, fov: 32, roll: 0}],
  [K.t4, on(3, {viewH: 3.2, yaw: -18}), on(3, {viewH: 2.9, yaw: -6})],
  [K.never, on(3, {viewH: 3.2, yaw: 34, pitch: 5, roll: -5, dx: 0.1}), on(3, {viewH: 3.0, yaw: 28, pitch: 4, roll: -7, dx: 0.1})],
  [K.wont, on(3, {viewH: 3.1, yaw: -34, pitch: 5, roll: 6, dx: -0.1}), on(3, {viewH: 2.9, yaw: -28, pitch: 4, roll: 8, dx: -0.1})],
  [K.broke, on(3, {viewH: 3.4, yaw: 8, pitch: 14, cy: 0.8}), on(3, {viewH: 3.7, yaw: 12, pitch: 15, cy: 0.8})],
  [K.s4, on(3, {viewH: 3.3, yaw: 22, pitch: 8, cy: 0.8, dx: 0.2}), on(3, {viewH: 3.5, yaw: 16, pitch: 9, cy: 0.85})],
  [K.t5, on(4, {viewH: 3.8, yaw: -8, pitch: 10, dx: -0.3}), on(4, {viewH: 3.3, yaw: -4, pitch: 10, dx: -0.2})],
  [K.sure, on(4, {viewH: 3.0, yaw: -22, pitch: 8}), on(4, {viewH: 2.7, yaw: -18, pitch: 7, roll: 2})],
  [K.seen, on(4, {viewH: 3.2, yaw: 26, pitch: 6, dx: 0.1}), on(4, {viewH: 2.8, yaw: 18, pitch: 5, dx: 0.1})],
  [K.slam, {...on(4, {dx: -1.25, dz: 0.2}), viewH: 4.8, cy: 0.75, pitch: 8, yaw: 4, fov: 34, roll: 0}, {...on(4, {dx: -1.35, dz: 0.2}), viewH: 4.4, cy: 0.7, pitch: 8, yaw: 8, fov: 34, roll: 0}],
  [K.blink, {viewH: 2.6, cx: WALL.x * K3 + 0.6, cy: 0.55, cz: WALL.z * K3, pitch: 8, yaw: 60, fov: 30, roll: 0}, {viewH: 2.3, cx: WALL.x * K3 + 0.55, cy: 0.55, cz: WALL.z * K3, pitch: 7, yaw: 52, fov: 30, roll: 0}],
  [K.all, {viewH: 7.6, cx: 0.9, cy: 0.4, cz: -5.4, pitch: 34, yaw: -36, fov: 34, roll: 0}, {viewH: 9.2, cx: 0.6, cy: 0.4, cz: -6.2, pitch: 46, yaw: -46, fov: 34, roll: 0}],
];
const SHOT_END = SECONDS;

export const cam = (t: number): Cam => {
  let i = SHOTS.length - 1;
  while (i > 0 && t < SHOTS[i][0]) i--;
  const [t0, a, b] = SHOTS[i];
  const t1 = i + 1 < SHOTS.length ? SHOTS[i + 1][0] : SHOT_END;
  const c = mixC(a, b, easeInOut(seg(t, t0, t1)));
  // punches and shakes on the wins and the hit
  const wins = [K.w1, K.w2, K.w3, K.broke];
  const punch = wins.reduce((m, w) => m + 0.07 * hit(t, w, 6), 0) + 0.12 * hit(t, K.slam, 5) + 0.08 * hit(t, K.slam + 0.36, 6);
  c.viewH *= 1 - punch;
  c.roll += 3 * hit(t, K.w3, 4) - 4 * hit(t, K.slam, 4);
  const tremble = 0.012 * ss(t, 12.3, 13) * (1 - ss(t, K.w3, K.w3 + 0.1)) + 0.01 * ss(t, 18.6, 19) * (1 - ss(t, K.broke, K.broke + 0.2)) + 0.008 * ss(t, K.sure, K.seen) * (1 - ss(t, K.slam, K.slam + 0.1));
  const [sx, sy] = shake(t, tremble + wins.reduce((m, w) => m + 0.03 * hit(t, w, 8), 0) + 0.06 * hit(t, K.slam, 6) + 0.05 * hit(t, K.slam + 0.36, 7));
  return {...c, cx: c.cx + sx, cy: c.cy + sy};
};

/* ───────────── text ───────────── */

const shadow = '0 3px 2px rgba(0,0,0,0.6), 0 6px 26px rgba(0,0,0,0.9)';
type Part = [string, string?];
const CAPS: [number, number, Part[], number?][] = [
  [K.t1, K.w1, [['Table 1: '], ['Motivation.', TINT.mot]]],
  [K.w1, K.t2, [['Gone in 2 seconds.']]],
  [K.t2, K.w2, [['Table 2: '], ['Laziness.', TINT.laz]]],
  [K.w2, K.t3, [["Didn't even try."]]],
  [K.t3, K.losing, [['Table 3: '], ['Talent.', TINT.tal]]],
  [K.losing, K.w3, [['Ego', TINT.ego], [' was losing…']]],
  [K.w3, K.dark, [['Ego 3 — 0. ', TINT.ego], ['Unstoppable.']]],
  [K.dark, K.more, [['Then the lights went out.']]],
  [K.more, K.t4, [['…more were waiting.']]],
  [K.t4, K.never, [['Table 4: '], ['Obsession.', TINT.obs]]],
  [K.never, K.wont, [['Obsession', TINT.obs], [' never stops…']]],
  [K.wont, K.broke, [['But '], ['Ego', TINT.ego], [" won't lose."]]],
  [K.broke, K.s4, [['He broke his own arm.', TINT.obs]]],
  [K.s4, K.t5, [['Ego 4 — 0.', TINT.ego]]],
  [K.t5, K.sure, [['Last table: '], ['Discipline.', TINT.dis]]],
  [K.sure, K.seen, [['Ego', TINT.ego], [' was so sure…']]],
  [K.seen, K.slam, [['Discipline', TINT.dis], [' had seen it all.']]],
  [K.blink, K.all, [['Discipline', TINT.dis], [" didn't blink."]]],
  [K.all, K.except, [['Ego', TINT.ego], [' beat everyone…']]],
  [K.except, K.end, [['…except the one who shows up daily.']], 52],
];

const Caption: React.FC<{t: number}> = ({t}) => {
  const c = CAPS.find(([a, b]) => t >= a && t < b);
  if (!c) return null;
  const [a, b, parts, size = 62] = c;
  const k = clamp((t - a) / 0.16);
  const e = 1 - Math.pow(1 - k, 3);
  const o = e * (1 - clamp((t - (b - 0.06)) / 0.06));
  return (
    <div style={{position: 'absolute', left: 540, top: 1470, transform: `translate(-50%, -50%) scale(${1 + 0.12 * (1 - e)})`, whiteSpace: 'pre', fontFamily: 'Sora', fontWeight: 600, fontSize: size, letterSpacing: '0.005em', opacity: o, textShadow: shadow}}>
      {parts.map(([s, col], i) => (
        <span key={i} style={{color: col ?? 'var(--txt)', textShadow: col ? `var(--shd), 0 0 30px ${col}77` : 'var(--shd)'}}>
          {s}
        </span>
      ))}
    </div>
  );
};

const Title: React.FC<{t: number}> = ({t}) => {
  const o = ss(t, 0.15, 0.4) * (1 - ss(t, K.t1 - 0.12, K.t1));
  if (o <= 0) return null;
  const k = ss(t, 0.15, 0.5);
  return (
    <div style={{position: 'absolute', left: 540, top: 1440, transform: `translate(-50%, -50%) scale(${1.15 - 0.15 * k})`, textAlign: 'center', opacity: o, fontFamily: 'Sora', fontWeight: 600}}>
      <div style={{fontSize: 96, letterSpacing: '-0.01em', whiteSpace: 'pre', textShadow: shadow}}>
        <span style={{color: TINT.ego, textShadow: `${shadow}, 0 0 40px ${TINT.ego}99`}}>Ego</span>
        <span style={{color: '#f4f7ff'}}> vs everyone</span>
      </div>
      <div style={{fontSize: 34, letterSpacing: '0.32em', color: '#9fb0d6', marginTop: 8, textShadow: shadow}}>arm wrestling</div>
    </div>
  );
};

const End: React.FC<{t: number}> = ({t}) => {
  const k = ss(t, K.end, K.end + 0.3);
  if (k <= 0) return null;
  const k2 = ss(t, K.end + 0.5, K.end + 0.8);
  return (
    <>
      <div style={{position: 'absolute', left: 540, top: 1380, transform: `translate(-50%, -50%) scale(${1.2 - 0.2 * k})`, opacity: k, whiteSpace: 'pre', fontFamily: 'Sora', fontWeight: 600, fontSize: 104, letterSpacing: '-0.01em'}}>
        <span style={{color: TINT.dis, textShadow: `${shadow}, 0 0 40px ${TINT.dis}aa`}}>Discipline</span>
        <span style={{color: '#f4f7ff', textShadow: shadow}}>{' > '}</span>
        <span style={{color: TINT.ego, textShadow: `${shadow}, 0 0 40px ${TINT.ego}99`}}>Ego</span>
      </div>
      <div style={{position: 'absolute', left: 540, top: 1500, transform: 'translate(-50%, -50%)', opacity: k2, fontFamily: 'Sora', fontWeight: 600, fontSize: 54, color: '#f4f7ff', textShadow: shadow}}>Agree? ↓</div>
    </>
  );
};

/** speech bubbles above Ego's head */
const BUBBLES: [number, number, string][] = [
  [K.w1 + 0.2, K.t2 - 0.5, 'Next.'],
  [K.w2 + 0.35, K.t3 - 0.3, 'Too easy.'],
  [K.w3 + 0.2, K.dark, "Who's next?!"],
  [K.s4 + 0.05, K.t5 - 0.1, 'Is that all?'],
  [K.t5 + 0.15, K.sure - 0.15, "This one's easy."],
];
const Bubble: React.FC<{t: number; c: Cam}> = ({t, c}) => {
  const b = BUBBLES.find(([a, e]) => t >= a && t < e);
  if (!b) return null;
  const [a, e, s] = b;
  const hd = W3(solveR(CAST[0](t).rig).head, [0, 0, 0], K3);
  const [x, y] = project(c, hd[0], hd[1] + 0.36, hd[2]);
  const k = clamp((t - a) / 0.18);
  const pop = 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k);
  const o = k * (1 - clamp((t - e + 0.1) / 0.1));
  const loud = s.includes('!');
  return (
    <div style={{position: 'absolute', left: clamp(x, 240, 840), top: Math.max(y, 250), transform: `translate(-50%, -100%) scale(${pop * (0.7 + 0.3 * k)})`, transformOrigin: '50% 100%', opacity: o}}>
      <div style={{background: '#f7f9ff', color: '#0b1020', padding: '14px 30px', borderRadius: 40, fontFamily: 'Sora', fontWeight: 600, fontSize: loud ? 52 : 46, whiteSpace: 'pre', boxShadow: `0 8px 30px rgba(0,0,0,0.6), 0 0 0 4px ${TINT.ego}`}}>{s}</div>
      <div style={{position: 'absolute', left: '50%', bottom: -16, width: 0, height: 0, transform: 'translateX(-50%)', borderLeft: '14px solid transparent', borderRight: '14px solid transparent', borderTop: '18px solid #f7f9ff'}} />
    </div>
  );
};

/** names over the heads of the opponents while they are in play */
const LABEL_ON: [number, number, number][] = [
  [1, 0.2, 5.6],
  [2, 5.8, 10.0],
  [3, 10.0, 16.1],
  [4, 16.72, 25.6],
  [5, K.more, 31.6],
];
const Labels: React.FC<{t: number; c: Cam}> = ({t, c}) => (
  <>
    {LABEL_ON.map(([i, a, b]) => {
      if (t < a || t > b) return null;
      const s = CAST[i](t);
      const hd = W3(solveR(s.rig).head, [0, 0, 0], K3);
      const [x, y] = project(c, hd[0], hd[1] + 0.32, hd[2]);
      const o = ss(t, a, a + 0.2) * (1 - ss(t, b - 0.2, b)) * ss(y, 200, 260) * (1 - ss(y, 1300, 1380)) * ss(x, 40, 90) * (1 - ss(x, 990, 1040));
      if (o <= 0) return null;
      const col = TINT[(['', 'mot', 'laz', 'tal', 'obs', 'dis'] as const)[i] as 'mot'];
      return (
        <div key={i} style={{position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', opacity: o * (1 - 0.5 * s.spent), fontFamily: 'Sora', fontWeight: 600, fontSize: 34, letterSpacing: '0.04em', color: col, textShadow: `0 2px 8px rgba(0,0,0,0.9), 0 0 18px ${col}66`}}>
          {['', 'Motivation', 'Laziness', 'Talent', 'Obsession', 'Discipline'][i]}
        </div>
      );
    })}
  </>
);

/** radial speed lines burst (the comeback, the hit) */
const Speed: React.FC<{t: number; at: number; colors: [string, string]; life?: number}> = ({t, at, colors, life = 0.42}) => {
  const k = (t - at) / life;
  if (k < 0 || k > 1) return null;
  const n = 64;
  const o = Math.sin(Math.PI * Math.min(1, k * 1.6)) * (1 - k) * 1.4;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: clamp(o), mixBlendMode: 'screen'}}>
      {Array.from({length: n}, (_, i) => {
        const a = (i / n) * Math.PI * 2 + Math.sin(i * 12.9898) * 0.04;
        const r0 = 430 + 240 * Math.abs(Math.sin(i * 78.233)) - 200 * k;
        const r1 = 1500;
        const w = 4 + 10 * Math.abs(Math.sin(i * 3.3));
        const cx = 540;
        const cy = 900;
        return <line key={i} x1={cx + Math.cos(a) * r0} y1={cy + Math.sin(a) * r0} x2={cx + Math.cos(a) * r1} y2={cy + Math.sin(a) * r1} stroke={colors[i % 3 === 0 ? 0 : 1]} strokeWidth={w} strokeLinecap="round" />;
      })}
    </svg>
  );
};

/** caption colour per style: plain words take the style's text colour */
const StyText: React.FC<{sty: Sty; children: React.ReactNode}> = ({sty, children}) => (
  <div style={{position: 'absolute', inset: 0, ['--txt' as string]: sty.text, ['--shd' as string]: sty.textShadow}}>{children}</div>
);

const darkness = (t: number) => Math.max(1 - seg(t, 0.0, 0.3), seg(t, SECONDS - 0.4, SECONDS - 0.05));

export const SG007Full: React.FC<{withAudio?: boolean; style?: string}> = ({withAudio = true, style = 'toon'}) => {
  const sty: Sty = STY[style] ?? STY.toon;
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const c = cam(t);
  const wins = [K.w1, K.w2, K.w3, K.broke];
  const flash = wins.reduce((m, w, i) => Math.max(m, (i === 1 ? 0.15 : 0.4) * hit(t, w, 9)), 0) + 0.7 * hit(t, K.slam, 7) + 0.25 * hit(t, K.slam + 0.36, 9);
  const ego = CAST[0](t);
  const red = 0.22 * clamp(ego.aura - 0.3) * (t < K.slam ? 1 : 0) + 0.15 * hit(t, K.w3, 3);
  return (
    <AbsoluteFill style={{background: SG.bg.edge}}>
      <Stage look={sty.look} cam={c}>
        <StyCtx.Provider value={sty}>
          <World t={t} />
        </StyCtx.Provider>
      </Stage>
      {sty.fig === 'flat' || sty.fig === 'ink' ? <FlatFigs t={t} c={c} sty={sty} /> : null}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 62% at 50% 50%, rgba(255,40,20,0) 45%, rgba(255,40,20,1) 100%)', opacity: red * (sty.fig === 'clay' || sty.fig === 'ink' ? 0.4 : 1), mixBlendMode: sty.fig === 'clay' || sty.fig === 'ink' ? 'multiply' : 'screen'}} />
      <Speed t={t} at={K.w3} colors={['#ff4a3a', '#ffffff']} />
      <Speed t={t} at={K.slam} colors={['#3cc8ff', '#ffffff']} life={0.5} />
      <Labels t={t} c={c} />
      <Bubble t={t} c={c} />
      <Title t={t} />
      <StyText sty={sty}>
        <Caption t={t} />
      </StyText>
      <End t={t} />
      <AbsoluteFill style={{background: '#f2f6ff', opacity: flash}} />
      <AbsoluteFill style={{background: SG.bg.edge, opacity: darkness(t)}} />
      <Watermark />
      {withAudio ? <Audio src={staticFile('sg007/music.m4a')} /> : null}
    </AbsoluteFill>
  );
};
