import React from 'react';
import {Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {seg} from './anim';
import {Cam, Stage} from './kit3d';
import {LOOKS, Look} from './looks';
import {Watermark} from '../../channels/stepglow/Brand';
import {Over1, S1, World1, cam1} from './S1';
import {Over2, S2, World2, cam2} from './S2';
import {Over3, S3, World3, cam3} from './S3';
import {Over4, S4, World4, cam4} from './S4';
import {Over5, S5, World5, cam5} from './S5';
import {Over6, S6, World6, cam6} from './S6';

export const NC001_FPS = 30;
export const NC001_SECONDS = 33.5;
export const NC001_FRAMES = Math.round(NC001_SECONDS * NC001_FPS);

type SceneDef = {from: number; to: number; cam: (t: number) => Cam; World: React.FC<{t: number}>; Over: React.FC<{t: number; look: Look; cam: Cam}>};
const SCENES: SceneDef[] = [
  {...S1, cam: cam1, World: World1, Over: Over1},
  {...S2, cam: cam2, World: World2, Over: Over2},
  {...S3, cam: cam3, World: World3, Over: Over3},
  {...S4, cam: cam4, World: World4, Over: Over4},
  {...S5, cam: cam5, World: World5, Over: Over5},
  {...S6, cam: cam6, World: World6, Over: Over6},
];

/** every scene opens out of the dark and sinks back into it, like the reference */
const darkness = (t: number) => {
  let d = 1 - seg(t, 0, 0.35);
  for (const s of SCENES) {
    if (s.from > 0) d = Math.max(d, seg(t, s.from - 0.42, s.from) * (1 - seg(t, s.from, s.from + 0.4)));
  }
  return Math.max(d, seg(t, NC001_SECONDS - 0.5, NC001_SECONDS - 0.05));
};

export const NC001Full: React.FC<{withAudio?: boolean; look?: string}> = ({withAudio = true, look: lookId = 'core'}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const look = LOOKS[lookId];
  const sc = SCENES.find((s) => t >= s.from && t < s.to) ?? SCENES[SCENES.length - 1];
  const cam = sc.cam(t);
  return (
    <>
      <Stage look={look} cam={cam} dark={darkness(t)} overlay={<sc.Over t={t} look={look} cam={cam} />}>
        <sc.World t={t} />
      </Stage>
      <Watermark />
      {withAudio ? <Audio src={staticFile('nc001/music.m4a')} /> : null}
    </>
  );
};
