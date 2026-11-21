#!/usr/bin/env python3
"""build.py: the script's words + the narration's word times -> words.js (the words on screen), to the rule book's section 4.

    python3 build.py                       reads voice/words.json, or else voice/transcript.json
    python3 build.py --words other.json    any file of [{ "text", "start", "end" }, ...]
    python3 build.py --duration 62.27      the film's length (default: the length of voice/voice.wav, else the last word + 0.4 s)

The words on screen come from the SCRIPT (script.json, written by tools/count.py from SCRIPT.md: its spelling, its
punctuation, its numbers as written); only the TIMES come from the word file. The two are matched word by word, so a
transcriber that writes "30" for "thirty", "St" for "Saint" or "400" for "four hundred" changes nothing on screen.
Every place where they differ is printed side by side with its time: if one is a real misreading by the voice, change
the script (or voice it again); otherwise there is nothing to fix. Without a script.json the word file's own words are used.

Accepted word files (lists of words with times in seconds):
  - what `npx hyperframes transcribe voice/voice.wav --dir voice` writes: voice/transcript.json, [{ text, start, end, id }]
  - what tools/pace.py writes: voice/words.json, the same with the times after the pauses were cut

It writes words.js next to this file and sets the film's length (data-duration) in index.html and
compositions/short.html, so the film is always as long as the narration.

Rules (RULEBOOK.md section 4):
  - one word at a time; a short word (a, the, of, to, in, and, he, his, it) may ride with the next one;
  - never more than three words at once;
  - each caption lands one frame before it is spoken (engine/words.js does the one-frame lead from `at`)
    and stays until the next caption lands; the last one stays to the end;
  - a short word rides only inside its own line of the script, only if it carries no punctuation itself
    and only if it is spoken fast (shorter than RIDE_MAX seconds).

words.js holds:
  RT.WORDS     [{ text, at, end, n }]  the captions (n = how many spoken words)
  RT.SPOKEN    [{ text, at, end, line }]  every spoken word with its own times (for mouths that flap on speech)
  RT.DURATION  the film's length in seconds
Prints: the share of single-word captions, the most words at once, the share of the running time with a caption
(the originals: 68 to 80 %, 3, 91 to 98 %), words a minute and the longest pause (201 to 230, at most 0.30 s).
"""
import argparse, difflib, json, os, re, sys, wave

HERE = os.path.dirname(os.path.abspath(__file__))
FPS = 30
LEAD = 1
SHORT = {"a", "the", "of", "to", "in", "and", "he", "his", "it"}
RIDE_MAX = 0.2
MAX_WORDS = 3
MIN_MATCH = 0.5          # below this share of matching words the word file is not a reading of this script


def bare(w):
    return w.lower().strip(".,!?;:'\"")


def norm(w):
    """A word as the matcher compares it: lower case, letters, digits and inner apostrophes only."""
    w = w.lower().replace("’", "'").replace("‘", "'")
    return re.sub(r"[^a-z0-9']", "", w).strip("'")


def script_words():
    """The script's words in order, [{ text, line }], from script.json; None when there is no script.json."""
    sj = os.path.join(HERE, "script.json")
    if not os.path.exists(sj):
        return None
    out = []
    for l in json.load(open(sj)):
        for chunk in str(l["text"]).split():
            if norm(chunk):
                out.append({"text": chunk, "line": l["n"]})
            elif out and out[-1]["line"] == l["n"]:
                out[-1]["text"] += chunk          # a dash or a mark standing alone rides on the word before it
    return out or None


def match(script, heard):
    """Give each script word a time from the heard words (the word file), matched word by word.
    Returns (words [{ text, start, end, line }], differences [(time, line, script text, heard text)], share matched)."""
    a = [norm(w["text"]) for w in script]
    b = [norm(w["text"]) for w in heard]
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    times = [None] * len(script)
    diffs, same, carry = [], 0, None

    def spread(i1, i2, t0, t1):              # share [t0, t1] among script words i1..i2-1 by their length
        wts = [max(1, len(a[i])) for i in range(i1, i2)]
        tot, t = float(sum(wts)), t0
        for k, i in enumerate(range(i1, i2)):
            d = (t1 - t0) * wts[k] / tot
            times[i] = [t, t + d]; t += d

    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                times[i1 + k] = [heard[j1 + k]["start"], heard[j1 + k]["end"]]
            same += i2 - i1
        elif tag == "replace":
            if i2 - i1 == j2 - j1:
                for k in range(i2 - i1):
                    times[i1 + k] = [heard[j1 + k]["start"], heard[j1 + k]["end"]]
            else:
                spread(i1, i2, heard[j1]["start"], heard[j2 - 1]["end"])
        elif tag == "delete":                 # script words the word file does not have: fit them into the gap
            t0 = heard[j1 - 1]["end"] if j1 > 0 else max(0.0, heard[0]["start"] - 0.3 * (i2 - i1))
            t1 = heard[j1]["start"] if j1 < len(heard) else heard[-1]["end"] + 0.3 * (i2 - i1)
            if t1 - t0 < 0.06 * (i2 - i1) and i1 > 0 and times[i1 - 1]:
                s, e = times[i1 - 1]; mid = (s + e) / 2; times[i1 - 1] = [s, mid]; t0, t1 = mid, max(t1, e)
            spread(i1, i2, t0, max(t1, t0 + 0.06 * (i2 - i1)))
        elif tag == "insert":                 # words heard that the script does not have: their time joins a neighbour
            if i1 > 0 and times[i1 - 1]:
                times[i1 - 1][1] = heard[j2 - 1]["end"]
            else:
                carry = heard[j1]["start"]
        if tag != "equal":
            t = heard[j1]["start"] if j1 < len(heard) else heard[-1]["end"]
            line = script[i1]["line"] if i1 < len(script) else script[-1]["line"]
            diffs.append((t, line, " ".join(w["text"] for w in script[i1:i2]) or "(nothing)",
                          " ".join(w["text"] for w in heard[j1:j2]) or "(nothing)"))
        if carry is not None and tag != "insert" and i1 < len(times) and times[i1]:
            times[i1][0] = min(times[i1][0], carry); carry = None
    words, last = [], 0.0
    for w, (s, e) in zip(script, times):
        s = max(s, last); e = max(e, s + 0.01); last = s
        words.append({"text": w["text"], "start": round(s, 3), "end": round(e, 3), "line": w["line"]})
    return words, diffs, same / float(max(len(a), len(b)))


def print_diffs(diffs, path):
    print(f"the script and {path} differ in {len(diffs)} place{'s' if len(diffs) != 1 else ''}; on screen: the script's words, "
          "timed by the word file (fix the script only where the voice really said something else):")
    print(f"  {'time':>8}  {'line':>4}  {'script':<28}  word file")
    for t, line, s, h in diffs:
        print(f"  {t:7.2f}s  {line:>4}  {s:<28}  {h}")


def rides(w):
    t = w["text"]
    return bare(t) in SHORT and t.rstrip(".,!?;:") == t


def load_words(path):
    words = json.load(open(path))
    if isinstance(words, dict):            # tolerate { "words": [...] }
        words = words.get("words") or []
    out = []
    for w in words:
        t = str(w.get("text", "")).strip()
        if not t:
            continue
        s, e = float(w["start"]), float(w["end"])
        if not norm(t):                    # a mark the transcriber wrote as a word: its time joins the word before
            if out:
                out[-1]["end"] = max(out[-1]["end"], e)
            continue
        out.append({"text": t, "start": s, "end": e, "line": w.get("line")})
    if not out:
        sys.exit(f"build.py: no words in {path}")
    return out


def script_and_times(heard, path):
    """The words to show: the script's, timed by the word file. Returns (words, how)."""
    script = script_words()
    rel = os.path.relpath(path, HERE)
    if not script:
        for w in heard:
            w["line"] = w["line"] or 0
        return heard, f"none (no script.json: run python3 tools/count.py first); words on screen as written in {rel}"
    words, diffs, share = match(script, heard)
    if share < MIN_MATCH:
        print(f"build.py: only {share * 100:.0f} % of the words in {rel} match script.json: is script.json from the script "
              "you voiced? (python3 tools/count.py writes it). Using the word file's own words.")
        for w in heard:
            w["line"] = w["line"] or 0
        return heard, f"none (the word file does not match script.json); words on screen as written in {rel}"
    if diffs:
        print_diffs(diffs, rel)
    return words, (f"from script.json: {len(script)} script words, {len(heard)} in the word file, "
                   f"{len(diffs)} place{'s' if len(diffs) != 1 else ''} differ; words on screen from the script, times from {rel}")


def wav_seconds(path):
    try:
        with wave.open(path) as f:
            return f.getnframes() / float(f.getframerate())
    except Exception:  # noqa: BLE001
        return None


def group(words, duration):
    caps, i = [], 0
    while i < len(words):
        g = [words[i]]
        while len(g) < MAX_WORDS and i + len(g) < len(words) and rides(g[-1]):
            w, nxt = g[-1], words[i + len(g)]
            if nxt.get("line") != w.get("line") or (w["end"] - w["start"]) > RIDE_MAX:
                break
            g.append(nxt)
        caps.append({"text": " ".join(x["text"] for x in g), "at": g[0]["start"], "n": len(g)})
        i += len(g)
    for k, c in enumerate(caps):
        c["end"] = caps[k + 1]["at"] if k + 1 < len(caps) else duration
    return caps


def counts(caps, duration):
    single = sum(1 for c in caps if c["n"] == 1) / len(caps)
    most = max(c["n"] for c in caps)
    total = round(duration * FPS)
    on = 0
    for c in caps:
        f0 = max(0, round(c["at"] * FPS) - LEAD)
        f1 = min(total, max(0, round(c["end"] * FPS) - LEAD) if c["end"] < duration else total)
        on += max(0, f1 - f0)
    return single, most, on / total


def set_duration(path, d):
    if not os.path.exists(path):
        return False
    s = open(path).read()
    s2 = re.sub(r'data-duration="[0-9.]+"', f'data-duration="{d}"', s)
    if s2 != s:
        open(path, "w").write(s2)
    return True


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--words"); ap.add_argument("--duration", type=float)
    a = ap.parse_args()
    path = a.words
    if not path:
        for c in ("voice/words.json", "voice/transcript.json", "transcript.json"):
            if os.path.exists(os.path.join(HERE, c)):
                path = os.path.join(HERE, c); break
    if not path:
        sys.exit("build.py: no word times. Run: npx hyperframes@0.8.189 transcribe voice/voice.wav --dir voice")
    words, how = script_and_times(load_words(path), path)
    dur = a.duration or wav_seconds(os.path.join(HERE, "voice", "voice.wav")) or (words[-1]["end"] + 0.4)
    dur = round(max(dur, words[-1]["end"] + 0.1), 2)
    caps = group(words, dur)
    single, most, cover = counts(caps, dur)
    r3 = lambda v: round(v, 3)
    src = ("script.json (the words) and " if os.path.exists(os.path.join(HERE, "script.json")) else "") + os.path.relpath(path, HERE)
    out = ["/* words.js: WRITTEN BY build.py from " + src + ". Do not edit by hand. */",
           "window.RT = window.RT || {};",
           f"RT.DURATION = {dur};",
           "RT.WORDS = ["]
    out += [f'  {{ text: {json.dumps(c["text"])}, at: {r3(c["at"])}, end: {r3(c["end"])}, n: {c["n"]} }},' for c in caps]
    out += ["];", "RT.SPOKEN = ["]
    out += [f'  {{ text: {json.dumps(w["text"])}, at: {r3(w["start"])}, end: {r3(w["end"])}, line: {w.get("line") or 0} }},' for w in words]
    out += ["];", ""]
    open(os.path.join(HERE, "words.js"), "w").write("\n".join(out))
    for f in ("index.html", os.path.join("compositions", "short.html")):
        set_duration(os.path.join(HERE, f), dur)
    gaps = [b["start"] - w["end"] for w, b in zip(words, words[1:])]
    speech = words[-1]["end"] - words[0]["start"]
    print(f"read {os.path.relpath(path, HERE)}: {len(words)} spoken words, {len(caps)} captions; script lines {how}")
    print(f"film length          {dur:.2f} s  (set in index.html and compositions/short.html)")
    print(f"single-word captions {single * 100:.1f} %  (originals 68-80 %)")
    print(f"most words at once   {most}  (originals 3)")
    print(f"time with a caption  {cover * 100:.1f} %  (originals 91-98 %)")
    print(f"words a minute       {len(words) / speech * 60:.0f}  (originals 201-230)")
    print(f"longest pause        {max(gaps) if gaps else 0:.2f} s  (originals at most 0.30 s; close pauses with tools/pace.py)")
    multi = [c["text"] for c in caps if c["n"] > 1]
    if multi:
        print("multi-word captions: " + " | ".join(multi))


if __name__ == "__main__":
    sys.exit(main())
