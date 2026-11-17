import {LOOKS, type Look} from '../nc001-work-smart/looks';

/** SG002: Inner Light, but clean — no grain, bloom only on what really glows, crisp captions */
export const SG: Look = {
  ...LOOKS.core,
  id: 'sg',
  bg: {center: '#0f1a30', edge: '#03050b', glow: '#3b5a9a', glowAmt: 0.3},
  bloom: {strength: 0.34, radius: 0.32, threshold: 0.86},
  grain: 0,
  vignette: 0.32,
  text: {...LOOKS.core.text, size: 46, glow: 'rgba(150,190,255,0.18)', tracking: 0.03},
};
