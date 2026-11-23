# 09 — Production methodology, per visual technique

Format per technique: Reference / What is visible / Likely technique / Alternative / Recommended
implementation / Difficulty / Requirements. Confidence labels: **CONFIRMED** (observed on evidence),
**MEASURED**, **INFERENCE**, **HYPOTHESIS** (unverified).

## T1. Rendered cartoon character in 3D world
- **Reference**: `../sheets/cats_characters.jpg` (18 crops); posters `../thumbs/<id>.jpg`.
- **Visible**: character fully integrated with scene lighting/shadow; no outlines torn from background.
- **Likely technique**: 3D character with toon/cel shading rendered in the same pass as the environment.
- **Alternative**: 2D character cutout composited over 3D env (would show lighting mismatch — not seen).
- **Recommended**: single-engine render (e.g. our HyperFrames/SVG-card or Three.js toon-material pipeline) with matte shading + rim.
- **Difficulty**: medium. **Requirements**: one shading system shared by cast and set.
- CONFIRMED integration; HYPOTHESIS on exact renderer.

## T2. Depth layering in environments
- **Reference**: `../sheets/cats_environments.jpg`.
- **Visible**: interiors read as full geometry (walls catch light differently by direction); some exteriors have soft flattened mid-layers.
- **Likely technique**: full 3D layout with a simplified far layer / DOF, not matte cards in most settings.
- **Alternative**: 2.5D card stacks — cheaper, and visually acceptable in wide shots.
- **Recommended**: full geometry for foreground + midground, cards/gradient for far layer; portrait framing hides cheap far layers (h-FOV only ~27° at our renders).
- **Difficulty**: low-medium. MEASURED basis: top/bottom luma asymmetry across shots (bright top vs dark bottom discipline).

## T3. Cut grammar (the core "explainer" rhythm)
- **Reference**: `../sheets/cats_transitions.jpg`; `../reports/06_shot_database.md`.
- **Measured**: opening hold 2.0–7.8 s → front-loaded cuts (2–6 s apart) → relaxed back half;
  all large-delta transitions read hard at 1 fps.
- **Likely technique**: hand-timed editorial against narration beats; hard cuts + whip-pans; dissolves basically absent in era-2 (present in era-1 control).
- **Recommended**: narration-first editing — write VO, place cuts on sentence/keyword boundaries, cap average view at ~3 s, opening hold ≥ 2 s but < 8 s, mood-dip shot before the final act.
- **Difficulty**: low (discipline, not software). CONFIRMED pattern (4/4 era-2 representatives + RULEBOOK frame-accurate cross-check).

## T4. Motion inside shots
- **Reference**: `../sheets/cats_animation.jpg`; shot DB motion columns.
- **Measured**: every 1-s cell pair differs (no dead holds); but no global translation signature → in-shot motion is character/prop animation + non-pan camera moves.
- **Likely technique**: hand-keyed character animation with simple idle/act cycles; camera moves = dolly/orbit/punch-in, not scroll-style pans.
- **Recommended**: 3–4 reusable per-character animation states (idle-wobble, walk, act, react), camera as pure function of t (our `story.js` pattern already does this); 8 fps pose quantization acceptable.
- **Difficulty**: medium. At 1 fps we cannot confirm keyframe vs procedural — HYPOTHESIS (hand-keyed is the mainstream toolchain).

## T5. Lighting system
- **Reference**: `../sheets/cats_lighting.jpg` (luma deciles).
- **Visible**: bright scenes = directional key (sun), soft ambient fill, cast shadows from above; dark scenes = high contrast, silhouettes, few in-frame light sources.
- **Likely technique**: 2–3 light rig presets (day / warm interior / dark mood) applied per shot.
- **Recommended**: preset rigs, one per emotional beat; schedule a "lights-down" shot (luma ≤ 0.25 mean) before each reveal.
- **Difficulty**: low. CONFIRMED range: luma p10–p90 = 0.29–0.62 era-2.

## T6. Grade & palette
- **Reference**: shot DB sat/luma bands; `../data/palette.csv` clusters.
- **Measured**: per-film tightness, cross-film variety.
- **Likely technique**: one grade preset per film (LUT or shader), palette chosen at art-direction stage.
- **Recommended**: lock one grade preset per film before staging (our `moodAt` grade params do this); verify with per-shot luma/sat report like `shots.csv` on our own renders.
- **Difficulty**: low.

## T7. Typography / narration scaffolding
- **Reference**: bright interior stamps read signage-like text in QlDPM shot 2 (OBS at low res).
- **Likely technique**: minimal on-frame captions; the channel leans on narration + cut rhythm, not dense subtitles.
- **Recommended**: caption only key words; keep ink fraction of the whole frame ≈ 0.03 (MEASURED era-2 ink frac) — text-heavy frames break the look.
- UNVERIFIED for exact caption behavior (audio/captions inaccessible).

## T8. Audio bed
- **Reference**: none — storyboards carry no audio. Entire audio section stays INACCESSIBLE.
- **Recommended for us**: continuous music bed + hard-sync SFX on cuts (what we already do in our pipeline) — but flagged as OUR choice, not a channel measurement.
