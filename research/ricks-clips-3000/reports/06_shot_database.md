# 06 — Shot database (59 shots, 5 representative videos)

Built by `../data/shots_build.py` from the storyboard cell DB + `../data/cut_tables.json`. Raw data: `../data/shots.csv`, `../data/shots_<vid>.json`, `../data/shots_db.json`. Visual grids: `../sheets/shots_<vid>.jpg` (one representative frame per shot, labeled with video+timestamp).

## Accuracy statement (read first)

- **Timestamps are storyboard-grid values.** Cells arrive at ~1.015-2 fps; shot boundaries are the cell timestamps nearest each detected cut. Resolution is **±0.5 s** (±0.25 s for 2-fps videos). Do NOT treat these as frame-accurate; a true cut can land anywhere inside the interval.
- **Shots are bounded below by sampling.** A shot shorter than ~1 s cannot be seen; era-2 view grammar per RULEBOOK (median view 1.0-2.2 s) means some of our 'shots' are fusions of 2-3 true views. Counts here are a floor.
- **Transition typing limitation.** 'hard/whip' means the 1-s-resampled diff was large. A 6-8 frame dissolve at 30 fps spans <0.3 s and is indistinguishable from a hard cut at 1 fps. Only the CONTROL video (2 fps cells) resolves soft transitions. Treat every 'hard/whip' as 'cut with large visual delta: hard cut or whip-pan, dissolve not excluded'.
- **Labels.** OBS = observed on storyboard cells at 50×90 px (low confidence for fine detail); MEASURED = computed from cells. Everything else is explicitly marked.

## VS1Z_Q-Klt8 — 11 shots, 66.0 s

**Style** (urban comedy-explainer; street/interior mix). Shots 1-4 alternate an urban exterior and two interiors, one ornate. Shot 6 (32.5-50.2 s, 18 cells) is the long central sequence with the highest cell count of the film - the story core. Cuts are all hard/large-diff; no soft transition appears in the film.

| # | t_start–t_end (s) | dur* | cells | luma | sat | ink | subj_x | top/bot luma | trans (kind, diff) | in-shot change* | content |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0.0–1.98 | 2.0 | 2 | 0.474 | 0.284 | 0.003 | 0.481 | 0.41/0.392 | - | 0.2261 | OBS: urban street, 1 character mid-frame, medium-wide, low angle, daylight |
| 1 | 0.98–15.77 | 14.8 | 15 | 0.407 | 0.303 | 0.02 | 0.489 | 0.38/0.303 | hard/whip, 55.8 | 0.1722 | OBS: dim indoor room with arches, 1 character center, medium, eye-level |
| 2 | 14.77–19.71 | 4.9 | 5 | 0.536 | 0.209 | 0.005 | 0.421 | 0.617/0.412 | hard/whip, 48.3 | 0.1642 | OBS: open sky + structures, character low in frame, wide high-angle, bright |
| 3 | 18.71–27.59 | 8.9 | 9 | 0.373 | 0.4 | 0.019 | 0.506 | 0.335/0.245 | hard/whip, 22.9 | 0.1668 | OBS: ornate indoor room, 2 characters flanking, medium eye-level, warm light, symmetrical |
| 4 | 26.59–31.53 | 4.9 | 5 | 0.562 | 0.367 | 0.054 | 0.506 | 0.587/0.371 | hard/whip, 78.5 | 0.1607 | OBS: outdoor courtyard with archway, 1 character, wide low-angle, daylight |
| 5 | 30.53–33.5 | 3.0 | 3 | 0.494 | 0.448 | 0.067 | 0.551 | 0.602/0.256 | hard/whip, 21.1 | 0.1611 | moderate silhouette content; bright top / darker bottom (sky or lit ceiling above) |
| 6 | 32.5–50.24 | 17.7 | 18 | 0.41 | 0.452 | 0.005 | 0.517 | 0.393/0.339 | hard/whip, 15.5 | 0.118 | balanced frame |
| 7 | 49.24–56.15 | 6.9 | 7 | 0.428 | 0.315 | 0.003 | 0.633 | 0.416/0.425 | hard/whip, 32.2 | 0.1666 | balanced frame |
| 8 | 55.15–60.09 | 4.9 | 5 | 0.519 | 0.392 | 0.004 | 0.683 | 0.389/0.621 | hard/whip, 51.8 | 0.1558 | bright bottom / darker top (floor or foreground light) |
| 9 | 59.09–62.06 | 3.0 | 3 | 0.524 | 0.343 | 0.002 | 0.53 | 0.433/0.692 | hard/whip, 60.6 | 0.1634 | bright bottom / darker top (floor or foreground light) |
| 10 | 61.06–66.0 | 4.9 | 5 | 0.522 | 0.364 | 0.05 | 0.544 | 0.517/0.556 | hard/whip, 29.3 | 0.1846 | moderate silhouette content |

\* dur and in-shot change are measured on the grid; real duration error up to ±1 s near boundaries.

## QlDPMzGmYac — 13 shots, 64.0 s

**Style** (rural/farm narrative; fields, interiors, road). Opens on a 7.8 s field establishing beat (shot 0) - the longest opening hold measured across the representatives. Shots 2, 7, 12 are 2-cell quick cuts (2 s or less), the film's punctuation. Mean luma dips to 0.30 in shot 3 (15.5-30.1 s, dark interior sequence of 15 s).

| # | t_start–t_end (s) | dur* | cells | luma | sat | ink | subj_x | top/bot luma | trans (kind, diff) | in-shot change* | content |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0.0–7.79 | 7.8 | 8 | 0.486 | 0.489 | 0.004 | 0.435 | 0.38/0.458 | - | 0.1223 | OBS: open field + dirt path, 1 character centered on path, wide low, clear sky |
| 1 | 6.79–15.54 | 8.8 | 9 | 0.376 | 0.393 | 0.064 | 0.469 | 0.338/0.343 | hard/whip, 35.7 | 0.1601 | OBS: dim interior with stairs, 1 character at stair base, medium, low light |
| 2 | 14.54–16.51 | 2.0 | 2 | 0.325 | 0.285 | 0.001 | 0.464 | 0.375/0.25 | hard/whip, 50.2 | 0.0656 | OBS: bright interior w/ signage character, medium slightly elevated, even light |
| 3 | 15.51–30.08 | 14.6 | 15 | 0.297 | 0.505 | 0.024 | 0.495 | 0.246/0.285 | hard/whip, 13.3 | 0.1347 | OBS: grassy field + trees, 1 character, wide eye-level, partly cloudy |
| 4 | 29.08–34.92 | 5.8 | 6 | 0.458 | 0.434 | 0.007 | 0.53 | 0.324/0.398 | hard/whip, 28.9 | 0.155 | OBS: building with sign, 1 character beside it, medium slightly elevated |
| 5 | 33.92–36.86 | 2.9 | 3 | 0.447 | 0.404 | 0.043 | 0.514 | 0.487/0.233 | hard/whip, 45.5 | 0.2052 | moderate silhouette content; bright top / darker bottom (sky or lit ceiling above) |
| 6 | 35.86–45.59 | 9.7 | 10 | 0.493 | 0.323 | 0.016 | 0.449 | 0.561/0.353 | hard/whip, 56.8 | 0.1345 | bright top / darker bottom (sky or lit ceiling above) |
| 7 | 44.59–46.55 | 2.0 | 2 | 0.533 | 0.399 | 0.003 | 0.521 | 0.517/0.471 | hard/whip, 44.4 | 0.1791 | OBS: open road + signpost, 1 character at signpost, wide eye-level (from cell row ~t45) |
| 8 | 45.55–55.28 | 9.7 | 10 | 0.55 | 0.494 | 0.0 | 0.442 | 0.479/0.543 | hard/whip, 43.5 | 0.1061 | balanced frame |
| 9 | 54.28–59.15 | 4.9 | 5 | 0.497 | 0.468 | 0.003 | 0.327 | 0.503/0.534 | hard/whip, 15.4 | 0.1301 | OBS: grass field, no characters visible, wide (dead-space beat) |
| 10 | 58.15–61.09 | 2.9 | 3 | 0.494 | 0.422 | 0.012 | 0.489 | 0.46/0.454 | hard/whip, 50.2 | 0.1506 | balanced frame |
| 11 | 60.09–63.03 | 2.9 | 3 | 0.451 | 0.299 | 0.034 | 0.38 | 0.499/0.451 | hard/whip, 49.8 | 0.21 | balanced frame |
| 12 | 62.03–64.0 | 2.0 | 2 | 0.574 | 0.27 | 0.018 | 0.504 | 0.523/0.569 | hard/whip, 57.0 | 0.2767 | high in-shot change (strong animation/camera per second) |

\* dur and in-shot change are measured on the grid; real duration error up to ±1 s near boundaries.

## TRUkQ1wbV2E — 13 shots, 61.0 s

**Style** (western/mine adventure; desert, cabin, cave). Tightest cutting rhythm early (shots 1-4 all 5-6 cells). Shot 5 (31.0-33.9 s) is the darkest measured shot in era-2 representatives (luma 0.22, ink 0.32) - a deliberate mood-dip beat near the midpoint. Shot 11 has the largest single transition diff in the whole DB (101.3).

| # | t_start–t_end (s) | dur* | cells | luma | sat | ink | subj_x | top/bot luma | trans (kind, diff) | in-shot change* | content |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0.0–3.9 | 3.9 | 4 | 0.302 | 0.507 | 0.16 | 0.536 | 0.281/0.268 | - | 0.1812 | OBS: mine tunnel interior, 2 characters, wide, dim, cart+pickaxe props |
| 1 | 2.9–11.65 | 8.8 | 9 | 0.388 | 0.548 | 0.03 | 0.541 | 0.362/0.251 | hard/whip, 50.4 | 0.1276 | OBS: wooden cabin interior, 1 character center, medium, warm light, table+chair |
| 2 | 10.65–17.46 | 6.8 | 7 | 0.516 | 0.431 | 0.016 | 0.562 | 0.547/0.378 | hard/whip, 57.3 | 0.1786 | OBS: desert exterior, 2 characters, wide, bright, tracks+signpost |
| 3 | 16.46–22.3 | 5.8 | 6 | 0.462 | 0.383 | 0.015 | 0.543 | 0.487/0.336 | hard/whip, 67.1 | 0.1756 | OBS: desert exterior, 3 characters, wide, bright, vintage car |
| 4 | 21.3–31.98 | 10.7 | 11 | 0.395 | 0.42 | 0.052 | 0.529 | 0.36/0.397 | hard/whip, 60.9 | 0.1756 | OBS: cave interior, 1 character left, medium, dim, stalactites+rope |
| 5 | 30.98–33.92 | 2.9 | 3 | 0.219 | 0.676 | 0.32 | 0.505 | 0.183/0.251 | hard/whip, 52.1 | 0.1777 | OBS: dark room, 1 character center, close, low light |
| 6 | 32.92–41.67 | 8.8 | 9 | 0.4 | 0.533 | 0.025 | 0.619 | 0.361/0.36 | hard/whip, 67.6 | 0.1336 | balanced frame |
| 7 | 40.67–45.54 | 4.9 | 5 | 0.35 | 0.535 | 0.03 | 0.554 | 0.302/0.338 | hard/whip, 21.7 | 0.1495 | OBS: cabin interior, 2 characters, medium, warm, table+barrels (from cell row ~t41) |
| 8 | 44.54–47.48 | 2.9 | 3 | 0.405 | 0.473 | 0.031 | 0.586 | 0.375/0.41 | hard/whip, 56.1 | 0.2072 | balanced frame |
| 9 | 46.48–52.32 | 5.8 | 6 | 0.323 | 0.542 | 0.103 | 0.525 | 0.238/0.286 | hard/whip, 39.0 | 0.1789 | high-ink frame (dark scene / heavy silhouette) |
| 10 | 51.32–54.25 | 2.9 | 3 | 0.342 | 0.482 | 0.148 | 0.525 | 0.26/0.327 | hard/whip, 47.0 | 0.3085 | high-ink frame (dark scene / heavy silhouette); high in-shot change (strong animation/camera per second) |
| 11 | 53.25–56.19 | 2.9 | 3 | 0.488 | 0.526 | 0.018 | 0.45 | 0.408/0.412 | hard/whip, 101.3 | 0.2 | balanced frame |
| 12 | 55.19–61.03 | 5.8 | 6 | 0.356 | 0.682 | 0.031 | 0.451 | 0.235/0.276 | hard/whip, 48.9 | 0.1251 | balanced frame |

\* dur and in-shot change are measured on the grid; real duration error up to ±1 s near boundaries.

## Mz72MuPgnGY — 12 shots, 66.0 s

**Style** (ship/pirate kitchen comedy; deck + cabin). Most output-saturated representative (sat 0.50-0.76). Longest era-2 shot measured: shot 8, 20.7-44.3 s (23.6 s, 24 cells) - an exceptional hold vs the 2.96 s median. Cut density returns after it (9 cuts in the last 22 s). Shot 11 (luma 0.28, sat 0.76) closes the film dark and saturated.

| # | t_start–t_end (s) | dur* | cells | luma | sat | ink | subj_x | top/bot luma | trans (kind, diff) | in-shot change* | content |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0.0–1.98 | 2.0 | 2 | 0.468 | 0.581 | 0.058 | 0.492 | 0.401/0.357 | - | 0.2847 | OBS: ship deck (barrel+rope), 1 chef mid-left, wide high-angle, daylight |
| 1 | 0.98–2.97 | 2.0 | 2 | 0.464 | 0.614 | 0.078 | 0.501 | 0.429/0.489 | hard/whip, 66.6 | 0.3581 | OBS: ship deck, 1 pirate mid-right, wide eye-level, daylight |
| 2 | 1.97–5.92 | 4.0 | 4 | 0.454 | 0.549 | 0.155 | 0.514 | 0.408/0.469 | hard/whip, 86.1 | 0.263 | OBS: ship cabin interior, 3 characters, medium eye-level, warm |
| 3 | 4.92–11.83 | 6.9 | 7 | 0.47 | 0.505 | 0.118 | 0.482 | 0.604/0.261 | hard/whip, 34.5 | 0.1819 | OBS: deck w/ railing, 2 chefs right, medium, daylight |
| 4 | 10.83–13.8 | 3.0 | 3 | 0.458 | 0.496 | 0.042 | 0.54 | 0.377/0.347 | hard/whip, 59.7 | 0.2684 | OBS: deck near barrel, 2 chefs left, wide low-angle, daylight |
| 5 | 12.8–17.74 | 4.9 | 5 | 0.462 | 0.508 | 0.031 | 0.517 | 0.354/0.36 | hard/whip, 56.5 | 0.1679 | balanced frame |
| 6 | 16.74–19.71 | 3.0 | 3 | 0.456 | 0.543 | 0.063 | 0.558 | 0.449/0.399 | hard/whip, 68.2 | 0.246 | OBS: deck, 1 chef center holding object, close, daylight (from cell row ~t18) |
| 7 | 18.71–21.68 | 3.0 | 3 | 0.442 | 0.5 | 0.091 | 0.518 | 0.417/0.397 | hard/whip, 73.0 | 0.3549 | moderate silhouette content; high in-shot change (strong animation/camera per second) |
| 8 | 20.68–44.33 | 23.6 | 24 | 0.331 | 0.63 | 0.118 | 0.491 | 0.213/0.322 | hard/whip, 80.4 | 0.1631 | high-ink frame (dark scene / heavy silhouette) |
| 9 | 43.33–50.24 | 6.9 | 7 | 0.478 | 0.584 | 0.074 | 0.457 | 0.517/0.25 | hard/whip, 48.3 | 0.1699 | moderate silhouette content; bright top / darker bottom (sky or lit ceiling above) |
| 10 | 49.24–54.18 | 4.9 | 5 | 0.585 | 0.664 | 0.011 | 0.564 | 0.518/0.571 | hard/whip, 71.8 | 0.2269 | balanced frame |
| 11 | 53.18–66.0 | 12.8 | 13 | 0.276 | 0.756 | 0.081 | 0.504 | 0.191/0.303 | hard/whip, 21.2 | 0.1225 | moderate silhouette content |

\* dur and in-shot change are measured on the grid; real duration error up to ±1 s near boundaries.

## RVnC1DSfK30 — 10 shots, 11.9 s

**Style** (era-1 comic-dub CONTROL; flat-color comic pages). Radically different grammar: ink fraction 0.58-0.63 (vs 0.03 era-2 mean), luma 0.13-0.25, cell grid 2 fps. 'Shots' here are page-holds and slow zooms, not 3D scenes; 3 of 9 transitions read SOFT (dissolve/evolution) - the only soft transitions in the database. Included as the format contrast control.

| # | t_start–t_end (s) | dur* | cells | luma | sat | ink | subj_x | top/bot luma | trans (kind, diff) | in-shot change* | content |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0.0–1.88 | 1.9 | 9 | 0.223 | 0.557 | 0.578 | 0.486 | 0.316/0.214 | - | 0.0204 | OBS: flat-color comic page look (ink 0.58), sheet-cell grid artifacts; control video |
| 1 | 0.88–1.99 | 1.1 | 2 | 0.203 | 0.596 | 0.579 | 0.483 | 0.243/0.201 | soft, 9.8 | 0.0545 | high-ink frame (dark scene / heavy silhouette); low in-shot change (near-hold) |
| 2 | 0.99–2.1 | 1.1 | 2 | 0.204 | 0.57 | 0.579 | 0.485 | 0.306/0.161 | hard/whip, 13.2 | 0.042 | high-ink frame (dark scene / heavy silhouette); bright top / darker bottom (sky or lit ceiling above); low in-shot change (near-hold) |
| 3 | 1.1–3.2 | 2.1 | 11 | 0.171 | 0.612 | 0.584 | 0.485 | 0.181/0.144 | soft, 9.3 | 0.0342 | high-ink frame (dark scene / heavy silhouette); low in-shot change (near-hold) |
| 4 | 2.2–4.52 | 2.3 | 13 | 0.22 | 0.606 | 0.584 | 0.492 | 0.129/0.184 | hard/whip, 21.2 | 0.0243 | high-ink frame (dark scene / heavy silhouette); low in-shot change (near-hold) |
| 5 | 3.52–4.74 | 1.2 | 3 | 0.254 | 0.572 | 0.584 | 0.501 | 0.261/0.212 | hard/whip, 15.3 | 0.0308 | high-ink frame (dark scene / heavy silhouette); low in-shot change (near-hold) |
| 6 | 3.74–5.29 | 1.5 | 6 | 0.247 | 0.541 | 0.583 | 0.491 | 0.283/0.177 | soft, 9.8 | 0.0351 | high-ink frame (dark scene / heavy silhouette); low in-shot change (near-hold) |
| 7 | 4.29–6.61 | 2.3 | 13 | 0.188 | 0.605 | 0.581 | 0.49 | 0.204/0.153 | hard/whip, 22.0 | 0.0336 | high-ink frame (dark scene / heavy silhouette); low in-shot change (near-hold) |
| 8 | 5.61–9.69 | 4.1 | 29 | 0.165 | 0.624 | 0.628 | 0.499 | 0.087/0.176 | hard/whip, 18.0 | 0.0207 | high-ink frame (dark scene / heavy silhouette); low in-shot change (near-hold) |
| 9 | 8.69–11.89 | 3.2 | 21 | 0.134 | 0.704 | 0.632 | 0.501 | 0.075/0.162 | hard/whip, 21.5 | 0.0213 | high-ink frame (dark scene / heavy silhouette); low in-shot change (near-hold) |

\* dur and in-shot change are measured on the grid; real duration error up to ±1 s near boundaries.

## Cross-film reading (MEASURED + INFERRED)

1. **Opening beats:** era-2 films open on a 2.0–7.8 s hold (VS1Z 2.0 s, TRUk 3.9 s, QlDPM 7.8 s, Mz72 2.0 s) before the first cut — the hook is a composed wide, not a montage (MEASURED from shot 0 row lengths).
2. **In-shot change is everywhere (MEASURED):** 53/54 era-2 shots show visible change between consecutive 1-s cells (mean pair diff 0.066–0.36 gray levels, 0–1 scale). No locked-off still holds exist in the explainer era — even within 'shots', characters animate and/or the camera drifts.
3. **Global translation is rare (MEASURED):** translation-consistency (a single integer shift explaining the change) is ~0 for all era-2 shots. Inference: in-shot motion is character/prop animation plus non-uniform camera moves (dolly/orbit/whip), which an integer-shift model cannot cancel. Whip pans happen as cuts, not intra-shot pans.
4. **Asymmetric cutting:** cut density peaks in the first 40 % of each film and relaxes in the last third (e.g. Mz72: 8 cuts in 0–21 s vs 4 cuts in 44–66 s) — EXPLAINER rhythm: hook montage up front, longer holds once the story lands.
5. **Mood dips are engineered:** each film contains 1–2 near-black luma shots (TRUk shot 5 luma 0.22, Mz72 shot 11 luma 0.28) at act boundaries — the 'lights down' beat before a reveal or payoff.
