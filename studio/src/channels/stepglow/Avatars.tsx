import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Cam, Figure, Glow, Part, Pose, Stage, roundedBox, useLook} from '../../episodes/nc001-work-smart/kit3d';
import type {Mat} from '../../episodes/nc001-work-smart/looks';
import {STAND} from '../../episodes/nc001-work-smart/anim';
import {SG} from '../../episodes/sg002-start-small/look';

/**
 * STEPGLOW avatars with the stickman (800×800, read in a 98 px circle).
 * Same world as the videos: porcelain stickman, navy night, the light in the chest burning gold.
 */

const GOLD = '#ffd66b';
const S = 800;
const cam = (c: Omit<Cam, 'aspect'>): Cam => ({...c, aspect: 1});

const blockGeo = (w: number, h: number, d: number) => roundedBox(w, h, d, 0.04, 6);

const Block: React.FC<{x: number; y?: number; w: number; h: number; d?: number; hot?: boolean}> = ({x, y = 0, w, h, d = 0.7, hot}) => {
  const lk = useLook();
  const cool: Mat = {...lk.prop, top: '#dfe8ff', bottom: '#5d6d94', rimAmt: 0.35, emit: 0.92};
  const gold: Mat = {...lk.accent, emit: 1.35};
  return (
    <>
      <Part geo={blockGeo(w, h, d)} m={hot ? gold : cool} y0={y} y1={y + h} position={[x, y, 0]} />
      {hot ? <Glow p={[x, y + h, 0.4]} w={w * 2.6} h={w * 1.6} color={GOLD} a={0.55} /> : null}
    </>
  );
};

const RAISE: Pose = {...STAND, lean: -3, head: [-0.08, 0.12], handB: [0.22, 0.97], elbowB: 1, handF: [0.14, -0.84]};
const CLIMB: Pose = {pelvis: [0.1, 1.06], lean: 12, head: [0.12, 0.04], handF: [-0.42, -0.6], elbowF: -1, handB: [0.45, -0.48], elbowB: -1, footF: [0.42, 0.34], footB: [-0.12, 0]};

/** D — on top of a burning gold step, one arm up */
export const SGAvatarD: React.FC = () => (
  <Stage look={SG} cam={cam({viewH: 2.6, cx: 0, cy: 1.1, pitch: 8, yaw: 0, fov: 26})} width={S} height={S}>
    <Glow p={[0, 1.2, -1.5]} w={3.6} h={3.6} color="#3b5a9a" a={0.6} />
    <Glow p={[0, 0.9, -0.4]} w={2.2} h={2.2} color={GOLD} a={0.16} />
    <Block x={0} y={-0.02} w={1.05} h={0.34} hot />
    <Figure pose={RAISE} cast={SG.a} x={0.02} y={0.32} dir={1} yaw={62} energy={1} tint={GOLD} />
  </Stage>
);

/** E — a close portrait: the head and the light in the chest */
export const SGAvatarE: React.FC = () => (
  <Stage look={SG} cam={cam({viewH: 1.18, cx: 0.06, cy: 1.27, pitch: 3, yaw: 0, fov: 24})} width={S} height={S}>
    <Glow p={[0, 1.3, -1]} w={2.4} h={2.4} color="#3b5a9a" a={0.7} />
    <Figure pose={{...STAND, head: [0.05, 0.06], handF: [0.12, -0.86], handB: [-0.06, -0.86]}} cast={SG.a} x={0} dir={1} yaw={38} energy={1} tint={GOLD} />
    <Glow p={[0.05, 1.03, 0.3]} w={0.9} h={0.9} color={GOLD} a={0.3} />
  </Stage>
);

/** G — mid-climb on three steps, the top one already burning */
export const SGAvatarG: React.FC = () => {
  const w = 0.5;
  const h = 0.22;
  return (
    <Stage look={SG} cam={cam({viewH: 2.7, cx: 0.12, cy: 0.98, pitch: 7, yaw: 12, fov: 26})} width={S} height={S}>
      <Glow p={[0.2, 1.1, -1.5]} w={3.6} h={3.6} color="#3b5a9a" a={0.6} />
      {[0, 1, 2].map((i) => (
        <Block key={i} x={-0.5 + i * w} w={w} h={(i + 1) * h} hot={i === 2} />
      ))}
      <Figure pose={CLIMB} cast={SG.a} x={-0.5 + w * 0.82} y={h} dir={1} yaw={22} energy={1} tint={GOLD} />
    </Stage>
  );
};

/** F — flat 2D mark: a white stickman stepping up three gold steps */
export const SGAvatarF: React.FC = () => {
  const ink = '#f4f8ff';
  const sw = 40;
  const limb = {stroke: ink, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none'};
  return (
    <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 46%, #22355c 0%, #111b30 45%, #050812 100%)'}}>
      <svg width={S} height={S} viewBox="0 0 800 800">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe9a6" />
            <stop offset="1" stopColor="#ff9d2e" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* three steps */}
        <g filter="url(#glow)">
          <rect x={170} y={560} width={160} height={70} rx={14} fill="url(#g)" opacity={0.55} />
          <rect x={330} y={490} width={160} height={140} rx={14} fill="url(#g)" opacity={0.75} />
          <rect x={490} y={420} width={160} height={210} rx={14} fill="url(#g)" />
        </g>
        {/* the stickman, one foot on the middle step, the other reaching for the top */}
        <g filter="url(#soft)">
          <circle cx={428} cy={214} r={56} fill={ink} />
          <path d="M 414 282 L 382 392" {...limb} />
          <path d="M 382 392 L 356 446 L 372 490" {...limb} />
          <path d="M 382 392 L 462 372 L 520 420" {...limb} />
          <path d="M 404 314 L 452 370 L 500 346" {...limb} />
          <path d="M 404 314 L 352 362 L 314 404" {...limb} />
          <circle cx={402} cy={330} r={20} fill="#ffd66b" />
        </g>
      </svg>
    </AbsoluteFill>
  );
};
