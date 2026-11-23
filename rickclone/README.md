# rickclone — Shorts generator (Ricks Clips style)

Style-matched vertical Short produced from analysis of the last 20 uploads of
[youtube.com/@RicksClips3000](https://www.youtube.com/@RicksClips3000):
single concrete story, hook → build → twist → payoff, AI 2.5D shots,
Ken Burns motion, bold captions with punch-words, ~36s.

## Contents
- `napoleon_rabbits_short.mp4` — finished 720x1280/24fps short (no audio: record VO over `napoleon_script.md`)
- `napoleon_script.md` — timed voiceover script + YouTube title/description/hashtags
- `shots/` — the 8 AI Generated story images
- `render.py` — reproducible renderer (OpenCV): Ken Burns pans/zooms, animated captions

## Rebuild
```
pip install opencv-python pillow numpy
cd rickclone && python render.py
```
