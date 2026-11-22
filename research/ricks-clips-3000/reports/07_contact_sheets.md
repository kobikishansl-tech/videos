# 07 — Contact sheet inventory (11 sheets, all generated this phase)

All sheets are built by `../data/contacts_build.py` from the 11,313-cell storyboard corpus.
Every cell is labeled with **video id + timestamp (s)** (`*` suffix = interval label for shot grids).
Evidence base: `../data/frames.db` (137 videos, 11,313 cells, full timeline coverage where sheets exist).

## A. Per-video shot grids (representative frames, one per shot)

| sheet | cells | content |
|---|---|---|
| `../sheets/shots_VS1Z_Q-Klt8.jpg` | 11 | representative frame per shot, shot# + full interval (0.0–66.0 s coverage) |
| `../sheets/shots_QlDPMzGmYac.jpg` | 13 | same, 0.0–64.0 s |
| `../sheets/shots_TRUkQ1wbV2E.jpg` | 13 | same, 0.0–61.0 s |
| `../sheets/shots_Mz72MuPgnGY.jpg` | 12 | same, 0.0–66.0 s |
| `../sheets/shots_RVnC1DSfK30.jpg` | 10 | era-1 comic-dub CONTROL, 0.0–11.9 s |

Together these give complete per-shot visual coverage of all 5 representative videos
(4 era-2 explainers + 1 era-1 control). Representative frames are the middle cell of each
shot segment; raw cells live under `../frames/<vid>/t*.jpg`.

## B. Category sheets (cross-film)

| sheet | cells | category | how sampled | what it shows |
|---|---|---|---|---|
| `../sheets/cats_characters.jpg` | 18 | Character appearances | poster middle-band crops, sorted era-2 (upload ≥ 2026-10, dur < 70 s) | character design consistency across the era: proportions, palette, facial grammar |
| `../sheets/cats_environments.jpg` | 30 | Environment types | random era-2 cells (seed 11) | outdoor/urban/indoor/vehicle mix, depth layering, background construction |
| `../sheets/cats_lighting.jpg` | 24 | Lighting variations | cells sampled across luma deciles, labels carry the luma value | the full darkness→daylight range the channel ships |
| `../sheets/cats_transitions.jpg` | 36 | Scene transitions | PRE/POST pairs around the first 6 cuts of the 4 era-2 representatives | what changes at a cut: same-location cut-ins vs location jumps |
| `../sheets/cats_animation.jpg` | 18 | Animation examples | consecutive-cell triples, highest mid-shot change first | what motion is visible at 1 fps: pose changes, stills, camera-driven movement |
| `../sheets/cats_camera.jpg` | 12 | Camera angles | 6 center-subject (subj_x ≈ 0.5) vs 6 off-axis/dark-centroid cells | framing variants, horizon height, shot-size cues |

## Coverage statement

- Every era-2 representative film: start-to-end shot coverage YES (see grids A).
- Era-1 control: covered (0–11.9 s, 2-fps grid).
- Newest upload `aD73kaL_PtY`: **NO storyboard sheets exist yet on YouTube's side** — documented gap, not an extraction failure (`../reports/01_extraction_log.md`).
- Audio: storyboards carry no audio; SFX/music/narration-sync conclusions remain inaccessible — flagged wherever used.
