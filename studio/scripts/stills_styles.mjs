// Render the same frames of a composition in several styles (inputProps.style) and stack them into one labelled sheet.
// Usage: STYLES=a,b,c FRAMES=1,2 node scripts/stills_styles.mjs <compositionId> <outDir>
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [id, outDir = 'out/styles'] = process.argv.slice(2);
const styles = process.env.STYLES.split(',');
const names = (process.env.NAMES ?? process.env.STYLES).split(',');
const frames = process.env.FRAMES.split(',').map(Number);
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const cols = [];
for (const [si, style] of styles.entries()) {
  const inputProps = {withAudio: false, style};
  const composition = await selectComposition({serveUrl, id, inputProps});
  const files = [];
  for (const frame of frames) {
    const output = path.join(outDir, `${style}-${frame}.png`);
    await renderStill({composition, serveUrl, output, frame, inputProps, chromiumOptions: {gl: 'swangle'}, scale: Number(process.env.SCALE ?? 0.4)});
    files.push(output);
    console.log('still', style, frame);
  }
  const col = path.join(outDir, `col-${style}.png`);
  const label = `${si + 1}. ${names[si]}`.replace(/:/g, '\\:');
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...files.flatMap((f) => ['-i', f]), '-filter_complex', `${files.map((_, i) => `[${i}]`).join('')}${files.length > 1 ? `vstack=inputs=${files.length},` : ''}pad=iw:ih+64:0:64:black,drawtext=text='${label}':x=(w-tw)/2:y=16:fontsize=34:fontcolor=white`, col]);
  cols.push(col);
}
const sheet = path.join(outDir, 'styles-sheet.jpg');
execFileSync('ffmpeg', ['-v', 'error', '-y', ...cols.flatMap((f) => ['-i', f]), '-filter_complex', cols.length > 1 ? `${cols.map((_, i) => `[${i}]`).join('')}hstack=inputs=${cols.length}` : 'null', '-q:v', '3', sheet]);
console.log('sheet ->', sheet);
