# 10 — Visual production specification (our ORIGINAL implementation)

Target: the same GENERAL level of visual sophistication as era-2 Ricks Clips 3000, built from
our own original assets. Nothing in this document copies identifiers, characters, shots, or
assets from the reference; every parameter traces to a MEASURED statistic of the reference style.

## 1. Character specification
- Rendered toon-shaded cartoon; 2.5–3 head-units tall; oversized round head; eye-dominant face.
- One shared shading model for cast + sets (matte + rim light), single engine render.
- Cast fields per character: variant id, palette slot (2 clothing colors from film palette), one of 4 pose states.
- Expressions limited to a small set (alarm / laugh / scared / earnest) keyed by story beat, 8 fps pose quantization acceptable.

## 2. World-building / environment specification
- Full geometry foreground + midground; simplified far layer (cards/gradients/DOF).
- Portrait-first staging (1080×1920): design every set along a vertical; verify all staging inside the ~27° horizontal half-FOV.
- Setting families per film (pick 2–3): interior-room, outdoor-natural, street, vehicle-deck.
- Props oversized relative to characters (cartoon scale rhythm).

## 3. Camera specification
- Opening: composed wide hold 2–7 s with subject near center (subj_x 0.43–0.55 measured band).
- Cuts on narration beats; mean view length ≤ 3 s in the hook montage, allow 8–20 s holds in the story core.
- In-shot motion: dolly/orbit/punch-in, character animation carries change; avoid simple pans (reference shows no readable translation signature).
- Whip-pans as cuts, not intra-shot moves. Close-ups get a low-light or high-contrast frame (reference dark close-up beats).

## 4. Lighting specification
- Three preset rigs per film: DAY (directional key + fill, top luma > bottom by ~0.1–0.15), WARM INTERIOR, MOOD-DIP (luma ≤ 0.25, silhouettes, high contrast).
- Grade locked per film: saturation target 0.40–0.60; per-shot luma band 0.30–0.57 with ≤2 engineered dips.

## 5. Animation specification
- 4 reusable states/character: idle-wobble (continuous, subtle), walk, act, react.
- Change every second of screen time: no locked-off static holds (measured requirement: visible change every 1 s).
- Environmental animation on at least one layer per set (flags, water, dust, crowd bobbing).

## 6. Rendering specification
- 1080×1920 @ 30 fps; soft shading; no noise; consistent AA; fog/atmosphere for depth separation.
- Per-shot QA gate: luma/sat/ink/subj_x report vs spec bands (same metrics as `shots.csv`).

## 7. Editing specification
- VO first; cuts placed on sentence/keyword boundaries; opening hold 2–7 s; front-loaded montage in the first 40 %; relaxed cutting in final third; one "lights-down" beat before the payoff; hard-cut grammar (no dissolves).

## 8. Sound specification
- Continuous bed synced to tempo grid; SFX accents at cuts; one boom at the act-turn hard cut; wind/air swells in the final act. (Our established pattern; not a channel measurement.)

## 9. Frame-level spec numbers (all MEASURED from reference, reused as OUR targets)
| parameter | band |
|---|---|
| visible shots per 60 s film | 12–13 floor (true count likely 20–27) |
| opening hold | 2.0–7.8 s |
| luma mean per shot | 0.30–0.57 (dips to 0.22–0.28 allowed ≤1–2×) |
| ink fraction | ≤ 0.05 typical |
| subject x | 0.43–0.55 |
| saturation | 0.21–0.76, per-film tight |
| in-shot change | visible change every 1 s (diff ≥ ~0.07 gray) |
