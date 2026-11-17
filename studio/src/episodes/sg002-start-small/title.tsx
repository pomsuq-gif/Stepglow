import React from 'react';
import {clamp} from '../nc001-work-smart/anim';

/** SG002 captions: bigger, with a dark shadow so they read over anything, and a pop on their beat */
export const Title: React.FC<{x: number; y: number; t: number; at: number; out?: number; children: React.ReactNode}> = ({x, y, t, at, out = 1e9, children}) => {
  const size = 60;
  const color = '#f6f9ff';
  const glow = 'rgba(140,190,255,0.45)';
  const k = clamp((t - at) / 0.32);
  const e = 1 - Math.pow(1 - k, 3);
  const o = e * (1 - clamp((t - out) / 0.3));
  if (o <= 0.001) return null;
  const pop = 1 + 0.18 * (1 - e);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${pop})`,
        whiteSpace: 'pre',
        fontFamily: 'Sora',
        fontWeight: 600,
        fontSize: size,
        letterSpacing: `${0.02 + 0.04 * (1 - e)}em`,
        color,
        opacity: o,
        filter: `blur(${(1 - e) * 6}px)`,
        textShadow: `0 3px 2px rgba(0,0,0,0.55), 0 6px 26px rgba(0,0,0,0.85), 0 0 34px ${glow}`,
      }}
    >
      {children}
    </div>
  );
};
