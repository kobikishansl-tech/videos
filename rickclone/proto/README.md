# WorldFrame prototype — "Milady of the Market" (15 s camera/integration test)

Phase 4 deliverable. Proves the Phase 3 architecture (Petrichor Engine look) end to end:
one original 2D character (Mila) walking, rummaging and posing inside a full 3D golden-hour
market — five camera stations, real shadows, DOF, grade, ambience + footsteps.

**The film:** `out/worldframe-proto.mp4` — 15.0 s, 1080×1920 @ 30 fps, loudness-finished to −14 LUFS.
**Still proof of each step:** `stills/min` (smoke test), `stills/camera_tests` (the A–E camera
stills + contact sheet), `stills/step3/check-cast-shadow.png` etc. (integration tests),
`sheets/mila_refsheet.png` (the 12-panel character sheet).

## 1. Character reference assets
- `sheets/mila_refsheet.png` — front / three-quarter / profile (R+L) / stand / walk / run / talk
  / 8 expressions (joy, laugh, gasp, worried, sly, focused, blink, gesture): one design, one draw
- `cast/mila.js` — the asset itself: a deterministic 2D canvas character drawn each frame from the
  same definition (identical hair/teal, mustard jacket, plum top, teal boots, ink contour). Views
  are parameter blends (`profile 0..1`, `faceDir ±1`), not separate drawings, so she cannot drift
  between scenes.

## 2. Character animation assets
- `cast/mila.js`: `RT.MILA.idle / walk(t,{bps}) / run / talk`, pose language (`bob, tilt, kick,
  step, armN, armF, profile, faceDir`), expression set `RT.MILA.EXPR`, prop-in-hand hook
  (`propN`) used for the golden bundle reveal at 12.6–15 s.

## 3. 3D environment project
- `sets/market.js` — golden-hour market square: plaza ground (procedural stone/dirt textures),
  two rows of jettied timber-framed houses (L/R + skyline row), two awninged stalls with canvas
  textures and produce, crate stacks, handcart, barrels, two lanterns (one lit), tree, banners,
  sky dome with drifting clouds, golden-hour→noon daylight rig. Everything procedural: the folder
  contains one original JS file and no copied assets.

## 4. Camera system
- `compositions/short.js` builds the A–E shot list from `engine/camera_lib.js` +
  `engine/cam.js` (`SF.cam`): ESTAB hold, medium walk cut-in, push-in dolly, low angle, sampled
  tracking move, whip-as-cut, settle ending. `focus` per key drives real DOF (`engine/lens.js`).

## 5. Lighting configuration
- `sets/market.js` light rig (all in-scene, found by `M.*`): hemisphere sky/ground bounce, warm
  low sun key (4096 shadow map, bias/normalBias tuned) from front-left, warm camera-side fill,
  warm rim from the north, small ambient, lantern point light. Colors/intensities lerp in
  `setDay()`. Post: thin glow haze, saturation/contrast/LUT-ish curve + vignette grade
  (`sets/market.js` `mood` + engine `grade.js`).

## 6. Complete source project
```
proto/
  index.html              timeline root: 15 s stage + soundtrack audio track
  compositions/short.js   build: set, character, staged poses, camera keys  (the film)
  compositions/refsheet.html  the character sheet page (rendered into sheets/)
  cast/mila.js            character definition + animation library
  sets/market.js          the 3D market + light rig + setDay
  engine/                 stage, cards, cam, camera_lib, lens (DOF), grade, glow, ink, paint,
                          props, outdoor (sky/clouds/tree/lamp/...) — the reusable engine modules
  assets/vendor/          gsap + vendored three.js r147 (the ONLY third-party code)
  music/                  ambience.wav / step.wav / crate.wav / sfx.wav / soundtrack.wav (procedural)
  out/worldframe-proto.mp4  the finished render
```

## 7. Reproduce
```sh
. /home/appuser/chrome-libs/chrome_env.sh      # or any env with a working Chrome LD path
sh render.sh worldframe-proto.mp4              # render 30 fps + loudnorm to -14 LUFS
HYPERFRAMES_SKIP_SKILLS=1 CI=1 npx --yes hyperframes@0.8.189 check --json   # expect all ok:true
HYPERFRAMES_SKIP_SKILLS=1 CI=1 npx --yes hyperframes@0.8.189 snapshot --describe false --no-end \
  --at 1.5,4.5,8.4,11.0,13.0,14.3 -o stills/camera_tests .                   # the A–E stills
# character sheet: swap compositions/short.html -> compositions/refsheet.html in index.html,
# snapshot --at 0.4 -o sheets .
```

## 8. The debug story (kept because it is the real cost of the bug)
The first full build crashed the WebGL renderer mid-render with `TypeError: Cannot read
properties of undefined (reading 'elements')` — but only when `SF.cam` was active AND the full
market was loaded; section removals each "fixed" it (a bisect red herring: removing anything
changed what the frustum saw). Final root cause, found with a standalone repro page
(vendored three.js r147 + our engine, headless Chrome + SwiftShader):
`O.lam(map, opts)` takes a **texture** first; two stall-produce calls passed a raw
`THREE.Color`, so `material.map = Color` (no `.matrix`) and three's `refreshMaterialUniforms`
crashed the first time the fruit entered the camera frustum — which only the moved camera did.
Fix: `O.lam(null, { color })` for solid colors. Full light rig (7 lights) kept.

## 9. Honest limits
- The ambience/steps/crate SFX are procedural ffmpeg synthesis, not recorded foley.
- The walk is a 2D pose-cycle on a 3D-pinned card (by design, the Phase 3 look): her feet touch
  the ground plane exactly, and the contact shadow is an engine-drawn ground ellipse, not a
  shadow-cast sprite.
- `duration 15 s / 450 frames`; the target reference format is 39–67 s — this is a camera+integration
  proof, not a film.
