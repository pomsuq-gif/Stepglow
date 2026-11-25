/**
 * SG005 pose check, every frame at 60 fps:
 * (1) any body part (head, torso, upper arms, forearms short of the gripping hand, thighs, shins, feet) inside any rope;
 * (2) any body part through the wall face (below the summit) or the summit top;
 * (3) joint jumps larger than 0.08 world units in one frame (pops).
 * Build: node_modules/.bin/esbuild scripts/sg005-check.ts --bundle --platform=node --outfile=out/check5.cjs --jsx=automatic && node out/check5.cjs
 */
import {CAST, NAMES, RZ, ROPE_BOT, BEAM_Y, solveC, TOPY, WALL_Z, XS} from '../src/episodes/sg005-top/plan';
import {HB, K3, W3} from '../src/episodes/sg003-same-bar/rig3';
import type {V3} from '../src/episodes/nc001-work-smart/kit3d';

const FPS = 60;
const N = Math.round(44.98 * FPS);
const ROPE_R = 0.015;

type Seg = {name: string; a: V3; b: V3; r0: number; r1: number; /** fraction of the segment checked against ropes (forearms stop short of the gripping hand) */ upto?: number};

const segs = (i: number, t: number): Seg[] => {
  const j = solveC(CAST[i](t).rig);
  const w = (p: V3) => W3(p, [XS[i], 0, 0], K3);
  const k = K3;
  const out: Seg[] = [
    {name: 'head', a: w(j.head), b: w(j.head), r0: HB.headR * k, r1: HB.headR * k},
    {name: 'torso', a: w(j.hip[0].map((v, n) => (v + j.hip[1][n]) / 2) as V3), b: w(j.chest), r0: HB.tr[1] * HB.tr[2] * k, r1: HB.tr[1] * HB.tr[2] * k},
  ];
  for (const s of [0, 1]) {
    out.push({name: `upperarm${s}`, a: w(j.sh[s]), b: w(j.el[s]), r0: HB.ar[0] * k, r1: HB.ar[1] * k});
    out.push({name: `forearm${s}`, a: w(j.el[s]), b: w(j.hd[s]), r0: HB.ar[1] * k, r1: HB.ar[2] * k, upto: 0.6});
    out.push({name: `thigh${s}`, a: w(j.hip[s]), b: w(j.kn[s]), r0: HB.lr[0] * k, r1: HB.lr[1] * k});
    out.push({name: `shin${s}`, a: w(j.kn[s]), b: w(j.ft[s]), r0: HB.lr[1] * k, r1: HB.lr[2] * k});
  }
  return out;
};

const issues = new Map<string, {from: number; to: number; worst: number; n: number}>();
const note = (key: string, t: number, depth: number) => {
  const e = issues.get(key);
  if (e && t - e.to < 0.05) {
    e.to = t;
    e.worst = Math.max(e.worst, depth);
    e.n++;
  } else {
    if (e) report(key, e);
    issues.set(key, {from: t, to: t, worst: depth, n: 1});
  }
};
const lines: string[] = [];
const report = (key: string, e: {from: number; to: number; worst: number; n: number}) => lines.push(`${key.padEnd(44)} ${e.from.toFixed(2)}–${e.to.toFixed(2)} s  depth ${(e.worst * 100).toFixed(1)} cm  (${e.n} fr)`);

let prev: V3[][] | null = null;
for (let f = 0; f < N; f++) {
  const t = f / FPS;
  const cur: V3[][] = [];
  for (let i = 0; i < 6; i++) {
    const ss = segs(i, t);
    cur.push(ss.flatMap((s) => [s.a, s.b]));
    for (const s of ss) {
      for (let q = 0; q <= 8; q++) {
        const u = (q / 8) * (s.upto ?? 1);
        const p: V3 = [s.a[0] + (s.b[0] - s.a[0]) * u, s.a[1] + (s.b[1] - s.a[1]) * u, s.a[2] + (s.b[2] - s.a[2]) * u];
        const r = s.r0 + (s.r1 - s.r0) * u;
        // ropes: vertical lines at (XS[k], RZ) from ROPE_BOT to the beam
        for (let k = 0; k < 6; k++) {
          if (p[1] < ROPE_BOT - r || p[1] > BEAM_Y) continue;
          const d = Math.hypot(p[0] - XS[k], p[2] - RZ) - r - ROPE_R;
          if (d < -0.004) note(`${NAMES[i]} ${s.name} × rope ${NAMES[k]}`, t, -d);
        }
        // wall face (below the summit) and the summit top
        if (p[1] < TOPY - 0.02 && p[2] - r < WALL_Z - 0.004 && p[2] > WALL_Z - 3) note(`${NAMES[i]} ${s.name} × wall`, t, WALL_Z - (p[2] - r));
        if (p[2] < WALL_Z && p[1] - r < TOPY - 0.012 && p[1] > TOPY - 1) note(`${NAMES[i]} ${s.name} × summit`, t, TOPY - (p[1] - r));
        // the ground at the start
        if (p[1] - r < -0.012 && t < 4) note(`${NAMES[i]} ${s.name} × ground`, t, -(p[1] - r));
      }
    }
  }
  if (prev) {
    for (let i = 0; i < 6; i++) {
      for (let n = 0; n < cur[i].length; n++) {
        const d = Math.hypot(cur[i][n][0] - prev[i][n][0], cur[i][n][1] - prev[i][n][1], cur[i][n][2] - prev[i][n][2]);
        // falls are fast by design; count jumps only on bodies that are not in free fall
        const st = CAST[i](t);
        const falling = (i === 1 && t > 27.5) || (i === 5 && t > 19.24) || (i === 0 && t > 12.06);
        if (d > 0.08 && !falling) note(`${NAMES[i]} jump point ${n}`, t, d);
        void st;
      }
    }
  }
  prev = cur;
}
for (const [k, e] of issues) report(k, e);
lines.sort();
console.log(lines.length ? lines.join('\n') : 'clean');
