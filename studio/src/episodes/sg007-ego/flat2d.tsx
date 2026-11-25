import React from 'react';
import * as THREE from 'three';
import {type Cam, makeCamera, type V3} from '../nc001-work-smart/kit3d';
import {mixHex} from '../nc001-work-smart/world';
import {add, HB, K3, mul, W3, type J3} from '../sg003-same-bar/rig3';
import {CAST, TINTS} from './plan';
import {solveR} from './rig';
import type {Sty} from './styles';

/**
 * SG007: 2D characters over the 3D arena. The same 3D rig is solved, every joint is projected with this frame's camera,
 * and the stickman is drawn flat on top — round-capped strokes, a round head, an outline, the chest light as a dot.
 * Characters are drawn far to near.
 */
export const FlatFigs: React.FC<{t: number; c: Cam; sty: Sty}> = ({t, c, sty}) => {
  const camera = makeCamera(c);
  const v = new THREE.Vector3();
  const pr = (p: V3): [number, number, number] => {
    v.set(p[0], p[1], p[2]).project(camera);
    return [(v.x * 0.5 + 0.5) * 1080, (1 - (v.y * 0.5 + 0.5)) * 1920, v.z];
  };
  // pixels per world unit at a point (vertical)
  const ppu = (p: V3) => {
    const a = pr(p);
    const b = pr([p[0], p[1] + 0.2, p[2]]);
    return Math.hypot(a[0] - b[0], a[1] - b[1]) / 0.2;
  };
  const camPos = camera.position;
  const figs = CAST.map((f, i) => {
    const s = f(t);
    const j = solveR(s.rig);
    const w = (p: V3) => W3(p, [0, 0, 0], K3);
    const chest = w(j.chest);
    const d = Math.hypot(chest[0] - camPos.x, chest[1] - camPos.y, chest[2] - camPos.z);
    return {i, s, j, w, d};
  }).sort((a, b) => b.d - a.d);
  const ink = sty.fig === 'ink';
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
      <defs>
        <filter id="aura" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      {figs.map(({i, s, j, w}) => {
        const k = ppu(w(j.chest));
        if (pr(w(j.chest))[2] > 1) return null;
        const P = (p: V3) => pr(w(p));
        const pel = add(j.hip[0], mul(j.side, HB.hipZ));
        const limbs: [V3, V3, number][] = [
          [pel, j.shc, 0.1],
          [j.hip[0], j.kn[0], 0.058],
          [j.kn[0], j.ft[0], 0.054],
          [j.hip[1], j.kn[1], 0.058],
          [j.kn[1], j.ft[1], 0.054],
          ...(s.noArm ? [] : ([[j.sh[0], j.el[0], 0.048], [j.el[0], j.hd[0], 0.045]] as [V3, V3, number][])),
          [j.sh[1], j.el[1], 0.048],
          [j.el[1], j.hd[1], 0.045],
        ];
        // draw the far side first: sort limbs by depth
        const L = limbs.map(([a, b, r]) => ({a: P(a), b: P(b), r: r * K3 * k, z: (P(a)[2] + P(b)[2]) / 2})).sort((x, y) => y.z - x.z);
        const hd = P(j.head);
        const hr = HB.headR * K3 * k * 0.9;
        const tint = TINTS[i];
        const spent = s.spent;
        const fill = ink ? mixHex('#1a1614', '#8a8070', spent * 0.6) : mixHex('#ffffff', '#9aa3b8', spent * 0.7);
        const line = ink ? '#1a1614' : '#05070d';
        const ow = ink ? 0 : Math.max(2.5, 0.026 * K3 * k);
        const core = P(add(j.chest, mul(j.fwd, 0.06)));
        const auraA = Math.min(1, s.aura);
        return (
          <g key={i}>
            {auraA > 0.05 ? (
              <g filter="url(#aura)" opacity={0.85 * auraA}>
                {L.map((l, n) => (
                  <line key={n} x1={l.a[0]} y1={l.a[1]} x2={l.b[0]} y2={l.b[1]} stroke={i === 0 ? '#ff3a22' : s.auraColor} strokeWidth={l.r * 2 + 40} strokeLinecap="round" />
                ))}
                <circle cx={hd[0]} cy={hd[1]} r={hr + 24} fill={i === 0 ? '#ff3a22' : s.auraColor} />
              </g>
            ) : null}
            {ow > 0
              ? L.map((l, n) => <line key={`o${n}`} x1={l.a[0]} y1={l.a[1]} x2={l.b[0]} y2={l.b[1]} stroke={line} strokeWidth={l.r * 2 + ow * 2} strokeLinecap="round" />)
              : null}
            {ow > 0 ? <circle cx={hd[0]} cy={hd[1]} r={hr + ow} fill={line} /> : null}
            {L.map((l, n) => (
              <line key={`f${n}`} x1={l.a[0]} y1={l.a[1]} x2={l.b[0]} y2={l.b[1]} stroke={fill} strokeWidth={l.r * 2} strokeLinecap="round" />
            ))}
            <circle cx={hd[0]} cy={hd[1]} r={hr} fill={fill} />
            {/* the chest light (paper: a red mark on Ego only, a tint ring on the others) */}
            {ink ? (
              <circle cx={core[0]} cy={core[1]} r={0.05 * K3 * k} fill={i === 0 ? '#d8261a' : 'none'} stroke={i === 0 ? 'none' : tint} strokeWidth={0.018 * K3 * k} />
            ) : (
              <>
                <circle cx={core[0]} cy={core[1]} r={0.12 * K3 * k * (0.6 + 0.4 * s.energy)} fill={tint} opacity={0.55 * (1 - spent)} filter="url(#soft)" />
                <circle cx={core[0]} cy={core[1]} r={0.045 * K3 * k} fill={mixHex(tint, '#ffffff', 0.4)} opacity={1 - 0.7 * spent} />
              </>
            )}
            {i === 0 && s.aura >= 0 && t < 30.1 ? (() => {
              const u = hr * 0.62;
              const y0 = hd[1] - hr * 0.86;
              const pts = [[-1, 0], [-1, -1.05], [-0.5, -0.45], [0, -1.25], [0.5, -0.45], [1, -1.05], [1, 0]].map(([x, y]) => `${hd[0] + x * u},${y0 + y * u}`).join(' ');
              return <polygon points={pts} fill="#ffcf4a" stroke={ink ? '#1a1614' : '#05070d'} strokeWidth={Math.max(2, ow * 0.8)} strokeLinejoin="round" />;
            })() : null}
          </g>
        );
      })}
    </svg>
  );
};
