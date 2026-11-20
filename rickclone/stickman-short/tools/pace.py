#!/usr/bin/env python3
"""tools/pace.py: make a narration fast and without air (RULEBOOK.md section 2), keeping the word times right.

    python3 tools/pace.py voice/raw.wav voice/transcript.json            -> voice/voice.wav + voice/words.json
    python3 tools/pace.py IN.wav WORDS.json --gap 0.18 --speed 1.08 --out-wav voice/voice.wav --out-words voice/words.json

1. Every pause longer than --max-gap (0.30 s) is cut down to --gap (0.18 s): the middle of the pause is removed, so
   breaths and word ends stay. Pauses are found two ways: gaps between the word times, and real silence in the sound
   (ffmpeg silencedetect at --floor dB, -38 by default), because a transcriber often stretches a word's end over the
   silence after it, so the word times alone miss pauses. The silence before the first word is cut to --lead (0.02 s): the voice starts
   on the first frame.
2. Then the whole narration is sped up by --speed with ffmpeg's atempo filter, which keeps the pitch. Never above 1.15
   (it starts to sound hurried and thin). Default: the speed that lands on --wpm (215) words a minute, capped at 1.15
   and never below 1.0.
3. The word times are moved and scaled the same way and written to --out-words, so there is no need to transcribe again.
   build.py reads that file.

Needs ffmpeg on the PATH (or FFMPEG set). Reads 16-bit PCM WAV (what `hyperframes tts` writes, and most recorders).
Prints words a minute and the longest pause, before and after.
"""
import argparse, json, os, shutil, subprocess, sys, tempfile, wave

FF = os.environ.get("FFMPEG") or shutil.which("ffmpeg") or "ffmpeg"


def stats(words):
    gaps = [b["start"] - a["end"] for a, b in zip(words, words[1:])]
    span = words[-1]["end"] - words[0]["start"]
    return len(words) / span * 60, max(gaps) if gaps else 0.0, words[-1]["end"]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("wav"); ap.add_argument("words")
    ap.add_argument("--max-gap", type=float, default=0.30); ap.add_argument("--gap", type=float, default=0.18)
    ap.add_argument("--lead", type=float, default=0.02); ap.add_argument("--speed", type=float)
    ap.add_argument("--wpm", type=float, default=215)
    ap.add_argument("--floor", type=float, default=-38.0, help="silence below this level (dB) counts as a pause")
    ap.add_argument("--out-wav"); ap.add_argument("--out-words")
    a = ap.parse_args()
    d = os.path.dirname(os.path.abspath(a.wav))
    out_wav = a.out_wav or os.path.join(d, "voice.wav")
    out_words = a.out_words or os.path.join(d, "words.json")
    if os.path.abspath(out_wav) == os.path.abspath(a.wav):
        sys.exit("pace.py: write to a new file (keep the raw take): --out-wav voice/voice.wav from voice/raw.wav")

    ws = json.load(open(a.words)); ws = ws.get("words", ws) if isinstance(ws, dict) else ws
    words = [{"text": w["text"], "start": float(w["start"]), "end": float(w["end"]), **({"line": w["line"]} if "line" in w else {})}
             for w in ws if str(w.get("text", "")).strip()]
    wpm0, gap0, len0 = stats(words)

    with wave.open(a.wav) as f:
        p = f.getparams(); sr = p.framerate; data = f.readframes(p.nframes)
    if p.sampwidth != 2:
        sys.exit("pace.py: needs 16-bit PCM WAV (convert: ffmpeg -i in.wav -c:a pcm_s16le out.wav)")
    bpf = p.sampwidth * p.nchannels

    # cuts: (from, to) in seconds of the input to remove
    cuts = []
    if words[0]["start"] > a.lead:
        cuts.append((0.0, words[0]["start"] - a.lead))
    pauses = [(x["end"], y["start"]) for x, y in zip(words, words[1:])]
    sd = subprocess.run([FF, "-v", "info", "-i", a.wav, "-af", f"silencedetect=noise={a.floor}dB:d={a.max_gap}", "-f", "null", "-"],
                        capture_output=True, text=True).stderr
    s0 = None
    for line in sd.splitlines():
        if "silence_start:" in line:
            s0 = float(line.split("silence_start:")[1].split()[0])
        elif "silence_end:" in line and s0 is not None:
            s1 = float(line.split("silence_end:")[1].split()[0])
            if s0 > words[0]["start"] and s1 < words[-1]["end"]:
                pauses.append((s0, s1))
            s0 = None
    pauses.sort(); merged = []
    for p0, p1 in pauses:                     # merge overlapping pauses
        if merged and p0 <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], p1))
        else:
            merged.append((p0, p1))
    for p0, p1 in merged:
        g = p1 - p0
        if g > a.max_gap:
            mid = (p0 + p1) / 2
            cuts.append((mid - (g - a.gap) / 2, mid + (g - a.gap) / 2))
    cuts.sort()

    def moved(t):  # time in the input -> time after the cuts
        r = t
        for c0, c1 in cuts:
            if t >= c1:
                r -= (c1 - c0)
            elif t > c0:
                r -= (t - c0)
        return r

    keep, pos = [], 0.0
    for c0, c1 in cuts:
        keep.append(data[int(pos * sr) * bpf:int(c0 * sr) * bpf]); pos = c1
    keep.append(data[int(pos * sr) * bpf:])
    tight = b"".join(keep)
    words2 = [dict(w, start=round(moved(w["start"]), 3), end=round(moved(w["end"]), 3)) for w in words]
    wpm1, _, _ = stats(words2)
    speed = a.speed or max(1.0, min(1.15, a.wpm / wpm1))
    if speed > 1.15:
        sys.exit("pace.py: --speed above 1.15 sounds hurried; shorten the script instead")

    with tempfile.TemporaryDirectory() as tmp:
        mid = os.path.join(tmp, "tight.wav")
        with wave.open(mid, "wb") as f:
            f.setparams(p); f.writeframes(tight)
        r = subprocess.run([FF, "-v", "error", "-y", "-i", mid, "-af", f"atempo={speed:.4f}", "-c:a", "pcm_s16le", out_wav],
                           capture_output=True, text=True)
        if r.returncode != 0:
            sys.exit("pace.py: ffmpeg failed: " + r.stderr.strip())
    words3 = [dict(w, start=round(w["start"] / speed, 3), end=round(w["end"] / speed, 3)) for w in words2]
    json.dump(words3, open(out_words, "w"), indent=1)
    wpm2, gap2, len2 = stats(words3)
    print(f"before: {len0:.2f} s, {wpm0:.0f} words a minute, longest pause {gap0:.2f} s")
    print(f"cut {len(cuts)} pauses, then speed x{speed:.3f} (pitch kept)")
    print(f"after:  {len2:.2f} s, {wpm2:.0f} words a minute, longest pause {gap2:.2f} s")
    print(f"wrote {out_wav} and {out_words}")


if __name__ == "__main__":
    main()
