# RECIPE.md — the Moshimo stick-figure style, measured

This is the style recipe behind this project: how the format was measured from the reference
channels and turned into frame-deterministic code, and the numbers it targets.

The method (and it is a method, not a single style prompt): **measure the reference → write a
structured recipe → have the agent write frame-deterministic code that follows the recipe →
render key frames → compare side by side with the reference → iterate.** Every frame of the
finished film is a pure function of `t` (HyperFrames / Remotion-style), so the same code renders
the same frames every time — no recording, no drift.

## The references

- Moshimo — https://www.youtube.com/@Moshimoff/shorts
- AI with CB — https://www.youtube.com/@aiwithcb/shorts

What could be measured here: full video downloads are blocked by YouTube (SABR + bot check;
yt-dlp gets metadata and captions only from this sandbox), so the direct measurement is from
auto-caption transcripts + titles + thumbnails of the most recent shorts, combined with the kit
kit's own measured rule book: `claude-stickman-shorts` ships `RULEBOOK.md`, measured from
**13,855 reference frames** of Ricks Clips (8 shorts, 150.7 M views) — the closest measured
companion to the Moshimo look (same stick-figure/paper-world family, big pale heads, heavy ink,
vertical, hard-in narration).

## Measured numbers

### Moshimo, "Why You Can't Mail a Child Anymore" (short `yl4IKvdicWA`)

| Metric | Value |
|---|---|
| Duration | 59.6 s |
| Spoken words | 223 |
| Pace | 224 wpm |
| Hook | "Her parents stuck fifty-three cents in stamps…" — the full first sentence is out in ~5.4 s |
| Ending | lands on a statement; no outro, no call to action |
| Titles of the last 12 shorts | all one-sentence historical absurdist hooks, 54–68 s each |

### The kit's measured rule book (RULEBOOK.md, from Ricks Clips)

| Metric | Rule |
|---|---|
| Format | 1080 × 1920, 30 fps, 60–65 s one story, hard end on the last line |
| Words / pace | 218–247 words, 201–230 wpm, pauses ≤ 0.30 s (we cut to 0.18) |
| Hook | one fast sentence, the "turn" in the first ~5 s, the "reason" marked in the script |
| Views | ~1.5 s each, camera always pushing in; 0–3 hard cuts, D7 dissolves and W16–W35 whip moves |
| Captions | one word at a time (single-word captions are the norm, ≤ 3), white Nunito 900, ~72–76 px, 13 px stroke, centred at 70.6 % height |
| Characters | flat stick-figure cards, big pale heads (~0.25 m radius, ~4 heads tall), heavy outlines, distance-driven walks |
| Palette | dark violet / navy / brown-black dominants, warm lamp accents, no grain |
| Sound | one voice, −14 LUFS, optional quiet music bed |

## The named tools

- `claude-stickman-shorts` — exists (several forks; this project uses [`devassistant-io/claude-stickman-shorts`](https://github.com/devassistant-io/claude-stickman-shorts), chosen because it renders on the same HyperFrames engine already proven here). It carries the rule book, the character library, the sets and the script→TTS→words→views→story pipeline.
- `edit-recreator` — **does not exist on GitHub** (searched; only false matches). Its described function (measure cuts/flash/speed-ramps and compare side by side with a fidelity score) is reimplemented here with the kit's `count.py` checks, `stills.sh` snapshots, `check.json`, and per-frame contact sheets reviewed against the plan.

## This project's pipeline (all local, deterministic)

1. `SCRIPT.md` — numbered lines, `<!-- turn -->` and `<!-- reason -->` marks; `python3 tools/count.py`
   enforces the rule book (words, wpm, hook, turn/reason placement) and writes `script.json`.
2. Voice — HyperFrames' local TTS (kokoro-onnx), `am_michael` at speed 1.25 → `tools/pace.py`
   trims pauses → transcribe (whisper) gives a start/end time for **every word**.
3. `build.py` — writes `words.js` (`RT.WORDS`, one caption per word, `at`/`end`), sets the film
   duration in `index.html` and `compositions/short.html`.
4. `PLAN.md` — one row per view (28 here), each timed to the spoken word it starts on;
   `tools/views.py` compiles it to `views.js` (`RT.PLAN`).
5. `story.js` — cameras (spot-relative push-ins) and per-view staging as pure functions of `t`;
   day/night through the set's moods (`moodAt`), mouths from the word times, faces on cues.
6. `sh tools/stills.sh <times> stills/rN` — snapshots at exposed times, `hyperframes check`
   (camera-inside-solid warnings, lint, runtime), contact sheets for side-by-side review.
   Iterate until `check` is `ok: true` and every still matches the plan.
7. `sh render.sh <name>.mp4` — full render, then loudnorm 2-pass to −14 LUFS;
   `check/qa.py out/<name>.mp4 --expect 62.87`.

## Where this recipe falls short (expectation management)

Moshimo's shorts are drawn by hand; the comic timing of each action is authored, not derived
from data. This clone reproduces the **visual and audio rules exactly** (format, pace, caption
style, palette, camera grammar, character construction) and stages the actions from a written
script. To clone individual actions too, describe them per-view in `PLAN.md` ("what we see")
and stage them in `story.js` — the same measure-then-code loop, one level down.
