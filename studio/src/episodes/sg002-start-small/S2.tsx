import React, {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {clamp, easeInOut, gait, lerp, mixPose, poseAt, pulse, rnd, seg, ss} from '../nc001-work-smart/anim';
import {Cam, Figure, Glow, Limb, Part, Pose, Txt, roundedBox, useLook, V3} from '../nc001-work-smart/kit3d';
import {mat, type Look} from '../nc001-work-smart/looks';
import {Floor, mixHex} from '../nc001-work-smart/world';
import {beat} from './grid';

/** scene 2 · 9.34 – 18.22 · Motion / Action: running in circles vs climbing step by step */
export const S2 = {from: beat(6), to: beat(20)};

const PULL = beat(10); // 11.88 — the camera pulls back
const TOP = beat(18.5); // 17.27 — the climber reaches the summit

export const cam2 = (t: number): Cam => {
  const k = easeInOut(seg(t, PULL - 0.2, PULL + 1.5));
  const drift = ss(t, PULL + 1.5, S2.to);
  return {viewH: lerp(3.6, 8.3, k) - 0.3 * drift, cx: lerp(0.02, 0.05, k), cy: lerp(0.78, 2.3, k) + 0.1 * drift, pitch: lerp(7, 22, k)};
};

const S = 0.6;

/* ── the ring ── */
const RC: V3 = [-1.08, 0, 0.1];
const R = 0.7;
const A0 = (60 * Math.PI) / 180;
const OMEGA = (Math.PI * 2) / 2.3;
const angle = (t: number) => {
  // running in place, then round and round: integrate the speed up
  let a = A0;
  const dt = 1 / 60;
  for (let x = PULL - 0.6; x < t; x += dt) a += OMEGA * ss(x, PULL - 0.6, PULL + 0.6) * dt;
  return a;
};
const ringPos = (a: number): V3 => [RC[0] + R * Math.sin(a), 0, RC[2] + R * Math.cos(a)];

/* ── the mountain ── */
const MC: V3 = [1.55, 0, -1.4];
const MR = 2.0;
const MH = 3.3;
const PHI0 = (-32 * Math.PI) / 180;
const PHI1 = (6 * Math.PI) / 180;
const OFF = 0.1;
const pathAt = (u: number): V3 => {
  const phi = lerp(PHI0, PHI1, u);
  const r = MR * (1 - u) + OFF * (1 - u * 0.6);
  return [MC[0] + r * Math.sin(phi), MH * u, MC[2] + r * Math.cos(phi)];
};
const climbU = (t: number) => {
  // slow in the close-up, then steady up the mountain
  if (t < PULL) return 0.1 * seg(t, S2.from, PULL);
  return clamp(lerp(0.1, 1, seg(t, PULL, TOP) * 0.9 + 0.1 * easeInOut(seg(t, PULL, TOP))));
};
const heading = (u: number) => {
  const a = pathAt(Math.max(0, u - 0.01));
  const b = pathAt(Math.min(1, u + 0.01));
  return (Math.atan2(-(b[2] - a[2]), b[0] - a[0]) * 180) / Math.PI;
};
const NS = 24;

const facetCone = (r: number, hgt: number, seg: number, rows: number) => {
  const g = new THREE.ConeGeometry(r, hgt, seg, rows, true).toNonIndexed();
  g.translate(0, hgt / 2, 0);
  // jitter the ring vertices so the facets catch the light differently
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y > 0.01 && y < hgt - 0.01) {
      const key = Math.round(p.getX(i) * 50) * 31 + Math.round(p.getZ(i) * 50) * 17 + Math.round(y * 50);
      const j = (rnd(key) - 0.5) * 0.16 * r;
      p.setX(i, p.getX(i) + j);
      p.setZ(i, p.getZ(i) + (rnd(key + 5) - 0.5) * 0.16 * r);
    }
  }
  g.computeVertexNormals();
  return g;
};

const ROCK = mat('#6a7aa0', '#1a2136', {shade: '#262d46', rim: '#a8c0f0', rimAmt: 0.45, rimPow: 2.6, wrap: 0.45});
const SNOW = mat('#ffffff', '#b7c6e4', {shade: '#6a7ca8', rim: '#e6f0ff', rimAmt: 0.5, rimPow: 2.4, wrap: 0.6});
const RUT = mat('#56617e', '#2c3450', {shade: '#30384e', rim: '#9fb6e6', rimAmt: 0.35, wrap: 0.6});

const Mountain: React.FC = () => {
  const rock = useMemo(() => facetCone(MR, MH, 9, 5), []);
  const cap = useMemo(() => facetCone(MR * 0.27, MH * 0.27, 9, 2), []);
  useEffect(() => () => {
    rock.dispose();
    cap.dispose();
  }, [rock, cap]);
  return (
    <>
      <Part geo={rock} m={ROCK} y0={0} y1={MH} position={MC} />
      <Part geo={cap} m={SNOW} y0={MH * 0.6} y1={MH} position={[MC[0], MH * 0.73 + 0.005, MC[2]]} scale={[1.04, 1.0, 1.04]} />
    </>
  );
};

const ringGeo = (() => {
  const g = new THREE.RingGeometry(R - 0.11, R + 0.11, 96, 1);
  g.rotateX(-Math.PI / 2);
  return g;
})();
const stepGeo = roundedBox(0.2, 0.035, 0.12, 0.012);
const flagGeo = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(0.36, -0.1);
  s.lineTo(0, -0.22);
  s.lineTo(0, 0);
  return new THREE.ExtrudeGeometry(s, {depth: 0.012, bevelEnabled: false});
})();

export const World2: React.FC<{t: number}> = ({t}) => {
  const look = useLook();
  const gold = look.accent;
  const dimStep = useMemo(() => ({...look.prop, top: '#7d8db0', bottom: '#4a587a', emit: 0.8}), [look]);

  /* runner */
  const a = angle(t);
  const rp = ringPos(a);
  const tired = ss(t, PULL, S2.to);
  const run = gait(t * 2.7, {stride: 0.5, lift: 0.26, lean: 16 - tired * 4, bob: 0.05, arm: 0.62, armY: -0.5, crouch: 0.9});
  const runnerPose: Pose = {...run, head: [0.1, -0.1 * tired]};
  const runTint = mixHex('#ff8a2e', '#ff4a2a', tired);
  const laps = Math.max(0, (a - A0) / (Math.PI * 2));

  /* climber */
  const u = climbU(t);
  const cp = pathAt(u);
  const arrived = ss(t, TOP - 0.05, TOP + 0.25);
  const walk = gait(t * 1.55, {stride: 0.36, lift: 0.2, lean: 15, bob: 0.02, arm: 0.3, crouch: 0.95});
  const JOY: Pose = {pelvis: [0, 0.985], lean: -4, head: [0, 0.18], handF: [0.38, 0.9], elbowF: -1, handB: [-0.3, 0.88], elbowB: -1, footF: [0.12, 0], footB: [-0.12, 0]};
  const climbPose = arrived > 0 ? mixPose(walk, poseAt(t, [[TOP, JOY], [TOP + 0.35, {...JOY, pelvis: [0, 1.05]}], [TOP + 0.6, JOY]]), arrived) : walk;
  const climbTint = mixHex('#38e8ff', '#ffd66b', arrived);
  const hd = heading(Math.min(u, 0.985));
  const yawC = arrived > 0 ? lerp(-hd, -70, arrived) : -hd;

  const flagBase: V3 = [MC[0] + 0.18, MH - 0.02, MC[2] + 0.05];
  const wave = Math.sin(t * 6) * 0.25;
  const burst = pulse(t, TOP, TOP + 0.25, TOP + 1.3);

  return (
    <>
      <Floor y={0} w={30} d={16} z={-4} />
      {/* stars */}
      {Array.from({length: 46}, (_, i) => (
        <Glow key={i} p={[(rnd(i + 3) - 0.5) * 12, 2.6 + rnd(i + 9) * 4.5, -9]} w={0.07 + rnd(i) * 0.06} h={0.07 + rnd(i) * 0.06} color="#cfe0ff" a={(0.35 + 0.4 * rnd(i + 2)) * (0.75 + 0.25 * Math.sin(t * (1 + rnd(i) * 2) + i))} />
      ))}
      <Glow p={[MC[0], MH * 0.6, MC[2] - 1.5]} w={6.5} h={6} color={look.bg.glow} a={0.35} />

      {/* the ring: a worn rut that heats up with every lap */}
      <Part geo={ringGeo} m={RUT} y0={-0.1} y1={0.1} position={[RC[0], 0.006, RC[2]]} />
      <Glow p={[RC[0], 0.02, RC[2]]} w={R * 2.6} h={R * 2.6} color={mixHex('#3b5a9a', '#ff5a2a', clamp(laps / 2.5))} a={0.18 + 0.2 * clamp(laps / 2.5)} flat />
      {Array.from({length: 18}, (_, i) => {
        // dust kicked up behind the runner
        const age = (i / 18) * 0.6;
        const pa = angle(t - age);
        const p = ringPos(pa);
        return t - age > PULL - 0.3 ? <Glow key={i} p={[p[0], 0.06 + age * 0.25, p[2]]} w={0.1 + age * 0.35} h={0.1 + age * 0.35} color="#8fa2c8" a={(1 - age / 0.6) * 0.18} /> : null;
      })}
      <Figure pose={runnerPose} cast={look.a} x={rp[0]} z={rp[2]} dir={1} yaw={-(a * 180) / Math.PI} s={S} energy={0.75 - 0.45 * tired + 0.15 * Math.sin(t * 17)} tint={runTint} />
      {/* sweat */}
      {Array.from({length: 4}, (_, i) => {
        const ph = ((t * 1.7 + i / 4) % 1);
        return <Glow key={i} p={[rp[0] + (i - 1.5) * 0.06 * ph * 3, 0.95 + ph * 0.2 - ph * ph * 0.5, rp[2] + 0.05]} w={0.04} h={0.05} color="#bfe6ff" a={(1 - ph) * 0.8} />;
      })}

      {/* the mountain and the path of small steps that light up under the feet */}
      <Mountain />
      {Array.from({length: NS}, (_, i) => {
        const uk = (i + 0.5) / NS;
        const p = pathAt(uk);
        const lit = ss(u, uk - 0.03, uk + 0.01);
        const phi = lerp(PHI0, PHI1, uk);
        return (
          <React.Fragment key={i}>
            <Part geo={stepGeo} m={lit > 0.5 ? gold : dimStep} y0={p[1] - 0.05} y1={p[1] + 0.05} position={[p[0], p[1] - 0.02, p[2]]} rotation={[0, phi, 0]} />
            {lit > 0 ? <Glow p={[p[0], p[1] + 0.03, p[2] + 0.05]} w={0.42} h={0.22} color={gold.top} a={0.55 * lit} /> : null}
          </React.Fragment>
        );
      })}
      <Figure pose={climbPose} cast={look.b} x={cp[0]} y={cp[1]} z={cp[2]} dir={1} yaw={yawC} s={S} energy={0.85 + 0.15 * arrived} tint={climbTint} gy={0} />

      {/* the flag at the top */}
      <Limb a={flagBase} b={[flagBase[0], flagBase[1] + 0.78, flagBase[2]]} r0={0.014} r1={0.012} m={look.prop} y0={MH} y1={MH + 0.8} />
      <Part geo={flagGeo} m={gold} y0={MH + 0.4} y1={MH + 0.8} position={[flagBase[0], flagBase[1] + 0.78, flagBase[2]]} rotation={[0, wave, Math.sin(t * 9) * 0.05]} />
      <Glow p={[flagBase[0] + 0.15, flagBase[1] + 0.68, flagBase[2] + 0.1]} w={0.9} h={0.9} color={gold.top} a={0.25 + 0.6 * burst} />
      {burst > 0
        ? Array.from({length: 10}, (_, i) => {
            const ang = (i / 10) * Math.PI * 2;
            const rr = 0.2 + seg(t, TOP, TOP + 1.3) * 1.1;
            return <Glow key={i} p={[cp[0] + Math.cos(ang) * rr, cp[1] + 0.5 + Math.sin(ang) * rr, cp[2] + 0.2]} w={0.07} h={0.07} color={gold.top} a={burst} />;
          })
        : null}
      {arrived > 0 ? <Glow p={[cp[0], cp[1] + 0.4, cp[2] + 0.2]} w={2.2} h={2.2} color={gold.top} a={0.35 * arrived} /> : null}
    </>
  );
};

export const Over2: React.FC<{t: number; look: Look; cam: Cam}> = ({t, look}) => {
  const o = ss(t, S2.from + 0.05, S2.from + 0.5) * (1 - ss(t, S2.to - 0.45, S2.to - 0.1));
  return (
    <>
      <Txt look={look} x={290} y={290} o={o}>
        Motion
      </Txt>
      <Txt look={look} x={790} y={290} o={o}>
        Action
      </Txt>
    </>
  );
};
