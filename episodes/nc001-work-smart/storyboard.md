# NC001 — Work smart over hard: our version

Style: **Inner Light** (`studio/src/episodes/nc001-work-smart/looks.ts`, look `core`).
White porcelain stickman on a moonlit navy stage; a light in the chest shows how the character is doing:
orange and fading = grinding, cyan = calm and smart, red flash = fail, green = win, gold = success.

Music: the reference track as is (`studio/public/nc001/music.m4a`). Grid: drop at 14.51 s, one beat = 0.6325 s.
Timings in the code come from that grid (`anim.ts → beat(k)`), so the cuts and hits stay on the music.

Composition `NC001-Full` · 1080×1920 · 30 fps · 33.5 s. Every scene comes out of the dark and goes back into it.

| # | Time, s | File | What happens | What we added over the reference |
|---|---|---|---|---|
| 1 | 0.00–5.07 | `S1.tsx` | Working Hard pulls a spear from a bundle, throws it into the water every 2 beats and slumps; Working Smart lies in a deck chair, sips, two rods fish by themselves | Spear flies and sinks, splash and ripples, the school darts away from every throw; both rods actually catch a fish; the hard worker's light reddens and dims with every throw |
| 2 | 5.07–10.67 | `S2.tsx` | Two charts. One block per beat: on top it lands in a different column every time, at the bottom always in the same one | A goal line; when the focused tower reaches it (beat −9) the line lights up, burst of sparks, camera punch, "Focused" flashes |
| 3 | 10.67–16.93 | `S3.tsx` | A walker stops under a wall, a winner with a trophy stands on top. "Lucky". Then the camera pulls back on the drop and shows the long staircase behind the winner: "The Luck:" | Echoes of the winner light up on the stairs one per beat after the drop, a pulse of light runs up the steps; the walker's light dims with envy |
| 4 | 16.93–21.20 | `S4.tsx` | Today / In a month / In a year: the same effort moves a cube, a rounded cube and a ball | The cube only tips and falls back; the rounded cube rolls one face per beat; the ball runs ahead. Floor marks slide at each row's real speed; sweat drops on "Today" |
| 5 | 21.20–26.87 | `S5.tsx` | Two ladders with a huge first rung. Both jump and hang. "The First Step Is Always The Hardest". Left one drops, thinks, and small rungs slide in: "Break It Into Smaller Steps" — he climbs, the right one is still hanging | New rungs glow cyan as they arrive; the left light changes from orange to cyan at the idea; SUCCESS on top grows brighter |
| 6 | 26.87–33.50 | `S6.tsx` | "If you knew you had to fail 100 times before you succeeded / How fast would you want to fail?" A runner jumps pillar to pillar: red FAIL, faster and faster, then green WIN grows and lifts him to SUCCESS | A fail counter ×1 … ×100, speed streaks when the pace doubles, the chest flashes red on every fail, gold burst when the hand touches SUCCESS |

## Render

```bash
cd studio
SCALE=1 node scripts/stills.mjs NC001-Full 60,300,450,560,720,980 out/nc001   # check frames
npx remotion render src/index.ts NC001-Full out/draft.mp4 --scale=0.5 --gl=swangle   # draft
scripts/render_chunks.sh NC001-Full 1004 4 ../review/nc001/NC001-final.mp4            # final
```
