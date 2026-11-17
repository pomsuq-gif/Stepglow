# SG002 — Great things start small: our version (v2, after the owner's review)

Style: **Inner Light, clean** (`look.ts → SG`: no grain, bloom only on what glows, crisp captions).
Music: the reference track (`studio/public/sg002/music.m4a`). Grid: bass in at 5.54 s, one beat = 0.6338 s (`grid.ts → beat(k)`).
Composition `SG002-Full` · 1080×1920 · 30 fps · 33.5 s. Scenes 1–2 are **split screen** (two worlds, two cameras, a thin seam);
3–4 full frame on a **mirror floor** (`mirror.tsx`, a blurred Reflector). 1→2→3 through the dark; 3 has a hard cut inside; 3→4 hard cut.

v1 → v2: the owner's notes were "soap and dirt on the screen", "too much blur", "figures pass through the log and the dominoes",
"he doesn't touch the first domino", "the mountain scene is bad", "look at the staging, editing and pace of the reference, but do it better".

| # | Time, s | File | What happens |
|---|---|---|---|
| 1 | 0–9.34 | `S1.tsx`, `fire.tsx` | **Intensity / Consistency**, split. Same camp on both sides: seat log, campfire, the same bundle of firewood. Left stands up in front of the log, hugs the whole bundle, swings it overhead (lying across his hands), throws it in: a blaze that fills the panel, joy, then he shields his face; the fire dies exactly on the bass into smoke; he sits back on the log hugging his knees, cold blue light, breath vapour. Right pulls one stick out of the bundle every other beat (he turns a little so the stick is in the plane of his hand) and tosses it in; his fire lives, the bundle shrinks |
| 2 | 9.34–18.22 | `S2.tsx` | **Motion / Action**, split, both go round in circles. Close-ups first; at 11.88 both cameras pull back. Left: he is running inside a hamster wheel (open in front, rungs move exactly with his feet), it heats up red, he slumps at the end. Right: a spiral stair round a tower, feet placed on the steps, each step lights gold under him, the camera orbits with him; at 17.27 he reaches the landing and the beacon on the column lights up with a beam to the sky |
| 3 | 18.22–24.87 | `S3.tsx` | **Dream Big**. Low angle: he pushes the giant domino (hands flat on its face, red strain on the beat), gives up and looks up at it. Hard cut on beat 26 (22.02): from behind him at the start, the chain grows out of the floor from the giant toward his feet, a cyan spark running ahead of each one. "Start Small" appears as the smallest one rises at his feet |
| 4 | 24.87–33.5 | `S4.tsx`, `chain.ts`, `dominoes.tsx` | **Start Small**. Hard cut to a low close shot: he gets down on hands and knees, his fingertip touches the smallest domino and pushes it exactly when the bass returns (25.82); the fingertip rides its top for a moment. The camera rides the wave low over the mirror floor; every domino's pips light up gold as it tips; the giant lands at 32.5 with a ring of light and dust; crane up to a top view of the golden path with him at its start |

Contact rules used (no passing through anything): standing up from the log the figure steps forward onto its feet (`STAND_DX`);
hands are placed with `reach()` at the exact surface (`hand centre = surface − hand radius`); props held in the hands are positioned
from the solved hand joints (`toWorld`); the hero walks only where nothing stands; dominoes rise only where he isn't.
