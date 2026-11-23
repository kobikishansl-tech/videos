# 00 — Channel database: Ricks Clips 3000

Source: https://www.youtube.com/@RicksClips3000 (display name "Ricks Clips")
Channel description: "Hey I'm Rick! Just a regular guy who loves doing voiceovers."
Data pulled: 2026-11-22, via yt-dlp flat-playlist of the Shorts tab.

## Headline numbers (MEASURED)

| Item | Value |
|---|---|
| Subscribers | 206,000 |
| Shorts published | 155 (full list in `../data/channel_index.tsv`) |
| Published span | 2025-09 → 2026-11-22 |
| Total views (sum) | ~365 M across two formats |
| Current format (era 2): narrated animated explainer shorts | 27 videos, 2026-10-11 → 2026-11-22 (43 days, ~4.4/week) |
| Era 2 avg duration | 55.6 s; format 1080×1920 @30 fps (27 of 27) |
| Era 2 views | median 7.2 M, mean 8.2 M, total ≈ 221 M in ~7 weeks |
| Old format (era 1): comic-dub shorts | 111 videos, avg 14.7 s, median 484 k views, total ≈ 143 M |
| uploads by month | 2025-09: 1 · 2026-01: 1 · 2026-02: 4 · 2026-04: 34 · 2026-05: 3 · 2026-06: 44 · 2026-07: 23 · (gap Aug–Sep) · 2026-10: 20 · 2026-11: 7 |

**Key structural finding (CONFIRMED OBSERVATION):** the channel is two channels in sequence.
Era 1 (Sep 2025 – Jul 2026) is voiceover-on-someone-else's-webcomic shorts: 4K/60 capture,
8–100 s, near-zero camera language, ~485 k median views. After a 2-month gap the channel relaunched
(Era 2, Oct 2026) with an entirely original production format — narrated act-structured animated
explainers — and immediately 10–15×'d its median views. Every Era-2 explainer is the same machine:
55–67 s, one narrator voice, 1080×1920@30.

## Top 15 by views (MEASURED)

| views | id | title | date | dur |
|---|---|---|---|---|
| 35.4 M | VS1Z_Q-Klt8 | The Ancient Jar That Warned an Empire | 2026-10-19 | 65 s |
| 31.1 M | 7xS87iActkU | Why Perfect Railroads Don't Work | 2026-11-01 | 65 s |
| 19.0 M | 0m6G8pDtzNs | The Job Nobody Wants in Japan | 2026-10-22 | 61 s |
| 16.9 M | Mz72MuPgnGY | Why Sailors Carried Storm Oil | 2026-10-30 | 65 s |
| 16.6 M | PL-Yro2meY4 | Your Brain's Secret Idea Zone | 2026-10-11 | 39 s |
| 16.2 M | eQR3pgMiUF0 | The Window That Breaks Japan's Gambling Law | 2026-10-15 | 45 s |
| 14.1 M | GM9UKnZ6JFw | What the Grave Bell Really Meant | 2026-10-24 | 60 s |
| 13.3 M | QlDPMzGmYac | This Shape Saved Roller Coasters | 2026-11-06 | 63 s |
| 11.8 M | HxqtHI62otM | The Pink Prison Cell Experiment | 2026-11-04 | 65 s |
| 11.4 M | aD73kaL_PtY | The Instinct That Makes You Crash | 2026-11-15 | 59 s |
| 10.6 M | VKsamN3Fk4U | Why Cashiers Keep Winning The Lottery | 2026-10-23 | 58 s |
| 10.5 M | nzbkkEZFM8g | The Burglar Who Only Moved Furniture | 2026-10-21 | 58 s |
| 10.0 M | lnYLIWP2l-I | Levels of Pirate Cannonballs | 2026-10-19 | 64 s |
| 10.0 M | RVnC1DSfK30 | (era-1 comic dub) | 2026-04-16 | 11 s |
| 10.0 M | LC8hYwUZ-kU | Why the Second Draw Always Wins | 2026-10-27 | 56 s |

## Format taxonomy

**Era 2 (the target format) — "act explainer".** Title grammar: paradox one-liner
("Why X did Y", "The X that Zed", "How X Worked"). Scenes: one historical/scientific anecdote,
played by recurring flat-character casts inside painted 3D worlds. No presenter, no logo, no
title card. End on a statement.

Environment families seen (poster contact sheet, `../sheets/channel_posters_contact_sheet.jpg`,
155 posters): medieval/European-village, maritime, modern Japan, factory/mine, laboratory,
road/vehicle, nature/hazard. Palette family: deep neutral-black grounds + one warm accent
(fire/lamp/gold) + saturated mid-tones; posters heavy on slate (#3c454b), oxblood (#3e171c),
brown-gold (#352316) per k-means (MEASURED, `../data/palette.csv`).

## Representative sample selection (5 + 1)

Chosen to span environments, era-2 formats and an era-1 control:

| id | why |
|---|---|
| VS1Z_Q-Klt8 | biggest hit (35 M); ancient-world set, crowd + interior scenes; 65 s |
| QlDPMzGmYac | modern engineering (coaster); outdoor day; 63 s |
| TRUkQ1wbV2E | interior/tunnel/underground; lantern-lit; 61 s |
| Mz72MuPgnGY | maritime storm scenes; weather/physics; 65 s |
| aD73kaL_PtY | modern road/APV; newest upload — no storyboard exists yet, only poster (gap documented) |
| RVnC1DSfK30 | era-1 control: 11 s comic-dub for the before/after comparison |
