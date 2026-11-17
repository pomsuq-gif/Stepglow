# STEPGLOW — production repo

Англоязычный канал YouTube Shorts **@Stepglow**: короткие 3D-притчи про работу и успех,
фарфоровый стикмен с огоньком в груди, без голоса (музыка + текст в кадре).
Всё делается кодом: Remotion + Three.js. Перенесено из `YT-Channel-4` (ветка `ccr-2b762d78-8f3co3`).

- Навык: `.claude/skills/stepglow-shorts/`
- Библия канала, стиль, оформление, публикация: `channels/stepglow/README.md`
- Выпуски: `episodes/<ep>/` (разбор эталона, раскадровка, поля YouTube) и `studio/src/episodes/<ep>/` (сцены)
- 3D-набор: `studio/src/episodes/nc001-work-smart/kit3d.tsx` (+ `anim.ts`, `looks.ts`, `world.tsx`)
- Оформление: `review/brand-stepglow/`, код — `studio/src/channels/stepglow/Brand.tsx`
- Громкость: `tools/master.sh` (−14 LUFS)

```bash
cd studio && npm ci
COLS=5 node scripts/stills.mjs NC001-Full 30,200,400 out/check   # пробные кадры
npx remotion studio
```
