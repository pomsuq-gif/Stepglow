import {Config} from '@remotion/cli/config';

// SwiftShader-ANGLE gives us software WebGL (Three.js) inside headless Chromium.
Config.setChromiumOpenGlRenderer('swangle');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setConcurrency(4);
Config.setOverwriteOutput(true);
