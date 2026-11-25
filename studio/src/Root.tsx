import React from 'react';
import {Composition} from 'remotion';
import {NC001Full, NC001_FPS, NC001_FRAMES} from './episodes/nc001-work-smart/Full';
import {SG002Full, SG002_FPS, SG002_FRAMES} from './episodes/sg002-start-small/Full';
import {SG003Full, SG003_FPS, SG003_FRAMES} from './episodes/sg003-same-bar/Full';
import {SG004Full, SG004_FPS, SG004_FRAMES} from './episodes/sg004-hurt-ego/Full';
import {SG005Full, SG005_FPS, SG005_FRAMES} from './episodes/sg005-top/Full';
import {SG006Full, SG006_FPS, SG006_FRAMES} from './episodes/sg006-quit/Full';
import {SG007Full, SG007_FPS, SG007_FRAMES, SG007_SECONDS} from './episodes/sg007-ego/Full';
import {SGAvatarD, SGAvatarE, SGAvatarF, SGAvatarG} from './channels/stepglow/Avatars';
import {SGAvatarA, SGAvatarB, SGAvatarC, SGBannerA, SGBannerB, SGBannerC, SGWatermark} from './channels/stepglow/Brand';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="SG-Watermark" component={SGWatermark} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="SG-AvatarA" component={SGAvatarA} durationInFrames={1} fps={30} width={800} height={800} />
      <Composition id="SG-AvatarB" component={SGAvatarB} durationInFrames={1} fps={30} width={800} height={800} />
      <Composition id="SG-AvatarC" component={SGAvatarC} durationInFrames={1} fps={30} width={800} height={800} />
      <Composition id="SG-AvatarD" component={SGAvatarD} durationInFrames={1} fps={30} width={800} height={800} />
      <Composition id="SG-AvatarE" component={SGAvatarE} durationInFrames={1} fps={30} width={800} height={800} />
      <Composition id="SG-AvatarF" component={SGAvatarF} durationInFrames={1} fps={30} width={800} height={800} />
      <Composition id="SG-AvatarG" component={SGAvatarG} durationInFrames={1} fps={30} width={800} height={800} />
      <Composition id="SG-BannerA" component={SGBannerA} durationInFrames={1} fps={30} width={2560} height={1440} />
      <Composition id="SG-BannerB" component={SGBannerB} durationInFrames={1} fps={30} width={2560} height={1440} />
      <Composition id="SG-BannerC" component={SGBannerC} durationInFrames={1} fps={30} width={2560} height={1440} />
      <Composition id="NC001-Full" component={NC001Full} durationInFrames={NC001_FRAMES} fps={NC001_FPS} width={1080} height={1920} defaultProps={{withAudio: true}} />
      <Composition id="SG002-Full" component={SG002Full} durationInFrames={SG002_FRAMES} fps={SG002_FPS} width={1080} height={1920} defaultProps={{withAudio: true}} />
      <Composition id="SG003-Full" component={SG003Full} durationInFrames={SG003_FRAMES} fps={SG003_FPS} width={1080} height={1920} defaultProps={{withAudio: true}} />
      <Composition id="SG004-Full" component={SG004Full} durationInFrames={SG004_FRAMES} fps={SG004_FPS} width={1080} height={1920} defaultProps={{withAudio: true}} />
      <Composition id="SG005-Full" component={SG005Full} durationInFrames={SG005_FRAMES} fps={SG005_FPS} width={1080} height={1920} defaultProps={{withAudio: true}} />
      <Composition id="SG006-Full" component={SG006Full} durationInFrames={SG006_FRAMES} fps={SG006_FPS} width={1080} height={1920} defaultProps={{withAudio: true}} />
      <Composition id="SG007-Full" component={SG007Full} durationInFrames={SG007_FRAMES} fps={SG007_FPS} width={1080} height={1920} defaultProps={{withAudio: true}} />
      <Composition id="SG007-Draft30" component={SG007Full} durationInFrames={Math.round(SG007_SECONDS * 30)} fps={30} width={1080} height={1920} defaultProps={{withAudio: true}} />
    </>
  );
};
