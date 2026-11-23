# 08 — Visual consistency analysis

Question: how does the channel make 155 videos (and 27 era-2 films in 4 months) look like one body of work?
Evidence: poster contact sheet (`../sheets/channel_posters_contact_sheet.jpg`, 155 posters),
character band (`../sheets/cats_characters.jpg`, 18 era-2 posters), cell corpus stats, prior palette
k-means (`../data/palette.csv`), and the shot DB.

## 1. Character proportions and design (OBS + MEASURED)

- **Style**: rendered cartoon — large round heads, simplified facial geometry (big eyes, small mouth),
  2.5–3 head-units tall, smooth cel-shaded surfaces. Observed consistently on all 18 era-2
  character-band crops (`cats_characters.jpg`) and read the same on all poster crops.
  Label: CONFIRMED OBSERVATION (at poster resolution ~1280×720).
- **Palette of characters**: bright saturated clothing colors against lighter backgrounds;
  recurring saturated primary/secondary hues. MEASURED: era-2 saturation mean 0.40, posters cluster
  into a small number of hue families (prior k-means, `palette.csv`) rather than spreading.
- **Facial grammar**: eyes dominate the face; simple mouth shapes carry expression. No detailed
  noses, minimal wrinkle detail. OBS at poster res; cannot verify micro-detail at 50×90 cells.

## 2. Character consistency across videos

- The character style (not the characters) recurs: different films use different casts, but
  proportions, shading style, eye/mouth grammar match between crops from different months.
  CONFIRMED OBSERVATION on `cats_characters.jpg`.
- This implies a **style spec + reusable rig/pipeline**, not shared literal character models:
  casts differ per film (analyzer could not identify an identical recurring main character across
  the 18 posters beyond the style itself). Label: TECHNICAL INFERENCE.

## 3. Environmental style (OBS on 30-cell environment sheet)

- Full-3D-reading backgrounds dominate interiors and fantasy sets (distinct foreground/midground/
  background layers); some outdoor/vehicle shots read flatter (simplified mid-layer geometry or
  projected backdrops). OBS — at 50×90 px, "flat-looking" may simply be depth-of-field blur.
- Scale and proportions stay cartoonish (oversized props, oversized architectural elements)
  matching the character scale rhythm. OBS.

## 4. Color grading and lighting consistency

- MEASURED (from shot DB, era-2 representatives): luma means sit in a 0.30–0.57 band per shot with
  engineered exceptions (0.22 and 0.28 mood-dips); sat 0.21–0.76 but per-film consistent
  (TRUk ~0.43–0.68, Mz72 ~0.50–0.76, VS1Z ~0.21–0.45).
- Per-film grading is consistent; per-film palettes differ (each film picks a palette family and a
  luma band). CONSISTENCY MECHANISM: grade-to-the-film, not grade-to-the-channel. Label: MEASURED
  RESULT + INFERENCE.
- Lighting: bright scenes show directional sun (cast shadows from above); dark scenes go ambient
  with high contrast and silhouettes (cats_lighting.jpg, luma deciles). CONFIRMED OBSERVATION.

## 5. Rendering quality consistency

- Era-2 frames show consistent soft shading, no inter-pixel noise, no resolution-dependent detail
  popping across cells sampled from different parts of any timeline. At storyboard resolution we
  cannot measure anti-aliasing or true render settings — labeled UNVERIFIED HYPOTHESIS: consistent
  renderer profile (same engine + same post chain per film, reused per upload).

## 6. Reusable vs independently-constructed assets

| asset class | verdict | evidence |
|---|---|---|
| character style/rig | **reusable** | identical proportions/grammar across 18 posters from different films |
| palette + grade LUT family | **reusable per film** | per-film luma/sat bands tight, cross-film palettes distinct |
| environments | **independently built per film** | no recurring building layout; environment sheet shows 5 distinct setting families (indoor/natural/urban/vehicle/fantasy) with no repeated geometry signature at available resolution |
| props | mixed — barrel/railing/signpost archetypes recur but reshaped per film | OBS on Mz72 & TRUk grids; archetype reuse (INFERENCE), not literal asset reuse (UNVERIFIED) |
| cut grammar | **reusable** | opening hold → front-loaded montage → relaxed back half on all 4 era-2 representatives (MEASURED) |

**Bottom line**: the channel's consistency comes from (1) one character style specification,
(2) per-film palette/grade selection from a fixed family, (3) a fixed cut grammar — NOT from
re-deploying the same environments or literal models. That is exactly what a small studio can
replicate without a giant asset library.
