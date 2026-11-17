---
name: stepglow-shorts
description: Production workflow for STEPGLOW (@Stepglow) — an English YouTube Shorts channel of short wordless 3D parables about work, success and habits (work smart vs hard, focus vs multitasking, luck as invisible stairs, small steps, fail fast), benchmarked on the SIMPLY ANIMATED Short "Work smart over hard". Covers studying a reference Short (frame sheets, beat grid of the music), offering several style options first, the channel's Inner Light look (porcelain stickman with a light in the chest on a moonlit navy stage, Three.js inside Remotion), the 3D kit (shader, IK stickman rig with body-relative poses, props, captions, per-frame camera), scenes timed to the music beat, scene-to-scene fades, draft and chunked 30 fps render, −14 LUFS master, the stepglow watermark burned onto a finished video without re-rendering, YouTube fields (Education, max tags ≤500), pinned comment, posting time, and the channel avatar/banner. Use it whenever the user works on Stepglow, «канал про работу/успех/мотивацию», «стикмен», «сделай как у эталона SIMPLY ANIMATED», «варианты стиля», «черновик/чистовой рендер», «водяной знак», «название, описание, теги», «аватар / шапка» for this channel — even if the skill is not named. Not for Snoot Logic (snoot-logic-shorts) or THE UNSEEN BLUEPRINT.
---

# STEPGLOW — производство Shorts-притч со стикменом

Свой репозиторий **`pomsuq-gif/Stepglow`** — только этот канал (перенесён из `YT-Channel-4`, ветка
`ccr-2b762d78-8f3co3`; Snoot Logic остался там). Библия канала, стиль, звук,
оформление и публикация — **`channels/stepglow/README.md` — прочитай до начала работы.**
Владелец пишет по-русски, ролики — на английском, **без озвучки** (музыка + текст в кадре).
Образец выпуска — **NC001** «Work smart over hard»: `episodes/nc001-work-smart/` (разбор эталона
`reference.md`, раскадровка `storyboard.md`, поля `youtube.md`) и `studio/src/episodes/nc001-work-smart/`.
Второй — **SG002** «Great things always start small» (`episodes/sg002-start-small/`,
`studio/src/episodes/sg002-start-small/`): костёр, гора со ступенями, цепочка доминошек. Новый выпуск —
своя папка, 3D-набор импортируется из `../nc001-work-smart/` (`kit3d`, `anim`, `looks`, `world`).

## Правила владельца (каждое уже стоило переделки)

1. **Повторяем эталон по структуре, делаем лучше по графике.** Сценарий, порядок сцен, монтаж, темп,
   переходы, звук и музыку — как у эталона (музыку и звуки владелец разрешил брать из оригинала).
   Графика — своя, 3D, «уникальнее, круче и приятнее»: свет, глубина, частицы, реакции мира
   (брызги, рыбы разбегаются, искры), огонёк в груди героя меняет цвет по смыслу.
2. **Перед анимацией показать несколько вариантов стиля** (5–6 пробных кадров двух сцен в одном
   листе), владелец выбирает номер. Выбран **Inner Light** (`looks.ts → core`).
3. **Герой — стикмен, всегда.** Предложение заменить человечка камнями/фонарями/кристаллами/
   игрушками владелец резко отверг («зачем стикмана полностью убрал?»). Просьба «другие пропорции /
   уникальнее» = поменять пропорции и фирменную деталь, а не героя.
4. **Никаких «ИИшных» слоганов** вроде «SMALL STEPS · BIG LIGHT». Текст — только смысловой, из эталона
   или по делу. Надписи — **по центру**.
5. **Аватар — только текст** (картинки-аватары не подошли «вообще»). Шапка — надпись по центру.
6. **Водяной знак** «stepglow» на каждом ролике, тихий; правки знака — без перерендера (ниже).
7. **Показывать кадры перед рендером**, сначала черновик в половину разрешения, потом чистовой.
8. Канал англоязычный; тексты в кадре — короткие, как у эталона.

## Конвейер выпуска

| # | Шаг | Как |
|---|---|---|
| 1 | Эталон | ролик в scratchpad (в git не кладём). Сцены: `ffmpeg -vf "fps=6,crop=…,scale=300:-1,drawtext=…,tile=8x4"` по каждой сцене с подписью времени; склейки — по средней яркости кадров (затемнения). Музыка: спектр `showspectrumpic`, сетка бита — спектральный поток + автокорреляция (NC001: дроп 14,51 с, бит 0,6325 с). Итог → `episodes/<ep>/reference.md` (таблица сцен: время · текст · действие; звук) |
| 2 | Варианты стиля | пробные кадры двух сцен в 4–6 стилях (`looks.ts` — стиль = набор чисел) → лист в `review/<ep>/styles/` → выбор владельца. Стиль канала уже выбран (Inner Light) — для новых выпусков этот шаг пропускаем, если владелец не просит другой |
| 3 | Раскадровка | `episodes/<ep>/storyboard.md`: сцена · время · что происходит · что добавили сверх эталона |
| 4 | Музыка | трек → `studio/public/<ep>/music.m4a` (`ffmpeg -vn -c:a copy`); сетку бита — в `anim.ts` (`BEAT`, `DROP`, `beat(k)`) |
| 5 | Сцены | `S1.tsx…S6.tsx`: каждая экспортирует `{from, to}`, `camN(t)`, `WorldN` (3D) и `OverN` (надписи); `Full.tsx` — список `SCENES`, затемнение между сценами `darkness(t)`, `Watermark`, `Audio`. **Все тайминги — от бита** `beat(k)`, а не на глаз |
| 6 | Проверка | `COLS=5 node scripts/stills.mjs <Comp> <кадры> out/<dir>` (кадры через запятую, лист `…-sheet.jpg`); несколько композиций одним бандлом — `node scripts/stills_multi.mjs <outDir> <id…>` (`SCALE`, `FRAME`) |
| 7 | Черновик | `npx remotion render src/index.ts <Comp> out/draft/video.mp4 --muted --scale=0.5 --codec=h264 --crf=20 --gl=swangle --props='{"withAudio":false}'` + музыка `ffmpeg -c copy -shortest` (≈5 мин на 33 с). Контакт-лист: `fps=2,scale=180:-1,tile=12x6` |
| 8 | Чистовой | `bash scripts/render_chunks.sh <Comp> <lastFrame> 4 ../review/<ep>/<EP>-final.mp4` — в фоне (≈35 мин на 33 с), затем проверить `ffprobe` и громкость `ebur128` (−14 LUFS) |
| 9 | Знак | если ролик рендерился без знака или знак поменяли: PNG `SCALE=1 node scripts/stills_multi.mjs out/wm SG-Watermark`, затем `ffmpeg -i <final>.mp4 -i studio/out/wm/SG-Watermark.png -filter_complex "[0:v][1:v]overlay=0:0:format=auto,format=yuv420p" -c:v libx264 -crf 16 -preset slow -c:a copy -movflags +faststart <final>-wm.mp4` (≈1 мин) |
| 10 | Публикация | `episodes/<ep>/youtube.md` по образцу NC001 (название, описание, теги ≤ 500 с проверкой длины, закреплённый комментарий, настройки, время) |

Видео (`*.mp4`) в git не коммитятся; куски рендера (`review/*/chunks-*`) в `.gitignore`.

## 3D-набор (`studio/src/episodes/nc001-work-smart/`)

- `kit3d.tsx` — основа:
  - `Stage` (ThreeCanvas + фон + bloom + виньетка + зерно; `dark` — затемнение; `width/height` для
    аватара и шапки) и `Cam {viewH, cy, cx, pitch, fov, aspect}`; камера пересчитывается **каждый кадр**
    внутри `Post`, поэтому анимировать камеру можно просто функцией `camN(t)`.
  - Шейдер `Part/useMat`: градиент по высоте мира или по оси детали (`local`), wrap-свет, ободок,
    блик, перламутр, свет в груди (`core`), туман по глубине/высоте (`Fade`).
  - `Limb`, `Ball`, `roundedBox`, `capsuleGeo`, `Glow` (аддитивные пятна: `radial`, `beam`, `line`).
  - `Txt` (надпись по пикселю кадра), `Label` (надпись в точке мира), `project()`.
  - **Стикмен** `Figure`: поза `Pose` в относительных единицах (ноги — в длинах ноги, руки — в длинах
    руки, `pelvisY` для сидения/висения), IK колени/локти (`elbowF/B`, `kneeF/B`), `dir`, `yaw`, `s`,
    `energy` (яркость огонька), `tint` (цвет огонька), `gy` (сдвиг градиента, когда поза поднимается),
    `children` — пропсы в локальных координатах героя. `reach(pose, body, x, y)` — рука к точке.
- **Камера** `Cam` умеет `cz` (глубина точки взгляда) и `yaw` (облёт вокруг точки, градусы) — для сцен,
  уходящих в глубину (SG002: цепочка доминошек по диагонали). Без них камера смотрит вдоль −z как раньше.
- `looks.ts` — стили (`core` = Inner Light), материалы героя `Cast`, цвета провала/победы.
- `anim.ts` — сетка бита, easing (`ss`, `easeOut`, `back`, `wobble`, `pulse`), `poseAt` (ключи поз),
  `mixPose`, `gait` (ходьба/бег на месте), `STAND`.
- `world.tsx` — `Banks` (два берега), `Floor`, `Block` (`gy` для падающих), `Fish`, `Chair`, `Spear`,
  `Mug`, `Trophy`, `mixHex`.
- Сцены NC001: `S1` (копьё против удочек), `S2` (графики-башни), `S3` (стена → отъезд к лестнице «The Luck:»),
  `S4` (куб → скруглённый куб → шар), `S5` (лестницы и маленькие ступеньки), `S6` (FAIL ×1…×100 → WIN).
- SG002 добавил переиспользуемое: `fire.tsx` (`Campfire` — шейдер пламени с шумом, искры, дым, угли;
  `warm`/`chill` — фарфор, согретый огнём / замёрзший), `chain.ts` (цепочка доминошек: размеры ×1,6,
  падение с настоящим касанием следующей, `tilts(t)`), `dominoes.tsx` (`Domino` с точками, которые
  загораются золотом), `rig.ts` (`toWorld` — точка руки героя в мир, `sitPose`). Сцена с `cut: true`
  в `Full.tsx` начинается склейкой, без затемнения.
- Оформление — `studio/src/channels/stepglow/Brand.tsx`: `SG-AvatarA/B/C`, `SG-BannerA/B/C`,
  `SG-Watermark`, компонент `Watermark`.

## Ловушки

- **WebGL в рендере** — только `--gl=swangle` (уже в `remotion.config.ts`); concurrency 4.
- **Удалять материалы** при смене (`useEffect` → `dispose`) — иначе утечка памяти на длинном рендере.
- **Надписи сцен — выше y ≈ 1680**, иначе налезают на водяной знак (NC001: «×100» под FAIL).
- **Падающие предметы не пролетают сквозь подписи** — стартовая высота ниже строки подписи.
- **Градиент тела «едет»**, когда герой поднимается по лестнице — передать `gy` (подъём таза).
- **Сидящий в кресле:** размер кресла считать от длины ноги (`ck`), таз — в провис ткани.
- **Мелкая аватарка:** проверять в кружке 98 px (`geq` маска круга) — мелкие детали пропадают.
- **Шапка:** телефон показывает только полосу 1546×423 по центру — строить превью «целиком / компьютер / телефон».
- **Хэндлы YouTube:** `curl -A Mozilla/5.0 https://www.youtube.com/@<name>` → 404 = свободен
  (контроль: заведомо занятый даёт 200); плюс поиск в интернете по имени.
- **vidIQ** может быть без кредитов — тогда поля YouTube подбирать вручную и сказать об этом владельцу.
- **Сетка бита:** автокорреляция может выдать 1,5 бита (SG002: 0,952 вместо 0,634) — проверять по
  интервалам между сильными онсетами (они идут через 4 бита) и подгонять `BEAT` по первому и последнему.
- **Белые предметы + bloom = пересвет** (доминошки SG002): `emit` ≤ 0,8 и верх цвета не чисто белый;
  аддитивные `Glow` поверх белого держать слабыми (a ≤ 0,1).
- **Крупный план** с `fov` 26 и `viewH` < 2 — герой между камерой и точкой взгляда раздувается на весь кадр; держать `viewH` ≈ 2,9.
- **Прерванная правка** (владелец остановил вызов) — проверить `git status` и не повторять вслепую.
