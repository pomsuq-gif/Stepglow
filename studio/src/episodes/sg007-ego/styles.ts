import {createContext, useContext} from 'react';
import {LOOKS, type Look} from '../nc001-work-smart/looks';
import {SG} from '../sg002-start-small/look';

/**
 * SG007 style options: the same arena, rigs and timing, drawn six ways.
 * fig: how the characters are drawn — 3D (porcelain | toon | neon | clay | marble) or 2D over the 3D world (flat | ink).
 */
export type Fig = 'porcelain' | 'toon' | 'neon' | 'clay' | 'marble' | 'flat' | 'ink';
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
export const STY = Object.fromEntries(STYLES.map((s) => [s.id, s])) as Record<string, Sty>;

export const StyCtx = createContext<Sty>(STY.porcelain);
export const useSty = () => useContext(StyCtx);

/** clay / neon: each character's own colour */
export const CLAY = ['#ff6a5a', '#ffb45a', '#7fdcb0', '#ffd96b', '#b994ff', '#5cc4ff'];
