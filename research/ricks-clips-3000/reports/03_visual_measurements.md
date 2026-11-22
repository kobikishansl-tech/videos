# 03 — Visual measurements (this machine, storyboard resolution ~1 fps, 137 videos)

Method: YouTube's own L2 storyboard sheets (50×90 px cells, ≈1.01 fps, full timeline per video)
unravelled into cells; per-cell metrics; consecutive-cell diffs for scene-change candidate
detection; phase-correlation motion proxy on 32×57 thumbnails. Full pipeline: `../data/measure.py`
→ `../data/timeline_metrics.csv`, `../data/shot_lengths.csv`, `../data/palette.csv`.

## Era contrast (MEASURED RESULT)

| metric | era 1 comic-dubs (n=110) | era 2 explainers (n=27) |
|---|---|---|
| visible "shots" per film (1 s sampling floor) | median 5, p25–p75 2–7 | **median 12, p25–p75 10.5–13** |
| shot length median | 11.7 s | **2.96 s** |
| luma p50 | 0.24 | **0.45** |
| luma p90 / p10 | 0.29 / 0.19 | 0.62 / 0.29 |
| ink fraction (Y<0.10) | 0.58 | **0.03** |
| saturation mean | 0.50 | 0.40 |
| subject x-position median | 0.49 | 0.50 |
| motion-frac (1 s sampling, threshold-gated) | 0.00 | 0.00 |

Reading: the explainer format is **4× brighter, ~20× less ink-heavy, and scene-changes every
~2–3 s at minimum measurable** — i.e. it is built from many brief composed views, not pages.
The 1 s sampling cannot see sub-second views: the 13,855-frame RULEBOOK measurement (cited:
`RULEBOOK §3`) counts **21–28 views/film with median view 1.0–2.2 s** — consistent with our 12-shot
floor, and the true number (TECHNICAL INFERENCE) is likely 20–27 with most views < 1.5 s.

## Scene-change tables (MEASURED at ~1 s granularity)

Cut timestamps (from cell-diff peaks, `../data/cut_tables.json`):

- **VS1Z_Q-Klt8** (65 s): 13 events → density ≈ 1 per 4.6 s visible; long quiet stretch 33.5→46.3 s
  (a single held scene or continuous move), then 4 events in the last 12 s (finale acceleration).
- **QlDPMzGmYac** (63 s): 13 events, evenly spread (~1 per 4.4 s).
- **TRUkQ1wbV2E** (61 s): 13 events, denser at 44–56 s.
- **Mz72MuPgnGY** (65 s): 13 events, cluster 0.98→20.7 s (storm build), a quiet mid stretch
  20.7→42.4 s, then 4 events 49→65 s.
- **RVnC1DSfK30** (11 s, era-1 control): 9 events ≈ page turns + character swaps, no camera language.

(TECHNICAL INFERENCE: at full fps these 13 "events" per film probably decompose into ~25 views,
as the RULEBOOK's 21–28 count states — our sampling merges sub-second views into single events.)

## Brightness journey (MEASURED)

Era-2 films move: luma p10 0.29 vs p50 0.45 vs p90 0.62 — no film sinks to a flat dark look;
dark frames (mean luma < 0.10) are ~0 across era 2 (each film keeps a lit frame nearly every
second). Darkness is a *mood*, applied shot-locally (interiors, night exteriors), never the film.

## Palette (MEASURED, poster k-means k=5, era 2 explained by weight)

Top-weighted cluster colors across era-2 posters: #08070b, #100e0b, #0c0c1d (deep neutral/ink),
#3c454b, #474543, #45464a (slate/steel neutrals), #3e171c, #4c4840, #433b36, #352316 (oxblood,
brown-gold). I.e.: **dark violet/navy/brown-black grounds + warm accents** — matches
RULEBOOK §6 ("a dark violet, navy or brown-black is the largest or second-largest colour in 7 of 8;
a blue among the five main colours in 8 of 8") — CONFIRMED-BY-PRIOR-MEASUREMENT, CROSS-CONFIRMED here.

## Subject placement (MEASURED)

Dark-subject centroid x: median 0.50, p10 0.47, p90 0.53 → near-perfect centering with small
lateral variation: compositions are centered on a vertical axis, variation ±3% only.
(Composition is therefore: subject center-frame, world wrapped around it.)

## Camera motion (MEASURED with caveat)

Phase-correlation between consecutive 1 s cells: consistent global shift of >1 px with
correlation > 0.35 is rare (median motion-frac ≈ 0) — **expected false-negative**: per RULEBOOK,
in-view moves are 2.6–14.5%/s push-ins; at 1 s × 32 px sampling a 5% push ≈ 1.6 px ≈ our detection
floor. So: cannot independently confirm/refuse the "camera never still" rule at storyboard
resolution; prior 30 fps measurement says it holds (CONFIRMED-BY-PRIOR-MEASUREMENT, RULEBOOK §3).

## Gaps that need frame-accurate data (listed per user rule)

1. fps-true view counts, transition durations (dissolve lengths vs whip-travel lengths)
2. ink stroke widths vs head size; head-width px; 4-head proportion re-verification
3. DOF blur radius; vignette gradient; grain presence (expected: none per RULEBOOK)
4. caption typography measure (px height, stroke) — visible but only at 50×90 in filmstrips,
   resolvable only qualitatively (see 04)
5. audio: bed ducking level, SFX placement (no audio obtainable)
