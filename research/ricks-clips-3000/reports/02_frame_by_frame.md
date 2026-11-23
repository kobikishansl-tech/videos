# 02 — Frame-by-frame breakdowns of the 5+1 representatives

Evidence per video: `../sheets/filmstrip_<id>.jpg` (whole film, ~1 fps cells, green timestamps =
detected change events), `../thumbs/<id>.jpg` (1280×720 poster), `../frames/<id>/` (all cells),
`../data/cut_tables.json`. Labels: OBS = observed on storyboard cells / poster; PRIOR = measured
in the 13,855-frame RULEBOOK; INFER = technical inference; HYP = hypothesis.

## VS1Z_Q-Klt8 — "The Ancient Jar That Warned an Empire" (65 s, 35.4 M views)

- **Structure (OBS):** 13 visible scene events. Opens wide, moves through jar/temple beats, has
  one long held stretch (33.5→46.3 s) then accelerates into 4 events in the last 12 s.
  POSTER: an environment-only frame (castle on a hill, no character) — the poster sells the world.
- **Environment (OBS + POSTER read):** painted-3D hybrid — stone with mortar, wood grain, cloth
  banners; foreground/mid/background depth layers; day, interior and night scenes across one film.
- **Characters (OBS + PRIOR):** flat drawn figures standing inside 3D-drawn worlds — the era-2
  family signature (PRIOR §5 head/body spec).
- **Captions (OBS + PRIOR):** single word, consistent position; PRIOR: one word 68–80% of the time,
  centred at 70.5–70.7% height, heavy white rounded font, black outline, sentence case.

## QlDPMzGmYac — "This Shape Saved Roller Coasters" (63 s, 13.3 M)

- **Structure:** 13 events, evenly spread.
- **Environment:** modern theme park; coaster as true 3D geometry with ink lines (POSTER read:
  "rendered in three dimensions with visible depth and perspective").
- **Characters:** round big head, thick black outline, dot eyes + curved-line mouth, head to body
  ≈ 1:1 read on poster close-up (PRIOR: whole figure ≈ 4 heads tall, head 0.21–0.24 of height).
- **Lighting:** from above/front, soft shadows; saturated sky-blue/green/primary costume palette.
- **Captions:** "ever" single word visible; bold white with black outline.

## TRUkQ1wbV2E — "How Mine Salting Worked" (61 s, 7.2 M)

- **Structure:** 13 events, denser at 44–56 s (escalation cluster).
- **Environment:** underground mine; painted rock/wood textures (POSTER read), warm lantern glow
  around characters (POSTER read) against cool ambient.
- **Lighting pattern:** warm source + cool ambient — the channel's signature two-tone;
  matches PRIOR §6 ("strong moods, glows and light shafts, darker corners").

## Mz72MuPgnGY — "Why Sailors Carried Storm Oil" (65 s, 16.9 M)

- **Structure:** 13 events; fast 0.98→20.7 storm build; long middle hold 20.7→42.4 s; finale
  bursts 49→65 s.
- **Environment:** sea/storm deck; weather and fluid as the spectacle; dark-water vs bright-sky
  contrast carries the drama.

## aD73kaL_PtY — "The Instinct That Makes You Crash" (59 s, 11.4 M) — GAP

No storyboard published yet and video download blocked; poster only (modern road/vehicle POV).
Its row is missing in `../data/era2_facts.csv`. Re-run `../data/storyboards.py` on this id later.

## RVnC1DSfK30 — comic-dub control (11 s, 10.0 M, April 2026)

- Static-page format: 9 events in 11 s ≈ panel swaps (OBS), no camera language; 4K/60 capture of
  webcomic art; other people's art, credited in description (CONFIRMED: "Please support the
  amazing artist behind this comic! I only do the voice.").
- **Proof of transformation (MEASURED):** same channel, median views 484 k (borrowed art) → 7.2 M
  (original pipeline): the format switch, not the drawing skill, drove ≈ 15× median views.

## Cross-video constants (era 2, OBS unless noted)

1. One narrator; no presenter, no title card, no logo (also PRIOR).
2. Scene changes at ~1–3 s minimum (MEASURED floor), ~25 views/film at full fps (PRIOR).
3. Subject centered: x = 0.50 ± 3% (MEASURED).
4. No flat-dark frames (MEASURED dark-frame-frac ≈ 0 across 27 films).
5. Single-word caption near 70.6% height (OBS + PRIOR).
6. 1080×1920 @30.0 fps (MEASURED 27/27), durations 39–67 s (MEASURED), median ~61 s.
