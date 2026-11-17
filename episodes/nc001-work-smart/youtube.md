# NC001 — поля для загрузки на YouTube (Short, 0:33)

Видео для загрузки: `review/nc001/NC001-final-wm.mp4` — с водяным знаком stepglow (композиция `NC001-Full`, 1080×1920, 30 к/с, 33,5 с, −14 LUFS).
Без знака: `review/nc001/NC001-final.mp4`. Знак накладывается на готовый ролик без перерендера:
`ffmpeg -i NC001-final.mp4 -i studio/out/wm/SG-Watermark.png -filter_complex "[0:v][1:v]overlay=0:0:format=auto,format=yuv420p" -c:v libx264 -crf 16 -preset slow -c:a copy -movflags +faststart NC001-final-wm.mp4`
(PNG знака — композиция `SG-Watermark`; в `NC001-Full` знак уже встроен, так что следующий полный рендер выйдет сразу с ним).
Канал — Stepglow (@Stepglow). Озвучки нет — только музыка и текст в кадре, поэтому субтитры не нужны.

## Название (≤ 100 символов)

**Основное:** `Work Smart, Not Hard 💡`
(как у эталона — короткая известная фраза, которую ищут; эмодзи-«идея» совпадает с огоньком в груди героя)

Запасные (A/B-тест «Test & Compare» или следующие загрузки):
- `Hard Work vs Smart Work`
- `Why Smart People Fail Faster`
- `6 Lessons Nobody Teaches About Success`

## Описание

```
Hard work keeps you busy. Smart work moves you forward.
Focus on one thing, take small steps, and fail fast — luck is just the stairs nobody saw you climb.

#shorts #motivation #worksmart
```

## Теги (492 из 500 символов — с кавычками у тегов из нескольких слов и запятыми)

```
work smart not hard, work smart, working smart, working hard, hard work vs smart work, smart work, productivity, productivity tips, focus, deep work, multitasking, stop multitasking, consistency, compound effect, small steps, first step, fail fast, failure, success, motivation, self improvement, discipline, mindset, life lessons, success mindset, luck vs hard work, motivational shorts, animated motivation, stickman animation, 3d animation, shorts
```

Проверка длины:

```python
tags = "...".split(", ")
print(sum(len(t) + (2 if " " in t else 0) for t in tags) + 2 * (len(tags) - 1))  # 492
```

Теги подобраны вручную: подбор через vidIQ не делали — на аккаунте закончились кредиты.

## Закреплённый комментарий

```
which one are you right now — the spear or the fishing rods? 🎣
```

(выбор из двух по первой сцене — легко ответить; в первый час отвечать на комментарии самому)

Запасной: `if you had to fail 100 times, how many would you do this week? 👇`

## Настройки

| Поле | Значение |
|---|---|
| Язык видео | English |
| Категория | Education (мотивационная анимация; запасной вариант — People & Blogs) |
| Аудитория | No, it's not made for kids |
| Платное продвижение | нет |
| Изменённый/синтетический контент | 3D-анимация, реалистичных людей/событий нет, голоса нет — пометка не нужна |
| Лицензия / встраивание | Standard YouTube License, встраивание разрешено |
| Комментарии / ремиксы | включены |
| Видимость | сначала Private → проверить → «Запланировать» |

Музыка взята из ролика-эталона. Владелец считает её свободной; если YouTube покажет претензию
Content ID, заменить трек на бесплатный из Аудиотеки YouTube с тем же темпом (дроп на 14,5 с).

## Когда публиковать

Аудитория англоязычная (США): **вт–чт 12:00–15:00 по Нью-Йорку** (17:00–20:00 UTC, 20:00–23:00 мск),
запасной слот — воскресенье 9:00–11:00 ET. Мотивационные шортсы хорошо заходят ещё и утром
понедельника (7:00–9:00 ET). Через 2–3 недели сверить с YouTube Studio → Аналитика →
«Когда ваши зрители на YouTube».
