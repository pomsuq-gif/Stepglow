import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, easeInOut, lerp, seg, ss} from '../nc001-work-smart/anim';
import * as THREE from 'three';
import {type Cam, makeCamera, project, Stage} from '../nc001-work-smart/kit3d';
import {Watermark} from '../../channels/stepglow/Brand';
import {SG} from '../sg002-start-small/look';
import {K3, W3} from '../sg003-same-bar/rig3';
import {beat, DROP, hit, shake} from './grid';
import {CAST, D, N, NAMES, PL, solveC, T, TINTS, TOP_Y, treadZ, XS} from './plan';
import {lightning, World} from './World';

export const SG006_FPS = 60;
export const SG006_SECONDS = 33.5;
export const SG006_FRAMES = Math.round(SG006_SECONDS * SG006_FPS);

const B = beat;
const E = easeInOut;
type C = {viewH: number; cx: number; cy: number; cz: number; pitch: number; yaw: number; roll: number; fov: number};
const mixC = (a: C, b: C, k: number): C => ({
  viewH: lerp(a.viewH, b.viewH, k),
  cx: lerp(a.cx, b.cx, k),
  cy: lerp(a.cy, b.cy, k),
  cz: lerp(a.cz, b.cz, k),
  pitch: lerp(a.pitch, b.pitch, k),
  yaw: lerp(a.yaw, b.yaw, k),
  roll: lerp(a.roll, b.roll, k),
  fov: lerp(a.fov, b.fov, k),
});

/** a climber's body (z, y) smoothed over 0.4 s so the camera does not ride the bob of every step */
const at = (i: number, t: number) => {
  const a = CAST[i](t);
  const b = CAST[i](t - 0.2);
  const c = CAST[i](t - 0.4);
  return {z: (a.z + b.z + c.z) / 3, y: (a.y + b.y + c.y) / 3};
};
const pair = (t: number) => {
  const o = at(2, t);
  const d = at(3, t);
  return {z: (o.z + d.z) / 2, y: (o.y + d.y) / 2};
};

/**
 * Shots, cut on the strong beats: the endless stair from below (title) → the weight lands → the group →
 * Motivation burns out (from the side) → the crowd below, Ego looks back and drops it → the two →
 * the storm (profile, lightning) → the break: from behind, the summit, Obsession walks on → the beacon → Obsession far away → the end.
 */
type Shot = [number, (t: number) => C];
const SHOTS: Shot[] = [
  // the scale of it: from behind the crowd, up the stair into the clouds
  [0, (t) => {
    const k = E(seg(t, 0, T.slam));
    return {viewH: lerp(9.8, 9.0, k), cx: 0.3, cy: lerp(3.0, 2.7, k), cz: lerp(3.4, 2.8, k), pitch: 3, yaw: 180 - 10 + 4 * k, roll: 0, fov: 30};
  }],
  // the weight lands
  [T.slam, (t) => ({viewH: lerp(5.6, 5.0, seg(t, T.slam, DROP)), cx: 0.1, cy: 1.05, cz: 0.1, pitch: 26, yaw: lerp(-44, -36, seg(t, T.slam, DROP)), roll: 0, fov: 30})],
  // the drop: in profile, the stair rising to the right — Motivation races ahead, Discipline keeps the beat
  [DROP, (t) => {
    const m = at(0, t);
    const d = at(3, t);
    const k = seg(t, DROP, B(4));
    return {viewH: lerp(6.4, 7.2, k), cx: 0, cy: (m.y + d.y) / 2 + 0.55, cz: (m.z + d.z) / 2, pitch: 14, yaw: lerp(-74, -66, k), roll: -2, fov: 30};
  }],
  // Motivation burns out, close from the front-left; the others pass him
  [B(4), (t) => {
    const m = at(0, Math.min(t, B(6)));
    const k = seg(t, B(4), B(9));
    return {viewH: lerp(4.4, 3.9, k), cx: XS[0] + 0.35, cy: m.y + 0.45, cz: m.z + 0.1, pitch: 26, yaw: lerp(-30, -22, k), roll: -1, fov: 28};
  }],
  // the group goes on; Motivation sits below them
  [B(9), (t) => {
    const g = at(1, t);
    return {viewH: 6.6, cx: 0.1, cy: g.y + 0.1, cz: g.z - 0.6, pitch: 38, yaw: lerp(8, -4, seg(t, B(9), B(12))), roll: 0, fov: 32};
  }],
  // high over Ego, down the whole stair to the crowd: their lights go out one by one
  [B(12), (t) => {
    const k = E(seg(t, B(12), B(14.5)));
    const g = at(1, Math.min(t, B(14.5)));
    return {viewH: lerp(12.5, 6.0, k), cx: lerp(-0.3, XS[1], k), cy: lerp(0.2, g.y + 0.2, k), cz: lerp(-2.6, g.z - 1.2, k), pitch: lerp(46, 40, k), yaw: lerp(-14, -22, k), roll: 0, fov: 32};
  }],
  // he lets go; the stone goes back down to where the crowd was
  [B(15), (t) => {
    const g = at(1, B(15));
    return {viewH: lerp(4.4, 4.9, seg(t, B(15), B(17))), cx: XS[1] + 0.1, cy: g.y + 0.45, cz: g.z, pitch: 20, yaw: lerp(-34, -26, seg(t, B(15), B(17))), roll: 1, fov: 28};
  }],
  // the two that are left
  [B(17), (t) => {
    const p = pair(t);
    return {viewH: 5.0, cx: 0.8, cy: p.y + 0.35, cz: p.z, pitch: 34, yaw: lerp(4, -8, seg(t, B(17), B(20))), roll: 0, fov: 30};
  }],
  // the storm, in profile against the sky
  [B(20), (t) => {
    const p = pair(t);
    return {viewH: lerp(5.4, 5.0, seg(t, B(20), B(24))), cx: 0.6, cy: p.y + 0.45, cz: p.z + 0.2, pitch: 6, yaw: 66, roll: -3, fov: 28};
  }],
  // Discipline: one step per beat, unmoved
  [B(24), (t) => {
    const d = at(3, t);
    return {viewH: 4.3, cx: XS[3] + 0.1, cy: d.y + 0.55, cz: d.z + 0.1, pitch: 22, yaw: lerp(30, 22, seg(t, B(24), B(26))), roll: 1, fov: 28};
  }],
  // Obsession tears up to the top
  [B(26), (t) => {
    const o = at(2, t);
    return {viewH: 4.4, cx: XS[2] + 0.2, cy: o.y + 0.4, cz: o.z, pitch: 8, yaw: 58, roll: -2, fov: 28};
  }],
  // the break: from behind, up at the summit; Obsession does not stop
  [B(28), (t) => {
    const k = E(seg(t, B(28), B(32)));
    return {viewH: lerp(7.4, 8.4, k), cx: lerp(1.7, 1.4, k), cy: lerp(TOP_Y + 1.0, TOP_Y + 1.5, k), cz: lerp(treadZ(N - 1), treadZ(N + 1), k), pitch: -5, yaw: 180 - 28 + 8 * k, roll: 0, fov: 30};
  }],
  // the beacon
  [B(32), (t) => {
    const k = E(seg(t, B(32), B(36)));
    return {viewH: lerp(4.4, 5.1, k), cx: XS[3] + 0.05, cy: TOP_Y + 0.95, cz: treadZ(N + 1) + 0.25, pitch: 10, yaw: lerp(40, 30, k), roll: 0, fov: 30};
  }],
  // Obsession, far away, still climbing
  [B(36), (t) => {
    const k = E(seg(t, B(36), B(40)));
    const o = at(2, t);
    return {viewH: lerp(8.5, 10, k), cx: lerp(1.0, 0.7, k), cy: lerp(TOP_Y + 2.2, (o.y + TOP_Y) / 2 + 1.6, k), cz: lerp(treadZ(N + PL + 3), o.z - 3, k), pitch: -3, yaw: 180 - 12, roll: 0, fov: 30};
  }],
  // the end: up and away — the beacon low in the frame, Obsession's light high on the stair
  [B(40), (t) => {
    const k = E(seg(t, B(40), T.end));
    const o = at(2, t);
    const dz = treadZ(N + 1);
    const span = Math.max(o.y - TOP_Y, 1);
    return {viewH: lerp(span * 1.9 + 4.5, span * 1.9 + 6, k), cx: lerp(0.9, 0.7, k), cy: (o.y + TOP_Y) / 2 + lerp(0.6, 1.0, k), cz: (o.z + dz) / 2, pitch: lerp(2, 6, k), yaw: 180 - 12 - 6 * k, roll: 0, fov: 30};
  }],
];

const camBase = (t: number): C => {
  let f = SHOTS[0][1];
  for (const [a, fn] of SHOTS) if (t >= a) f = fn;
  return f(t);
};

const PUNCH: [number, number][] = [
  [T.slam, 0.06],
  [DROP, 0.07],
  [B(4), 0.03],
  [T.motDrop, 0.04],
  [B(12), 0.03],
  [T.egoDrop, 0.04],
  [B(20), 0.07],
  [B(24), 0.03],
  [B(28), 0.04],
  [T.ignite, 0.1],
  [B(36), 0.03],
  [B(40), 0.03],
];

export const cam = (t: number): Cam => {
  const c = camBase(t);
  const p = PUNCH.reduce((m, [a, v]) => m + v * hit(t, a, 5), 0);
  const storm = ss(t, T.storm - 1, T.storm) * (1 - ss(t, T.ignite, T.ignite + 1));
  const [sx, sy] = shake(t, 0.04 * hit(t, T.slam, 5) + 0.03 * hit(t, DROP, 4) + 0.012 * storm + 0.05 * lightning(t) * storm + 0.04 * hit(t, T.ignite, 3.5));
  return {viewH: c.viewH * (1 - p), cx: c.cx + sx, cy: c.cy + sy, cz: c.cz, pitch: c.pitch, yaw: c.yaw, roll: c.roll + 1.5 * Math.sin(t * 0.9) * storm, fov: c.fov};
};

/* ───────────── captions ───────────── */

const shadow = '0 3px 2px rgba(0,0,0,0.55), 0 6px 26px rgba(0,0,0,0.85)';

const Cap: React.FC<{t: number; y: number; at: [number, number]; out?: number; lines: [string, string]; accent: string; size?: number; first?: string}> = ({t, y, at: a, out = 1e9, lines, accent, size = 84, first = '#f6f9ff'}) => {
  const fadeOut = 1 - clamp((t - out) / 0.3);
  return (
    <>
      {lines.map((s, i) => {
        const k = clamp((t - a[i]) / 0.3);
        const e = 1 - Math.pow(1 - k, 3);
        const o = e * fadeOut;
        if (o <= 0.001 || !s) return null;
        const col = i ? accent : first;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 540,
              top: y + i * size * 1.14,
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
  const size = clamp(0.12 * ppu, 34, 54);
  const C3 = makeCamera(c);
  const P = st.map((s, i) => {
    const j = solveC(s.rig);
    const hd = W3(j.head, [XS[i], 0, 0], K3);
    const top = Math.max(hd[1] + 0.3, s.stone.on ? s.stone.p[1] + 0.33 : -1e9);
    const [x, y] = project(c, hd[0], top + 0.14, hd[2]);
    return {x, y, d: C3.position.distanceTo(new THREE.Vector3(hd[0], hd[1], hd[2]))};
  });
  // a label that sits on a nearer one fades out
  const hidden = P.map((p, i) => P.reduce((m, q2, k) => (k !== i && q2.d < p.d && Math.abs(q2.x - p.x) < 230 && Math.abs(q2.y - p.y) < 70 ? Math.max(m, 1 - Math.max(Math.abs(q2.x - p.x) - 170, 0) / 60) : m), 0));
  return (
    <AbsoluteFill>
      {st.map((s, i) => {
        const {x, y} = P[i];
        const show = ss(t, T.slam + 0.2, T.slam + 0.6) * (1 - ss(t, B(28) - 0.3, B(28)));
        const gone = s.status ? ss(t, s.status.at + 3.2, s.status.at + 3.7) : 0;
        const o = show * ss(y, 330, 420) * (1 - ss(y, 1560, 1640)) * ss(x, 40, 110) * (1 - ss(x, 970, 1040)) * s.label * (1 - hidden[i]) * (1 - gone);
        if (o < 0.01) return null;
        const a = s.status?.at ?? 1e9;
        const sk = clamp((t - a) / 0.22);
        const pop = sk > 0 ? Math.exp(-(t - a) * 6) : 0;
        const dim = s.spent > 0.2;
        return (
          <div key={i} style={{position: 'absolute', left: x, top: y, transform: 'translate(-50%, -100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'Sora', fontWeight: 600, opacity: o, lineHeight: 1.05, whiteSpace: 'nowrap'}}>
            {sk > 0 ? (
              <span style={{fontSize: size * 0.95, color: s.status!.color, opacity: sk, transform: `scale(${1 + 0.6 * pop})`, letterSpacing: '0.02em', textShadow: `0 2px 8px rgba(0,0,0,0.9), 0 0 ${12 + 22 * pop}px ${s.status!.color}`}}>{s.status!.text}</span>
            ) : null}
            <span style={{fontSize: size * 0.78, color: dim ? '#9aa4bc' : TINTS[i], letterSpacing: '0.04em', textShadow: `0 2px 8px rgba(0,0,0,0.9), 0 0 16px ${TINTS[i]}66`}}>{NAMES[i]}</span>
          </div>
        );
      })}
      <Cap t={t} y={300} at={[0.15, 0.55]} out={T.slam + 1.6} lines={['Who quits', 'first?']} accent="#ffd66b" size={96} />
      <Cap t={t} y={300} at={[B(4), B(6)]} out={B(11.5)} lines={['Mile 10.', 'Motivation burns out.']} accent={TINTS[0]} />
      <Cap t={t} y={300} at={[B(13), T.egoDrop]} out={B(19.5)} lines={["Mile 30. No one's watching.", 'Ego quits.']} accent={TINTS[1]} size={70} />
      <Cap t={t} y={300} at={[B(20), B(22)]} out={B(27.5)} lines={['Mile 50.', 'Only two left.']} accent="#dfe8ff" />
      <Cap t={t} y={300} at={[T.cap1, T.cap1 + 0.5]} out={T.cap2 - 0.3} lines={['Discipline does', "what's required."]} accent={TINTS[3]} />
      <Cap t={t} y={300} at={[T.cap2, T.cap2 + 0.5]} out={T.cap3 - 0.3} lines={['Obsession', "can't stop."]} accent={TINTS[2]} />
      <Cap t={t} y={300} at={[T.cap3, T.cap3 + 0.5]} lines={['Which one', 'carries you?']} accent="#ffd66b" size={92} />
    </AbsoluteFill>
  );
};

const darkness = (t: number) => Math.max(0.9 * (1 - seg(t, 0.0, 0.25)), seg(t, SG006_SECONDS - 0.35, SG006_SECONDS - 0.02));

export const SG006Full: React.FC<{withAudio?: boolean}> = ({withAudio = true}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const c = cam(t);
  const storm = t > T.storm - 1 && t < T.ignite ? 1 : 0;
  const flash = 0.13 * lightning(t) * storm + 0.75 * hit(t, T.ignite - 0.02, 4.5);
  const gold = t > T.ignite - 0.1;
  return (
    <AbsoluteFill style={{background: SG.bg.edge}}>
      <Stage look={SG} cam={c}>
        <World t={t} cam={c} />
      </Stage>
      <Over t={t} />
      <AbsoluteFill style={{background: gold ? 'radial-gradient(ellipse 70% 50% at 55% 55%, #fffaf0 0%, #fff4dc 60%, #ffe6b8 100%)' : 'radial-gradient(ellipse 80% 60% at 50% 20%, #eef3ff 0%, #c9d6ff 70%, #9fb2ff 100%)', opacity: clamp(flash), mixBlendMode: gold ? 'normal' : 'screen'}} />
      <AbsoluteFill style={{background: SG.bg.edge, opacity: darkness(t)}} />
      <Watermark />
      {withAudio ? <Audio src={staticFile('sg006/music.m4a')} /> : null}
    </AbsoluteFill>
  );
};

export {D};
