import React, {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, easeInOut, fract, gait, lerp, mixPose, poseAt, pulse, rnd, seg, ss, STAND} from '../nc001-work-smart/anim';
import {BODIES, Cam, Figure, Glow, Limb, Part, Pose, Txt, roundedBox, useLook, V3} from '../nc001-work-smart/kit3d';
import {mat, type Look, type Mat} from '../nc001-work-smart/looks';
import {mixHex} from '../nc001-work-smart/world';
import {beat} from './grid';
import {Mirror} from './mirror';
import {toLocal} from './rig';
import type {Panel} from './Full';

/**
 * scene 2 · 9.34 – 18.22 · Motion / Action — split screen, both go round in circles:
 * left runs in a wheel and stays where he is; right climbs a spiral stair round a tower and rises to the beacon.
 */
export const S2 = {from: beat(6), to: beat(20)};

const PULL = beat(10); // 11.88 — both cameras pull back
const TOP = beat(18.5); // 17.27 — the climber reaches the beacon

const METAL = mat('#c9d4ec', '#5a6a90', {shade: '#3a4668', rim: '#e6efff', rimAmt: 0.45, rimPow: 2.4, wrap: 0.6, spec: 0.5});
const STONE = mat('#aab6d2', '#3c4766', {shade: '#2c3550', rim: '#d6e2ff', rimAmt: 0.4, rimPow: 2.5, wrap: 0.6});
const PILLAR = mat('#8a98ba', '#1f2840', {shade: '#222a44', rim: '#b8c8f0', rimAmt: 0.45, rimPow: 2.2, wrap: 0.5});

const Stars: React.FC<{t: number; y0?: number; z?: number; spread?: number}> = ({t, y0 = 2, z = -14, spread = 14}) => (
  <>
    {Array.from({length: 60}, (_, i) => (
      <Glow key={i} p={[(rnd(i + 3) - 0.5) * spread, y0 + rnd(i + 9) * spread * 0.9, z]} w={0.06 + rnd(i) * 0.07} h={0.06 + rnd(i) * 0.07} color="#d6e4ff" a={(0.3 + 0.45 * rnd(i + 2)) * (0.75 + 0.25 * Math.sin(t * (1 + rnd(i) * 2) + i))} />
    ))}
  </>
);

/* ───────────── left: the wheel ───────────── */

const S = 0.86; // hero scale in this scene
const WR = 1.05; // inner radius (rungs)
const WC: V3 = [0, WR + 0.16, 0]; // wheel centre
const RUNGS = 34;
const HALFW = 0.44;

/** running cadence (cycles/s) speeds up over the scene; collapse after the other one reaches the top */
const cadence = (t: number) => (2.2 + 1.3 * ss(t, S2.from, TOP)) * (1 - 0.85 * ss(t, TOP + 0.1, TOP + 0.7));
const integ = (t: number, f: (x: number) => number) => {
  let a = 0;
  const dt = 1 / 90;
  for (let x = S2.from; x < t; x += dt) a += f(x) * dt;
  return a;
};

export const cam2L = (t: number): Cam => {
  const k = easeInOut(seg(t, PULL - 0.15, PULL + 1.3));
  const drift = ss(t, PULL + 1.3, S2.to);
  return {viewH: lerp(2.5, 5.3, k) + 0.5 * drift, cx: lerp(0.08, 0, k), cy: lerp(0.95, 1.55, k) + 0.15 * drift, pitch: lerp(3, 9, k), yaw: lerp(12, 24, k), fov: 24};
};

const ringGeo = new THREE.TorusGeometry(WR + 0.03, 0.035, 12, 120);
const hubGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.3, 24).rotateX(Math.PI / 2);

const Wheel: React.FC<{ang: number; heat: number}> = ({ang, heat}) => {
  const look = useLook();
  const q = Math.round(heat * 20) / 20;
  const hot = useMemo(() => ({...METAL, top: mixHex('#c9d4ec', '#ff7a4a', q), bottom: mixHex('#5a6a90', '#b3263a', q), rim: mixHex('#e6efff', '#ffb08a', q), emit: 1 + 0.35 * q}) as Mat, [q]);
  const y0 = WC[1] - WR - 0.1;
  const y1 = WC[1] + WR + 0.1;
  return (
    <>
      <group position={WC} rotation={[0, 0, ang]}>
        {/* open in front: only the rim; the spokes and the mount are on the back side */}
        <Part geo={ringGeo} m={hot} y0={-WR} y1={WR} position={[0, 0, HALFW]} />
        <Part geo={ringGeo} m={hot} y0={-WR} y1={WR} position={[0, 0, -HALFW]} />
        {Array.from({length: 6}, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return <Limb key={i} a={[0, 0, -HALFW]} b={[Math.cos(a) * (WR + 0.02), Math.sin(a) * (WR + 0.02), -HALFW]} r0={0.022} r1={0.018} m={METAL} y0={-WR} y1={WR} />;
        })}
        {Array.from({length: RUNGS}, (_, i) => {
          const a = (i / RUNGS) * Math.PI * 2;
          const c: [number, number] = [Math.cos(a) * WR, Math.sin(a) * WR];
          return <Limb key={i} a={[c[0], c[1], -HALFW]} b={[c[0], c[1], HALFW]} r0={0.022} r1={0.022} m={METAL} y0={-WR} y1={WR} />;
        })}
      </group>
      <Part geo={hubGeo} m={METAL} y0={y0} y1={y1} position={[WC[0], WC[1], -HALFW - 0.12]} />
      {/* stand: an A-frame on each side, outside the wheel */}
      <Limb a={[WC[0], WC[1], -HALFW - 0.24]} b={[WC[0] - 0.75, 0, -HALFW - 0.4]} r0={0.035} r1={0.04} m={METAL} y0={0} y1={y1} />
      <Limb a={[WC[0], WC[1], -HALFW - 0.24]} b={[WC[0] + 0.75, 0, -HALFW - 0.4]} r0={0.035} r1={0.04} m={METAL} y0={0} y1={y1} />
      <Glow p={[WC[0], 0.01, 0]} w={3.2} h={1.6} color={mixHex(look.bg.glow, '#ff5a3a', heat)} a={0.25 + 0.25 * heat} flat />
    </>
  );
};

const WorldL: React.FC<{t: number}> = ({t}) => {
  const look = useLook();
  const b = BODIES[look.kind];
  const k = S * b.s;
  const L = b.thigh + b.shin;
  const stride = 0.5;
  const phase = integ(t, cadence);
  // the rungs under the feet move exactly as fast as the feet in stance
  const v = (2 * stride * L * k) / 0.55;
  const ang = -integ(t, (x) => (cadence(x) * v) / WR);
  const fade = ss(t, TOP + 0.1, TOP + 0.7);
  const tired = ss(t, PULL, TOP);
  const run = gait(phase, {stride, lift: 0.26, lean: 16 + 6 * tired, bob: 0.05, arm: 0.62, armY: -0.5, crouch: 0.9});
  const SLUMP: Pose = {pelvis: [0.05, 0.86], lean: 48, head: [0.25, -0.35], handF: [0.55, -0.72], elbowF: -1, handB: [0.48, -0.74], elbowB: -1, footF: [0.12, 0], footB: [-0.16, 0]};
  const pose = mixPose(run, SLUMP, fade);
  const ground = WC[1] - WR + 0.022;
  const heat = clamp(tired * 0.8 + fade * 0.2);
  const tint = mixHex('#ff8a2e', '#ff3b3b', tired);
  return (
    <>
      <Stars t={t} />
      <Mirror amt={0.4} poolR={3.5} pool="#16223e" res={[540, 1080]} far={16} />
      <Glow p={[0, 1.5, -3]} w={6} h={5} color={look.bg.glow} a={0.3} />
      <Wheel ang={ang} heat={heat} />
      <Figure pose={pose} cast={look.a} x={0.04} y={ground} s={S} dir={1} yaw={6} energy={0.8 - 0.5 * tired + 0.12 * Math.sin(t * 19)} tint={tint} />
      {/* sweat flying off */}
      {Array.from({length: 5}, (_, i) => {
        const ph = fract(t * 1.6 + i / 5);
        return <Glow key={i} p={[0.04 - ph * 0.5, ground + 1.32 * S + ph * 0.25 - ph * ph * 0.7, 0.05 + (i - 2) * 0.03]} w={0.035} h={0.045} color="#bfe6ff" a={(1 - ph) * (0.4 + tired * 0.6) * (1 - fade)} />;
      })}
      {void k}
    </>
  );
};

/* ───────────── right: the spiral stair ───────────── */

const NS = 22; // steps
const DA = (27 * Math.PI) / 180; // turn per step
const RISE = 0.155;
const RP = 0.62; // walking radius
const COL_R = 0.24;
const TOPY = RISE * NS; // the last step is the landing at the top
const stepTop = (i: number) => RISE * (i + 1);
const stepAng = (i: number) => i * DA;

/** body progress in steps */
const prog = (t: number) => {
  const k = seg(t, S2.from, TOP - 0.25);
  return lerp(-0.6, NS - 0.6, k * 0.92 + 0.08 * easeInOut(k));
};
/** one foot's step (continuous): swings in the first half of every two-step window, planted in the second */
const footStep = (p: number, q: number) => {
  const x = p - q;
  const w = Math.floor(x / 2);
  return q + 2 * w + 2 * ss(clamp(x - 2 * w), 0.05, 0.95);
};
const onPath = (s: number, r = RP): V3 => [r * Math.sin(stepAng(s)), 0, r * Math.cos(stepAng(s))];

export const cam2R = (t: number): Cam => {
  const p = prog(t);
  const hy = RISE * (p + 1);
  const k = easeInOut(seg(t, PULL - 0.15, PULL + 1.3));
  const end = ss(t, TOP - 0.6, S2.to);
  // close: orbit with him, slightly outside and ahead; wide: the whole tower, still turning slowly
  const th = (stepAng(p) * 180) / Math.PI;
  const pos = onPath(p);
  return {
    viewH: lerp(2.9, 5.2, k) + 1.2 * end,
    cx: lerp(pos[0], 0, k),
    cz: lerp(pos[2], 0, k),
    cy: lerp(hy + 0.62, hy * 0.62 + 1.0, k) + end * 0.3,
    pitch: lerp(4, 10, k) + 6 * end,
    yaw: lerp(th + 62, th + 30, k),
    fov: 24,
  };
};

const stepGeo = roundedBox(0.7, 0.07, 0.27, 0.02);
const colGeo = new THREE.CylinderGeometry(COL_R, COL_R * 1.08, TOPY + 1.3, 36);
const discGeo = new THREE.CylinderGeometry(0.98, 0.98, 0.08, 48);
const orbGeo = new THREE.SphereGeometry(1, 32, 20);

const WorldR: React.FC<{t: number}> = ({t}) => {
  const look = useLook();
  const b = BODIES[look.kind];
  const L = b.thigh + b.shin;
  const gold = look.accent;
  const p = prog(t);
  const arrived = ss(t, TOP - 0.05, TOP + 0.3);
  const onTop = t >= TOP - 0.15;

  // feet on the steps (world), the body between them
  const sA = footStep(p, 0);
  const sB = footStep(p, 1);
  const top = (i: number) => (i < 0 ? 0 : stepTop(Math.min(i, NS - 1)));
  // a foot swings from step i0 to i0 + 2 over an arc that clears the step in between
  const footW = (s: number, q: number): V3 => {
    const i0 = q + 2 * Math.floor((s - q) / 2);
    const v = (s - i0) / 2;
    const base = onPath(s);
    return [base[0], lerp(top(i0), top(i0 + 2), v) + Math.sin(v * Math.PI) * 0.09, base[2]];
  };
  const fA = footW(sA, 0);
  const fB = footW(sB, 1);
  const bodyS = clamp(p, -0.6, NS - 1);
  const bodyPos = onPath(bodyS);
  const by = Math.min(fA[1], fB[1]);
  const th = (stepAng(bodyS) * 180) / Math.PI;
  const yaw = lerp(-th, -th + 70, arrived);
  const fig = {x: bodyPos[0], y: by, z: bodyPos[2], dir: 1 as const, yaw, s: S};
  const la = toLocal(fA, fig, b);
  const lb = toLocal(fB, fig, b);
  const sw = Math.sin(p * Math.PI);
  const climb: Pose = {
    pelvis: [0.02, 0],
    pelvisY: b.ankle + L * 0.84 + Math.max(la[1], lb[1]) * 0.25 + Math.abs(sw) * 0.01,
    lean: 10,
    head: [0.08, 0.05],
    handF: [-sw * 0.3, -0.74],
    handB: [sw * 0.3, -0.74],
    elbowF: -1,
    elbowB: -1,
    footF: [la[0] / L, (la[1] - b.ankle) / L],
    footB: [lb[0] / L, (lb[1] - b.ankle) / L],
  };
  const JOY: Pose = {pelvis: [0, 0.985], lean: -4, head: [0, 0.18], handF: [0.38, 0.9], elbowF: -1, handB: [-0.3, 0.88], elbowB: -1, footF: [0.12, 0], footB: [-0.12, 0]};
  const pose = onTop ? poseAt(t, [[TOP - 0.15, {...STAND, footF: [0.12, 0], footB: [-0.12, 0]}], [TOP + 0.2, JOY], [TOP + 0.45, {...JOY, pelvis: [0, 1.06]}], [TOP + 0.7, JOY]]) : climb;
  const topFig = {...fig, ...(() => { const q = onPath(NS - 1); return {x: q[0], z: q[2]}; })(), y: TOPY};
  const beacon = ss(t, TOP + 0.1, TOP + 0.5);
  const tint = mixHex('#38e8ff', '#ffd66b', arrived);

  return (
    <>
      <Stars t={t} y0={1} />
      <Mirror amt={0.35} poolR={3} pool="#16223e" res={[540, 1080]} far={16} />
      {/* clouds drifting at half height: how high this is */}
      {Array.from({length: 9}, (_, i) => {
        const a = (i / 9) * Math.PI * 2 + t * 0.05;
        const r = 1.6 + rnd(i) * 1.2;
        return <Glow key={i} p={[Math.sin(a) * r, 1.4 + rnd(i + 4) * 0.5, Math.cos(a) * r - 0.6]} w={2.2} h={0.5} color="#6d82b8" a={0.12} />;
      })}
      <Glow p={[0, TOPY * 0.5, -2.5]} w={4} h={TOPY + 3} color={look.bg.glow} a={0.28} />
      <Part geo={colGeo} m={PILLAR} y0={0} y1={TOPY} position={[0, (TOPY + 1.3) / 2, 0]} />
      {Array.from({length: NS}, (_, i) => {
        const a = stepAng(i);
        const c = onPath(i, 0.6);
        const lit = ss(Math.max(sA, sB), i - 0.15, i + 0.1);
        return (
          <React.Fragment key={i}>
            <Part geo={stepGeo} scale={i === NS - 1 ? [1, 1, 2.2] : 1} m={lit > 0.5 ? gold : STONE} y0={stepTop(i) - 0.08} y1={stepTop(i)} position={[c[0], stepTop(i) - 0.07, c[2]]} rotation={[0, a - Math.PI / 2, 0]} />
            {lit > 0 ? <Glow p={[c[0], stepTop(i) - 0.02, c[2] + 0.02]} w={0.75} h={0.28} color={gold.top} a={0.45 * lit} /> : null}
          </React.Fragment>
        );
      })}
      {/* the platform on top and the beacon that lights when he arrives */}
      <Part geo={discGeo} m={STONE} y0={TOPY} y1={TOPY + 1.4} position={[0, TOPY + 1.34, 0]} scale={[0.32, 1, 0.32]} />
      <Part geo={orbGeo} m={beacon > 0.5 ? gold : STONE} y0={TOPY + 1.3} y1={TOPY + 1.8} position={[0, TOPY + 1.6, 0]} scale={0.22} />
      {beacon > 0 ? (
        <>
          <Glow p={[0, TOPY + 1.6, 0.25]} w={1.6 * beacon} h={1.6 * beacon} color={gold.top} a={0.7 * beacon} />
          <Glow p={[0, TOPY + 4.8, 0]} w={0.8} h={6.5} color={gold.top} a={0.35 * beacon} mode="beam" />
          {Array.from({length: 12}, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            const r = 0.3 + seg(t, TOP + 0.1, TOP + 1.1) * 1.4;
            return <Glow key={i} p={[Math.cos(a) * r, TOPY + 1.6 + Math.sin(a) * r, 0.2]} w={0.06} h={0.06} color={gold.top} a={pulse(t, TOP + 0.1, TOP + 0.3, TOP + 1.1)} />;
          })}
        </>
      ) : null}
      <Figure pose={pose} cast={look.b} x={onTop ? topFig.x : fig.x} y={onTop ? topFig.y : fig.y} z={onTop ? topFig.z : fig.z} s={S} dir={1} yaw={yaw} energy={0.85 + 0.15 * arrived} tint={tint} />
    </>
  );
};

export const S2L: Panel = {cam: cam2L, World: WorldL};
export const S2R: Panel = {cam: cam2R, World: WorldR};

export const Over2: React.FC<{t: number; look: Look}> = ({t, look}) => {
  const o = ss(t, S2.from + 0.05, S2.from + 0.45) * (1 - ss(t, S2.to - 0.45, S2.to - 0.1));
  return (
    <>
      <Txt look={look} x={270} y={300} o={o} glow={0.5}>
        Motion
      </Txt>
      <Txt look={look} x={810} y={300} o={o} glow={0.5}>
        Action
      </Txt>
    </>
  );
};
