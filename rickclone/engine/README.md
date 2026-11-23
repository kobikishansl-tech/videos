# Petrichor Engine — R1 (scene records + camera + seed sets + QA)

Status after R1 (per the Phase 3 blueprint, `../research/ricks-clips-3000/reports/12_blueprint_p3.md`):

| component | file | state |
|---|---|---|
| scene-record schema + loader + validator | `records.py` | **PASS** on `../plan/demo_records.json`; negative tests CAUGHT (missing fields, unknown moves, out-of-window actions/sfx, rounding against words) |
| QA shot suite (our renders, reference metrics) | `qa_shots.py` | **VALIDATED on real footage**: our Dancing Plague film → 24 shots over full 62.9 s, 2 engineered mood-dips detected, 6 violations + 4 ink warnings (`qa_dancing_plague.csv`) |
| camera move library (13 typed moves, pure f(t)) | `camera_lib.js` | self-tested, 24/24 checks (`test_engine.js`) |
| seeded set builders: urban, domestic | `sets_families.js` | deterministic per seed (urban 93 children, 84 occluders; spots + occluder tables) |
| demo scene records (original micro-narrative) | `../plan/demo_records.json` | 4 scenes / 14.0 s, urban + domestic, 1 mood-dip |

## Run

```sh
# engine self-test (headless; no browser needed)
node engine/test_engine.js
# records validation (add --words voice/words.json in real productions; R-EXACT then
# verifies scene times are COPIED, never rounded)
python3 engine/records.py plan/demo_records_scenes.json        # (extract scenes: see plan/)
# per-shot QA on a rendered film (needs FFMPEG/FFPROBE env or on PATH)
python3 engine/qa_shots.py <video.mp4> --json engine/qa_<film>.csv [--bands bands.json] [--strict]
```

## Design deltas fixed during R1 (recorded so R2 does not regress)
1. `qa_shots` originally buffered the whole RGB decode (~730 MB → truncated at 31/62.9 s).
   Now streams at ~6 fps sampling (bounded RAM), `rgb24` explicit (yuv420p default had
   re-framed the buffer silently — symptom: sat ≈ 0.07 everywhere).
2. `subj_x` was the centroid of ALL dark pixels (night skies dragged it to 0.0/0.9).
   Now the darkness-weighted centroid of the middle 60% rows (action band).
3. In-shot change is a per-SECOND rate, not per-pair (raw pair diffs shrink with sampling fps).
4. `camera_lib` PUSH/DOLLY/CRANE/POSTCARD collapsed when look == target (zero-length direction);
   fixed with a `back` unit-vector primitive (`standAt`), default +z.
5. Bands are ERA-2 (day) defaults; night films override via `--bands` JSON or the plan —
   our night-tinted Dancing Plague lands slightly OUTSIDE the day bands (0.61–0.65 luma shots,
   ink up to 0.19 in silhouette beats) and the gate says so honestly.

## Not in R1 (planned)
- `industry / nature / period` set families (R2), cast rig + reference-sheet renderer (R2),
  viewport render glue (records → hyperframes page) and full record-only film (R2/R5),
- R-EXACT against a real `words.json` (schema ready; demo carries inline word times).
