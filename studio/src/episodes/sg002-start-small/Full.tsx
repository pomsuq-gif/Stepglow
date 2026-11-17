import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {seg} from '../nc001-work-smart/anim';
import {Cam, Stage, W, H} from '../nc001-work-smart/kit3d';
import type {Look} from '../nc001-work-smart/looks';
import {Watermark} from '../../channels/stepglow/Brand';
import {SG} from './look';
import {S1, S1L, S1R, Over1} from './S1';
import {S2, S2L, S2R, Over2} from './S2';
import {S3, S3F, Over3} from './S3';
import {S4, S4F, Over4} from './S4';

export const SG002_FPS = 30;
export const SG002_SECONDS = 33.5;
export const SG002_FRAMES = Math.round(SG002_SECONDS * SG002_FPS);

export type Panel = {cam: (t: number) => Cam; World: React.FC<{t: number}>};
type SceneDef = {from: number; to: number; cut?: boolean; Over: React.FC<{t: number; look: Look}>; full?: Panel; left?: Panel; right?: Panel};
const SCENES: SceneDef[] = [
  {...S1, left: S1L, right: S1R, Over: Over1},
  {...S2, left: S2L, right: S2R, Over: Over2},
  {...S3, full: S3F, Over: Over3},
  {...S4, full: S4F, Over: Over4},
];

/** scenes open out of the dark and sink back into it; a `cut` scene starts on a hard cut */
const darkness = (t: number) => {
  let d = 1 - seg(t, 0, 0.3);
  for (const s of SCENES) {
    if (s.from > 0 && !s.cut) d = Math.max(d, seg(t, s.from - 0.36, s.from) * (1 - seg(t, s.from, s.from + 0.36)));
  }
  return Math.max(d, seg(t, SG002_SECONDS - 0.6, SG002_SECONDS - 0.05));
};

const HALF = W / 2;

const PanelView: React.FC<{p: Panel; t: number; left: boolean}> = ({p, t, left}) => (
  <div style={{position: 'absolute', left: left ? 0 : HALF, top: 0, width: HALF, height: H, overflow: 'hidden'}}>
    <Stage look={SG} cam={{...p.cam(t), aspect: HALF / H}} width={HALF} height={H}>
      <p.World t={t} />
    </Stage>
  </div>
);

export const SG002Full: React.FC<{withAudio?: boolean}> = ({withAudio = true}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const sc = SCENES.find((s) => t >= s.from && t < s.to) ?? SCENES[SCENES.length - 1];
  return (
    <AbsoluteFill style={{background: SG.bg.edge}}>
      {sc.full ? (
        <Stage look={SG} cam={sc.full.cam(t)}>
          <sc.full.World t={t} />
        </Stage>
      ) : (
        <>
          <PanelView p={sc.left!} t={t} left />
          <PanelView p={sc.right!} t={t} left={false} />
          {/* the seam between the two worlds */}
          <div style={{position: 'absolute', left: HALF - 1.5, top: 0, width: 3, height: H, background: 'linear-gradient(180deg, rgba(150,180,255,0) 0%, rgba(150,180,255,0.35) 30%, rgba(150,180,255,0.35) 70%, rgba(150,180,255,0) 100%)'}} />
          <div style={{position: 'absolute', left: HALF - 0.5, top: 0, width: 1, height: H, background: '#02040a'}} />
        </>
      )}
      <sc.Over t={t} look={SG} />
      <AbsoluteFill style={{background: SG.bg.edge, opacity: darkness(t)}} />
      <Watermark />
      {withAudio ? <Audio src={staticFile('sg002/music.m4a')} /> : null}
    </AbsoluteFill>
  );
};
