import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Cam, Figure, Glow, Part, Pose, Stage, Txt, roundedBox, useLook} from '../../episodes/nc001-work-smart/kit3d';
import {LOOKS, Mat} from '../../episodes/nc001-work-smart/looks';
import {STAND} from '../../episodes/nc001-work-smart/anim';

/**
 * STEPGLOW — channel identity candidates.
 * The same world as the videos: a porcelain stickman on a moonlit navy stage with a light in the chest.
 * Brand idea: small steps, and a glow that grows as you climb.
 *  - Avatar 800×800 (must read at 98 px in a circle)
 *  - Banner 2560×1440; everything important inside the 1546×423 centre band (what phones show)
 */

const look = LOOKS.core;
const GOLD = '#ffd66b';
const GOLD_TXT = '#ffd98a';

const stepGeo = (w: number, h: number) => roundedBox(w, h, 0.9, 0.02);
const edgeGeo = (w: number) => roundedBox(w, 0.034, 0.92, 0.012);
const riserGeo = (h: number) => roundedBox(0.034, h, 0.92, 0.012);

/**
 * A flight of steps rising to the right, drawn like the video: a dark mass with glowing edges.
 * n steps of size (w, h); the first one's left edge at x0. `lit` = the step that burns gold.
 * `solid` = porcelain blocks instead of the dark mass (for the avatar, where it has to read at 98 px).
 */
const Steps: React.FC<{x0: number; y0?: number; n: number; w: number; h: number; z?: number; lit?: number; solid?: boolean; fadeLeft?: number}> = ({x0, y0 = 0, n, w, h, z = 0, lit = -1, solid = false, fadeLeft = 0}) => {
  const lk = useLook();
  const body: Mat = solid ? {...lk.prop, top: '#eef3ff', bottom: '#6a7aa0', rimAmt: 0.35} : {...lk.ground, top: '#1c2740', bottom: '#0a0f1c'};
  const edge: Mat = {...lk.prop, top: '#d6e2ff', bottom: '#9fb2dc', emit: 1.05};
  const hot: Mat = {...lk.accent, emit: 1.45};
  return (
    <>
      {Array.from({length: n}, (_, i) => {
        const hh = (i + 1) * h;
        const x = x0 + i * w + w / 2;
        const isLit = i === lit;
        const o = fadeLeft > 0 ? Math.min(1, (i + 1) / fadeLeft) : 1;
        const em: Mat = {...edge, emit: edge.emit * o};
        return (
          <React.Fragment key={i}>
            <Part geo={stepGeo(w, hh)} m={isLit && solid ? hot : body} y0={y0} y1={y0 + n * h} position={[x, y0, z]} />
            {!solid ? (
              <>
                <Part geo={edgeGeo(w)} m={isLit ? hot : em} y0={0} y1={1} position={[x, y0 + hh - 0.017, z]} />
                <Part geo={riserGeo(h)} m={em} y0={0} y1={1} position={[x - w / 2, y0 + hh - h, z]} />
              </>
            ) : null}
            {isLit ? <Glow p={[x, y0 + hh, z + 0.3]} w={w * 3.4} h={w * 2.6} color={GOLD} a={0.6} /> : null}
          </React.Fragment>
        );
      })}
    </>
  );
};

const BEAM: Pose = {...STAND, lean: -3, head: [-0.12, 0.08], handB: [0.25, 0.96], elbowB: 1, handF: [0.12, -0.85]};
const CLIMB: Pose = {pelvis: [0.1, 1.08], lean: 12, head: [0.1, 0.02], handF: [-0.42, -0.62], elbowF: -1, handB: [0.45, -0.5], elbowB: -1, footF: [0.42, 0.36], footB: [-0.12, 0]};

const gold = (m: Mat): Mat => m;

/* ─────────────────────────── avatars ─────────────────────────── */

/** the night backdrop of the videos, flat (no 3D needed for a text mark) */
const Night: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 46%, #22355c 0%, #111b30 42%, #050812 100%)', alignItems: 'center', justifyContent: 'center'}}>
    {children}
  </AbsoluteFill>
);

const glowGold = `0 0 18px ${GOLD}cc, 0 0 52px ${GOLD}88, 0 0 110px ${GOLD}55`;
const glowWhite = '0 0 16px rgba(170,200,255,0.55), 0 0 48px rgba(120,160,255,0.35)';
const mark = (size: number): React.CSSProperties => ({fontFamily: 'Sora', fontWeight: 600, fontSize: size, letterSpacing: '-0.04em', lineHeight: 0.9, textAlign: 'center'});

/** A — the name on two lines */
const AvatarA: React.FC = () => (
  <Night>
    <div style={{...mark(196), marginTop: -22}}>
      <div style={{color: '#f4f8ff', textShadow: glowWhite}}>step</div>
      <div style={{color: GOLD_TXT, textShadow: glowGold}}>glow</div>
    </div>
  </Night>
);

/** B — the monogram */
const AvatarB: React.FC = () => (
  <Night>
    <div style={{...mark(380), marginTop: -70}}>
      <span style={{color: '#f4f8ff', textShadow: glowWhite}}>s</span>
      <span style={{color: GOLD_TXT, textShadow: glowGold}}>g</span>
    </div>
  </Night>
);

/** C — the name on one line */
const AvatarC: React.FC = () => (
  <Night>
    <div style={{...mark(128), marginTop: -18}}>
      <span style={{color: '#f4f8ff', textShadow: glowWhite}}>step</span>
      <span style={{color: GOLD_TXT, textShadow: glowGold}}>glow</span>
    </div>
  </Night>
);

/* ─────────────────────────── banners ─────────────────────────── */

const BW = 2560;
const BH = 1440;
const BANNER_CAM: Cam = {viewH: 6.4, cy: 0, cx: 0, pitch: 4, aspect: BW / BH};

/** the name, centred on (x, y) */
const Wordmark: React.FC<{x?: number; y?: number; size: number}> = ({x = BW / 2, y = BH / 2, size}) => (
  <Txt look={look} x={x} y={y} size={size} weight={600} tracking={-0.03} glow={0.6}>
    <span>step</span>
    <span style={{color: GOLD_TXT, textShadow: `0 0 24px ${GOLD}cc, 0 0 70px ${GOLD}88, 0 0 140px ${GOLD}55`}}>glow</span>
  </Txt>
);

/* world → banner pixels: 225 px per unit, centre at (1280, 720); the phone-safe band is y −0.94 … +0.94 */

/** A — the name in the middle; the staircase climbs from the bottom-left corner and reaches the band on the right */
const BannerA: React.FC = () => (
  <Stage look={look} cam={BANNER_CAM} width={BW} height={BH} overlay={<Wordmark size={200} />}>
    <Glow p={[0, 0.2, -2]} w={14} h={6} color="#3b5a9a" a={0.55} />
    <Steps x0={-6.4} y0={-3.42} n={34} w={0.4} h={0.12} z={-0.3} lit={23} fadeLeft={10} />
    <Figure pose={BEAM} cast={look.a} x={-6.4 + 23 * 0.4 + 0.2} y={-3.42 + 24 * 0.12} dir={-1} yaw={26} s={0.62} energy={1} tint={GOLD} />
  </Stage>
);

/** B — the name on the left, three steps and the figure on the right; everything inside the band */
const BannerB: React.FC = () => (
  <Stage look={look} cam={BANNER_CAM} width={BW} height={BH} overlay={<Wordmark size={190} />}>
    <Glow p={[0, 0.1, -2]} w={9} h={5} color="#3b5a9a" a={0.7} />
    <Glow p={[2.98, 0.5, -0.6]} w={2.4} h={2.4} color={GOLD} a={0.22} />
    <Steps x0={1.98} y0={-0.92} n={3} w={0.42} h={0.16} lit={2} solid />
    <Figure pose={BEAM} cast={look.a} x={3.03} y={-0.92 + 0.48} dir={-1} yaw={26} s={0.66} energy={1} tint={GOLD} />
  </Stage>
);

/** C — the "luck" stairs from the video: one long diagonal on the right, echoes of the same climber lighting up */
const BannerC: React.FC = () => {
  const n = 26;
  const w = 0.24;
  const h = 0.2;
  const x0 = -0.6;
  const y0 = -3.3;
  return (
    <Stage look={look} cam={BANNER_CAM} width={BW} height={BH} overlay={<Wordmark size={190} />}>
      <Glow p={[2, 0, -2]} w={12} h={6} color="#3b5a9a" a={0.55} />
      <Steps x0={x0} y0={y0} n={n} w={w} h={h} z={-0.3} lit={n - 1} fadeLeft={8} />
      {[12, 17, 21].map((k, i) => (
        <Figure key={k} pose={CLIMB} cast={look.a} x={x0 + k * w + 0.16} y={y0 + (k + 1) * h} dir={1} yaw={24} s={0.44} energy={0.3 + i * 0.25} tint={i === 2 ? GOLD : look.a.core} />
      ))}
      <Figure pose={BEAM} cast={look.a} x={x0 + (n - 1) * w + w / 2} y={y0 + n * h} dir={-1} yaw={26} s={0.44} energy={1} tint={GOLD} />
    </Stage>
  );
};
void gold;

export const SGAvatarA = AvatarA;
export const SGAvatarB = AvatarB;
export const SGAvatarC = AvatarC;
export const SGBannerA = BannerA;
export const SGBannerB = BannerB;
export const SGBannerC = BannerC;
export const SGBlank: React.FC = () => <AbsoluteFill />;

/* ─────────────────────────── watermark ─────────────────────────── */

/**
 * Channel watermark for the Shorts, placed like the reference's: centred under the scene at y ≈ 1735 (the reference uses 1650; ours sits lower to clear the FAIL counter of NC001),
 * about 250 px wide, quiet enough not to compete with the picture.
 */
export const Watermark: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      left: 540,
      top: 1735,
      transform: 'translate(-50%, -50%)',
      fontFamily: 'Sora',
      fontWeight: 600,
      fontSize: 46,
      letterSpacing: '-0.03em',
      whiteSpace: 'pre',
    }}
  >
    <span style={{color: 'rgba(205, 218, 242, 0.27)'}}>step</span>
    <span style={{color: 'rgba(255, 214, 107, 0.34)', textShadow: '0 0 12px rgba(255, 214, 107, 0.12)'}}>glow</span>
  </div>
);

export const SGWatermark: React.FC = () => (
  <AbsoluteFill>
    <Watermark />
  </AbsoluteFill>
);
