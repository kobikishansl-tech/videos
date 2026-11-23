# "The City That Dance-Cursed Itself": the plan for the full short (2026-11-20)

62.87 s, 1080 x 1920, 30 frames a second, ~1,886 frames. Narration final: `voice/voice.wav`, a time for
every word in `voice/words.json` (228 words; 62.77 s of voice). Views are timed to the spoken words —
a view starts on a word's start time. The rules are the kit's `RULEBOOK.md`; sets and spots are defined in
`sets/road.js`, `sets/field.js`, `sets/hall.js`, `sets/church.js`.

## Sets used

| Set | What it does here |
|---|---|
| `road` | the city street; day (`road.setDay(1)`) for views 1-22, night for views 21's end through 28 — the market stage shows for views 16-20 (`road.setStage(1)`) |
| `field` | the failed harvest (line 14) and the collapse |
| `hall` | the council chamber: the ban fails, the doctors' verdict, the stamp |
| `church` | the exhaustion in the pews at the end of the mania |

Day/night: every `road` view up to view 22 (`43.92` CUT) is day; views 23-28 on the post-fade shots
(`60.20` on) are night. The church/hall/field sets carry their own moods.

## Cast

| Name | Who | Where |
|---|---|---|
| `dancer` | villager b (red dress, coif) — Frau Troffea, unnamed in the narration | road, home `dance` |
| `dancer2`, `dancer3`, `dancer4` | villagers a, c and a second a, the ones who join | road |
| `crowd1`, `crowd2` | villagers b and c as onlookers | road |
| `usher` | the ban, the rope | road `gate` |
| `judge` | head of the council | hall `seat` |
| `doctor` | the prosecutor (black gown, beard) as the physician | hall `accuser` |
| `clap1`, `clap2` | villagers at the table | hall |
| `farmer` | the famine face | field `farmer` |
| `drummer` | villager with a tabor, paid to play | road `stage` |
| `priest` | at the pulpit | church `pulpit` |
| `pew1`, `pew2` | villager b (a second instance: the dancer, exhausted) and c in the pews | church |

## The views

| # | In (s) | How | Set | Aim at (spot) | What we see | Words |
|---|---|---|---|---|---|---|
| 1 | 0.00 | open | road | dance | She walks into the light pool and takes her first dancing steps; a low close, her face just entering frame | She walked |
| 2 | 1.02 | W24 | road | dance | the beat in closer: legs and dress swing through the steps | summer |
| 3 | 2.45 | D7 | road | dance | her face: alarm and sweat, she stares at her own feet | dance |
| 4 | 3.72 | D7 | road | start | wide: she is alone in the empty street | six |
| 5 | 5.00 | D7 | road | stage | two villagers stop dead and stare | You see |
| 6 | 7.60 | W24 | road | stage | a hundred: another dancer joins in the square | hundred |
| 7 | 10.92 | D7 | field | rats.1 | one has dropped in the stubble; empty fields all round | Some |
| 8 | 12.41 | D7 | road | dance | kneeling, begging anybody to make it stop | dropped |
| 9 | 15.00 | W20 | road | start | nobody moves: the crowd frozen, faces helpless | (make it) stop |
| 10 | 16.66 | W24 | road | gate | the ban: the usher with a rope by the courthouse door | down |
| 11 | 17.91 | D7 | road | corners.1 | locked away: faces in a dark doorway | worst |
| 12 | 19.15 | D7 | hall | seat | the council: the judge at the high seat, the doctor standing | That |
| 13 | 21.84 | W16 | hall | accuser | the doctor's verdict, close and smug | beards |
| 14 | 24.41 | D7 | hall | table | the order stamped; two villagers applaud it | cure |
| 15 | 26.80 | W24 | road | start | the guild hall's doors open, warm light, the crowd flows in | guild |
| 16 | 28.40 | D7 | road | stage | the stages rise in the market square | Stages |
| 17 | 31.24 | W28 | road | stage | the drummer is paid to play: close on the tabor | paid |
| 18 | 31.54 | D7 | road | dance | the whole street dances round the stage | The goal |
| 19 | 35.62 | D7 | road | dance | the problem doubled: sweat drops, flung arms | Which |
| 20 | 38.15 | D7 | road | stage | September: the empty stage, nobody | By |
| 21 | 42.61 | W24 | road | corners.2 | the stages come down, planks carried off | came |
| 22 | 43.92 | CUT | road | start | high and wide over the city: the part everyone missed | And |
| 23 | 45.84 | D7 | field | farmer | the failed harvest: the farmer's one bare stalk | You see |
| 24 | 48.09 | D7 | field | vista | the hunger landscape, the villages far off | winter |
| 25 | 52.17 | W24 | field | farmer | starving, frightened: the face in close | starving |
| 26 | 55.00 | D7 | church | pews.1 | the dancer in a pew, hollow-eyed, exhausted | Nobody (danced) |
| 27 | 57.19 | D7 | church | pews.2 | wide: the pews full of slumped, emptied dancers | bodies |
| 28 | 60.20 | W24 | road | stage | night: the drum lies silent on the empty stage; push into the moonlight | music |

Transitions: 17 dissolves (D7), 10 fast moves (W16-W28), 1 hard cut (view 22), 1 opening.
