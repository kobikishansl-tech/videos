#!/usr/bin/env python3
"""tools/count.py: check a script against the rule book (RULEBOOK.md section 2), before and after the narration.

    python3 tools/count.py                      reads SCRIPT.md next to the project (the numbered lines under "## The lines")
    python3 tools/count.py path/to/SCRIPT.md
    python3 tools/count.py --words voice/transcript.json     also checks the real narration: times instead of estimates

SCRIPT.md: a heading "## The lines", then one numbered line per sentence group, e.g.
    1. He stood up in court to defend his clients, and every one of them was a rat.
    2. You see, five hundred years ago in France, ...
Mark the line where the story turns with <!-- turn --> at its end, and the line where the real reason starts with
<!-- reason --> (without a mark, the reason is the last line that opens with "You see"). Marks are not counted as words.

Writes script.json next to the project (the lines and their word counts; build.py uses it to number the words by line).

Checks (each prints ok or FIX):
  words              218 to 247 for a 60 to 65 s short
  first sentence     over before 5.5 s (estimated at 3.6 words a second, or the real end time with --words)
  hinge              "You see," appears
  turn               the marked turn starts at 55 to 71 % of the words (of the time, with --words)
  reason             the reason starts at 62 to 82 %
  ending             the last line ends on a statement (a full stop, not a question mark)
With --words also: length 60 to 65 s, 201 to 230 words a minute, no pause over 0.30 s.
"""
import argparse, json, os, re, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORD = r"[A-Za-z0-9']+"


def read_lines(path):
    s = open(path).read()
    if "## The lines" not in s:
        sys.exit(f"count.py: {path} has no '## The lines' heading")
    body = s.split("## The lines")[1].split("\n## ")[0]
    out = []
    for m in re.finditer(r"^(\d+)\. (.+)$", body, re.M):
        raw = m.group(2).strip()
        marks = set(re.findall(r"<!--\s*(turn|reason)\s*-->", raw))
        text = re.sub(r"<!--.*?-->", "", raw).strip()
        out.append({"n": int(m.group(1)), "text": text, "words": len(re.findall(WORD, text)), "marks": marks})
    if not out:
        sys.exit("count.py: no numbered lines under '## The lines'")
    return out


def verdict(ok):
    return "ok " if ok else "FIX"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("script", nargs="?", default=os.path.join(HERE, "SCRIPT.md"))
    ap.add_argument("--words", help="word times: voice/transcript.json or voice/words.json")
    ap.add_argument("--rate", type=float, default=3.6, help="words a second for the estimates (default 3.6)")
    a = ap.parse_args()
    lines = read_lines(a.script)
    tot = sum(l["words"] for l in lines)
    starts, cum = [], 0
    for l in lines:
        starts.append(cum); cum += l["words"]
    print(f"{len(lines)} lines, {tot} words; at 3.4 / 3.6 / 3.8 words a second: {tot/3.4:.1f} / {tot/3.6:.1f} / {tot/3.8:.1f} s")
    for l, s in zip(lines, starts):
        tag = (" [" + ",".join(sorted(l["marks"])) + "]") if l["marks"] else ""
        print(f"{l['n']:>2}  words {s+1:>3}-{s+l['words']:<3}  starts at {100*s/tot:4.1f}%{tag}  {l['text'][:70]}")

    times = None
    if a.words:
        ws = json.load(open(a.words))
        ws = ws.get("words", ws) if isinstance(ws, dict) else ws
        times = [(float(w["start"]), float(w["end"])) for w in ws if str(w.get("text", "")).strip()]
        if len(times) != tot:
            print(f"note: the word file has {len(times)} words, the script {tot}; positions below use the word file's share")
    full = " ".join(l["text"] for l in lines)
    first = re.split(r"(?<=[.!?])\s", full, maxsplit=1)[0]
    first_n = len(re.findall(WORD, first))

    def share(word_index):
        if times:
            k = min(len(times) - 1, round(word_index * len(times) / tot))
            return times[k][0] / times[-1][1]
        return word_index / tot

    turn = next((i for i, l in enumerate(lines) if "turn" in l["marks"]), None)
    reason = next((i for i, l in enumerate(lines) if "reason" in l["marks"]), None)
    if reason is None:
        ys = [i for i, l in enumerate(lines) if l["text"].lower().startswith("you see")]
        reason = ys[-1] if ys else None

    print("\nchecks")
    print(f"  {verdict(218 <= tot <= 247)} words              {tot} (218 to 247)")
    if times:
        fe = times[min(first_n, len(times)) - 1][1]
        print(f"  {verdict(fe < 5.5)} first sentence     {first_n} words, over at {fe:.2f} s (before 5.5 s)")
    else:
        fe = first_n / a.rate
        print(f"  {verdict(fe < 5.5)} first sentence     {first_n} words, about {fe:.1f} s at {a.rate} words a second (before 5.5 s)")
    print(f"  {verdict('you see,' in full.lower())} hinge              \"You see,\" {'found' if 'you see,' in full.lower() else 'missing'}")
    if turn is None:
        print("  FIX turn               no line marked <!-- turn -->")
    else:
        k = share(starts[turn]); print(f"  {verdict(0.55 <= k <= 0.71)} turn               line {lines[turn]['n']} at {k*100:.0f} % (55 to 71 %)")
    if reason is None:
        print("  FIX reason             no line marked <!-- reason --> and no line opening with \"You see\"")
    else:
        k = share(starts[reason]); print(f"  {verdict(0.62 <= k <= 0.82)} reason             line {lines[reason]['n']} at {k*100:.0f} % (62 to 82 %)")
    end_ok = lines[-1]["text"].rstrip().endswith((".", "!")) and not lines[-1]["text"].rstrip().endswith("?")
    print(f"  {verdict(end_ok)} ending             {'a statement' if end_ok else 'not a statement: end on the twist, the payoff or the fact'}")
    if times:
        length = times[-1][1]
        wpm = len(times) / (times[-1][1] - times[0][0]) * 60
        gaps = [b[0] - x[1] for x, b in zip(times, times[1:])]
        g = max(gaps) if gaps else 0
        print(f"  {verdict(60 <= length <= 65)} length             {length:.2f} s (60 to 65)")
        print(f"  {verdict(201 <= wpm <= 230)} pace               {wpm:.0f} words a minute (201 to 230; tools/pace.py speeds up, at most 1.15)")
        print(f"  {verdict(g <= 0.30)} pauses             longest {g:.2f} s (at most 0.30; tools/pace.py closes them)")

    json.dump([{"n": l["n"], "text": l["text"], "words": l["words"]} for l in lines],
              open(os.path.join(os.path.dirname(os.path.abspath(a.script)), "script.json"), "w"), indent=1)
    print(f"\nwrote {os.path.join(os.path.dirname(os.path.abspath(a.script)), 'script.json')}")


if __name__ == "__main__":
    main()
