# 01 — Extraction log (full honesty)

## What succeeded

| dataset | count | where | method (reproducible) |
|---|---|---|---|
| full video list + views | 155 | `../data/channel_index.tsv` | `yt-dlp --flat-playlist -J https://www.youtube.com/@RicksClips3000/shorts` |
| per-video metadata (duration, upload date, res, fps) | 138 of 155 | `../data/meta_<id>.json` | `yt-dlp -J --skip-download` |
| poster frames | 155/155 | `../thumbs/<id>.jpg` (1280×720 maxres or fallback) | `python3 ../data/posters.py` |
| **storyboard timeline sheets** (≈1 fps, 50×90 px cells, full video) | 137 videos / 11,380 cells | `../frames/<id>/t*.jpg` + `../data/frames.db` | `python3 ../data/storyboards.py data/meta_*.json` |
| transcript auto-captions | **0 of 155 — FAILED** | — | HTTP 429 Too Many Requests on Google's timedtext endpoint, even at 60 s spacing, with TLS impersonation (`--impersonate chrome`) |

## What failed, and evidence

- **Direct video download (yt-dlp):** FAILED for all 6 selected videos.
  - With no JS runtime: n-challenge unsolved → 403.
  - `--js-runtimes node` + `--remote-components ejs:github`: challenge solved, format list resolves
    (dash 1080p `137+140` exists, verified via `-F`), but every googlevideo/manifest request returns
    **HTTP 403 Forbidden**.
  - Client overrides tried: `tv_embedded`, `android`, `ios`, `web_safari` — android/ios report
    **SABR-only streaming** enabled (yt-dlp issue #12482); ios/web_safari: "Sign in to confirm you're not a bot".
  - `--impersonate chrome` (TLS fingerprint): same 403 → the block is IP-reputation based, not TLS-based.
- **Public YouTube proxies:** Invidious (inv.nadeko.net, invidious.nerdvpn.de, yewtu.be) HTTP 403;
  Piped (kavin.rocks 502, adminforge.de 403, private.coffee 500). All dead from this sandbox IP.
- **Storyboards L3/L1/L0:** 403 — only the L2 storyboard level is served with the L2 signature.
- **aD73kaL_PtY (newest explainer):** no storyboard published yet by YouTube at time of extraction.

## Consequence for the analysis chain (do not hide)

- Frame-accurate shot analysis (fps-true cut counts, whip-transition measurement, ink stroke widths,
  character proportions in px, DOF radius in px) could NOT be re-measured on this machine.
- What CAN be measured here (and was): full-film timeline behavior at ~1 fps × 137 videos —
  shot pacing floor, brightness/color journey, scene-change rhythm, palette, subject placement.
- For numbers below storyboard resolution I reuse the closest measured source available:
  `devassistant-io/claude-stickman-shorts/RULEBOOK.md`, which documents its own measurement of
  **13,855 frames of 8 Ricks Clips shorts (150.7 M combined views)** — cited explicitly
  wherever used, as CONFIRMED-BY-PRIOR-MEASUREMENT, not re-measured here.

Reproduction: scripts in `../data/` (`storyboards.py`, `measure.py`, `posters.py`, `bulkmeta.sh`)
run in order; DB schema in `storyboards.py` docstring.
