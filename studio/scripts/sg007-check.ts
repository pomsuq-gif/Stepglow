import {grip, PIN, TY, EY, FH, solveR} from '../src/episodes/sg007-ego/rig';
import {HB, len, sub} from '../src/episodes/sg003-same-bar/rig3';
const LEG = HB.thigh + HB.shin;
console.log('PIN', PIN.toFixed(3), 'FH', FH.toFixed(3), 'TY', TY, 'EY', EY);
for (const phi of [0, 0.6, -0.6, 1.1, -1.1, PIN, -PIN]) {
  const out: string[] = [];
  const js = [-1, 1].map((sd) => {
    const r = grip({side: sd as -1 | 1, phi, t: 0});
    const j = solveR(r);
    const hipFoot = [0, 1].map((i) => len(sub(j.hip[i], j.ft[i])) / LEG);
    const shHand = len(sub(j.sh[0], j.hd[0])) / (HB.arm + HB.fore);
    const elbowErr = len(sub(j.el[0], [sd * 0.125, EY, 0]));
    const sh1 = len(sub(j.sh[1], r.hand[1])) / (HB.arm + HB.fore);
    out.push(`${sd < 0 ? 'EGO' : 'OPP'} pel=${j.hip[0].map((v) => v.toFixed(2))} hipFoot=${hipFoot.map((v) => v.toFixed(3))} shHand=${shHand.toFixed(3)} elbErr=${elbowErr.toFixed(3)} free=${sh1.toFixed(3)} head=${j.head.map((v) => v.toFixed(2))} kneeY=${j.kn.map((k) => k[1].toFixed(2))}`);
    return j;
  });
  const hh = len(sub(js[0].head, js[1].head));
  const hc = Math.min(len(sub(js[0].head, js[0].hd[0])), len(sub(js[1].head, js[0].hd[0])));
  console.log(`phi=${phi.toFixed(2)} headDist=${hh.toFixed(3)} (min ${(2 * HB.headR).toFixed(2)}) headToFist=${hc.toFixed(3)}`);
  out.forEach((l) => console.log('   ', l));
}
