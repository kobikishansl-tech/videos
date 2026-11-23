# QC report — WorldFrame prototype "Milady of the Market"

Verified against the ACTUAL rendered file `out/worldframe-proto.mp4` — not the editor,
not the snapshots. Every claim below names its evidence.

## Hard facts (ffprobe on the delivered file)
| check | value | verdict |
|---|---|---|
| container / streams | h264 1080x1920 + aac | OK |
| duration | 15.000 s | spec 10-15 s: OK (top end) |
| picture rate | 30/1 fps, 450 frames | OK |
| file size | 13.9 MB (CRF 16 "looks" quality) | OK |
| loudness | -14.1 LUFS integrated, TP -1.8 dBFS | within +-0.5 of -14, TP <= -1.5: OK |
| `hyperframes check --json` | lint, runtime, layout, motion, contrast, craft — all `ok: true` | OK |

## 10-axis quality scorecard  (scores on the actual render)
| # | axis | score | evidence / notes |
|---|------|-------|------------------|
| 1 | Character design | **9** | `sheets/mila_refsheet.png` — 12-panel sheet reviewed: unique silhouette (ponytail + jacket), teal/mustard/plum palette reads on every panel |
| 2 | Character consistency | **9.5** | refsheet review found the design identical across all 12 panels (views are parameter blends of one definition, not separate drawings) |
| 3 | 3D environment quality | **8.5** | film strip frames 1-6: foreground crates/barrels -> mid stalls -> house rows -> sky dome; manual + procedural stone/plank/plaster textures, no flat plane |
| 4 | Character integration | **8.5** | feet touch ground (crop study at 4.5 s), contact shadow renders (ox-diff test: 47k px change vs shadow-off, bbox y1690-1919), card casts real depth-only shadows into the sun's shadow map (`customDepthMaterial`), no rectangle halo in film strip review |
| 5 | Camera movement | **8.5** | A-E stills at 1.5/4.5/8.4/11/13/14.3 s all captured and reviewed; cuts are hard, moves are push/dolly-low/track with per-key DOF focus (2.0-23 m) |
| 6 | Animation smoothness | **8** | 30 fps pose-cycle walk (bps 2.2) on a 3D path; footfall timing verified in audio (step #3 at t=3.36 s vs audio burst 3.33-3.5 s) |
| 7 | Lighting | **8.5** | 7-light golden-hour rig; warm key w/ 4096 shadow map + fill + rim + lantern point; all present in the functioning render |
| 8 | Color | **8.5** | saturation 1.35 grade + warm curve + vignette; golden-hour sky (#4f86cf->#f6c890) matches character palette |
| 9 | Rendering | **8.5** | engine pass order verified: ink -> sky -> scene -> DOF lens -> glow -> grade; CRF 16, no dropped frames (450/450) |
| 10 | Overall visual quality | **8.5** | final filmstrip: six frames graded, "one continuous film with a consistent look", no frame weaker |

## Five biggest weaknesses found — and their fixes (all applied BEFORE finishing)
1. **WebGL renderer crash on the full scene** (`Cannot read properties of undefined (reading
   'elements')`) — root caused with a standalone repro: `O.lam(map,…)` (texture first param) had
   been called with a raw `THREE.Color` for stall produce, putting a non-Texture with no `.matrix`
   into `material.map`; three's `refreshMaterialUniforms` crashed the first time the fruit entered
   the shifted camera's frustum. The earlier "removing houses/stalls/lights/fill/rim each fixes
   it" pattern was a bisect red herring caused by frustum changes. **Fix:** 2 call sites
   (`O.lam(null, { color })`). Full 7-light rig kept. Evidence: `RENDER OK` x2 in repro ->
   snapshots A-E -> the delivered render. (README §8 documents the story.)
2. **Medium/tracking shots cropped her feet and contact shadow off the frame bottom** — found by
   still-vs-still comparison (B/E/D keys). **Fix:** camera keys raised ~0.1 m and look-at lowered
   ~0.07 m; re-review: all five shots fully composed.
3. **Contact shadow too subtle** at wide focal distances. **Fix:** scale 0.78x0.30 -> 0.95x0.36,
   core opacity 0.62 -> 0.78 with a richer 4-stop falloff (engine `cards.js`), verified by ox-diff.
4. **Silent film.** **Fix:** procedural ambience bed + 15 walk footfalls at the walk's exact bps
   grid + 2 crate knocks at the rummage beats, mixed and loudness-finished with the render
   (-14 LUFS): `music/soundtrack.wav`.
5. **Character sheet never rendered** (`sheets/` was empty). **Fix:** registered the refsheet
   composition momentarily, captured `sheets/mila_refsheet.png` (12 panels reviewed, 10/10).

## What a reviewer should look at, in order
1. `out/worldframe-proto.mp4` — with sound on
2. `sheets/mila_refsheet.png` — the character contract
3. `stills/camera_tests/` — the five camera stations as stills (A 1.5 s, B 4.5 s, E 8.4 s, C 11 s, D 13 s, E2 14.3 s)
4. `stills/film/filmstrip.jpg` — six frames from the finished render
