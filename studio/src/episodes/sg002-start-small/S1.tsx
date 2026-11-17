import React, {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, easeInOut, easeOut, lerp, poseAt, pulse, rnd, seg, ss, STAND} from '../nc001-work-smart/anim';
import {BODIES, Cam, Figure, Glow, Limb, Part, Pose, Txt, reach, solve, useLook, V3} from '../nc001-work-smart/kit3d';
import {mat, type Look} from '../nc001-work-smart/looks';
import {Floor, mixHex} from '../nc001-work-smart/world';
import {Campfire, charred, chill, warm, WOOD} from './fire';
import {beat, hit, hits, shake} from './grid';
import {sitPose, toLocal, toWorld, yawFor} from './rig';
import {Title} from './title';
import type {Panel} from './Full';

/**
 * scene 1 · 0 – 9.34 · Intensity / Consistency — split screen, the same camp on both sides:
 * a seat log, a campfire and the same bundle of firewood. Left throws the whole bundle in at once, right feeds it a stick at a time.
 */
export const S1 = {from: 0, to: beat(6)};

const FLARE = beat(-6); // 1.74 — the bundle lands in the fire on the beat
const OUT = beat(0); // the blaze is gone when the bass comes in
const TOSSES = [-6, -4, -2, 0, 2, 4].map(beat); // right side: a stick lands on every other beat

/* ── the camp (same coordinates in both panels) ── */
const HX = -0.42; // the seat / the hero
const FX = 0.5; // the fire
const RING = 0.8; // stone ring: x from FX - 0.26
const LOG_R = 0.11;
const STAND_DX = 0.36; // standing, the figure stands this far in front of the log
const YAW = 18;
const BUNDLE_L: V3 = [0.08, 0, -0.42]; // bundle of firewood standing on the ground (left: within reach standing)
const BUNDLE: V3 = [-0.08, 0, -0.34]; // (right: within reach sitting)
const BR = 0.105;
const BH = 0.62;
const STICK_R = 0.017;
const STICKS: [number, number][] = [[0, 0], ...Array.from({length: 8}, (_, i) => [Math.cos((i / 8) * Math.PI * 2) * 0.072, Math.sin((i / 8) * Math.PI * 2) * 0.072] as [number, number])];

const ROPE = mat('#d9a35c', '#8a5a2a', {shade: '#5a3a1a', rim: '#ffd9a0', rimAmt: 0.3, wrap: 0.6});
const PINE = mat('#16233c', '#070b16', {shade: '#0a1020', rim: '#3a5488', rimAmt: 0.35, rimPow: 2.4, wrap: 0.4});
const DIRT = mat('#1c2132', '#080a12', {shade: '#2a2a38', rim: '#7088b8', rimAmt: 0.25, wrap: 0.6});

export const cam1L = (t: number): Cam => {
  // slow push in, a punch and a shake when the blaze goes up, pull back for its height, a punch in when it dies, then creep in on the cold
  const blaze = ss(t, FLARE, FLARE + 0.7) * (1 - ss(t, 4.4, OUT + 0.4));
  const cold = ss(t, OUT, S1.to);
  const punch = 0.1 * hit(t, FLARE, 5) + 0.07 * hit(t, OUT, 4) + 0.025 * hits(t, [beat(2), beat(4)], 6);
  const [sx, sy] = shake(t, 0.035 * hit(t, FLARE, 3));
  return {viewH: (5.5 - 0.25 * ss(t, 0, FLARE) + 1.0 * blaze - 0.7 * cold) * (1 - punch), cx: 0.02 + sx, cy: 1.22 + 0.4 * blaze - 0.15 * cold + sy, pitch: 9, yaw: YAW + 4 * ss(t, 0, S1.to), fov: 24};
};
export const cam1R = (t: number): Cam => {
  const punch = 0.03 * hits(t, TOSSES, 6);
  return {viewH: (5.5 - 0.7 * ss(t, 0, S1.to)) * (1 - punch), cx: 0.02, cy: 1.22 - 0.12 * ss(t, 0, S1.to), pitch: 9, yaw: YAW - 4 * ss(t, 0, S1.to), fov: 24};
};

const pineGeo = (() => {
  const g = new THREE.ConeGeometry(1, 1, 7, 1, false);
  g.translate(0, 0.5, 0);
  return g;
})();
/** a few pines at the edge of the light */
const Forest: React.FC<{glow: number}> = ({glow}) => {
  const trees: [number, number, number][] = [[-1.3, -2.6, 2.3], [-0.55, -3.4, 2.9], [0.4, -3.0, 2.5], [1.25, -2.5, 2.1], [0.95, -4.2, 3.2], [-1.6, -4.4, 3.0]];
  return (
    <>
      {trees.map(([x, z, hgt], i) => (
        <React.Fragment key={i}>
          {[0, 1, 2].map((k) => (
            <Part key={k} geo={pineGeo} m={PINE} y0={0} y1={hgt} position={[x, hgt * (0.18 + k * 0.24), z]} scale={[hgt * (0.3 - k * 0.07), hgt * 0.42, hgt * (0.3 - k * 0.07)]} />
          ))}
          <Limb a={[x, 0, z]} b={[x, hgt * 0.25, z]} r0={0.05} r1={0.04} m={PINE} y0={0} y1={1} />
        </React.Fragment>
      ))}
      <Glow p={[FX, 0.9, -2.2]} w={4.4} h={3.6} color="#ff7a2a" a={0.16 * glow} />
    </>
  );
};

const bandGeo = new THREE.TorusGeometry(BR * 0.98, 0.012, 8, 28).rotateX(Math.PI / 2);
/** the bundle: sticks standing in a ring, two rope bands; `gone` = sticks already pulled out */
const Bundle: React.FC<{p: V3; gone?: boolean[]; rot?: [number, number, number]; burnt?: number}> = ({p, gone = [], rot = [0, 0, 0], burnt = 0}) => {
  const wood = charred(burnt);
  const left = STICKS.length - gone.filter(Boolean).length;
  return (
    <group position={p} rotation={rot}>
      {STICKS.map(([x, z], i) => (gone[i] ? null : <Limb key={i} a={[x, 0.01, z]} b={[x * 1.05, BH, z * 1.05]} r0={STICK_R} r1={STICK_R * 0.9} m={wood} y0={0} y1={BH} />))}
      {left > 4 ? [0.18, 0.44].map((y) => <Part key={y} geo={bandGeo} m={burnt > 0 ? wood : ROPE} y0={0} y1={1} position={[0, BH * y + 0.04, 0]} />) : null}
    </group>
  );
};

const Ground: React.FC<{fire: number}> = ({fire}) => (
  <>
    <Floor y={0} w={30} d={30} z={-10} m={DIRT} />
    <Glow p={[FX - 0.1, 0.004, 0.1]} w={3.2} h={2.2} color="#ff8a3a" a={0.3 * clamp(fire)} flat />
  </>
);

const Seat: React.FC = () => <Limb a={[HX - 0.02, LOG_R, -0.3]} b={[HX + 0.02, LOG_R, 0.3]} r0={LOG_R} r1={LOG_R * 0.95} m={WOOD} y0={0} y1={LOG_R * 2} />;

/* ───────────── left: Intensity ───────────── */

const intensityL = (t: number) => {
  const flare = easeOut(seg(t, FLARE, FLARE + 0.18));
  const big = lerp(0.85, 2.7, flare) - 0.6 * ss(t, FLARE + 0.5, 4.2) + 0.15 * hits(t, [beat(-4), beat(-2)], 3);
  return big * (1 - ss(t, 4.3, OUT - 0.05));
};

const WorldL: React.FC<{t: number}> = ({t}) => {
  const look = useLook();
  const b = BODIES[look.kind];
  const k = b.s;
  const seat = (LOG_R * 2 + 0.012) / k;
  const I = intensityL(t);
  const handR = b.ar[2] * k;

  // turn to the bundle, hug it, swing it overhead lying across the arms, turn back and throw
  // standing up he shifts onto his feet, in front of the log (sitting origin = the log); back onto the log to huddle
  const standK = ss(t, 0.15, 0.47) * (1 - ss(t, OUT + 0.15, beat(1)));
  const fig0 = {x: HX + STAND_DX * standK, z: 0, s: 1};
  const hugAt: V3 = [BUNDLE_L[0], 0.5, BUNDLE_L[2]];
  const yawB = yawFor(hugAt, 0, fig0, b, -40);
  const dB = toLocal(hugAt, {...fig0, dir: 1, yaw: yawB}, b)[0];
  const yaw = t < 0.85 ? lerp(YAW, yawB, easeInOut(seg(t, 0.15, 0.68))) : lerp(yawB, YAW, easeInOut(seg(t, 0.92, 1.35)));
  const fig = {...fig0, dir: 1 as const, yaw};

  const SIT = sitPose(b, seat, {handF: [0.74, -0.16], handB: [0.68, -0.22]});
  const HUG0: Pose = {pelvis: [0.05, 0.72], lean: 45, head: [0.1, -0.1], handF: [0, 0], elbowF: -1, handB: [0, 0], elbowB: -1, footF: [0.2, 0], footB: [-0.22, 0]};
  const hugH = reach(HUG0, b, dB, 0.5 / k);
  const HUG: Pose = {...HUG0, handF: hugH, handB: hugH};
  const OVER0: Pose = {pelvis: [-0.02, 0.985], lean: -8, head: [0, 0.12], handF: [0, 0], elbowF: -1, handB: [0, 0], elbowB: -1, footF: [0.2, 0], footB: [-0.25, 0]};
  const overH = reach(OVER0, b, 0.25, 1.65);
  const CARRY0: Pose = {...OVER0, lean: 0, head: [0, 0]};
  const CARRY: Pose = {...CARRY0, handF: reach(CARRY0, b, 0.5, 1.0), handB: reach(CARRY0, b, 0.5, 1.0)};
  const OVER: Pose = {...OVER0, handF: overH, handB: overH};
  const THROW0: Pose = {pelvis: [0.08, 0.92], lean: 22, head: [0.12, 0], handF: [0, 0], elbowF: -1, handB: [0, 0], elbowB: -1, footF: [0.3, 0], footB: [-0.26, 0.02]};
  const throwH = reach(THROW0, b, 0.52, 1.15);
  const THROW: Pose = {...THROW0, handF: throwH, handB: throwH};
  const JOY: Pose = {pelvis: [0.02, 0.985], lean: -5, head: [0, 0.16], handF: [0.42, 0.88], elbowF: -1, handB: [-0.3, 0.86], elbowB: -1, footF: [0.16, 0], footB: [-0.15, 0]};
  const HOP: Pose = {...JOY, pelvis: [0.06, 1.1], footF: [0.18, 0.15], footB: [-0.14, 0.11]};
  const SHIELD: Pose = {pelvis: [-0.08, 0.95], lean: -16, head: [-0.25, -0.15], handF: [0.38, 0.62], elbowF: -1, handB: [-0.24, -0.74], elbowB: -1, footF: [0.2, 0], footB: [-0.28, 0]};
  const SHIELD2: Pose = {...SHIELD, lean: -20, handF: [0.32, 0.68], head: [-0.3, -0.1]};
  const LOOK: Pose = {pelvis: [0, 0.97], lean: 12, head: [0.2, -0.3], handF: [0.2, -0.82], elbowF: -1, handB: [0.1, -0.84], elbowB: -1, footF: [0.12, 0], footB: [-0.12, 0]};
  // back on the log, hugging his knees
  const HUDDLE0 = sitPose(b, seat, {lean: 22, head: [0.25, -0.35], footF: [0.36, 0], footB: [0.3, 0]});
  const kn = solve(HUDDLE0, b).knF;
  const huddleH = reach(HUDDLE0, b, kn[0] + b.lr[1] + b.ar[2] + 0.01, kn[1] + 0.02);
  const HUDDLE: Pose = {...HUDDLE0, handF: huddleH, handB: huddleH};

  const pose = poseAt(t, [
    [0, SIT],
    [0.15, SIT],
    [0.47, STAND],
    [0.74, HUG],
    [0.84, HUG],
    [1.06, CARRY],
    [1.3, OVER],
    [1.55, THROW],
    [1.7, THROW],
    [1.95, {...JOY, pelvis: [-0.06, 0.985]}],
    [beat(-5) - 0.12, HOP],
    [beat(-5) + 0.14, JOY],
    [2.95, SHIELD],
    [beat(-3), SHIELD2],
    [beat(-2), SHIELD],
    [4.9, LOOK],
    [OUT + 0.2, LOOK],
    [beat(1), HUDDLE],
  ]);
  const j = solve(pose, b);

  // the bundle: on the ground → hugged upright → lying across the hands overhead → flying → lying in the fire
  const hF = toWorld(j.hF, b.shZ, fig, b);
  const hB = toWorld(j.hB, -b.shZ, fig, b);
  const mid: V3 = [(hF[0] + hB[0]) / 2, (hF[1] + hB[1]) / 2, (hF[2] + hB[2]) / 2];
  const tip = ss(t, 0.9, 1.25);
  // hugging: hands at its middle; lying across: it rests on top of the hands
  const held: V3 = [mid[0], mid[1] - lerp(0.5, -(BR + handR), tip), mid[2]];
  const yawRad = (-yaw * Math.PI) / 180;
  let bp: V3 = BUNDLE_L;
  let rot: [number, number, number] = [0, 0, 0];
  if (t >= 0.8 && t < 1.55) {
    const lift = ss(t, 0.8, 0.9);
    bp = [lerp(BUNDLE_L[0], held[0], lift), lerp(0, held[1], lift), lerp(BUNDLE_L[2], held[2], lift)];
    // lying across = its axis along the hero's local z: tip it over around the hero's facing direction
    rot = [0, yawRad, 0];
  }
  const fly = seg(t, 1.55, FLARE);
  const RELEASE: V3 = (() => {
    const jj = solve(THROW, b);
    const a = toWorld(jj.hF, b.shZ, {...fig0, dir: 1, yaw: YAW}, b);
    const c = toWorld(jj.hB, -b.shZ, {...fig0, dir: 1, yaw: YAW}, b);
    return [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2 + BR + handR, (a[2] + c[2]) / 2];
  })();
  const flying = t >= 1.55 && t < FLARE;
  const fp: V3 = [lerp(RELEASE[0], FX, fly), lerp(RELEASE[1], 0.07 + BR, fly) + Math.sin(fly * Math.PI) * 0.28, lerp(RELEASE[2], 0, fly)];

  const cold = ss(t, 4.4, OUT + 0.6);
  const tint = t < FLARE ? '#ff8a2e' : mixHex('#ffb43a', '#7f8fb0', cold);
  const energy = t < FLARE ? 0.62 : lerp(lerp(1, 0.8, ss(t, 2, 4.2)), 0.16, cold);
  const shiver = t > beat(1) ? Math.sin(t * 41) * 0.004 * (0.5 + 0.5 * hits(t, [beat(2), beat(3), beat(4), beat(5)], 3)) : 0;
  const head = toWorld(j.head, 0, fig, b);

  return (
    <>
      <Forest glow={Math.min(1.6, I)} />
      <Ground fire={I / 1.2} />
      <Glow p={[FX, 1.4, -1.6]} w={5} h={5} color={mixHex('#3b5a9a', '#ff7a2a', Math.min(1, I / 2.7) * 0.8)} a={0.24} />
      <Seat />
      <Campfire x={FX} ring={RING} t={t} I={I} seed={1.3} burnt={ss(t, 2.0, OUT)} ember={t > OUT - 0.4 ? 1 - seg(t, OUT, 9.3) * 0.7 : 0} smoke={ss(t, OUT - 0.5, OUT + 0.3) * (1.6 - ss(t, 8.3, 9.3) * 0.6)} smokeT={t - OUT + 0.5} />
      {t < 1.55 ? (
        // the tilt from upright to lying across happens around the hero's facing axis
        <group position={bp} rotation={rot}>
          <group rotation={[(tip * Math.PI) / 2, 0, 0]}>
            <Bundle p={[0, (-BH / 2) * tip, 0]} />
          </group>
        </group>
      ) : flying ? (
        <group position={fp} rotation={[0, lerp(((-YAW) * Math.PI) / 180, 0, fly), 0]}>
          <group rotation={[Math.PI / 2, 0, 0]}>
            <Bundle p={[0, -BH / 2, 0]} />
          </group>
        </group>
      ) : (
        <group position={[FX, 0.07 + BR, 0]}>
          <group rotation={[Math.PI / 2, 0, 0]}>
            <Bundle p={[0, -BH / 2, 0]} burnt={ss(t, FLARE, OUT)} />
          </group>
        </group>
      )}
      <Figure pose={pose} cast={chill(warm(look.a, Math.min(1, I / 1.4) * 0.9), cold)} x={fig0.x + shiver} dir={1} yaw={yaw} energy={energy} tint={tint} />
      {t > OUT + 1.0
        ? [0, 1, 2].map((i) => {
            const ph = (t - OUT - 1.0 - i * 1.15 + 3.45) % 3.45;
            return ph < 0.9 ? <Glow key={i} p={[head[0] + 0.14 + ph * 0.22, head[1] - 0.04 + ph * 0.1, head[2] + 0.06]} w={0.1 + ph * 0.3} h={0.08 + ph * 0.22} color="#cfe0ff" a={0.4 * (1 - ph / 0.9)} /> : null;
          })
        : null}
    </>
  );
};

/* ───────────── right: Consistency ───────────── */

const intensityR = (t: number) => 0.82 + 0.06 * ss(t, 0, 9) + TOSSES.reduce((s, L) => s + 0.3 * pulse(t, L, L + 0.1, L + 0.75), 0);
const stickTop = (i: number): V3 => [BUNDLE[0] + STICKS[i][0] * 1.05, BH, BUNDLE[2] + STICKS[i][1] * 1.05];

const WorldR: React.FC<{t: number}> = ({t}) => {
  const look = useLook();
  const b = BODIES[look.kind];
  const k = b.s;
  const seat = (LOG_R * 2 + 0.012) / k;
  const I = intensityR(t);
  const fig0 = {x: HX, z: 0, s: 1};

  // the sticks nearest to the back hand go first
  const order = useMemo(() => {
    const f = {...fig0, dir: 1 as const, yaw: YAW};
    return STICKS.map((_, i) => i).sort((a, c) => Math.abs(toLocal(stickTop(a), f, b)[2] + b.shZ) - Math.abs(toLocal(stickTop(c), f, b)[2] + b.shZ));
  }, [b]);

  const n = TOSSES.findIndex((L) => t < L + 0.27);
  const L = n >= 0 ? TOSSES[n] : 99;
  const target = stickTop(n >= 0 ? order[n] : 0);
  // turn a little so the stick lies in the plane of the back hand
  const yawG = yawFor(target, -b.shZ, fig0, b, YAW);
  const yaw = lerp(YAW, yawG, pulse(t, L - 1.0, L - 0.76, L - 0.3));
  const fig = {...fig0, dir: 1 as const, yaw};

  const SIT = sitPose(b, seat, {handF: [0.74, -0.16], handB: [0.68, -0.22]});
  const handR = b.ar[2];
  const loc = toLocal(target, {...fig0, dir: 1, yaw: yawG}, b);
  const GRAB = sitPose(b, seat, {lean: 14, head: [0.15, -0.2], handF: [0.7, -0.2]});
  const grabH = reach(GRAB, b, loc[0], loc[1] + handR * 0.6);
  const PULL = sitPose(b, seat, {lean: 6, handF: [0.7, -0.2]});
  const pullH = reach(PULL, b, loc[0] + 0.02, loc[1] + BH / k + 0.05);
  const TOSS = sitPose(b, seat, {lean: 18, handF: [0.7, -0.22], handB: [0.95, 0.05]});
  const pose =
    n >= 0
      ? poseAt(t, [
          [L - 1.0, SIT],
          [L - 0.76, {...GRAB, handB: grabH}],
          [L - 0.68, {...GRAB, handB: grabH}],
          [L - 0.42, {...PULL, handB: pullH}],
          [L - 0.18, TOSS],
          [L + 0.02, TOSS],
          [L + 0.27, SIT],
        ])
      : SIT;
  const j = solve(pose, b);
  const hand = toWorld(j.hB, -b.shZ, fig, b);

  const gone = STICKS.map((_, i) => TOSSES.some((Lx, m) => order[m] === i && t >= Lx - 0.68));
  const holding = n >= 0 && t >= L - 0.68 && t < L - 0.18;
  const landed = TOSSES.filter((Lx) => t >= Lx);
  const fly = n >= 0 ? seg(t, L - 0.18, L) : 0;
  const top = hand[1] - handR * k * 0.6;

  return (
    <>
      <Forest glow={I} />
      <Ground fire={I / 1.2} />
      <Glow p={[FX, 1.4, -1.6]} w={5} h={5} color={mixHex('#3b5a9a', '#ff7a2a', 0.4)} a={0.22} />
      <Seat />
      <Campfire x={FX} ring={RING} t={t} I={I} seed={4.1} burnt={0.4} />
      <Bundle p={BUNDLE} gone={gone} />
      {/* held at its top end, hanging down */}
      {holding ? <Limb a={[hand[0], top, hand[2]]} b={[hand[0] + 0.015, top - BH, hand[2]]} r0={STICK_R} r1={STICK_R * 0.9} m={WOOD} y0={0} y1={2} /> : null}
      {fly > 0 && fly < 1
        ? (() => {
            const c: V3 = [lerp(hand[0], FX, fly), lerp(top - BH / 2, 0.14, fly) + Math.sin(fly * Math.PI) * 0.16, lerp(hand[2], 0.04, fly)];
            const a = lerp(Math.PI / 2, 0.15, fly);
            const dx = Math.cos(a) * BH * 0.5;
            const dy = Math.sin(a) * BH * 0.5;
            return <Limb a={[c[0] - dx, c[1] - dy, c[2]]} b={[c[0] + dx, c[1] + dy, c[2]]} r0={STICK_R} r1={STICK_R} m={WOOD} y0={0} y1={2} />;
          })()
        : null}
      {landed.slice(-3).map((Lx, i) => {
        const a = rnd(i + Lx) * 1.2 - 0.6;
        return <Limb key={Lx} a={[FX - Math.cos(a) * 0.2, 0.12 + i * 0.03, 0.03 - Math.sin(a) * 0.12]} b={[FX + Math.cos(a) * 0.2, 0.13 + i * 0.03, 0.03 + Math.sin(a) * 0.12]} r0={STICK_R} r1={STICK_R} m={charred(clamp((t - Lx) / 2.5))} y0={0} y1={0.3} />;
      })}
      <Figure pose={pose} cast={warm(look.b, Math.min(1, I / 1.2) * 0.75)} x={HX} dir={1} yaw={yaw} energy={0.85 + 0.1 * Math.sin(t * 2.4)} />
    </>
  );
};

export const S1L: Panel = {cam: cam1L, World: WorldL};
export const S1R: Panel = {cam: cam1R, World: WorldR};

export const Over1: React.FC<{t: number; look: Look}> = ({t}) => (
  <>
    <Title x={270} y={300} t={t} at={0.1} out={S1.to - 0.35}>
      Intensity
    </Title>
    <Title x={810} y={300} t={t} at={0.25} out={S1.to - 0.35}>
      Consistency
    </Title>
  </>
);
