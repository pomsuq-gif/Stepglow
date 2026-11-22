// SG004 pose check: no body part under the floor, no joint jumping between frames (run: see below)
import {CAST, PB, solveP} from '../src/episodes/sg004-hurt-ego/plan';
process.on('unhandledRejection', () => {});
const FPS = 60;
const N = Math.round(20.06 * FPS);
const names = ['Motivated', 'Talented', 'Disciplined', 'Ego', 'Obsessed'];
let bad = 0;
const stat: Record<string, [number, number, number, number]> = {};
const prev: Record<number, number[][]> = {};
const jumps: string[] = [];
for (let f = 0; f <= N; f++) {
  const t = f / FPS;
  CAST.forEach((fn, i) => {
    const j = solveP(fn(t).rig);
    const parts: [string, number[], number][] = [
      ['head', j.head, PB.headR],
      ['pelvis', [...j.hip[0]], PB.tr[0] * 0.95],
      ['chest', j.chest, PB.tr[1] * 0.9],
      ['elbowL', j.el[0], PB.ar[1]], ['elbowR', j.el[1], PB.ar[1]],
      ['handL', j.hd[0], PB.ar[2]], ['handR', j.hd[1], PB.ar[2]],
      ['kneeL', j.kn[0], PB.lr[1]], ['kneeR', j.kn[1], PB.lr[1]],
      ['footL', j.ft[0], PB.lr[2]], ['footR', j.ft[1], PB.lr[2]],
    ];
    for (const [n, p, r] of parts) {
      if (p[1] - r < -0.006) {
        const key = `${names[i]} ${n}`;
        const e = stat[key] ?? [0, 0, 1e9, -1e9];
        stat[key] = [e[0] + 1, Math.min(e[1], p[1] - r), Math.min(e[2], t), Math.max(e[3], t)];
        bad++;
      }
    }
    const pts = [j.head, j.el[0], j.el[1], j.hd[0], j.hd[1], j.kn[0], j.kn[1], j.shc];
    const pp = prev[i];
    if (pp) {
      pts.forEach((p, k) => {
        const d = Math.hypot(p[0] - pp[k][0], p[1] - pp[k][1], p[2] - pp[k][2]);
        if (d > 0.06) jumps.push(`JUMP t=${t.toFixed(3)} ${names[i]} joint#${k} ${d.toFixed(3)}/frame`);
      });
    }
    prev[i] = pts.map((p) => [...p]);
  });
}
console.log(`under-floor samples: ${bad}`);
for (const [k, [n, m, a, b]] of Object.entries(stat)) console.log(`  ${k}: ${n} frames, deepest ${m.toFixed(3)}, ${a.toFixed(2)}–${b.toFixed(2)} s`);
console.log(`jumps > 0.06/frame: ${jumps.length}`);
jumps.slice(0, 30).forEach((s) => console.log(s));
