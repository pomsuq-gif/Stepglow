import React, {useMemo} from 'react';
import {BEAT, back, beat, clamp, easeIn, easeInOut, easeOut, lerp, mixPose, pulse, seg, ss} from './anim';
import {BODIES, Body, Cam, Figure, Glow, Limb, P2, Pose, Txt, reach, useLook} from './kit3d';
import type {Look, Mat} from './looks';
import {Floor, mixHex} from './world';

/** scene 5 · 21.20 – 26.87 · The first step is always the hardest → break it into smaller steps */
export const S5 = {from: 21.2, to: 26.87};

export const cam5 = (t: number): Cam => ({viewH: 8.4, cy: 2.4 + easeInOut(seg(t, 24.2, 26.87)) * 0.7, pitch: 5});

const LX = 1.42; // ladders at ±LX
const YAW = -56; // seen from behind, three-quarter
const S = 0.92;
/* figure-local units */
const XL = 0.36; // the ladder stands this far in front of the climber
const D = 0.3; // a small step
const R0 = 8 * D; // the first rung of the original ladder
const TOPR = 30;
const CLIMB0 = beat(15); // 24.0

const uA = (x: number) => (x <= 0 ? 0 : 2 * Math.floor(x / 2) + 2 * ss(clamp(x - 2 * Math.floor(x / 2)), 0.08, 0.95));

/** standing / crouching / jumping / hanging under the rung: one pose driven by the pelvis height */
const vertical = (b: Body, pelY: number, o: {hands: number; swing?: number; tuck?: number; lean?: number; head?: P2; drop?: number; px?: number}): Pose => {
  const L = b.thigh + b.shin;
  const {hands, swing = 0, tuck = 0, lean = 0, head = [0, 0], drop = 0, px = XL - 0.1} = o;
  const stand = b.ankle + L * 0.985;
  const air = Math.max(0, pelY - stand);
  const p: Pose = {
    pelvis: [px / L, 0],
    pelvisY: pelY,
    lean: lean + swing * 9,
    head,
    handF: [0.1, -0.86],
    handB: [-0.06, -0.86],
    elbowF: -1,
    elbowB: -1,
    footF: [(px + 0.09) / L + swing * 0.3, air / L + tuck],
    footB: [(px - 0.09) / L + swing * 0.22, air / L + tuck * 0.5],
  };
  const up = reach(p, b, XL - 0.02, R0 - 0.02);
  return {
    ...p,
    handF: [lerp(p.handF[0], up[0], hands), lerp(p.handF[1], up[1], hands)],
    handB: [lerp(p.handB[0], up[0], hands * (1 - drop)), lerp(p.handB[1], up[1], hands * (1 - drop))],
  };
};

/** climbing: hand and opposite foot move together, two small rungs at a time */
const climbing = (b: Body, c: number): Pose => {
  const L = b.thigh + b.shin;
  const mv = (x: number) => Math.sin(clamp(x - 2 * Math.floor(Math.max(0, x) / 2)) * Math.PI) * (x > 0 ? 1 : 0);
  const p: Pose = {
    pelvis: [0.07 / L, 0],
    pelvisY: b.ankle + D * (c + 0.5) + 0.55 + Math.sin(c * Math.PI) * 0.012,
    lean: 9,
    head: [0.02, 0.12],
    handF: [0, 0],
    handB: [0, 0],
    elbowF: -1,
    elbowB: -1,
    footB: [(XL - 0.08 - mv(c) * 0.06) / L, (D * uA(c)) / L + mv(c) * 0.03],
    footF: [(XL - 0.08 - mv(c - 1) * 0.06) / L, (D * (uA(c - 1) + 1)) / L + mv(c - 1) * 0.03],
  };
  const hf = reach(p, b, XL - 0.02 - mv(c) * 0.05, D * (4 + uA(c)));
  const hb = reach(p, b, XL - 0.02 - mv(c - 1) * 0.05, D * (5 + uA(c - 1)));
  return {...p, handF: hf, handB: hb};
};

const Ladder: React.FC<{t: number; small: boolean}> = ({t, small}) => {
  const look = useLook();
  const m: Mat = useMemo(() => ({...look.prop, top: '#b4c4e6', bottom: '#66769e', emit: 0.72}), [look]);
  const fresh: Mat = useMemo(() => ({...look.accent2, emit: 1.25}), [look]);
  const H = TOPR * D + 0.3;
  const rungs: React.ReactNode[] = [];
  for (let j = 1; j <= TOPR; j++) {
    const original = j >= 8 && j % 2 === 0;
    if (!original && !small) continue;
    // new rungs slide in from the side: the low ones first, the rest ahead of the climber
    const at = j < 8 ? beat(14) + (j - 1) * 0.085 : CLIMB0 + 0.15 + ((j - 9) / 2) * 0.24;
    if (!original && t < at) continue;
    const k = original ? 1 : back(seg(t, at, at + 0.26), 1.4);
    const hot = original ? 0 : 1 - ss(t, at + 0.2, at + 1.1);
    const z = (1 - k) * -1.1;
    rungs.push(<Limb key={j} a={[XL, j * D, -0.3 + z]} b={[XL, j * D, 0.3 + z]} r0={0.02} r1={0.02} m={hot > 0.02 ? fresh : m} y0={0} y1={8} />);
    if (hot > 0.02) rungs.push(<Glow key={`g${j}`} p={[XL, j * D, z + 0.1]} w={1.3} h={0.32} color={look.accent2.top} a={hot * 0.55} />);
  }
  return (
    <>
      <Limb a={[XL, 0, -0.3]} b={[XL, H, -0.3]} r0={0.024} r1={0.024} m={m} y0={0} y1={8} />
      <Limb a={[XL, 0, 0.3]} b={[XL, H, 0.3]} r0={0.024} r1={0.024} m={m} y0={0} y1={8} />
      {rungs}
    </>
  );
};

export const World5: React.FC<{t: number}> = ({t}) => {
  const look = useLook();
  const b = BODIES[look.kind];
  const L = b.thigh + b.shin;
  const A = b.arm + b.fore;
  const stand = b.ankle + L * 0.985;
  const HANG = R0 - A * 0.97 - b.torso * 0.92;

  /* ── right: the big first step, again and again ── */
  let ry = stand;
  ry = lerp(ry, 0.52, ss(t, 21.42, 21.6));
  ry = lerp(ry, HANG, easeOut(seg(t, 21.6, 21.82)));
  ry += easeInOut(seg(t, 22.55, 23.0)) * 0.24 * (1 - ss(t, 23.02, 23.16));
  ry = lerp(ry, 0.5, easeIn(seg(t, 23.18, 23.42)));
  ry = lerp(ry, 0.68, ss(t, 23.45, 23.85));
  ry = lerp(ry, 0.5, ss(t, 24.36, 24.55));
  ry = lerp(ry, HANG, easeOut(seg(t, 24.55, 24.78)));
  const rHands = Math.max(ss(t, 21.5, 21.72) * (1 - ss(t, 23.16, 23.24)), ss(t, 24.5, 24.7));
  const rHang = (t > 21.82 && t < 23.18) || t > 24.78;
  const shake = pulse(t, 22.6, 23.0, 23.15) * Math.sin(t * 46) * 0.05;
  const rSwing = rHang ? Math.sin((t - 21.82) * 5.2) * 0.1 * (t > 24.78 ? Math.exp(-(t - 24.78) * 0.7) + 0.25 : 1) + shake : 0;
  const drop = ss(t, 26.05, 26.3);
  const rSlump = ss(t, 23.5, 23.8) * (1 - ss(t, 24.25, 24.4));
  let rPose = vertical(b, ry, {hands: rHands, swing: rSwing, tuck: rHang ? 0.04 + Math.max(0, Math.sin(t * 7)) * 0.05 * (t > 24.78 ? 1 : 0.3) : 0, lean: rSlump * 26 - drop * 6, head: [rSlump * 0.2 - 0.12 * (1 - rSlump), 0.08 * (1 - rSlump) - rSlump * 0.25], drop});
  if (rSlump > 0) rPose = mixPose(rPose, {...rPose, handF: [0.32, -0.62], handB: [0.24, -0.66]}, rSlump);
  const rFail = clamp(ss(t, 23.1, 23.5) * 0.5 + ss(t, 25.2, 26.6) * 0.5);

  /* ── left: one try, a thought, and then a staircase of small steps ── */
  let ly = stand;
  ly = lerp(ly, 0.52, ss(t, 21.42, 21.6));
  ly = lerp(ly, HANG, easeOut(seg(t, 21.6, 21.82)));
  ly = lerp(ly, 0.55, easeIn(seg(t, 22.45, 22.68)));
  ly = lerp(ly, stand, ss(t, 22.7, 23.0));
  const lHands = ss(t, 21.5, 21.72) * (1 - ss(t, 22.42, 22.5));
  const lHang = t > 21.82 && t < 22.45;
  const think = ss(t, 23.0, 23.2) * (1 - ss(t, 23.55, 23.8));
  let lPose = vertical(b, ly, {hands: lHands, swing: lHang ? Math.sin((t - 21.82) * 5.2) * 0.09 : 0, tuck: lHang ? 0.04 : 0, lean: -think * 3, head: [-0.14 + think * 0.04, 0.08 + think * 0.04], px: XL - 0.1 - ss(t, 22.8, 23.1) * 0.14});
  if (think > 0) lPose = mixPose(lPose, {...lPose, handF: [0.3, 0.42], elbowF: -1}, think);
  const c = Math.max(0, (t - CLIMB0) / (BEAT / 2));
  const mount = ss(t, CLIMB0 - 0.3, CLIMB0);
  if (mount > 0) lPose = mixPose(lPose, climbing(b, c), mount);
  const idea = ss(t, 23.05, 23.45);
  const lTint = mixHex(look.a.core, look.b.core, idea);
  const lEnergy = 0.5 + idea * 0.2 + clamp(c / 16) * 0.3 + pulse(t, 23.05, 23.2, 23.7) * 0.4;
  const lRise = Math.max(0, (lPose.pelvisY ?? stand) - stand) * S * b.s;
  const rRise = Math.max(0, ry - stand) * S * b.s;

  return (
    <>
      <Glow p={[-LX, 2.6, -1.8]} w={4.4} h={8} color={look.bg.glow} a={look.bg.glowAmt * (0.5 + idea * 0.4)} />
      <Glow p={[LX, 2.2, -1.8]} w={4.4} h={7} color={look.bg.glow} a={look.bg.glowAmt * 0.45} />
      <Glow p={[0, 7.3, -1.5]} w={5} h={3.2} color={look.accent.top} a={0.16} />
      <Floor y={0} w={9} d={2.6} />

      <Figure pose={lPose} cast={look.a} x={-LX} dir={1} yaw={YAW} s={S} gy={lRise} energy={lEnergy} tint={lTint}>
        <Ladder t={t} small />
      </Figure>

      <Figure pose={rPose} cast={look.a} x={LX} dir={-1} yaw={YAW} s={S} gy={rRise} energy={0.6 - rFail * 0.42} tint={mixHex(look.a.core, '#ff3a24', rFail)}>
        <Ladder t={t} small={false} />
      </Figure>
      {/* landing dust */}
      {[23.42, 22.68].map((tl, i) => {
        const k = seg(t, tl, tl + 0.5);
        return k > 0 && k < 1 ? <Glow key={i} p={[i === 0 ? LX : -LX, 0.06, 0.6]} w={0.6 + k * 1.3} h={0.1} color={look.water.line} a={(1 - k) * 0.7} mode="line" /> : null;
      })}
    </>
  );
};

const typed = (text: string, k: number) => text.slice(0, Math.round(clamp(k) * text.length));

export const Over5: React.FC<{t: number; look: Look; cam: Cam}> = ({t, look}) => {
  const a = ss(t, S5.from + 0.25, S5.from + 0.7);
  const line = 'Break It Into\nSmaller Steps';
  const k = seg(t, 23.05, 23.8);
  const glowUp = ss(t, 24.0, 26.6);
  return (
    <>
      <Txt look={look} x={540} y={228} size={66} color={look.accent.top} o={ss(t, S5.from + 0.1, S5.from + 0.5)} glow={1 + glowUp * 0.8} scale={1 + glowUp * 0.05}>
        SUCCESS
      </Txt>
      <Txt look={look} x={540} y={640} size={45} o={a * (1 - ss(t, 23.6, 24.2) * 0.45)}>
        {'The First Step\nIs Always\nThe Hardest'}
      </Txt>
      {k > 0 ? (
        <Txt look={look} x={540} y={930} size={47} color={look.b.core}>
          <span>{typed(line, k)}</span>
          <span style={{opacity: 0}}>{line.slice(typed(line, k).length)}</span>
        </Txt>
      ) : null}
    </>
  );
};
