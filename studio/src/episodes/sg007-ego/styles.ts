import {createContext, useContext} from 'react';
import {LOOKS, type Look} from '../nc001-work-smart/looks';
import {SG} from '../sg002-start-small/look';

/**
 * SG007 style options: the same arena, rigs and timing, drawn six ways.
 * fig: how the characters are drawn — 3D (porcelain | toon | neon | clay | marble) or 2D over the 3D world (flat | ink).
 */
import type {CSSProperties} from 'react';
import type {Env} from './envs';

export type Fig = 'porcelain' | 'toon' | 'neon' | 'clay' | 'vinyl' | 'marble' | 'flat' | 'ink' | 'paper';
export type Sty = {
  id: string;
  name: string;
  fig: Fig;
  look: Look;
  /** floor: base (house lights off/on), pool light colour and strength, spot cones, board lines */
  floor: [string, string];
  pool: string;
  poolAmt: number;
  cone: number;
  grid: number;
  /** crowd silhouettes */
  crowd: string;
  crowdAmt: number;
  /** tables */
  steel: [string, string];
  top: [string, string];
  /** characters: body (lit/shade), outline colour and width (world), per-character body colours (clay) */
  body: [string, string];
  line: string;
  lineW: number;
  bands: boolean;
  tinted?: boolean;
  /** caption colour for plain words, shadow strength */
  text: string;
  textShadow: string;
  shadow: number;
  /** the world around the tables, and the caption box */
  env?: Env;
  cap?: CSSProperties;
  /** round 3: a physically lit set with cartoon 3D characters */
  real?: {env: 'hall' | 'pub' | 'garage' | 'gym' | 'pro'; colored: boolean; neck?: number; design?: 'cel2d' | 'classic' | 'bean' | 'rubber' | 'block' | 'ring'};
};

const night = {...SG, bg: {center: '#111a30', edge: '#020308', glow: '#2c4a8a', glowAmt: 0.28}};

export const STYLES: Sty[] = [
  {
    id: 'toon',
    name: 'Ink Toon',
    fig: 'toon',
    look: {...night, bloom: {strength: 0.25, radius: 0.35, threshold: 0.97}, vignette: 0.4},
    floor: ['#020306', '#070b16'],
    pool: '#e6eeff',
    poolAmt: 1.25,
    cone: 1.3,
    grid: 1,
    crowd: '#222b44',
    crowdAmt: 1,
    steel: ['#3c4664', '#141a2a'],
    top: ['#232c46', '#10151f'],
    body: ['#eef2fa', '#8f9cc0'],
    line: '#05070d',
    lineW: 0.03,
    bands: true,
    text: '#ffffff',
    textShadow: '0 3px 0 #000, 0 0 3px #000, 0 6px 22px rgba(0,0,0,0.9)',
    shadow: 0.9,
  },
  {
    id: 'flat',
    name: '2D Flat · 3D arena',
    fig: 'flat',
    look: {...night, bloom: {strength: 0.32, radius: 0.35, threshold: 0.88}},
    floor: ['#020306', '#080c18'],
    pool: '#e6eeff',
    poolAmt: 1.2,
    cone: 1.2,
    grid: 1,
    crowd: '#222b44',
    crowdAmt: 1,
    steel: ['#3c4664', '#141a2a'],
    top: ['#232c46', '#10151f'],
    body: ['#ffffff', '#ffffff'],
    line: '#05070d',
    lineW: 0,
    bands: true,
    text: '#ffffff',
    textShadow: '0 3px 0 #000, 0 0 3px #000, 0 6px 22px rgba(0,0,0,0.9)',
    shadow: 0.8,
  },
  {
    id: 'neon',
    name: 'Neon Noir',
    fig: 'neon',
    look: {...night, bg: {center: '#0d0820', edge: '#010004', glow: '#5a1e8a', glowAmt: 0.35}, bloom: {strength: 0.75, radius: 0.5, threshold: 0.6}, vignette: 0.5},
    floor: ['#000000', '#03020a'],
    pool: '#b48cff',
    poolAmt: 0.7,
    cone: 0.8,
    grid: 3.5,
    crowd: '#120c22',
    crowdAmt: 1,
    steel: ['#1a1830', '#06050c'],
    top: ['#0e0c1c', '#050409'],
    body: ['#0d0e16', '#050509'],
    line: '#ffffff',
    lineW: 0.02,
    bands: false,
    tinted: true,
    text: '#ffffff',
    textShadow: '0 0 12px rgba(180,140,255,0.8), 0 4px 18px rgba(0,0,0,0.9)',
    shadow: 0.9,
  },
  {
    id: 'clay',
    name: 'Clay Studio',
    fig: 'clay',
    look: {...LOOKS.core, ...SG, id: 'clay', bg: {center: '#f1e4d2', edge: '#b99f84', glow: '#ffffff', glowAmt: 0.2}, bloom: {strength: 0.12, radius: 0.3, threshold: 0.95}, vignette: 0.28, grain: 0},
    floor: ['#9c8670', '#d8c6b0'],
    pool: '#fff2dc',
    poolAmt: 0.35,
    cone: 0.0,
    grid: 0,
    crowd: '#cdb79d',
    crowdAmt: 0.6,
    steel: ['#6c5a4c', '#3e3128'],
    top: ['#8a7262', '#5a463a'],
    body: ['#ffffff', '#d0c2b2'],
    line: '#3a2c24',
    lineW: 0,
    bands: false,
    tinted: true,
    text: '#2a1f18',
    textShadow: '0 2px 0 rgba(255,255,255,0.6), 0 6px 18px rgba(255,240,220,0.7)',
    shadow: 0.55,
  },
  {
    id: 'marble',
    name: 'Marble & Gold',
    fig: 'marble',
    look: {...night, bg: {center: '#16120c', edge: '#020101', glow: '#6a4a18', glowAmt: 0.3}, bloom: {strength: 0.35, radius: 0.4, threshold: 0.93}, vignette: 0.45},
    floor: ['#000000', '#070605'],
    pool: '#ffd9a0',
    poolAmt: 1.0,
    cone: 1.4,
    grid: 0,
    crowd: '#1e1812',
    crowdAmt: 1,
    steel: ['#e0b05a', '#6a4410'],
    top: ['#1c1a18', '#0a0908'],
    body: ['#e6e1d8', '#6e6860'],
    line: '#000000',
    lineW: 0,
    bands: false,
    text: '#fff6e6',
    textShadow: '0 3px 0 #000, 0 6px 22px rgba(0,0,0,0.9), 0 0 24px rgba(255,200,120,0.35)',
    shadow: 0.9,
  },
  {
    id: 'ink',
    name: 'Ink on Paper',
    fig: 'ink',
    look: {...LOOKS.core, ...SG, id: 'ink', bg: {center: '#f6efe0', edge: '#d8ccb4', glow: '#ffffff', glowAmt: 0.15}, bloom: {strength: 0.05, radius: 0.3, threshold: 0.98}, vignette: 0.22, grain: 0},
    floor: ['#cfc3aa', '#ece2cc'],
    pool: '#fffaf0',
    poolAmt: 0.35,
    cone: 0,
    grid: 0,
    crowd: '#ddd1b8',
    crowdAmt: 0.5,
    steel: ['#4a4440', '#2a2522'],
    top: ['#5a524a', '#3a342e'],
    body: ['#1a1614', '#1a1614'],
    line: '#1a1614',
    lineW: 0,
    bands: false,
    text: '#1a1614',
    textShadow: 'none',
    shadow: 0.35,
  },
  {
    id: 'porcelain',
    name: 'Inner Light (v1)',
    fig: 'porcelain',
    look: SG,
    floor: ['#010205', '#04070f'],
    pool: '#c9d6ff',
    poolAmt: 1,
    cone: 1,
    grid: 1,
    crowd: '#2c3550',
    crowdAmt: 1,
    steel: ['#5a6688', '#1a2032'],
    top: ['#2b3450', '#141a2a'],
    body: ['#ffffff', '#a9b9d6'],
    line: '#000000',
    lineW: 0,
    bands: false,
    text: '#f4f7ff',
    textShadow: '0 3px 2px rgba(0,0,0,0.6), 0 6px 26px rgba(0,0,0,0.9)',
    shadow: 0.85,
  },
];

const dark = {...SG, bloom: {strength: 0.3, radius: 0.4, threshold: 0.9}, vignette: 0.35};

/** round 2: six new worlds, each with its own characters, light and captions */
export const WORLDS: Sty[] = [
  {
    id: 'bar', name: 'Dive Bar', fig: 'toon', env: 'bar',
    look: {...dark, bg: {center: '#1a0c08', edge: '#050202', glow: '#5a2a10', glowAmt: 0.2}, bloom: {strength: 0.35, radius: 0.45, threshold: 0.95}, vignette: 0.5},
    floor: ['#000000', '#000000'], pool: '#ffb86a', poolAmt: 0, cone: 0, grid: 0, crowd: '#000000', crowdAmt: 0,
    steel: ['#2a1a10', '#0e0804'], top: ['#8a5a32', '#4a2a14'],
    body: ['#f0e2cc', '#8a6248'], line: '#120806', lineW: 0.026, bands: true,
    text: '#fff2e0', textShadow: '0 0 6px #ff3a6a, 0 0 22px #ff3a6a, 0 4px 18px rgba(0,0,0,0.9)', shadow: 0.9,
    cap: {fontFamily: 'Sora', letterSpacing: '0.04em'},
  },
  {
    id: 'colosseum', name: 'Colosseum at Sunset', fig: 'marble', env: 'colosseum',
    look: {...dark, bg: {center: '#e0704a', edge: '#2a1a4a', glow: '#ffb46a', glowAmt: 0.2}, bloom: {strength: 0.3, radius: 0.5, threshold: 0.85}, vignette: 0.3},
    floor: ['#000000', '#000000'], pool: '#ffd9a0', poolAmt: 0, cone: 0, grid: 0, crowd: '#000000', crowdAmt: 0,
    steel: ['#d8c0a0', '#6a5038'], top: ['#e8d4b4', '#8a6a4a'],
    body: ['#f6eee2', '#9a7a62'], line: '#000000', lineW: 0, bands: false,
    text: '#fff4e0', textShadow: '0 3px 0 rgba(60,20,10,0.8), 0 0 26px rgba(255,170,90,0.6)', shadow: 0.7,
    cap: {fontFamily: 'Fraunces', letterSpacing: '0.02em'},
  },
  {
    id: 'rooftop', name: 'Rooftop City · 2D', fig: 'flat', env: 'rooftop',
    look: {...dark, bg: {center: '#14204a', edge: '#030614', glow: '#3a2a5a', glowAmt: 0.2}, bloom: {strength: 0.5, radius: 0.5, threshold: 0.75}, vignette: 0.4},
    floor: ['#000000', '#000000'], pool: '#ffffff', poolAmt: 0, cone: 0, grid: 0, crowd: '#000000', crowdAmt: 0,
    steel: ['#5a6478', '#20242e'], top: ['#3a4252', '#181c24'],
    body: ['#ffffff', '#ffffff'], line: '#05070d', lineW: 0, bands: true,
    text: '#ffffff', textShadow: '0 3px 0 #000, 0 0 3px #000, 0 6px 22px rgba(0,0,0,0.9)', shadow: 0.7,
  },
  {
    id: 'show', name: 'Game Show', fig: 'vinyl', env: 'show',
    look: {...dark, bg: {center: '#7a1a8a', edge: '#2a0a4a', glow: '#ff4ab0', glowAmt: 0.2}, bloom: {strength: 0.45, radius: 0.45, threshold: 0.8}, vignette: 0.25},
    floor: ['#000000', '#000000'], pool: '#ffffff', poolAmt: 0, cone: 0, grid: 0, crowd: '#000000', crowdAmt: 0,
    steel: ['#ffffff', '#b8c0d8'], top: ['#ff4ab0', '#a01a6a'],
    body: ['#ffffff', '#d0c2b2'], line: '#000000', lineW: 0, bands: false, tinted: true,
    text: '#ffffff', textShadow: '0 3px 0 #6a0a4a', shadow: 0.6,
    cap: {background: '#ff2a8a', padding: '10px 30px', borderRadius: 40, boxShadow: '0 6px 0 #8a0a4a, 0 10px 30px rgba(0,0,0,0.4)'},
  },
  {
    id: 'paper', name: 'Paper Theatre · 2D', fig: 'paper', env: 'paper',
    look: {...dark, bg: {center: '#f7dcae', edge: '#f3c98a', glow: '#ffffff', glowAmt: 0.1}, bloom: {strength: 0.05, radius: 0.3, threshold: 0.98}, vignette: 0.2},
    floor: ['#000000', '#000000'], pool: '#ffffff', poolAmt: 0, cone: 0, grid: 0, crowd: '#000000', crowdAmt: 0,
    steel: ['#6e4a32', '#3e2618'], top: ['#a47a52', '#6e4a2e'],
    body: ['#ffffff', '#ffffff'], line: '#ffffff', lineW: 0, bands: false,
    text: '#4a1e1a', textShadow: 'none', shadow: 0.35,
    cap: {fontFamily: 'Fraunces', background: '#fff6e6', padding: '8px 28px', boxShadow: '4px 6px 0 rgba(90,40,20,0.35)', transform: 'rotate(-1.5deg)'},
  },
  {
    id: 'comic', name: 'Comic Pop', fig: 'toon', env: 'comic',
    look: {...dark, bg: {center: '#ffd22a', edge: '#ff9a1a', glow: '#ffffff', glowAmt: 0}, bloom: {strength: 0.0, radius: 0.3, threshold: 1}, vignette: 0.15},
    floor: ['#000000', '#000000'], pool: '#ffffff', poolAmt: 0, cone: 0, grid: 0, crowd: '#000000', crowdAmt: 0,
    steel: ['#2a2a2a', '#000000'], top: ['#3aa0ff', '#1a5aa0'],
    body: ['#ffffff', '#ffc8b0'], line: '#000000', lineW: 0.04, bands: true,
    text: '#000000', textShadow: 'none', shadow: 0.5,
    cap: {background: '#ffffff', padding: '10px 26px', border: '6px solid #000', boxShadow: '8px 8px 0 #000', transform: 'skew(-6deg)'},
  },
];

const realBase = (id: string, name: string, env: 'hall' | 'pub' | 'garage' | 'gym', colored: boolean, text: string, textShadow: string): Sty => ({
  ...STYLES[0],
  id,
  name,
  fig: 'toon',
  real: {env, colored},
  look: {...SG, bloom: {strength: 0.18, radius: 0.4, threshold: 0.92}, vignette: 0.3, grain: 0},
  text,
  textShadow,
});
const SH = '0 3px 0 #000, 0 0 3px #000, 0 6px 22px rgba(0,0,0,0.9)';
export const REALS: Sty[] = [
  realBase('r-hall', 'Tournament Hall', 'hall', false, '#ffffff', SH),
  realBase('r-pub', 'Old Pub', 'pub', true, '#fff2e0', SH),
  realBase('r-garage', 'Basement Garage', 'garage', false, '#ffffff', SH),
  realBase('r-gym', 'Sunny Gym', 'gym', true, '#ffffff', SH),
];
const toonIn = (id: string, name: string, design: 'cel2d' | 'classic' | 'bean' | 'rubber' | 'block' | 'ring'): Sty => ({...realBase(id, name, 'hall', false, '#ffffff', SH), real: {env: 'hall', colored: false, design}});
export const CARTOONS: Sty[] = [
  toonIn('c-cel2d', '3D as 2D (flat + ink)', 'cel2d'),
  toonIn('c-classic', 'Classic thin stickman', 'classic'),
  toonIn('c-bean', 'Gummy beans', 'bean'),
  toonIn('c-rubber', 'Rubber hose (1930s)', 'rubber'),
  toonIn('c-block', 'Toy blocks', 'block'),
  toonIn('c-ring', 'Colour line', 'ring'),
];
/** the chosen look: toy blocks in the built-out tournament hall, graded, new fonts */
export const BLOCKS: Sty = {
  ...realBase('blocks', 'Toy Blocks · Tournament', 'hall', false, '#ffffff', '0 4px 0 #1a0e0a, 0 0 2px #1a0e0a, 0 8px 24px rgba(0,0,0,0.75)'),
  real: {env: 'pro', colored: true, neck: 0.23},
  look: {...SG, bloom: {strength: 0.2, radius: 0.45, threshold: 0.96}, vignette: 0.42, grain: 0},
  cap: {fontFamily: 'Nunito', fontWeight: 900, letterSpacing: '0.005em', WebkitTextStroke: '3px #1a0e0a', paintOrder: 'stroke fill'},
};
const neckV = (id: string, neck: number): Sty => ({...BLOCKS, id, real: {env: 'pro', colored: true, neck}});
export const NECKS = [neckV('blocks-n1', 0.23), neckV('blocks-n2', 0.255), neckV('blocks-n3', 0.28)];
export const STY = Object.fromEntries([...STYLES, ...WORLDS, ...REALS, ...CARTOONS, BLOCKS, ...NECKS].map((s) => [s.id, s])) as Record<string, Sty>;

export const StyCtx = createContext<Sty>(STY.porcelain);
export const useSty = () => useContext(StyCtx);

/** clay / neon: each character's own colour */
export const CLAY = ['#ff6a5a', '#ffb45a', '#7fdcb0', '#ffd96b', '#b994ff', '#5cc4ff'];
