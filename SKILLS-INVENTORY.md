# Skills & Tooling Inventory — Faceless YouTube Shorts Studio
_Installed 2026-11-20 · 38 repos cloned shallow (depth 1) into /workspace/github__owner__repo_

## A. The core production engine
| Repo | What it is | Use for |
|---|---|---|
| heygen-com/hyperframes | **The render engine we already use** (HyperFrames 0.8.189): HTML/three.js compositions → MP4, snapshot/check/QA gates, engine/lib SF.* | Everything. Source of engine/, RULEBOOK/RECIPE pipeline |
| kaomei/stickman-video-director | 7.2k★ stickman video director skill (highest-rated stickman entry on the graded list) | Best-practice stick-figure direction; merge beats/shot grammar into our RECIPE |

## B. Full short-film SKILL.md pipelines (CLAUDE-FOLLOWABLE)
| Repo | What it is | Use for |
|---|---|---|
| mromidev/claude-animated-shorts | 2.4k★. Cartoon-3D-short skill: 55–70s vertical shorts, 2D bean-head characters in painted 3D world, three.js in Remotion. Ships STYLE_BIBLE, 7 measured reports, 38 ref frames, full proven short source (bridge) | The strongest reference recipe for our 2.5D horror/mystery style. Study STYLE_BIBLE + reports vs our film |
| kaomei/stickman-video-director | (above) |  |
| SyedBahjat/claude-stickman-shorts | Alternate stickman-shorts kit (≠ devassistant-io one we built on) | Compare casting/poses/vocab for stick figures |
| deenukhan/stick-figure-shorts | Stick-figure shorts kit (41★) | Extra stickman vocabulary |
| hassancs91/claude-faceless-shorts-creator | Faceless Shorts factory: pure-TSX Remotion visuals, ElevenLabs voice w/ word-exact captions, library-first sound design, 12 example shorts, five .claude/skills | Sound-design library + caption approach; six-beat grammar for 40s shorts |
| Alisa0808/vox-director | Paper-collage Vox-style explainer skill (host mode too) | Vox explainer format experiments |
| Anil-matcha/vox-ai-motion-graphics-generator | 363★ vox motion-graphics generator | Vox format |
| haiderfarooq3/paper-reel | 148★ cut-paper explainer reels skill | Alternative explainer style |
| Vincentwei1021/video-shotcraft | Shot-craft skill | Shot design vocabulary |
| mutonby/openshorts | Shorts research/download studio; viral cloning | Research competitor shorts |
| beatra-ai/viral-video-remake-skill | One-click replicate viral shorts → Viral DNA report | Deconstructing Moshimo/AIwithCB hooks into reports |
| Chamanrajragu/purffle-shorts | Free faceless shorts generator (Python, TTS, captions, auto-upload) | Pipeline reference |
| social-media-skills/remotion-shorts-skill | Remotion 9:16 shorts skill | Remotion-format shorts |
| dovudhusan/viral-hook-reels-skill | Hook engineering for reels | Hook writing |

## C. Animation-style skill packs
| Repo | What it is | Use for |
|---|---|---|
| artemnovitckii/claude-animation-skills | 979★. Eleven reel styles: low-poly, voxel, 3D cartoon, Kurzgesagt space, line art, **stick figure**, 3D map route, exploded view, graphs. skills/stick-figure engine + zach-d-films three.js engine, shared kit (anim.py, words.py) | Style library; zach-d-films engine for "curiosity-loop 3D short" pattern |
| JDhruv14/line-art-animation | Line-art animation skill + TS library | Ink/line look upgrades |
| mattypark/Motion-graphics-skill | Motion graphics skill | Motion design rules |
| iart-ai/motion-skills | iArt motion skills family | Motion graphics |

## D. Short-form grammar & retention skills
| Repo | What it is | Use for |
|---|---|---|
| iart-ai/tiktok-video-skills | Hook→retention→loop grammar, karaoke word-timed captions, countdown timers, safe-area | Captions + retention rules for Shorts |
| bangtutorial/bang-motion | v1.19: shot sizes — "camera moves to the element so videos don't feel static" | Fixing static-camera critique points |
| nolangz/pixel2motion | Pixel-art → motion | Niche style |

## E. Frameworks / toolkits (code, not skills)
| Repo | What it is | Use for |
|---|---|---|
| remotion-dev/remotion | The React video framework (899M src) | Programmatic React rendering, transcribe-cli |
| digitalsamba/claude-code-video-toolkit | 2.7k★ full video toolkit (fitted-face/hands/painted-world) | Toolkit reference |
| midrender/revideo | Revideo: code-driven video framework | Alternative renderer |
| Zulko/moviepy | MoviePy 2.x video editing lib | FFmpeg-level python editing |
| mifi/editly | Declarative FFmpeg video editor | Fast assembly/DIY cuts |
| ManimCommunity/manim | Math animation engine | Explainer videos |
| nexu-io/openmotion | 13.7k★ motion studio (MCP, parser, per-shot) | Studio reference |
| latent-spaces/brag | Video/audio gen agents (v0.6) | Gen-video agents |
| JuneYaooo/rea-video | Rea-video toolkit | Rendering experiments |
| rediumvex/ai-video-generator-claude | AI video generator workflow | Reference |

## F. Meta-lists (indexes — mine these for more)
| Repo | What it is |
|---|---|
| zhuyansen/awesome-claude-video-skills | **532 graded skills** w/ stars, kind, security_grade (data/skills.json — already mined) |
| ad-si/awesome-video-production | General video-production index |
| AIPMAndy/Andy-Video-Skill | Curated 13-skill catalog (programmatic animation, screencast-to-viral, paper collage) |
| appariciojunior/video-editor-skills | DaVinci Resolve first-pass editor skills |
| haidrrrry/claude-remotion-skill | Remotion pro motion-graphics skill |
| kevinbadi/open-edits | Talking-head → animated short harness (word-locked graphics, hyper-edit) |

## Notes / how we use this
- Engine: `npx --yes hyperframes@0.8.189`, env `. /home/appuser/hf-libs/env.sh` (ffmpeg + LD_LIBRARY_PATH). Our film projects live in kobikishansl-tech/videos (branch `vibe/rickclone-short-8a1fdf`).
- Pipeline to follow for any new short: SCRIPT → count → script.json → build.py words.js → PLAN/RECIPE → views.py → story.js (pure functions of t) → stills + check gate → render.sh (BED) → qa.py → push → PR link.
- Perf constraints: 4GB cgroup, software WebGL; crowd cards ≤ ~320px canvases, ≤9 pool redraws at 4–8fps, else check deadline fails.
- Next upgrade candidates from this inventory: mromidev STYLE_BIBLE + measured reports (style parity), hassancs91 sound library (SFX), iart-ai captions (word-timed), kaomei beats grammar.
