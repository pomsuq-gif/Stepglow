// Render selected frames as PNG stills + a contact sheet, bundling once.
// Usage: node scripts/stills.mjs <compositionId> <frame,frame,...> [outDir]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [id = 'EP001-Pilot', framesArg = '0', outDir = 'out/stills'] = process.argv.slice(2);
const frames = framesArg.split(',').map(Number);
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const inputProps = {withAudio: false};
const composition = await selectComposition({serveUrl, id, inputProps});
const files = [];
for (const frame of frames) {
  const output = path.join(outDir, `${id}-${String(frame).padStart(4, '0')}.png`);
  await renderStill({composition, serveUrl, output, frame, inputProps, chromiumOptions: {gl: 'swangle'}, scale: Number(process.env.SCALE ?? 0.5)});
  files.push(output);
  console.log('still', frame, '->', output);
}
if (files.length > 1) {
  const sheet = path.join(outDir, `${id}-sheet.jpg`);
  const cols = Math.min(Number(process.env.COLS ?? 3), files.length);
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...files.flatMap((f) => ['-i', f]), '-filter_complex',
    `${files.map((_, i) => `[${i}]drawtext=text='${frames[i]}':x=10:y=10:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.6[v${i}]`).join(';')};${files.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % cols) ? Array.from({length: i % cols}, () => 'w0').join('+') : '0'}_${Math.floor(i / cols) ? Array.from({length: Math.floor(i / cols)}, () => 'h0').join('+') : '0'}`).join('|')}:fill=black`, sheet]);
  console.log('sheet ->', sheet);
}
