/**
 * SG006 pose check, every frame at 60 fps:
 * (1) any body part inside the stair (treads, risers, the summit, the narrow endless stair);
 * (2) joint jumps larger than 0.07 world units in one frame (pops).
 * Build: node_modules/.bin/esbuild scripts/sg006-check.ts --bundle --platform=node --outfile=out/check6.cjs --jsx=automatic && node out/check6.cjs
 */
import {CAST, groundAt, NAMES, NARROW, solveC, STAIR_W, XS} from '../src/episodes/sg006-quit/plan';
import {HB, K3, W3} from '../src/episodes/sg003-same-bar/rig3';
import type {V3} from '../src/episodes/nc001-work-smart/kit3d';

const FPS = 60;
const NF = Math.round(33.5 * FPS);
type Seg = {name: string; a: V3; b: V3; r0: number; r1: number};
const segs = (i: number, t: number): Seg[] => {
  const j = solveC(CAST[i](t).rig);
  const w = (p: V3) => W3(p, [XS[i], 0, 0], K3);
  const k = K3;
  const out: Seg[] = [
    {name: 'head', a: w(j.head), b: w(j.head), r0: HB.headR * k, r1: HB.headR * k},
    {name: 'torso', a: w(j.hip[0].map((v, n) => (v + j.hip[1][n]) / 2) as V3), b: w(j.chest), r0: HB.tr[0] * k, r1: HB.tr[1] * k},
  ];
  for (const s of [0, 1]) {
    out.push({name: `upperarm${s}`, a: w(j.sh[s]), b: w(j.el[s]), r0: HB.ar[0] * k, r1: HB.ar[1] * k});
    out.push({name: `forearm${s}`, a: w(j.el[s]), b: w(j.hd[s]), r0: HB.ar[1] * k, r1: HB.ar[2] * k});
    out.push({name: `thigh${s}`, a: w(j.hip[s]), b: w(j.kn[s]), r0: HB.lr[0] * k, r1: HB.lr[1] * k});
    out.push({name: `shin${s}`, a: w(j.kn[s]), b: w(j.ft[s]), r0: HB.lr[1] * k, r1: HB.lr[2] * k});
  }
  return out;
};
const solidTop = (x: number, z: number) => {
  const onMain = Math.abs(x) < STAIR_W;
  const onNarrow = Math.abs(x - NARROW.x) < NARROW.w;
  return Math.max(onMain ? groundAt(z, false) : -99, onNarrow ? groundAt(z, true) : -99);
};
const issues = new Map<string, {from: number; to: number; worst: number; n: number; at?: string}>();
const lines: string[] = [];
const report = (key: string, e: {from: number; to: number; worst: number; n: number; at?: string}) => lines.push(`${key.padEnd(34)} ${e.from.toFixed(2)}–${e.to.toFixed(2)} s  depth ${(e.worst * 100).toFixed(1)} cm  (${e.n} fr) ${e.at ?? ''}`);
let WHERE = '';
const note = (key: string, t: number, depth: number) => {
  const e = issues.get(key);
  if (e && t - e.to < 0.05) {
    e.to = t;
    if (depth > e.worst) e.at = `@${t.toFixed(2)} ${WHERE}`;
    e.worst = Math.max(e.worst, depth);
    e.n++;
  } else {
    if (e) report(key, e);
    issues.set(key, {from: t, to: t, worst: depth, n: 1, at: `@${t.toFixed(2)} ${WHERE}`});
  }
};
let prev: V3[][] | null = null;
for (let f = 0; f < NF; f++) {
  const t = f / FPS;
  const cur: V3[][] = [];
  for (let i = 0; i < 4; i++) {
    const ss = segs(i, t);
    cur.push(ss.flatMap((s) => [s.a, s.b]));
    for (const s of ss)
      for (let q = 0; q <= 8; q++) {
        const u = q / 8;
        const p: V3 = [s.a[0] + (s.b[0] - s.a[0]) * u, s.a[1] + (s.b[1] - s.a[1]) * u, s.a[2] + (s.b[2] - s.a[2]) * u];
        const r = s.r0 + (s.r1 - s.r0) * u;
        let d = solidTop(p[0], p[2]) - (p[1] - r);
        for (const dz of [-0.7, 0.7]) d = Math.max(d, solidTop(p[0], p[2] + dz * r) - (p[1] - 0.7 * r));
        WHERE = `u${u.toFixed(2)} p(${p.map((v) => v.toFixed(2)).join(',')}) r${r.toFixed(3)}`;
        if (d > 0.012) note(`${NAMES[i]} ${s.name} × stair`, t, d);
      }
  }
  if (prev)
    for (let i = 0; i < 4; i++)
      for (let n = 0; n < cur[i].length; n++) {
        const d = Math.hypot(cur[i][n][0] - prev[i][n][0], cur[i][n][1] - prev[i][n][1], cur[i][n][2] - prev[i][n][2]);
        if (d > 0.07) note(`${NAMES[i]} joint ${n} jump`, t, d);
      }
  prev = cur;
}
for (const [k, e] of issues) report(k, e);
console.log(lines.length ? lines.sort().join('\n') : 'clean');
