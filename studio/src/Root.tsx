import React from 'react';
import {Composition} from 'remotion';
import {NC001Full, NC001_FPS, NC001_FRAMES} from './episodes/nc001-work-smart/Full';
import {SG002Full, SG002_FPS, SG002_FRAMES} from './episodes/sg002-start-small/Full';
import {SGAvatarA, SGAvatarB, SGAvatarC, SGBannerA, SGBannerB, SGBannerC, SGWatermark} from './channels/stepglow/Brand';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="SG-Watermark" component={SGWatermark} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="SG-AvatarA" component={SGAvatarA} durationInFrames={1} fps={30} width={800} height={800} />
      <Composition id="SG-AvatarB" component={SGAvatarB} durationInFrames={1} fps={30} width={800} height={800} />
      <Composition id="SG-AvatarC" component={SGAvatarC} durationInFrames={1} fps={30} width={800} height={800} />
      <Composition id="SG-BannerA" component={SGBannerA} durationInFrames={1} fps={30} width={2560} height={1440} />
      <Composition id="SG-BannerB" component={SGBannerB} durationInFrames={1} fps={30} width={2560} height={1440} />
      <Composition id="SG-BannerC" component={SGBannerC} durationInFrames={1} fps={30} width={2560} height={1440} />
      <Composition id="NC001-Full" component={NC001Full} durationInFrames={NC001_FRAMES} fps={NC001_FPS} width={1080} height={1920} defaultProps={{withAudio: true}} />
      <Composition id="SG002-Full" component={SG002Full} durationInFrames={SG002_FRAMES} fps={SG002_FPS} width={1080} height={1920} defaultProps={{withAudio: true}} />
    </>
  );
};
