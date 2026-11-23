#!/usr/bin/env python3
"""tools/views.py: PLAN.md's table of views -> views.js (RT.PLAN), so the plan is the ONE place where a view's time,
transition, set, subject and description are written. story.js adds only each view's camera (RT.CAMERAS, by number).

    python3 tools/views.py              reads PLAN.md next to the project, writes views.js (index.html loads it before story.js)
    python3 tools/views.py other.md

The table is the one under "## The views" (docs/plan-template.md):
    | # | In (s) | How | Set | Aim at (spot) | What we see | Words |
Each row becomes { n, t, how, set, aim, what }. "Aim at" is a spot of the set ("judge", "gallery.2"; backticks are fine).
Checks, each printed with its row: numbers in order, times rising, How is open / D<N> / W<N> / CUT, a set and a spot.
Run it again after every change to the plan's views, then take the stills.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "PLAN.md")
    if not os.path.exists(path):
        sys.exit(f"views.py: no {path} (copy docs/plan-template.md from the kit to PLAN.md and fill in its views)")
    text = open(path).read()
    m = re.search(r"^## The views.*$", text, re.M)
    if not m:
        sys.exit(f"views.py: {path} has no '## The views' heading")
    body = text[m.end():].split("\n## ")[0]
    rows, problems = [], []
    for line in body.splitlines():
        if not line.strip().startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 6 or not re.fullmatch(r"\d+", cells[0]):
            continue                                      # the header, the |---| line, notes
        n, t, how, st, aim, what = cells[:6]
        aim = re.sub(r"[`*]", "", aim).strip()
        aim = (re.match(r"[A-Za-z0-9_.]+", aim) or [""])[0]
        try:
            tv = float(t)
        except ValueError:
            problems.append(f"view {n}: the time '{t}' is not a number of seconds"); continue
        if not re.fullmatch(r"open|CUT|D\d+|W\d+", how):
            problems.append(f"view {n}: How '{how}' should be open, D7, W24 (any number of frames) or CUT")
        if not st or not aim:
            problems.append(f"view {n}: needs a set and a spot to aim at")
        rows.append({"n": int(n), "t": round(tv, 3), "how": how, "set": st, "aim": aim, "what": what})
    if not rows:
        sys.exit(f"views.py: no numbered rows in the table under '## The views' in {path}")
    for a, b in zip(rows, rows[1:]):
        if b["n"] != a["n"] + 1:
            problems.append(f"view {b['n']}: comes after view {a['n']} (number the views 1, 2, 3 ...)")
        if b["t"] <= a["t"]:
            problems.append(f"view {b['n']}: starts at {b['t']} s, not after view {a['n']} ({a['t']} s)")
    if rows[0]["how"] != "open":
        problems.append(f"view {rows[0]['n']}: the first view's How should be open")
    out = ["/* views.js: WRITTEN BY tools/views.py from " + os.path.basename(path) + ". Do not edit by hand: change the plan and run it again. */",
           "window.RT = window.RT || {};", "RT.PLAN = ["]
    out += ["  " + json.dumps(r, ensure_ascii=False) + "," for r in rows]
    out += ["];", ""]
    open(os.path.join(HERE, "views.js"), "w").write("\n".join(out))
    sets = sorted({r["set"] for r in rows})
    print(f"views.js: {len(rows)} views from {os.path.relpath(path, HERE)} ({rows[0]['t']:.2f} to {rows[-1]['t']:.2f} s; sets {', '.join(sets)})")
    for p in problems:
        print("FIX " + p)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
