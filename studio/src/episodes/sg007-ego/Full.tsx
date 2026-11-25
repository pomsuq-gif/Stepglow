import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, easeInOut, lerp, seg, ss} from '../nc001-work-smart/anim';
import {type Cam, project, Stage, type V3} from '../nc001-work-smart/kit3d';
import {Watermark} from '../../channels/stepglow/Brand';
import {SG} from '../sg002-start-small/look';
import {K3, W3} from '../sg003-same-bar/rig3';
import {hit, K, SECONDS, shake} from './grid';
import {CAST, TINT, tw, WALL} from './plan';
import {clasp, PIN, solveR} from './rig';
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

/**
 * The camera, as in the reference: one take that follows Ego. It settles on the table while he fights (pushing in
 * as the fight gets harder), drifts with him when he walks to the next one, and holds on every win so the hand is
 * seen going all the way down. Its own shots only where the reference cuts: the lights going out, the flight,
 * the board, the closing crane.
 */
const FIGHTS: [number, number, number][] = [
  [1.45, K.w1 + 0.95, 0],
  [6.35, K.w2 + 0.95, 1],
  [10.5, K.w3 + 1.05, 2],
  [18.2, K.broke + 1.0, 3],
  [26.45, K.slam + 0.2, 4],
];
const egoPel = (t: number): V3 => {
  const r = CAST[0](t).rig.pel;
  return [r[0] * K3, 0, r[2] * K3];
};
/** where the follow camera looks, and how tight, before smoothing */
const rawFollow = (t: number): [V3, number] => {
  const e = egoPel(t);
  let w = 0;
  let c: V3 = e;
  let vh = 5.2;
  for (const [a, b, i] of FIGHTS) {
    const k = ss(t, a - 0.5, a + 0.3) * (1 - ss(t, b - 0.2, b + 0.6));
    if (k > w) {
      w = k;
      const tc = tw(i);
      // between the table and Ego, so he stays in frame when he stands up after a win
      c = [lerp(tc[0], e[0], 0.42), 0, lerp(tc[2], e[2], 0.42)];
      // push in while the fight lasts; hard fights get closer
      const hard = i >= 2 ? 1 : 0.5;
      vh = 4.8 - (0.6 + 0.5 * hard) * ss(t, a, b - 0.6);
    }
  }
  const f: V3 = [lerp(e[0], c[0], w), 0, lerp(e[2], c[2], w)];
  return [f, lerp(5.2, vh, w)];
};
const follow = (t: number): C => {
  // a soft lag: the average of the last 0.6 s
  let sx = 0;
  let sz = 0;
  let sv = 0;
  let sw = 0;
  for (let k = 0; k < 12; k++) {
    const wk = 12 - k;
    const [f, vh] = rawFollow(Math.max(0, t - k * 0.05));
    sx += f[0] * wk;
    sz += f[2] * wk;
    sv += vh * wk;
    sw += wk;
  }
  // pull back a little for "Who's next?!" (arms up)
  const up = ss(t, K.w3 + 0.1, K.w3 + 0.5) * (1 - ss(t, K.dark - 0.1, K.dark));
  return {viewH: sv / sw + 1.5 * up, cx: sx / sw + 0.05 - 0.35 * up, cy: 1.02 + 0.5 * up, cz: sz / sw + 0.1, pitch: 13 + 1.5 * Math.sin(t * 0.21), yaw: -20 + 3 * Math.sin(t * 0.13), fov: 30, roll: 0};
};

const SHOT_END = SECONDS;
const W5 = tw(4);
const wallW = WALL.x * K3;
export const cam = (t: number): Cam => {
  let c: C;
  if (t < 1.6) {
    // the opening: wide on the arena, Ego walks in, the camera settles on table 1
    const wide: C = {viewH: 6.2, cx: 0.6, cy: 1.1, cz: -0.6, pitch: 16, yaw: -24, fov: 32, roll: 0};
    c = mixC(wide, follow(t), easeInOut(seg(t, 0.2, 1.6)));
  } else if (t >= K.dark && t < K.t4) {
    // lights out: down the row from Ego's side — Ego near, Obsession's spot, Discipline's far away
    const a: C = {viewH: 5.4, cx: tw(3)[0] + 0.3, cy: 1.1, cz: tw(3)[2] + 0.1, pitch: 10, yaw: -70, fov: 30, roll: 0};
    const b: C = {...a, viewH: 5.0};
    c = mixC(a, b, easeInOut(seg(t, K.dark, K.t4)));
  } else if (t >= K.slam && t < K.blink) {
    // the flight, side on
    c = {viewH: 5.6, cx: (wallW + W5[0]) / 2 - 0.2, cy: 1.45, cz: W5[2], pitch: 6, yaw: 4, fov: 32, roll: 0};
  } else if (t >= K.blink && t < K.all) {
    // at the board: Ego slumped, stars; slow push
    const a: C = {viewH: 3.2, cx: wallW + 0.55, cy: 0.7, cz: W5[2], pitch: 11, yaw: 40, fov: 30, roll: 0};
    c = mixC(a, {...a, viewH: 2.5, yaw: 32}, easeInOut(seg(t, K.blink, K.all)));
  } else if (t >= K.all) {
    // the closing crane down the row from the first table: the beaten on the floor, Discipline standing at the end
    const a: C = {viewH: 6.6, cx: tw(2)[0], cy: 0.7, cz: tw(2)[2], pitch: 10, yaw: -76, fov: 32, roll: 0};
    c = mixC(a, {...a, viewH: 7.2, pitch: 13, yaw: -72}, easeInOut(seg(t, K.all, SHOT_END)));
  } else c = follow(t);
  // a nudge on every win and the hit (no shaking)
  const wins = [K.w1, K.w2, K.w3, K.broke];
  const punch = wins.reduce((m, w) => m + 0.06 * hit(t, w, 5), 0) + 0.1 * hit(t, K.slam + 0.36, 5);
  c.viewH *= 1 - punch;
  const [sx, sy] = shake(t, 0.008 * hit(t, K.slam + 0.36, 8));
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

const CapCtx = React.createContext<React.CSSProperties>({});
const Caption: React.FC<{t: number}> = ({t}) => {
  const box = React.useContext(CapCtx);
  const c = CAPS.find(([a, b]) => t >= a && t < b);
  if (!c) return null;
  const [a, b, parts, size = 62] = c;
  const k = clamp((t - a) / 0.16);
  const e = 1 - Math.pow(1 - k, 3);
  const o = e * (1 - clamp((t - (b - 0.06)) / 0.06));
  return (
    <div style={{position: 'absolute', left: 540, top: 1470, transform: `translate(-50%, -50%) scale(${1 + 0.12 * (1 - e)})`, whiteSpace: 'pre', fontFamily: 'var(--capf)', fontWeight: 'var(--capw)' as unknown as number, WebkitTextStroke: 'var(--stroke)', paintOrder: 'stroke fill', fontSize: size, letterSpacing: '0.005em', opacity: o, textShadow: shadow}}>
      <div style={{display: 'inline-block', ...box}}>
      {parts.map(([s, col], i) => (
        <span key={i} style={{color: col ?? 'var(--txt)', textShadow: col ? `var(--shd), 0 0 30px ${col}77` : 'var(--shd)'}}>
          {s}
        </span>
      ))}
      </div>
    </div>
  );
};

const Title: React.FC<{t: number}> = ({t}) => {
  const o = ss(t, 0.15, 0.4) * (1 - ss(t, K.t1 - 0.12, K.t1));
  if (o <= 0) return null;
  const k = ss(t, 0.15, 0.5);
  return (
    <div style={{position: 'absolute', left: 540, top: 1440, transform: `translate(-50%, -50%) scale(${1.15 - 0.15 * k})`, textAlign: 'center', opacity: o, fontFamily: 'var(--capf)', fontWeight: 'var(--capw)' as unknown as number, WebkitTextStroke: 'var(--stroke)', paintOrder: 'stroke fill'}}>
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
      <div style={{position: 'absolute', left: 540, top: 1380, transform: `translate(-50%, -50%) scale(${1.2 - 0.2 * k})`, opacity: k, whiteSpace: 'pre', fontFamily: 'var(--capf)', fontWeight: 'var(--capw)' as unknown as number, WebkitTextStroke: 'var(--stroke)', paintOrder: 'stroke fill', fontSize: 104, letterSpacing: '-0.01em'}}>
        <span style={{color: TINT.dis, textShadow: `${shadow}, 0 0 40px ${TINT.dis}aa`}}>Discipline</span>
        <span style={{color: '#f4f7ff', textShadow: shadow}}>{' > '}</span>
        <span style={{color: TINT.ego, textShadow: `${shadow}, 0 0 40px ${TINT.ego}99`}}>Ego</span>
      </div>
      <div style={{position: 'absolute', left: 540, top: 1500, transform: 'translate(-50%, -50%)', opacity: k2, fontFamily: 'var(--capf)', fontWeight: 'var(--capw)' as unknown as number, WebkitTextStroke: 'var(--stroke)', paintOrder: 'stroke fill', fontSize: 54, color: '#f4f7ff', textShadow: shadow}}>Agree? ↓</div>
    </>
  );
};

/** speech bubbles above Ego's head */
const BUBBLES: [number, number, string][] = [
  [K.w1 + 0.55, 4.95, 'Next.'],
  [K.w2 + 0.7, 9.3, 'Too easy.'],
  [K.w3 + 0.45, K.dark, "Who's next?!"],
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
      <div style={{background: '#f7f9ff', color: '#0b1020', padding: '14px 30px', borderRadius: 40, fontFamily: 'var(--capf)', fontWeight: 'var(--capw)' as unknown as number, WebkitTextStroke: 'var(--stroke)', paintOrder: 'stroke fill', fontSize: loud ? 52 : 46, whiteSpace: 'pre', boxShadow: `0 8px 30px rgba(0,0,0,0.6), 0 0 0 4px ${TINT.ego}`}}>{s}</div>
      <div style={{position: 'absolute', left: '50%', bottom: -16, width: 0, height: 0, transform: 'translateX(-50%)', borderLeft: '14px solid transparent', borderRight: '14px solid transparent', borderTop: '18px solid #f7f9ff'}} />
    </div>
  );
};

/** names over the heads of the opponents while they are in play */
const LABEL_ON: [number, number, number][] = [
  [1, 0.2, 5.6],
  [2, K.t2, 10.0],
  [3, K.t3, 16.1],
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
        <div key={i} style={{position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', opacity: o * (1 - 0.5 * s.spent), fontFamily: 'var(--tagf)', fontWeight: 700, textTransform: 'var(--tagt)' as React.CSSProperties['textTransform'], fontSize: 34, letterSpacing: '0.04em', color: col, textShadow: `0 2px 8px rgba(0,0,0,0.9), 0 0 18px ${col}66`}}>
          {['', 'Motivation', 'Laziness', 'Talent', 'Obsession', 'Discipline'][i]}
        </div>
      );
    })}
  </>
);

/** the impact star on the clasp at every win: white rays and a ring, 0.3 s */
const Impact: React.FC<{t: number; c: Cam}> = ({t, c}) => {
  const hits: [number, number, string][] = [
    [K.w1 + 0.1, 0, '#ff5a4a'],
    [K.w2 + 0.2, 1, '#ff5a4a'],
    [K.w3 + 0.1, 2, '#ff5a4a'],
    [K.broke + 0.08, 3, '#b77cff'],
  ];
  return (
    <>
      {hits.map(([at, i, col]) => {
        const k = (t - at) / 0.32;
        if (k < 0 || k > 1) return null;
        const tc = tw(i);
        const cl = clasp(PIN);
        const [x, y] = project(c, tc[0] + cl[0] * K3, cl[1] * K3, tc[2] + cl[2] * K3);
        const e = 1 - Math.pow(1 - k, 3);
        const o = 1 - k;
        return (
          <svg key={at} width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
            {Array.from({length: 10}, (_, n) => {
              const a = (n / 10) * Math.PI * 2 + 0.3;
              const r0 = 20 + 40 * e;
              const r1 = 70 + 150 * e * (n % 2 ? 0.7 : 1);
              return <line key={n} x1={x + Math.cos(a) * r0} y1={y + Math.sin(a) * r0} x2={x + Math.cos(a) * r1} y2={y + Math.sin(a) * r1} stroke={n % 3 ? '#ffffff' : col} strokeWidth={10 * o + 2} strokeLinecap="round" opacity={o} />;
            })}
            <circle cx={x} cy={y} r={30 + 90 * e} fill="none" stroke="#ffffff" strokeWidth={6 * o} opacity={o} />
            <circle cx={x} cy={y} r={26 * (1 - k)} fill="#ffffff" opacity={o} />
          </svg>
        );
      })}
    </>
  );
};

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
  <div style={{position: 'absolute', inset: 0, ['--txt' as string]: sty.text, ['--shd' as string]: sty.textShadow}}>
    <CapCtx.Provider value={sty.cap ?? {}}>{children}</CapCtx.Provider>
  </div>
);

const darkness = (t: number) => Math.max(1 - seg(t, 0.0, 0.3), seg(t, SECONDS - 0.4, SECONDS - 0.05));

export const SG007Full: React.FC<{withAudio?: boolean; style?: string}> = ({withAudio = true, style = 'blocks'}) => {
  const sty: Sty = STY[style] ?? STY.toon;
  const light = sty.fig === 'clay' || sty.fig === 'ink' || ['paper', 'comic', 'show', 'colosseum'].includes(sty.env ?? '');
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const c = cam(t);
  const wins = [K.w1, K.w2, K.w3, K.broke];
  const flash = wins.reduce((m, w, i) => Math.max(m, (i === 1 ? 0.15 : 0.4) * hit(t, w, 9)), 0) + 0.7 * hit(t, K.slam, 7) + 0.25 * hit(t, K.slam + 0.36, 9);
  const ego = CAST[0](t);
  const red = sty.id.startsWith('blocks') ? 0 : 0.22 * clamp(ego.aura - 0.3) * (t < K.slam ? 1 : 0) + 0.15 * hit(t, K.w3, 3);
  const blocks = sty.id.startsWith('blocks');
  const vars = {
    ['--capf' as string]: blocks ? 'Nunito' : 'Sora',
    ['--capw' as string]: blocks ? 900 : 600,
    ['--stroke' as string]: blocks ? '3px #1a0e0a' : '0px transparent',
    ['--tagf' as string]: blocks ? 'Barlow Condensed' : 'Sora',
    ['--tagt' as string]: blocks ? 'uppercase' : 'none',
  } as React.CSSProperties;
  return (
    <AbsoluteFill style={{background: SG.bg.edge, ...vars}}>
      <AbsoluteFill style={{filter: blocks ? 'contrast(1.1) saturate(1.14) brightness(1.03)' : undefined}}>
      <Stage look={sty.look} cam={c}>
        <StyCtx.Provider value={sty}>
          <World t={t} />
        </StyCtx.Provider>
      </Stage>
      </AbsoluteFill>
      {blocks ? (
        <>
          {/* grade: warm light in the middle, cool teal shadows at the edges, a soft top-down falloff */}
          <AbsoluteFill style={{background: 'radial-gradient(ellipse 70% 55% at 50% 48%, rgba(255,170,90,0.22) 0%, rgba(255,170,90,0) 70%)', mixBlendMode: 'soft-light'}} />
          <AbsoluteFill style={{background: 'radial-gradient(ellipse 90% 75% at 50% 50%, rgba(10,40,70,0) 50%, rgba(10,40,70,0.55) 100%)', mixBlendMode: 'multiply'}} />
          <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.35) 100%)'}} />
        </>
      ) : null}
      {sty.fig === 'flat' || sty.fig === 'ink' || sty.fig === 'paper' ? <FlatFigs t={t} c={c} sty={sty} /> : null}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 62% at 50% 50%, rgba(255,40,20,0) 45%, rgba(255,40,20,1) 100%)', opacity: red * (light ? 0.35 : 1), mixBlendMode: light ? 'multiply' : 'screen'}} />
      <Speed t={t} at={K.w3} colors={['#ff4a3a', '#ffffff']} />
      <Speed t={t} at={K.slam} colors={['#3cc8ff', '#ffffff']} life={0.5} />
      <Impact t={t} c={c} />
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
