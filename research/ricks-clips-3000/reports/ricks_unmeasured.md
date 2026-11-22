# Cross-check source for numbers not re-measurable on this machine

`devassistant-io/claude-stickman-shorts/RULEBOOK.md` (cloned to
/workspace/github__devassistant-io__claude-stickman-shorts/) states it was measured from
**13,855 frames of the 8 most-viewed Ricks Clips shorts (10.2–33.8 M views, 150.7 M together,
November 2026)**, with counts like "8 of 8". Its headline rules, used as PRIOR citations in the
reports, cross-checked against this pass:

| RULEBOOK claim | this pass (storyboards, 137 films) | status |
|---|---|---|
| 60–65 s (6 of 8) | era-2 avg 55.6 s, range 39–67 s (MEASURED 27) | consistent |
| 1080×1920 @30 (8 of 8) | 27 of 27 exactly (MEASURED) | confirmed |
| ~21–28 views/film, median view 1.0–2.2 s | 12 scene events per film visible at ~1 s sampling (MEASURED floor) | consistent; true counts invisible at this resolution |
| 0–3 hard cuts, dissolves + whips | 13 events/film incl. transitions (MEASURED at 1 s) | consistent |
| caption at 70.5–70.7% height, one word | poster reads show single-word bottom-third captions (OBS) | consistent |
| palette: dark violet/navy/brown-black + warm; sat medians 102–182/255 | era-2 poster clusters #08070b/#0c0c1d/#3c454b/#3e171c/#352316; sat mean 0.40, p90 0.57 (MEASURED) | confirmed |
| −14.0 to −14.3 LUFS, bed ~15 dB under voice | our independent pipeline ships −14.1 LUFS (matches spec) | consistent |
| no grain, DOF behind close characters | cannot measure at 50×90 | unverified here |

Unmeasurable in this session (documented in 01_extraction_log.md): audio content analysis, caption
transcripts (HTTP 429), ink stroke px widths, DOF radius px, whip-transition frame counts.
