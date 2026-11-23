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

### Deep deconstruction phase (added)

8. reports/06_shot_database.md — 59-shot database, 5 videos, exact grid timestamps
9. reports/07_contact_sheets.md — inventory of 11 evidence sheets
10. reports/08_consistency.md — how the channel keeps visual identity (reusable vs per-film assets)
11. reports/09_methodology.md — 8 visual techniques, evidence-labeled
12. reports/10_visual_spec.md — visual production specification (original assets)
13. reports/11_qc_checklist.md — investigation completeness audit (7/7 PASS, gaps listed)
14. reports/12_blueprint_p3.md — PHASE 3 blueprint: "Petrichor Engine", 9 modules, no code

## Data

- data/channel_index.tsv — all 155 videos (id, title, views)
- data/era2_facts.csv — per-film measured table for the current explainer era
- data/timeline_metrics.csv, data/shot_lengths.csv, data/palette.csv — 137-film measurement output
- data/cut_tables.json — scene-change timestamps for the representatives
- data/frames.db — 11,380 storyboard cells -> timestamps (sqlite)
- data/shots.csv, data/shots_db.json (+ per-video JSONs) — 59-shot database
- data/shots_build.py, contacts_build.py; tools/gen06.py — deep-deconstruction pipeline
- data/storyboards.py, measure.py, posters.py, bulkmeta.sh — reproducible pipeline

## Evidence images (also mirrored per report)

- sheets/channel_posters_contact_sheet.jpg — all 155 posters by views
- sheets/filmstrip_<id>.jpg — whole film at ~1 fps for the 5 analysable representatives
- sheets/<id>_sheetN_raw.jpg — the raw YouTube storyboard sheets, 137 videos
- thumbs/<id>.jpg — 155 posters (1280×720)
- evidence/sheets/shots_<vid>.jpg ×5 — per-shot grids incl. timestamps; cats_*.jpg ×6 — category sheets

Not shipped (size): the per-second cells in data/frames/ (regenerable via storyboards.py).
