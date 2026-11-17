import React, {useMemo} from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {BEAT, DROP, STAND, back, easeInOut, easeOut, gait, lerp, mixPose, pulse, seg, ss} from './anim';
import {BODIES, Cam, Figure, Glow, Label, Part, Pose, Txt, useLook} from './kit3d';
import type {Look} from './looks';
import {Trophy} from './world';

/** scene 3 · 10.67 – 16.93 · "Lucky" → The Luck: */
export const S3 = {from: 10.67, to: 16.93};

const WALL_X = 0.55;
const TOP = 2.2; // the winner's ledge
const LEDGE = 1.2;
const SW = 0.36; // one step
const NSTEPS = 64;
const STAIR_X = WALL_X + LEDGE;

const PULL0 = 13.35;
const PULL1 = 14.95;

export const cam3 = (t: number): Cam => {
  const k = easeInOut(seg(t, PULL0, PULL1));
  const viewH = 6.4 * Math.pow(4.7, k) + Math.max(0, t - PULL1) * 0.5;
  const u = (viewH - 6.4) / 23.7;
  return {viewH, cx: lerp(-0.12, 6.4, u), cy: lerp(1.95, -8.6, u), pitch: 5};
};

const useTerrain = () =>
  useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-9, 0);
    s.lineTo(WALL_X, 0);
    s.lineTo(WALL_X, TOP);
    s.lineTo(STAIR_X, TOP);
    for (let i = 1; i <= NSTEPS; i++) {
      s.lineTo(STAIR_X + (i - 1) * SW, TOP - i * SW);
      s.lineTo(STAIR_X + i * SW, TOP - i * SW);
    }
    s.lineTo(STAIR_X + NSTEPS * SW, -60);
    s.lineTo(-9, -60);
    const body = new THREE.ExtrudeGeometry(s, {depth: 1.5, bevelEnabled: false});
    body.translate(0, 0, -1.05);
    // glowing edges: the ground line, the ledge and every tread
    const strips: THREE.BufferGeometry[] = [];
    const strip = (x0: number, x1: number, y: number) => {
      const g = new THREE.BoxGeometry(x1 - x0, 0.034, 1.5);
      g.translate((x0 + x1) / 2, y + 0.017, -0.3);
      strips.push(g);
    };
    strip(-9, WALL_X, 0);
    strip(WALL_X, STAIR_X, TOP);
    for (let i = 1; i <= NSTEPS; i++) strip(STAIR_X + (i - 1) * SW, STAIR_X + i * SW, TOP - i * SW);
    const wall = new THREE.BoxGeometry(0.034, TOP, 1.5);
    wall.translate(WALL_X - 0.017, TOP / 2, -0.3);
    strips.push(wall);
    return {body, edges: mergeGeometries(strips)};
  }, []);

const LOOKUP: Pose = {pelvis: [0, 0.985], lean: -5, head: [-0.22, 0.06], handF: [0.1, -0.86], elbowF: -1, handB: [-0.05, -0.86], elbowB: -1, footF: [0.1, 0], footB: [-0.1, 0]};
const POINT: Pose = {...LOOKUP, lean: -7, handB: [0.62, 0.5], elbowB: -1};
const SULK: Pose = {pelvis: [0, 0.975], lean: 7, head: [0.14, -0.14], handF: [0.12, -0.9], elbowF: -1, handB: [0.0, -0.9], elbowB: -1, footF: [0.1, 0], footB: [-0.1, 0]};
const PROUD: Pose = {pelvis: [0, 0.985], lean: -3, head: [-0.05, 0.03], handF: [0.22, 0.9], elbowF: 1, handB: [-0.35, -0.5], elbowB: -1, footF: [0.12, 0], footB: [-0.12, 0]};
const CLIMB: Pose = {pelvis: [0.16, 1.14], lean: 15, head: [0.1, -0.02], handF: [-0.42, -0.5], elbowF: -1, handB: [0.5, -0.3], elbowB: -1, footF: [0.5, 0.5], footB: [-0.08, 0]};

/** the climb, one echo per beat after the drop: tread index and time */
const ECHO = [34, 25, 16, 7].map((step, i) => ({step, at: DROP + i * BEAT}));

export const World3: React.FC<{t: number}> = ({t}) => {
  const look = useLook();
  const {body, edges} = useTerrain();
  const b = BODIES[look.kind];
  const far = seg(t, PULL0, PULL1);
  // edge light: soft up close, strong enough to read from far away
  const edgeM = useMemo(() => ({...look.prop, top: '#c9d8f5', bottom: '#7f90b8', emit: lerp(0.5, 1.15, far)}), [look, Math.round(far * 20)]);

  // the walker: comes in, stops under the wall, looks up
  const arrive = 11.85;
  const wx = lerp(-2.1, -0.82, easeOut(seg(t, S3.from + 0.05, arrive)));
  const phase = (wx + 2.1) / (2 * 0.5 * (b.thigh + b.shin) * b.s);
  let pose: Pose = mixPose(gait(phase, {stride: 0.5, lift: 0.14, lean: 7}), LOOKUP, ss(t, arrive - 0.22, arrive + 0.1));
  pose = mixPose(pose, POINT, ss(t, 12.0, 12.25) * (1 - ss(t, 13.0, 13.3)));
  pose = mixPose(pose, SULK, ss(t, 13.15, 13.6));
  const envy = ss(t, 11.9, 13.4);

  const bob = Math.sin(t * 2.4) * 0.008;
  const proud: Pose = {...PROUD, pelvis: [0, 0.985 + bob], handF: [0.22, 0.9 + Math.sin(t * 2.4 + 1) * 0.02]};

  return (
    <>
      <Glow p={[lerp(0.9, 8, far), lerp(3.2, -4, far), -2]} w={lerp(5, 30, far)} h={lerp(6, 34, far)} color={look.bg.glow} a={look.bg.glowAmt * 0.7} />
      <Glow p={[0.95, TOP + 1.6, -1.2]} w={3.2} h={3.6} color={look.accent.top} a={0.14} />
      <Part geo={body} m={look.ground} y0={-16} y1={TOP + 0.5} fade={{z0: 0.2, z1: -1.4, zmax: 0.55}} />
      <Part geo={edges} m={edgeM} y0={-22} y1={TOP} fade={{z0: 0.3, z1: -1.3, zmax: 0.75}} />

      <Figure pose={pose} cast={look.a} x={wx} dir={1} yaw={24} energy={0.6 - envy * 0.3} />

      <Figure pose={proud} cast={look.b} x={WALL_X + 0.52} y={TOP} dir={-1} yaw={28} tint={look.accent.top} energy={1}>
        <Trophy p={[0.26, b.ankle + (b.thigh + b.shin) * 0.985 + b.torso * 0.92 + (b.arm + b.fore) * 0.9 + 0.02, b.shZ + 0.02]} s={0.82} glow={0.45} />
      </Figure>

      {/* what the walker cannot see from below: every step that led here */}
      {ECHO.map(({step, at}, i) => {
        if (t < at - 0.02) return null;
        const pop = back(seg(t, at, at + 0.22), 2.2);
        const flash = pulse(t, at - 0.02, at + 0.06, at + 0.55);
        const x = STAIR_X + (step - 0.42) * SW;
        const y = TOP - step * SW;
        return (
          <React.Fragment key={i}>
            <Figure pose={CLIMB} cast={look.b} x={x} y={y} dir={-1} yaw={24} s={pop} tint={look.accent.top} energy={0.35 + i * 0.2} />
            <Glow p={[x - 0.2, y + 1, 0.4]} w={2.5 + flash * 3} h={2.5 + flash * 3} color={look.accent.top} a={0.12 + flash * 0.7} />
          </React.Fragment>
        );
      })}
      {/* a pulse of light running up the stairs */}
      {[0, 1, 2].map((n) => {
        const k = seg(t, DROP - 0.1 + n * 0.5, DROP + 1.9 + n * 0.5);
        if (k <= 0 || k >= 1) return null;
        const st = lerp(46, 0, k);
        return <Glow key={n} p={[STAIR_X + st * SW, TOP - st * SW + 0.2, 0.5]} w={3.6} h={1.3} color={look.water.line} a={0.5 * Math.sin(k * Math.PI)} rot={-45} />;
      })}
    </>
  );
};

export const Over3: React.FC<{t: number; look: Look; cam: Cam}> = ({t, look, cam}) => {
  const lucky = ss(t, 12.0, 12.2) * (1 - ss(t, 13.0, 13.3));
  const luck = seg(t, DROP - 0.04, DROP + 0.25);
  return (
    <>
      {lucky > 0 ? <Label look={look} cam={cam} at={[-0.72, 2.42 + (1 - lucky) * -0.06, 0]} text="“Lucky”" o={lucky} size={62} /> : null}
      {luck > 0 ? (
        <Txt look={look} x={610} y={330} size={72} o={luck} scale={0.9 + back(luck, 2) * 0.1} color={look.accent.top} glow={1.4}>
          The Luck:
        </Txt>
      ) : null}
    </>
  );
};
