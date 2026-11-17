import React from 'react';
import {Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {seg} from '../nc001-work-smart/anim';
import {Cam, Stage} from '../nc001-work-smart/kit3d';
import {LOOKS, Look} from '../nc001-work-smart/looks';
import {Watermark} from '../../channels/stepglow/Brand';
import {Over1, S1, World1, cam1} from './S1';
import {Over2, S2, World2, cam2} from './S2';
import {Over3, S3, World3, cam3} from './S3';
import {Over4, S4, World4, cam4} from './S4';

export const SG002_FPS = 30;
export const SG002_SECONDS = 33.5;
export const SG002_FRAMES = Math.round(SG002_SECONDS * SG002_FPS);

type SceneDef = {from: number; to: number; cam: (t: number) => Cam; World: React.FC<{t: number}>; Over: React.FC<{t: number; look: Look; cam: Cam}>; cut?: boolean};
const SCENES: SceneDef[] = [
  {...S1, cam: cam1, World: World1, Over: Over1},
  {...S2, cam: cam2, World: World2, Over: Over2},
  {...S3, cam: cam3, World: World3, Over: Over3},
  {...S4, cam: cam4, World: World4, Over: Over4},
];

/** scenes open out of the dark and sink back into it; a `cut` scene starts without the dip */
const darkness = (t: number) => {
  let d = 1 - seg(t, 0, 0.35);
  for (const s of SCENES) {
    if (s.from > 0 && !s.cut) d = Math.max(d, seg(t, s.from - 0.4, s.from) * (1 - seg(t, s.from, s.from + 0.4)));
  }
  return Math.max(d, seg(t, SG002_SECONDS - 0.55, SG002_SECONDS - 0.05));
};

export const SG002Full: React.FC<{withAudio?: boolean}> = ({withAudio = true}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const look = LOOKS.core;
  const sc = SCENES.find((s) => t >= s.from && t < s.to) ?? SCENES[SCENES.length - 1];
  const cam = sc.cam(t);
  return (
    <>
      <Stage look={look} cam={cam} dark={darkness(t)} overlay={<sc.Over t={t} look={look} cam={cam} />}>
        <sc.World t={t} />
      </Stage>
      <Watermark />
      {withAudio ? <Audio src={staticFile('sg002/music.m4a')} /> : null}
    </>
  );
};
