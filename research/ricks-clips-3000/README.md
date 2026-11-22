# research/ricks-clips-3000 — Ricks Clips 3000 reverse engineering (Phases 1–4)

Everything measured and reconstructed from the channel, with full honesty about what could and
could not be captured. STOP: Phase 5–6 implementation awaits approval.

## Read in order

1. reports/00_channel_database.md — 155 shorts, two production eras, top videos, taxonomy
2. reports/01_extraction_log.md — what was captured, what was blocked (with evidence)
3. reports/02_frame_by_frame.md — the 5+1 representative breakdowns (labels: OBS/PRIOR/INFER/HYP)
4. reports/03_visual_measurements.md — measured era contrast, shot tables, palette, placement
5. reports/04_pipeline_hypothesis.md — tool-by-tool inference of their workflow
6. reports/05_architecture_proposal.md — OUR system design + roadmap + costs (for approval)
7. tool log: ricks_unmeasured.md (cross-check source for numbers not re-measurable here)

## Data

- data/channel_index.tsv — all 155 videos (id, title, views)
- data/era2_facts.csv — per-film measured table for the current explainer era
- data/timeline_metrics.csv, data/shot_lengths.csv, data/palette.csv — 137-film measurement output
- data/cut_tables.json — scene-change timestamps for the representatives
- data/frames.db — 11,380 storyboard cells -> timestamps (sqlite)
- data/storyboards.py, measure.py, posters.py, bulkmeta.sh — reproducible pipeline

## Evidence images (also mirrored per report)

- sheets/channel_posters_contact_sheet.jpg — all 155 posters by views
- sheets/filmstrip_<id>.jpg — whole film at ~1 fps for the 5 analysable representatives
- sheets/<id>_sheetN_raw.jpg — the raw YouTube storyboard sheets, 137 videos
- thumbs/<id>.jpg — 155 posters (1280×720)

Not shipped (size): the per-second cells in data/frames/ (regenerable via storyboards.py).
