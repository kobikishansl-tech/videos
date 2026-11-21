"""check/qa.py: read a finished film and report what must never reach a viewer.

    python3 check/qa.py out/short.mp4 [--json report.json] [--expect 62.27] [--selftest]

Needs Python 3 with numpy (python3 -m pip install numpy) and ffmpeg + ffprobe on the PATH
(or FFMPEG / FFPROBE set to their paths).

Reports the length, the frame count and frame rate, then:
  black frames      mean luma < 12 and 99th percentile < 32 (of 255)
  white frames      mean luma > 235 and 1st percentile > 200
  frozen stretches  runs of >= --freeze-min frames (15 = 0.5 s) where the picture changes by less than --freeze-thr
                    (mean absolute difference, 0..255, on a 270 x 480 grey copy). The plan says nothing is ever still.
  one-frame flashes a frame that differs a lot from both neighbours (> --flash-thr) while the neighbours match each other
                    (their difference < 0.35 of the smaller jump): a stray frame of another view, a black or white blink
  hard changes      frame-to-frame jumps above --cut-thr that are also 2.5x the jumps either side (a cut, not a fast
                    move or a dissolve), for information: a plan may have 0 to 3 planned cuts
Exit status 0 when no black, white, frozen or flash problem is found, 1 otherwise, 2 if the file cannot be read.
--selftest copies the decoded frames, puts in a black frame, a white frame, a one-frame flash, a frozen second and a hard cut,
and checks that each is found (no film is written).
"""
import argparse, json, os, shutil, subprocess, sys
try:
    import numpy as np
except ImportError:
    sys.exit("qa.py needs numpy: python3 -m pip install numpy  (or use the venv from the README)")

FF = os.environ.get("FFMPEG") or shutil.which("ffmpeg") or "ffmpeg"
FP = os.environ.get("FFPROBE") or shutil.which("ffprobe") or "ffprobe"
GW, GH = 270, 480


def probe(path):
    out = subprocess.run([FP, "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries",
                          "stream=width,height,r_frame_rate,nb_read_packets,duration:format=duration", "-of", "json", path],
                         capture_output=True, text=True)
    if out.returncode != 0:
        raise RuntimeError(out.stderr.strip() or "ffprobe failed")
    j = json.loads(out.stdout); s = j["streams"][0]
    num, den = s["r_frame_rate"].split("/")
    return {"width": int(s["width"]), "height": int(s["height"]), "fps": float(num) / float(den),
            "frames_packets": int(s.get("nb_read_packets", 0)),
            "duration": float(s.get("duration") or j["format"]["duration"])}


def decode(path):
    p = subprocess.run([FF, "-v", "error", "-i", path, "-vf", f"scale={GW}:{GH}:flags=area,format=gray", "-f", "rawvideo", "-"],
                       capture_output=True)
    if p.returncode != 0:
        raise RuntimeError(p.stderr.decode(errors="replace").strip() or "ffmpeg failed")
    a = np.frombuffer(p.stdout, np.uint8)
    return a.reshape(-1, GH, GW)


def runs(mask, min_len):
    out, i, n = [], 0, len(mask)
    while i < n:
        if mask[i]:
            j = i
            while j + 1 < n and mask[j + 1]:
                j += 1
            if j - i + 1 >= min_len:
                out.append((i, j))
            i = j + 1
        else:
            i += 1
    return out


def analyse(fr, fps, a):
    f = fr.astype(np.float32)
    n = len(f)
    mean = f.reshape(n, -1).mean(1)
    p1 = np.percentile(f.reshape(n, -1), 1, axis=1)
    p99 = np.percentile(f.reshape(n, -1), 99, axis=1)
    d = np.zeros(n, np.float32)                       # d[i] = change from frame i-1 to i
    d[1:] = np.abs(f[1:] - f[:-1]).reshape(n - 1, -1).mean(1)
    black = [int(i) for i in np.nonzero((mean < 12) & (p99 < 32))[0]]
    white = [int(i) for i in np.nonzero((mean > 235) & (p1 > 200))[0]]
    # frozen: frame i equals frame i-1; a run of k such frames is k+1 identical-looking frames
    still = d < a.freeze_thr; still[0] = False
    frozen = [(s - 1, e) for s, e in runs(still, a.freeze_min - 1)]
    flashes = []
    for i in range(1, n - 1):
        j1, j2 = d[i], d[i + 1]
        if min(j1, j2) <= a.flash_thr:
            continue
        across = float(np.abs(f[i + 1] - f[i - 1]).mean())
        if across < 0.35 * min(j1, j2):
            flashes.append(i)
    fl = set(flashes) | {i + 1 for i in flashes}
    # a hard change is a spike: above cut_thr and 2.5x both neighbouring changes (a fast move or a dissolve is a run, not a spike)
    nb = np.maximum(np.r_[0.0, d[:-1]], np.r_[d[1:], 0.0])
    cuts = [int(i) for i in np.nonzero((d > a.cut_thr) & (d > 2.5 * nb))[0] if i not in fl]
    T = lambda i: round(i / fps, 3)
    return {
        "frames_decoded": n,
        "black": [{"frame": i, "t": T(i)} for i in black],
        "white": [{"frame": i, "t": T(i)} for i in white],
        "frozen": [{"from_frame": s, "to_frame": e, "t0": T(s), "t1": T(e), "seconds": round((e - s + 1) / fps, 2)} for s, e in frozen],
        "flashes": [{"frame": i, "t": T(i), "jump_in": round(float(d[i]), 1), "jump_out": round(float(d[i + 1]), 1)} for i in flashes],
        "hard_changes": [{"frame": i, "t": T(i), "jump": round(float(d[i]), 1)} for i in cuts],
        "change_per_frame": {"median": round(float(np.median(d[1:])), 2), "p5": round(float(np.percentile(d[1:], 5)), 2),
                             "p95": round(float(np.percentile(d[1:], 95)), 2), "max": round(float(d.max()), 1)},
        "luma_mean": {"min": round(float(mean.min()), 1), "median": round(float(np.median(mean)), 1), "max": round(float(mean.max()), 1)},
    }


def selftest(fr, fps, a):
    g = fr.copy(); n = len(g)
    if n < 140:
        print("selftest needs 140+ frames"); return False
    g[30] = 0                                   # black frame
    g[50] = 255                                 # white frame
    g[70] = g[20]                               # a stray frame of another moment: a one-frame flash
    g[90:90 + int(fps)] = g[90]                 # a frozen second
    g[125:] = fr[0:n - 125]                     # a hard cut at frame 125 (back to the film's start)
    r = analyse(g, fps, a)
    ok = (any(x["frame"] == 30 for x in r["black"]) and any(x["frame"] == 50 for x in r["white"])
          and any(x["frame"] == 70 for x in r["flashes"]) and any(x["from_frame"] <= 90 and x["to_frame"] >= 89 + int(fps) for x in r["frozen"])
          and any(x["frame"] == 125 for x in r["hard_changes"]))
    print("selftest:", "PASS" if ok else "FAIL",
          json.dumps({k: r[k] for k in ("black", "white", "flashes", "frozen", "hard_changes")}))
    return ok


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("film"); ap.add_argument("--json"); ap.add_argument("--expect", type=float, help="expected length in seconds")
    ap.add_argument("--freeze-thr", type=float, default=0.12); ap.add_argument("--freeze-min", type=int, default=15)
    ap.add_argument("--flash-thr", type=float, default=12.0); ap.add_argument("--cut-thr", type=float, default=18.0)
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()
    try:
        info = probe(a.film); fr = decode(a.film)
    except Exception as e:  # noqa: BLE001
        print("cannot read", a.film, ":", e); sys.exit(2)
    r = analyse(fr, info["fps"], a)
    rep = {"film": a.film, **info, **r}
    problems = len(r["black"]) + len(r["white"]) + len(r["frozen"]) + len(r["flashes"])
    if a.expect is not None:
        rep["expected_seconds"] = a.expect
        rep["length_off_by_frames"] = round((info["duration"] - a.expect) * info["fps"], 1)
        if abs(rep["length_off_by_frames"]) > 1.5:
            problems += 1
    rep["problems"] = problems
    print(f"{a.film}\n  {info['width']}x{info['height']}  {info['fps']:.3f} fps  {info['duration']:.3f} s  "
          f"{r['frames_decoded']} frames decoded ({info['frames_packets']} in the stream)")
    if a.expect is not None:
        print(f"  expected {a.expect:.3f} s: off by {rep['length_off_by_frames']} frames")
    for k in ("black", "white", "flashes", "frozen", "hard_changes"):
        items = r[k]
        print(f"  {k:13s} {len(items):3d}" + ("  " + ", ".join(
            (f"{x['t0']}-{x['t1']} s ({x['seconds']} s)" if k == "frozen" else f"{x['t']} s") for x in items[:12]) if items else ""))
    print(f"  change per frame (0..255): {r['change_per_frame']}   luma mean: {r['luma_mean']}")
    print(f"  problems: {problems}")
    if a.json:
        json.dump(rep, open(a.json, "w"), indent=1)
    if a.selftest:
        if not selftest(fr, info["fps"], a):
            problems += 1
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
