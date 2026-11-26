import {CAST, tw} from '../src/episodes/sg007-ego/plan';
import {solveR, TOP, TY} from '../src/episodes/sg007-ego/rig';
import {K3, W3, add, mul, HB, type J3} from '../src/episodes/sg003-same-bar/rig3';
type V = [number, number, number];
const W = (p: V) => W3(p, [0, 0, 0], K3);
const APPEAR = [0, 0, 0, 0, 16.72, 17.44];
// segments of a block figure (world) with half-thickness
const segs = (j: J3, noArm: boolean): [string, V, V, number][] => {
  const pel = add(j.hip[0], mul(j.side, HB.hipZ)) as V;
  const out: [string, V, V, number][] = [
    ['torso', W(pel), W(j.shc as V), 0.12],
    ['head', W(j.head as V), W(j.head as V), 0.14],
    ['thighL', W(j.hip[0] as V), W(j.kn[0] as V), 0.06],
    ['shinL', W(j.kn[0] as V), W(j.ft[0] as V), 0.055],
    ['thighR', W(j.hip[1] as V), W(j.kn[1] as V), 0.06],
    ['shinR', W(j.kn[1] as V), W(j.ft[1] as V), 0.055],
    ['uarm1', W(j.sh[1] as V), W(j.el[1] as V), 0.048],
    ['farm1', W(j.el[1] as V), W(j.hd[1] as V), 0.06],
  ];
  if (!noArm) out.push(['uarm0', W(j.sh[0] as V), W(j.el[0] as V), 0.048], ['farm0', W(j.el[0] as V), W(j.hd[0] as V), 0.06]);
  return out;
};
const pts = (a: V, b: V, n = 5): V[] => Array.from({length: n}, (_, i) => [a[0] + (b[0] - a[0]) * i / (n - 1), a[1] + (b[1] - a[1]) * i / (n - 1), a[2] + (b[2] - a[2]) * i / (n - 1)]);
const issues = new Map<string, {t0: number; t1: number; worst: number}>();
const note = (k: string, t: number, d: number) => {
  const e = issues.get(k);
  if (!e) issues.set(k, {t0: t, t1: t, worst: d});
  else {
    e.t1 = t;
    e.worst = Math.max(e.worst, d);
  }
};
const top = TY * K3;
for (let f = 0; f <= 39.8 * 30; f++) {
  const t = f / 30;
  const st = CAST.map((c) => c(t));
  const S = st.map((s, i) => (t < APPEAR[i] ? [] : segs(solveR(s.rig), !!s.noArm)));
  S.forEach((ss, i) => {
    for (const [nm, a, b, r] of ss) {
      for (const p of pts(a, b)) {
        // floor
        if (p[1] - r < -0.03) note(`c${i} ${nm} under floor`, t, -(p[1] - r));
        // tables
        for (let k = 0; k < 5; k++) {
          const c = tw(k);
          const dx = Math.abs(p[0] - c[0]);
          const dz = Math.abs(p[2] - c[2]);
          if (dx < TOP.x * K3 + r - 0.02 && dz < TOP.z * K3 + r - 0.02 && p[1] < top + r - 0.03 && p[1] > top - 0.07 - r) {
            if (nm.startsWith('farm') || nm.startsWith('uarm')) continue; // resting on the top is expected
            note(`c${i} ${nm} through table ${k}`, t, top + r - p[1]);
          }
          // legs (columns at ±0.288)
          if (p[1] < top - 0.07) for (const lx of [-0.288, 0.288]) for (const lz of [-0.288, 0.288]) {
            const d = Math.hypot(p[0] - (c[0] + lx), p[2] - (c[2] + lz));
            if (d < 0.025 + r - 0.01) note(`c${i} ${nm} through leg of table ${k}`, t, 0.025 + r - d);
          }
        }
      }
    }
  });
  // character vs character
  for (let i = 0; i < S.length; i++)
    for (let k = i + 1; k < S.length; k++)
      for (const [na, a1, b1, r1] of S[i])
        for (const [nb, a2, b2, r2] of S[k]) {
          if ((na === 'farm0' && nb === 'farm0')) continue;
          let m = 1e9;
          for (const p of pts(a1, b1, 4)) for (const q of pts(a2, b2, 4)) m = Math.min(m, Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
          if (m < r1 + r2 - 0.03) note(`c${i}.${na} x c${k}.${nb}`, t, r1 + r2 - m);
        }
}
const rows = [...issues.entries()].sort((a, b) => a[1].t0 - b[1].t0);
for (const [k, v] of rows) if (v.worst > 0.02) console.log(`${v.t0.toFixed(2)}-${v.t1.toFixed(2)}  ${k}  depth ${v.worst.toFixed(3)}`);
console.log('total', rows.length);
