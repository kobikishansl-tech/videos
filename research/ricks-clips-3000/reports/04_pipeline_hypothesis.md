# 04 — Most likely production workflow (Phase 4)

Method: every claim labeled. Sources — this-machine storyboard measurements (OBS/MEASURED),
the 13,855-frame RULEBOOK (PRIOR), visual reads (POSTER/FILMSTRIP reads), reasoning (INFER/HYP).

## The decisive evidence set

1. Characters are **flat drawn cards standing in materially-painted 3D worlds** (POSTER reads on
   3 representatives + PRIOR §5/6). Not hand-drawn-animated on twos: faces swap whole drawings in
   a frame (PRIOR §3: "faces change by swapping the drawing in one frame — no in-betweens").
2. The camera is almost never still and "travels" between views (PRIOR §3), yet hard cuts are
   0–3 per film (PRIOR + our 13-events-at-1s OBS across 27 films).
3. View cadence ~1–2.2 s median (PRIOR); 21–28 views/film (PRIOR).
4. Worlds are internally consistent within a film: same set reappears from new angles across
   distant timestamps (FILMSTRIP reads on VS1Z: castle/street continuity; Mz72: deck continuity).
5. Rendering quality: lambert-ish shading, soft shadows, DOF on close work, no grain (PRIOR §6/7
   + POSTER reads).
6. One narration voice, −14 LUFS, ≈ mono, bed ~15 dB under voice (PRIOR §7).

## Tool-by-tool judgement (Phase 4 list)

| element | evidence for | most likely technique | alternatives | our best implementation |
|---|---|---|---|---|
| 3D world | real 3D geometry w/ perspective + painted textures; consistent sets | real-time 3D engine (Blender Eevee, Unity, Unreal, or a web-GL pipeline like THREE.js) — card-based sets with texture atlases | scene-by-scene image-gen compositing (rejected: sets wouldn't stay consistent) | THREE.js (proven in our stack; card-based sets, painted canvas textures) |
| character cards | flat figures on camera-facing billboards; face-swap keyframing | 2D cards drawn once per pose/expression into texture atlases, billboard-rendered in 3D | image-gen per frame (drift risk), true 3D rigs (wrong look) | drawn programmatic canvas cards / SVG-style, expression swap per frame (already our pipeline) |
| animation | walks, gesticulation, prop moves; faces swap frames | procedural + keyframed hybrid in the engine timeline; no MoCap (unrealistic smoothness would differ) | AI video gen (rejected: consistency) | pure functions of t (deterministic) — our existing DANCE/wobble/face system |
| camera | whip + dissolve transitions, slow push-ins, low angles | engine timeline with eased key frames and motion blur | per-shot renders stitched (weaker continuity) | gsap timeline + whip/dissolve system (exists in our engine) |
| editing | 0–3 cuts, transitions do the moving | whole film is one continuous timeline in the engine; script beats → view plan | NLE assembly (rejected: no NLE artifacts like speed ramps/audio bridging observed... HYP) | same: single timeline render |
| lighting | two-tone warm/cool, glow, light shafts, DOF, no grain | per-scene light rigs, additive glow draws, post shader grade | LUT logging (no evidence of external grade) | our existing `O.sky`+lights+grade.js chain |
| captions | single word, hard in within a frame of spoken word | timed from TTS/word timestamps, drawn as texture card layer | animated per-letter (rejected: single-word hard swaps observed) | our `words.js` RT.WORDS layer (already measured at 70.6%) |
| sound | −14 LUFS, bed ducked, ≈ mono | TTS or VO + loudnorm; bed sidechained | | TTS (kokoro-onnx) + ffmpeg render.sh (already at −14.1 LUFS ok) |
| pipeline shape | 27 polished films in 43 days, consistent format | **template + param pipeline**: script template → serialized production sheet → code/render step → fixed-QA finish (implied by cadence + consistency; HYP leanness, confirmed consistency) | full custom animation per film (rejected: cadence impossible at that consistency) | our SCRIPT → build → views → story → render pipeline is the same shape |

## Verdict (TECHNICAL INFERENCE, confidence: high)

The channel's era-2 look is produced by a **code-driven 3D-card pipeline**: a persistent, reusable
world (one codebase of sets/props/characters per film family) with a parametric camera/transition
system, driven beat-by-beat from a scripted narration with measured word timestamps, finalized by a
fixed loudness/deliver pass. It shows no signature of diffusion-video (no temporal flicker), no
NLE rhythm (no audio bridging, no speed ramps), and strong per-film set consistency.

Element-by-element "how we reproduce it": the rightmost column above — and it is exactly the stack
already proven in `../../rickclone/` (HyperFrames/THREE.js film + TTS + words + QA). The upgrade
this channel shows OUR system needs is breadth of **set/prop libraries** (10 environment families)
and **pre-lit mood presets** (day/storm/interior-lamp/night), not a new engine.
