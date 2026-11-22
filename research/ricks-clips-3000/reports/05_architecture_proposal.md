# 05 — Architecture proposal for OUR production system (Phases 5–6, design only — no code yet)

Goal restated: **a distinctive animated 2D character living inside a detailed, colorful, cinematic
3D world**, produced by a repeatable pipeline with per-scene production records and exact
script timestamps.

## 5.1 Visual identity proposal (original, bible-compliant)

- **Characters:** "ink-cards" — flat-drawn figures, ~3.5–4 heads tall, big pale egg heads,
  thick-thin variable outline, dot/brow acting, one clothing color block + job prop. All drawn
  programmatically (canvas) so proportions stay exact across every film. Identity = hat/hair,
  one color, one prop (channel-consistent hierarchy, PRIOR §5).
- **Worlds:** card-based 3D sets on the proven engine: buildings = textured boxes + painted
  texture detail; terrain = painted tiles; props = cutout+extrude cards. Ten set families
  (village, hall, church, road, field, sea/deck, mine, lab, modern street, workshop), each with
  2 pre-lit moods (day + night or storm).
- **Grade:** measured per-mood presets (the STYLE_BIBLE-fitted day grade already in our engine),
  warm-lifted blacks, single-word captions at 70.6% height, −14 LUFS finish.

## 5.2 System blocks (Phase 5 list, mapped to components)

1. **Character system** — cast.js def library: proportions DSL (head ratio, stroke widths,
   palette), variant generator, pose/face/expression instruction set, consistency oracle
   (compare drawn card against redlines: ink px budget, head-ratio test).
2. **Character reference sheets** — auto-render any cast member in 5 canonical poses x 6 faces
   at 3 distances onto one reference page (asset: refs/cards_<name>.png).
3. **Environment library** — each set a parameterized module (already: road/field/hall/church);
   new families get a "build once, view anywhere" spot system + baked moods.
4. **Scene record format** (Phase 6 core, see 5.3).
5. **Camera director** — RT.PLAN views with per-view transition (dissolve/whip), plus standing
   rules: camera never still, push>pull, 0–3 cuts, subject centered.
6. **Composer** — STAGING pure functions of t + voices + pool actors; local acting beats.
7. **Renderer** — HyperFrames render @1080x1920@30 (quality "looks"), px budgets per actor.
8. **Assembly/sound** — render.sh: TTS voice (kokoro-onnx), words layer, bed ducking, -14 LUFS.
9. **QA gates** — check ok:true (camera-in-solid sweep, perf deadline), qa.py (0 problems,
   hard changes only at planned whips/cuts), loudness check, caption-sync check.
10. **Export** — MP4 to repo, download link (established delivery chain).

## 5.3 The scene production record (Phase 6 schema)

```json
{
  "n": 14,
  "t_start": 31.52, "t_end": 33.48,
  "script_line": 12,
  "narration": "one cart stopped an entire army",
  "words": [{"w": "one", "t": 31.52}],
  "set": "road",
  "view": {"pos": ["spot",[0.4,1.4,3.2]], "look": ["spot",[0,1.1,0]], "fov": 42},
  "cam_move": {"kind": "push", "start_pct": 0.15, "end_pct": 0.35, "per_s_pct": 6.0},
  "transition": {"kind": "whip", "frames": 26, "blur": "peak"},
  "cast": [{"id": "usher", "pose": "carry", "face": "earnest", "fx": {"bob": 0.006}},
           {"pool": [1,3,5], "pose": "dance", "amp": "smooth 31.8-33.2"}],
  "lighting": {"mood": "road.day", "setDay": 1, "extras": []},
  "props": ["cart", "barrels"],
  "sfx": [{"kind": "whoosh", "t": 31.4}],
  "render": {"fps": 30, "quality": "looks", "grade": "moodDay"}
}
```

## 5.4 Engine dataflow (Phase 6)

```
SCRIPT.md --(count.py)--> script.json (exact word timings from TTS)
   |
   +--> SCENES.json (production records; one per view; timestamps verbatim)
           |
           +--> views.js  (RT.PLAN + cameras)
           +--> words.js  (caption layer, verbatim word times)
           +--> story.js  (STAGING = f(t) compiled from cast/pose/face fields)
   |
render.sh (QA gate: check ok:true -> render -> loudnorm -> qa.py) -> delivery
```

## 5.5 Development roadmap (after approval)

1. **M1 — Character consistency kit (1–2 sessions):** proportion DSL + reference-sheet renderer +
   redline oracle. Delivers consistent new casts from a short spec.
2. **M2 — Set family builder (2–3 sessions):** generalize sets/*.js into a set-module spec
   (spots + mood presets + builder); build 3 new families (mine, sea/deck, lab).
3. **M3 — SCENES.json pipeline (1–2 sessions):** production-record schema + compiler into the
   existing views/words/story runtime, with exact-timestamp preservation + validator.
4. **M4 — Camera director rules (1 session):** standing rules as lint checks (cut count,
   still-view count, push/pull ratio, centering oracle).
5. **M5 — SFX layer (1 session):** sfx cue layer in the render pass (whoosh/thump per transition).
6. **M6 — Pilot film** through the full new pipeline (acceptance test).

## 5.6 Limitations & costs (estimated)

- Compute: render ~90–95 min/film on this 4 GB sandbox at px320 pool settings. A 5-shorts/week
  cadence = ~8 h render/week — fits; the check deadline is the binding constraint (px ceilings
  could rise with more RAM).
- Art risk: programmatic characters are strong for the "flat ink-book" family; photoreal or anime
  looks would need image-gen cards + defocus treatment (out of scope of the current engine).
- Ethical line (kept per mromidev rules): measured style values only; scripts, characters, sets
  and shots remain original.
- Data gaps carried from Phases 1–4: no audio measurements (blocked), no fps-true re-measurement
  (storyboard resolution ceiling; RULEBOOK numbers reused and labeled).
