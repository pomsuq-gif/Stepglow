// Render frame 0 (or FRAME) of several compositions with one bundle.
// Usage: node scripts/stills_multi.mjs <outDir> <compositionId> [compositionId...]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

const [outDir, ...ids] = process.argv.slice(2);
const scale = Number(process.env.SCALE ?? 0.5);
const frame = Number(process.env.FRAME ?? 0);
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
for (const id of ids) {
  const inputProps = {withAudio: false, px: scale};
  const composition = await selectComposition({serveUrl, id, inputProps});
  const output = path.join(outDir, `${id}.png`);
  await renderStill({composition, serveUrl, output, frame, inputProps, chromiumOptions: {gl: 'swangle'}, scale});
  console.log('still ->', output);
}
