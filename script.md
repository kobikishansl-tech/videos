# What If You Got 1% Stronger Every Day?

Animated short (1:22, 1280x720, 30fps) in the style of the YouTube channel Ifverse:
2nd-person "impossible rule" narration, dark low-key silhouette scenes lit by
practicals, warm/cool grade flips, glow accents, flash-cut transitions, twist
ending with a serial cliffhanger.

## Full narration script

| # | Beat | Line |
|---|------|------|
| 1 | Hook | Day one. You wake up, and nothing feels different. |
| 2 | The rule | Then you notice. Every day, you wake up exactly one percent stronger. |
| 3 | The fence | Not just muscle. Speed. Memory. Nerve. Everything. |
| 4 | The trap | One percent doesn't feel like anything. That's the trap. |
| 5 | Calibration | The average man can bench one hundred thirty five pounds. |
| 6 | Ladder | Day thirty, you're at one eighty. Day one hundred, three sixty. |
| 7 | Escalation | Day two hundred, you bend a steel rod, just to check if it's still steel. |
| 8 | Turn | And here's what nobody tells you. The math doesn't stop. |
| 9 | Payoff | Day three sixty five, you're thirty eight times stronger than the day you started. |
| 10 | Montage | You can outrun a car. You can hear a heartbeat across the room. |
| 11 | Twist setup | And then, on day three sixty six, you find the note on your door. |
| 12 | Twist | "You're not the only one." — Day 3,650. |
| 13 | Stinger | Ten years of one percent. What would that even look like? |
| 14 | CTA | Tell us in the comments. Part two is coming. |

## Files
- `what_if_you_got_1_percent_stronger_every_day.mp4` — final video (H.264 + AAC)
- `thumbnail.jpg` — 1280x720 thumbnail
- `render_video.py` — frame renderer (silhouette scenes, glows, camera, captions)
- `make_audio.py` — narration timeline + synthesized drone/pulse/whoosh/riser score
- `make_thumbnail.py` — thumbnail generator
- `script_lines.py` — narration lines (source for TTS)
- `tts/durs.json` — narration timing data

## Regenerate
```bash
pip install edge-tts mutagen pillow numpy
python3 render_video.py && python3 make_audio.py
ffmpeg -i build/video.mp4 -i build/audio.wav -c:v copy -c:a aac -shortest out.mp4
```
