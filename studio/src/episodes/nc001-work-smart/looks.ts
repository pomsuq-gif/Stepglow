/** NC001 — stickman designs. Every design is the same human figure with its own signature detail, proportions and world. */

export type Mat = {
  top: string;
  bottom: string;
  /** colour the lit colour is multiplied by in shadow */
  shade: string;
  rim: string;
  rimAmt: number;
  rimPow: number;
  /** half-lambert wrap, 0 = hard terminator, 1 = very soft */
  wrap: number;
  spec: number;
  /** pearl colour shift */
  iri: number;
  speckle: number;
  emit: number;
};

const base: Mat = {top: '#ffffff', bottom: '#ffffff', shade: '#808080', rim: '#ffffff', rimAmt: 0, rimPow: 3, wrap: 0.5, spec: 0, iri: 0, speckle: 0, emit: 1};
export const mat = (top: string, bottom: string, o: Partial<Mat> = {}): Mat => ({...base, top, bottom, ...o});

/**
 * core   — porcelain body with a light in the chest
 * dipped — pearl body, limbs dipped in colour
 * joint  — lacquer mannequin with glowing ball joints
 * visor  — soft body, dark visor with two lights for eyes, a scarf
 * neon   — dark body drawn by a coloured edge of light
 */
export type Kind = 'core' | 'dipped' | 'joint' | 'visor' | 'neon';

/** materials of one character: body, trim (visor/boots), mark (the signature part) and the signature light colour */
export type Cast = {body: Mat; trim: Mat; mark: Mat; core: string};

export type Look = {
  id: string;
  name: string;
  kind: Kind;
  bg: {center: string; edge: string; glow: string; glowAmt: number};
  a: Cast;
  b: Cast;
  idle: Cast;
  ground: Mat;
  prop: Mat;
  accent: Mat;
  accent2: Mat;
  fail: Mat;
  win: Mat;
  mute: Mat;
  fish: Mat;
  bloom: {strength: number; radius: number; threshold: number};
  water: {line: string; rays: string; raysAmt: number};
  text: {family: string; weight: number; color: string; glow: string; tracking: number; upper: boolean; size: number};
  failText: string;
  winText: string;
  failCore: string;
  winCore: string;
  grain: number;
  vignette: number;
};

/* 1 ─ INNER LIGHT: moonlit porcelain, and a light in the chest that shows how the character is doing. */
const porcelain = mat('#ffffff', '#a9b9d6', {shade: '#56688f', rim: '#dcebff', rimAmt: 0.5, rimPow: 2.4, wrap: 0.75, emit: 0.96});
const dimPorcelain = mat('#8f9bb3', '#3d465c', {shade: '#3a4258', rim: '#c6d6f5', rimAmt: 0.3, wrap: 0.7});
const core: Look = {
  id: 'core',
  name: 'INNER LIGHT',
  kind: 'core',
  bg: {center: '#111b30', edge: '#020308', glow: '#3b5a9a', glowAmt: 0.35},
  a: {body: porcelain, trim: porcelain, mark: porcelain, core: '#ff8a2e'},
  b: {body: porcelain, trim: porcelain, mark: porcelain, core: '#38e8ff'},
  idle: {body: dimPorcelain, trim: dimPorcelain, mark: dimPorcelain, core: '#7f8fb0'},
  ground: mat('#222d44', '#0a0e18', {shade: '#30364a', rim: '#8fb0e8', rimAmt: 0.5, rimPow: 3, wrap: 0.6}),
  prop: mat('#e9f0ff', '#93a3c2', {shade: '#56688f', rim: '#dcebff', rimAmt: 0.4, rimPow: 2.5, wrap: 0.7}),
  accent: mat('#ffd66b', '#ff9d2e', {shade: '#b05a1c', rim: '#fff3c4', rimAmt: 0.6, wrap: 0.8, emit: 1.35}),
  accent2: mat('#7fe7ff', '#2f8dff', {shade: '#234a9c', rim: '#e0fbff', rimAmt: 0.6, wrap: 0.8, emit: 1.2}),
  fail: mat('#ff5a5a', '#b3122a', {shade: '#6b0f25', rim: '#ffc0c0', rimAmt: 0.5, wrap: 0.8, emit: 1.25}),
  win: mat('#7dffa0', '#11b85a', {shade: '#0b6b4a', rim: '#e0ffe9', rimAmt: 0.5, wrap: 0.8, emit: 1.25}),
  mute: dimPorcelain,
  fish: mat('#b9c8e6', '#62749a', {shade: '#3b4868', rim: '#dcebff', rimAmt: 0.5, rimPow: 2.2, wrap: 0.7}),
  bloom: {strength: 0.5, radius: 0.85, threshold: 0.74},
  water: {line: '#bcd6ff', rays: '#5f8de0', raysAmt: 0.5},
  text: {family: 'Sora', weight: 600, color: '#f4f8ff', glow: 'rgba(160,200,255,0.55)', tracking: -0.01, upper: false, size: 50},
  failText: '#ff5a5a',
  winText: '#6dff98',
  failCore: '#ff3b3b',
  winCore: '#4dff8a',
  grain: 0.07,
  vignette: 0.55,
};

/* 2 ─ DIPPED: pearl figures whose hands and feet are dipped in their own colour. */
const pearl = mat('#f6fbff', '#c8d6f0', {shade: '#6a78b8', rim: '#ffffff', rimAmt: 0.45, rimPow: 2.6, wrap: 0.8, iri: 0.42, spec: 0.5});
const dipCol = (top: string, bottom: string, shade: string) => mat(top, bottom, {shade, rim: '#ffffff', rimAmt: 0.5, wrap: 0.8, spec: 0.5, emit: 1.15});
const dipped: Look = {
  id: 'dipped',
  name: 'DIPPED',
  kind: 'dipped',
  bg: {center: '#0f1a2b', edge: '#03050b', glow: '#2fd6c8', glowAmt: 0.22},
  a: {body: pearl, trim: pearl, mark: dipCol('#ff8a4a', '#ff4f6a', '#9a2a5a'), core: '#ff7a4a'},
  b: {body: pearl, trim: pearl, mark: dipCol('#4ff0e0', '#3f9bff', '#2a4aa0'), core: '#4ff0e0'},
  idle: {body: mat('#93a0ba', '#4a546c', {shade: '#4a4a78', rim: '#d0e0ff', rimAmt: 0.3, wrap: 0.7, iri: 0.2}), trim: pearl, mark: mat('#6a7690', '#4a546c', {shade: '#4a4a78'}), core: '#6a7690'},
  ground: mat('#1a2740', '#070b14', {shade: '#3a4266', rim: '#7fe6ff', rimAmt: 0.45, rimPow: 3, wrap: 0.6, iri: 0.25}),
  prop: mat('#eef5ff', '#b8c6e6', {shade: '#6a78b8', rim: '#ffffff', rimAmt: 0.4, wrap: 0.8, iri: 0.35, spec: 0.4}),
  accent: dipCol('#ffb86b', '#ff6f91', '#a04a80'),
  accent2: dipCol('#7afcff', '#6f8bff', '#4a4aa0'),
  fail: dipCol('#ff6b7d', '#d0245a', '#80205a'),
  win: dipCol('#8dffc0', '#17c7a0', '#106f88'),
  mute: mat('#93a0ba', '#4a546c', {shade: '#4a4a78', rim: '#d0e0ff', rimAmt: 0.3, wrap: 0.7, iri: 0.2}),
  fish: mat('#cfe0ff', '#7088b8', {shade: '#4a5088', rim: '#ffffff', rimAmt: 0.5, wrap: 0.8, iri: 0.6, spec: 0.3}),
  bloom: {strength: 0.42, radius: 0.8, threshold: 0.8},
  water: {line: '#a8fff4', rays: '#48c8d8', raysAmt: 0.45},
  text: {family: 'Space Grotesk', weight: 600, color: '#f2fbff', glow: 'rgba(120,240,230,0.5)', tracking: -0.01, upper: false, size: 54},
  failText: '#ff6b7d',
  winText: '#7dffc0',
  failCore: '#ff4f6a',
  winCore: '#3dffb0',
  grain: 0.06,
  vignette: 0.55,
};

/* 3 ─ GOLD JOINTS: a black lacquer artist's mannequin held together by glowing joints. */
const lacquer = mat('#3a2c18', '#120d08', {shade: '#6a5a48', rim: '#ffcf6e', rimAmt: 1.2, rimPow: 2.6, wrap: 0.8, spec: 1.6});
const metal = (top: string, bottom: string, shade: string) => mat(top, bottom, {shade, rim: '#ffffff', rimAmt: 0.6, wrap: 0.7, spec: 0.9, emit: 1.35});
const joint: Look = {
  id: 'joint',
  name: 'GOLD JOINTS',
  kind: 'joint',
  bg: {center: '#1c150a', edge: '#030201', glow: '#b8791e', glowAmt: 0.3},
  a: {body: lacquer, trim: lacquer, mark: metal('#ffe9a8', '#e8a531', '#7a4a12'), core: '#ffcf6e'},
  b: {body: lacquer, trim: lacquer, mark: metal('#ffe9a8', '#e8a531', '#7a4a12'), core: '#ffcf6e'},
  idle: {body: mat('#1a1610', '#080706', {shade: '#807060', rim: '#8a7a5a', rimAmt: 0.8, rimPow: 2.8, wrap: 0.9, spec: 0.5}), trim: lacquer, mark: mat('#7a6c4a', '#4a4030', {shade: '#3a3020', rim: '#c8b890', rimAmt: 0.3}), core: '#7a6c4a'},
  ground: mat('#171008', '#040302', {shade: '#706050', rim: '#c98a2c', rimAmt: 0.9, rimPow: 3.2, wrap: 0.9}),
  prop: mat('#f6d488', '#b47a22', {shade: '#6a3f10', rim: '#fff2c8', rimAmt: 0.6, wrap: 0.7, spec: 0.8, emit: 1.05}),
  accent: metal('#ffe9a8', '#e8a531', '#7a4a12'),
  accent2: mat('#5a4a2a', '#2a2012', {shade: '#504030', rim: '#ffcf6e', rimAmt: 0.8, wrap: 0.8, spec: 0.6}),
  fail: mat('#ff4a3a', '#8a1410', {shade: '#500a0a', rim: '#ffb090', rimAmt: 0.7, wrap: 0.8, spec: 0.6, emit: 1.15}),
  win: metal('#ffe9a8', '#e8a531', '#7a4a12'),
  mute: mat('#2a2114', '#0c0906', {shade: '#807060', rim: '#a8905c', rimAmt: 0.9, rimPow: 2.6, wrap: 0.9, spec: 0.6}),
  fish: mat('#18120a', '#070503', {shade: '#807060', rim: '#d99a3a', rimAmt: 1.3, rimPow: 2.2, wrap: 0.9, spec: 0.8}),
  bloom: {strength: 0.6, radius: 0.75, threshold: 0.62},
  water: {line: '#ffd98a', rays: '#c98a2c', raysAmt: 0.4},
  text: {family: 'Fraunces', weight: 600, color: '#ffe6b0', glow: 'rgba(255,190,90,0.55)', tracking: 0.01, upper: false, size: 56},
  failText: '#ff5a48',
  winText: '#ffd98a',
  failCore: '#ff4a3a',
  winCore: '#fff0b8',
  grain: 0.07,
  vignette: 0.6,
};

/* 4 ─ VISOR: a soft clay figure with a dark visor and two lights for eyes — the only one with a face. */
const clay = (top: string, bottom: string, shade: string) => mat(top, bottom, {shade, rim: '#fff1de', rimAmt: 0.24, rimPow: 2.3, wrap: 0.58, spec: 0.22, speckle: 0.03});
const glassVisor = mat('#2a2148', '#120c26', {shade: '#606080', rim: '#b8a8ff', rimAmt: 0.9, rimPow: 2.2, wrap: 0.8, spec: 1.6});
const visor: Look = {
  id: 'visor',
  name: 'VISOR',
  kind: 'visor',
  bg: {center: '#4a2c58', edge: '#150b1a', glow: '#ff8a5c', glowAmt: 0.22},
  a: {body: clay('#ffe9d2', '#f2b99a', '#a8587c'), trim: glassVisor, mark: clay('#ffa24a', '#f26a2e', '#a8344a'), core: '#fff6c8'},
  b: {body: clay('#ffe9d2', '#f2b99a', '#a8587c'), trim: glassVisor, mark: clay('#6fe6c8', '#2fb69a', '#2a5f94'), core: '#fff6c8'},
  idle: {body: clay('#a98bb0', '#75597f', '#5a4078'), trim: glassVisor, mark: clay('#8a6c96', '#5f466c', '#4a3468'), core: '#8a7ab0'},
  ground: mat('#6b3f6e', '#2a1630', {shade: '#6a4a86', rim: '#ffb7a0', rimAmt: 0.18, rimPow: 3, wrap: 0.55, speckle: 0.03}),
  prop: clay('#fff1de', '#e8c0b0', '#a8587c'),
  accent: clay('#ffab4a', '#ff7d3a', '#b8405a'),
  accent2: clay('#8ff0d0', '#4cc7a8', '#3a6f98'),
  fail: clay('#ff7a70', '#e8454f', '#9a2a60'),
  win: clay('#a5f08a', '#4fcf7a', '#2a7f88'),
  mute: clay('#a98bb0', '#75597f', '#5a4078'),
  fish: clay('#9fd8e8', '#5c9fc0', '#5a5aa0'),
  bloom: {strength: 0.2, radius: 0.9, threshold: 0.86},
  water: {line: '#ffd2b8', rays: '#ff9a7a', raysAmt: 0.3},
  text: {family: 'Fredoka', weight: 600, color: '#fff1de', glow: 'rgba(255,170,120,0.35)', tracking: 0, upper: false, size: 60},
  failText: '#ff7a70',
  winText: '#a5f08a',
  failCore: '#ff8a7a',
  winCore: '#c8ffb0',
  grain: 0.09,
  vignette: 0.45,
};

/* 5 ─ NEON EDGE: black bodies drawn by a line of coloured light. */
const edge = (rim: string) => mat('#150c33', '#070414', {shade: '#b0a0d0', rim, rimAmt: 2.6, rimPow: 2.0, wrap: 1});
const neon: Look = {
  id: 'neon',
  name: 'NEON EDGE',
  kind: 'neon',
  bg: {center: '#170a36', edge: '#020108', glow: '#6a2cff', glowAmt: 0.4},
  a: {body: edge('#ff4fd8'), trim: edge('#ff4fd8'), mark: edge('#ff4fd8'), core: '#ff4fd8'},
  b: {body: edge('#3df2ff'), trim: edge('#3df2ff'), mark: edge('#3df2ff'), core: '#3df2ff'},
  idle: {body: mat('#120a2c', '#06040f', {shade: '#a0a0b0', rim: '#7b6ab0', rimAmt: 1.5, rimPow: 1.8, wrap: 1}), trim: edge('#7b6ab0'), mark: edge('#7b6ab0'), core: '#7b6ab0'},
  ground: mat('#120a2c', '#030108', {shade: '#9080b0', rim: '#8a5cff', rimAmt: 1.5, rimPow: 3.2, wrap: 1}),
  prop: mat('#140b2e', '#070414', {shade: '#b0a0d0', rim: '#c9b8ff', rimAmt: 2.2, rimPow: 1.8, wrap: 1}),
  accent: mat('#ff8fe6', '#ff4fd8', {shade: '#909090', rim: '#ffffff', rimAmt: 0.6, wrap: 1, emit: 1.5}),
  accent2: mat('#3df2ff', '#18a6ff', {shade: '#909090', rim: '#ffffff', rimAmt: 0.6, wrap: 1, emit: 1.5}),
  fail: mat('#2a0514', '#0c0206', {shade: '#b0a0a0', rim: '#ff3355', rimAmt: 3, rimPow: 1.6, wrap: 1}),
  win: mat('#04261a', '#020c08', {shade: '#a0b0a0', rim: '#3dff9a', rimAmt: 3, rimPow: 1.6, wrap: 1}),
  mute: mat('#120a2c', '#06040f', {shade: '#a0a0b0', rim: '#7b6ab0', rimAmt: 1.6, rimPow: 1.8, wrap: 1}),
  fish: mat('#0e0826', '#05030d', {shade: '#b0a0d0', rim: '#7d6bff', rimAmt: 2.0, rimPow: 1.8, wrap: 1}),
  bloom: {strength: 1.0, radius: 0.7, threshold: 0.35},
  water: {line: '#3df2ff', rays: '#7a3cff', raysAmt: 0.55},
  text: {family: 'Unbounded', weight: 600, color: '#f2f6ff', glow: 'rgba(120,200,255,0.8)', tracking: -0.01, upper: false, size: 44},
  failText: '#ff4d6d',
  winText: '#4dffa6',
  failCore: '#ff3355',
  winCore: '#3dff9a',
  grain: 0.06,
  vignette: 0.5,
};

export const LOOKS: Record<string, Look> = {core, dipped, joint, visor, neon};
