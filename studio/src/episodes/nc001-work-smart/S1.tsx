import React, {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {BEAT, clamp, easeOut, fract, lerp, poseAt, pulse, rnd, seg, ss} from './anim';
import {BODIES, Ball, Cam, Fade, Figure, Glow, Label, Limb, Part, Pose, V3, solve, useLook} from './kit3d';
import type {Look} from './looks';
import {Banks, Chair, Fish, Mug, Spear, WATER, mixHex} from './world';

/** scene 1 · 0.00 – 5.07 · Working Hard / Working Smart */
export const S1 = {from: 0, to: 5.07};

export const cam1 = (t: number): Cam => ({viewH: lerp(7.85, 7.45, ss(t, 0, 5.07)), cy: -0.25, pitch: 5});

const HX = -1.22;
const SX = 1.3;
const YAW = 26;
const CYC = BEAT * 2;
const REL = 0.62; // release moment inside a cycle

const READY: Pose = {pelvis: [-0.04, 0.93], lean: -5, handF: [-0.62, 0.3], elbowF: 1, handB: [0.82, 0.02], elbowB: -1, footF: [0.38, 0], footB: [-0.36, 0], head: [0, 0]};
const THROW: Pose = {pelvis: [0.1, 0.88], lean: 30, handF: [0.74, -0.5], elbowF: -1, handB: [-0.5, -0.4], elbowB: -1, footF: [0.42, 0], footB: [-0.36, 0.03], head: [0.1, -0.05]};
const SLUMP: Pose = {pelvis: [0.04, 0.9], lean: 25, handF: [0.3, -0.92], elbowF: -1, handB: [0.12, -0.92], elbowB: -1, footF: [0.38, 0], footB: [-0.36, 0], head: [0.25, -0.3]};
const GRAB: Pose = {pelvis: [-0.07, 0.92], lean: -9, handF: [-0.82, -0.22], elbowF: -1, handB: [0.36, -0.7], elbowB: -1, footF: [0.38, 0], footB: [-0.36, 0], head: [-0.15, -0.05]};

const hardPose = (t: number): Pose => {
  const i = Math.floor(t / CYC);
  const u = t - i * CYC;
  if (i === 0 && u < 0.47) return READY;
  return poseAt(u, [
    [0, SLUMP],
    [0.2, GRAB],
    [0.47, READY],
    [0.54, READY],
    [0.66, THROW],
    [0.82, THROW],
    [1.06, SLUMP],
    [CYC, SLUMP],
  ]);
};

const SMART: Pose = {pelvis: [0, 0.6], lean: -28, handF: [-0.42, 0.5], elbowF: 1, handB: [0.75, -0.12], elbowB: -1, footF: [0.98, 0.03], footB: [0.74, 0.32], head: [0.08, 0]};

/** a rod that fishes by itself: bite at tb, then the catch is lifted out and hangs on the line */
const Rod: React.FC<{from: V3; tip: V3; ctrl: V3; t: number; tb: number; seed: number}> = ({from, tip, ctrl, t, tb, seed}) => {
  const look = useLook();
  const dip = pulse(t, tb, tb + 0.14, tb + 0.4);
  const up = easeOut(seg(t, tb + 0.3, tb + 1.0));
  const load = Math.max(dip * 0.2, up * 0.09) + Math.sin(t * 9 + seed) * 0.012 * up;
  const tp: V3 = [tip[0] - load * 0.25, tip[1] - load, tip[2]];
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(...from), new THREE.Vector3(...ctrl), new THREE.Vector3(...tp)), 32, 0.013, 8), [Math.round(load * 400)]);
  useEffect(() => () => geo.dispose(), [geo]);
  const floatY = WATER + 0.02 + Math.sin(t * 2.2 + seed) * 0.012 - dip * 0.16;
  const hangY = tp[1] - 0.62;
  const fishY = lerp(WATER - 0.55, hangY, up);
  const swing = Math.sin((t - tb) * 7) * 0.05 * up * Math.exp(-Math.max(0, t - tb - 1) * 1.2);
  const bobY = up > 0 ? fishY + 0.3 : floatY;
  const end: V3 = [tp[0] + swing, up > 0 ? fishY + 0.12 : floatY, tp[2]];
  const ripple = seg(t, tb, tb + 0.7);
  return (
    <>
      <Part geo={geo} m={look.prop} y0={0} y1={2.4} />
      <Limb a={tp} b={end} r0={0.0045} r1={0.0045} m={look.prop} y0={-1} y1={2} />
      <Ball p={[tp[0] + swing * 0.6, bobY, tp[2]]} r={0.05} m={look.accent} y0={bobY - 0.1} y1={bobY + 0.1} />
      <Glow p={[tp[0], bobY, tp[2] + 0.1]} w={0.5} h={0.5} color={look.accent.top} a={0.35} />
      {t > tb + 0.2 ? <Fish p={[tp[0] + swing, fishY, tp[2]]} s={0.62} dir={1} tilt={90 + Math.sin((t - tb) * 16) * 14 * Math.exp(-Math.max(0, t - tb - 0.6) * 1.5)} wag={Math.sin(t * 18) * 0.6 * Math.exp(-Math.max(0, t - tb - 0.6) * 1.2)} /> : null}
      {ripple > 0 && ripple < 1 ? <Glow p={[tip[0], WATER, tip[2] + 0.2]} w={0.3 + ripple * 1.3} h={0.07} color={look.water.line} a={(1 - ripple) * 0.9} mode="line" /> : null}
    </>
  );
};

const FISH: [number, number, number, number, 1 | -1, number][] = [
  [-1.7, -1.35, 0.2, 1.0, 1, 4],
  [-0.55, -1.0, -0.4, 0.62, -1, -8],
  [0.75, -1.55, 0.35, 1.15, -1, 3],
  [1.75, -1.25, -0.2, 0.7, 1, -5],
  [-1.05, -2.1, -0.2, 0.8, -1, 6],
  [0.15, -2.35, 0.3, 1.3, 1, -4],
  [1.55, -2.5, -0.5, 0.9, -1, 2],
  [-1.85, -2.85, 0.1, 1.1, 1, -3],
  [-0.45, -3.15, -0.6, 0.75, 1, 7],
  [0.95, -3.3, 0.2, 1.0, -1, -6],
  [2.0, -3.45, -0.3, 0.7, 1, 4],
  [0.25, -0.85, -0.9, 0.5, 1, 10],
  [-2.15, -2.05, -0.9, 0.55, -1, 0],
];

export const World1: React.FC<{t: number}> = ({t}) => {
  const look = useLook();
  const body = BODIES[look.kind];
  const k = body.s;
  const A = body.arm + body.fore;
  const pose = hardPose(t);
  const j = solve(pose, body);
  const zs = body.shZ + 0.04;
  const cyc = Math.floor(t / CYC);
  const u = t - cyc * CYC;

  // the spear in the hand: pulled from the bundle, levelled, thrown
  const holding = (cyc === 0 && u < REL) || (u >= 0.2 && u < REL);
  const heldAng = ((cyc === 0 && u < 0.47 ? -16 : lerp(96, -16, ss(u, 0.2, 0.47)) + lerp(0, -40, ss(u, 0.54, REL))) * Math.PI) / 180;

  // thrown spears: straight into the water, then drag and a slow sink
  const ang = (-60 * Math.PI) / 180;
  const rel = solve(poseAt(REL, [[0.54, READY], [0.66, THROW]]), body);
  const wl = WATER / k;
  const dW = (rel.hF[1] - wl) / Math.sin(-ang);
  const tw = dW / 11;
  const throws = [0, 1, 2, 3].map((i) => i * CYC + REL).filter((r) => t >= r && t < r + 3.2);
  const local2world = (x: number, z: number) => HX + k * (x * Math.cos((YAW * Math.PI) / 180) - z * Math.sin((YAW * Math.PI) / 180));
  const hitX = local2world(rel.hF[0] + Math.cos(ang) * dW, zs);
  const hits = [0, 1, 2, 3].map((i) => i * CYC + REL + tw);

  const grab = solve(GRAB, body);
  const bx = grab.hF[0];

  // the hard worker burns out: the light in the chest sinks and reddens with every throw
  const tired = clamp(t / 5.07);
  const flare = Math.max(...[0, 1, 2, 3].map((i) => pulse(t, i * CYC + REL - 0.12, i * CYC + REL, i * CYC + REL + 0.5)));
  const energyA = clamp(0.62 - 0.42 * tired + flare * 0.35);
  const tintA = mixHex(look.a.core, '#ff3a24', tired * 0.75);

  // the smart one: breathing, a sip, a living light
  const L = body.thigh + body.shin;
  const ck = (L * 0.46 + body.ankle) / 0.36;
  const seatY = 0.36 * ck;
  const sip = pulse(t, 2.45, 2.9, 3.7);
  const smart: Pose = {
    ...SMART,
    pelvisY: seatY + 0.085,
    lean: -28 + Math.sin(t * 2.1) * 0.9,
    handB: [lerp(0.75, 0.34, sip), lerp(-0.12, 0.4, sip)],
    footB: [0.74, 0.32 + Math.sin(t * 3.1) * 0.025],
    head: [0.08 + sip * 0.06, Math.sin(t * 2.1 + 0.5) * 0.02],
  };
  const js = solve(smart, body);
  const energyB = 0.82 + 0.18 * Math.sin(t * 2.6);

  return (
    <>
      <Glow p={[HX, 1.0, -1.5]} w={4.2} h={4.6} color={look.bg.glow} a={look.bg.glowAmt * 0.7} />
      <Glow p={[SX, 0.9, -1.5]} w={4.2} h={4.6} color={look.bg.glow} a={look.bg.glowAmt * 0.7} />
      <Banks />

      {/* water: surface streak, light shafts, drifting motes */}
      <Glow p={[-0.07, WATER, 0.5]} w={1.55} h={0.1} color={look.water.line} a={0.9 + Math.sin(t * 3) * 0.08} mode="line" />
      <Glow p={[-0.07, WATER, 0.45]} w={2.6} h={0.5} color={look.water.line} a={0.22} />
      {[-0.42, -0.1, 0.22].map((x, i) => (
        <Glow key={i} p={[x - 0.35 - i * 0.12 + Math.sin(t * 0.7 + i * 2) * 0.05, WATER - 1.5, -0.6]} w={0.55 + i * 0.12} h={3.0} color={look.water.rays} a={look.water.raysAmt * (1.5 - i * 0.25) * (0.8 + 0.2 * Math.sin(t * 1.4 + i * 1.7))} mode="beam" rot={-12} />
      ))}
      {Array.from({length: 46}, (_, i) => {
        const y = WATER - 0.25 - fract(rnd(i + 50) - t * (0.012 + rnd(i) * 0.02)) * 3.6;
        return <Glow key={i} p={[(rnd(i) - 0.5) * 5.4 + Math.sin(t * 0.8 + i) * 0.04, y, (rnd(i + 90) - 0.6) * 2]} w={0.035 + rnd(i + 7) * 0.05} h={0.035 + rnd(i + 7) * 0.05} color={look.water.line} a={(0.25 + rnd(i + 3) * 0.5) * ss(y, WATER - 0.05, WATER - 0.5)} />;
      })}
      {hits.map((h, i) => {
        const r = seg(t, h, h + 0.6);
        return r > 0 && r < 1 ? (
          <React.Fragment key={i}>
            <Glow p={[hitX, WATER, 0.6]} w={0.3 + r * 1.5} h={0.08} color={look.water.line} a={(1 - r) * 1.2} mode="line" />
            <Glow p={[hitX, WATER + 0.05, 0.6]} w={0.5 + r * 0.6} h={0.5 + r * 0.6} color={look.water.line} a={(1 - r) * 0.5} />
            {[0, 1, 2, 3].map((d) => (
              <Glow key={d} p={[hitX + (d - 1.5) * 0.16 * r * 2, WATER + Math.sin(r * Math.PI) * (0.25 + d * 0.06), 0.6]} w={0.05} h={0.05} color={look.water.line} a={(1 - r) * 0.9} />
            ))}
          </React.Fragment>
        ) : null;
      })}

      {/* the school: drifting, and darting away from every spear */}
      {FISH.map(([x0, y, z, s, d, tilt], i) => {
        const span = 5.8;
        const x = ((((x0 + d * t * (0.1 + rnd(i) * 0.14) + span / 2) % span) + span) % span) - span / 2;
        let scare = 0;
        for (const h of hits) if (Math.abs(x - hitX) < 1.3 && y > -2.5) scare = Math.max(scare, easeOut(seg(t, h - 0.05, h + 0.22)) * (1 - ss(t, h + 0.5, h + 1.5)));
        const away = x >= hitX ? 1 : -1;
        return <Fish key={i} p={[x + away * scare * 0.5, y - scare * 0.12, z]} s={s * 0.72} dir={scare > 0.2 ? (away as 1 | -1) : d} tilt={tilt * (1 - scare)} wag={Math.sin(t * (6 + scare * 16) + i * 1.7) * (0.45 + scare * 0.3)} />;
      })}

      {/* working hard */}
      <Figure pose={pose} cast={look.a} x={HX} dir={1} yaw={YAW} energy={energyA} tint={tintA}>
        {[-0.07, 0.01, 0.09].map((dx, i) => (
          <Spear key={i} p={[bx + dx, 0.62, zs + (i - 1) * 0.07]} ang={((92 + (i - 1) * 7) * Math.PI) / 180} back={0.62} front={0.55} />
        ))}
        {holding ? <Spear p={[j.hF[0], j.hF[1], zs]} ang={heldAng} /> : null}
        {throws.map((r) => {
          const tau = t - r;
          const sdist = tau < tw ? 11 * tau : dW + (11 / 6) * (1 - Math.exp(-6 * (tau - tw)));
          const sink = Math.max(0, tau - tw) * 0.45;
          const fade: Fade = {y0: WATER - 0.05, y1: WATER - 2.4, max: 1};
          return <Spear key={r} p={[rel.hF[0] + Math.cos(ang) * sdist, rel.hF[1] + Math.sin(ang) * sdist - sink, zs]} ang={ang - Math.max(0, tau - tw) * 0.12} fade={fade} />;
        })}
      </Figure>

      {/* working smart */}
      <Figure pose={smart} cast={look.b} x={SX} dir={-1} yaw={YAW} energy={energyB}>
        <Chair k={ck} sx={js.pel[0]} sy={seatY} />
        <Mug p={[js.hB[0] + 0.03, js.hB[1] + 0.1, -body.shZ - 0.01]} />
      </Figure>
      <Rod from={[0.72, -0.06, -0.25]} ctrl={[0.5, 1.75, -0.25]} tip={[-0.02, 1.66, -0.25]} t={t} tb={2.95} seed={1} />
      <Rod from={[0.84, -0.06, 0.25]} ctrl={[0.68, 1.25, 0.25]} tip={[0.22, 1.02, 0.25]} t={t} tb={1.35} seed={2} />
      {void A}
    </>
  );
};

export const Over1: React.FC<{t: number; look: Look; cam: Cam}> = ({t, look, cam}) => {
  const o = ss(t, 0.08, 0.5);
  return (
    <>
      <Label look={look} cam={cam} at={[-1.1, 2.5 - (1 - o) * 0.08, 0]} text="Working Hard" o={o} />
      <Label look={look} cam={cam} at={[1.1, 2.5 - (1 - o) * 0.08, 0]} text="Working Smart" o={ss(t, 0.2, 0.62)} />
    </>
  );
};
