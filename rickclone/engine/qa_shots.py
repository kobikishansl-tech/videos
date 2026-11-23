"""qa_shots.py — Petrichor Engine R1: measure OUR rendered film with the same shot metrics
used on the reference channel (research/ricks-clips-3000/reports/06), and fail the build
when a shot leaves the spec bands (reports/10 §9).

    python3 engine/qa_shots.py <video.mp4 | stills_dir> [--json report.csv] [--strict]

Decoded at 270x480 (portrait). Per detected shot (consecutive-frame diff peaks):
  luma_mean, sat_mean, ink_frac (Y<0.10), subj_x (dark-centroid x), top/bot luma,
  in-shot change (mean consecutive diff), plus counts of spec violations:
    luma band       0.28 .. 0.60  (mood-dip shots allowed below, max 2)
    ink_frac        <= 0.08 (warn band; the measured channel mean is 0.03)
    subj_x          0.38 .. 0.62
    in-shot change  >= 0.05 (grey 0..1 scale) per shot (nothing is ever still)
  A mood-dip shot is detected structurally: luma_mean < 0.28.
Exit 0 = every hard gate pass; 1 = violation (--strict makes warnings fatal). 2 = bad input.
"""
import argparse, csv, glob, json, os, subprocess, sys, shutil
import numpy as np

GW, GH = 270, 480
WU = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
SPEC = dict(luma_lo=0.28, luma_hi=0.60, max_dips=2, subj_lo=0.38, subj_hi=0.62,
            ink_warn=0.08, change_min=0.05,  # change_min is a per-second rate
            cut_thr=0.085, min_shot_frames=12)


def read_video(path, sample_fps=6.0):
    """Stream-decode, keeping every k-th frame (default ~6 fps) — bounded RAM even for 60 s films."""
    ff = os.environ.get("FFMPEG") or shutil.which("ffmpeg") or "ffmpeg"
    FSIZE = GW * GH * 3
    fps = 30.0
    try:  # sample stride from true fps via ffprobe
        fp = os.environ.get("FFPROBE") or shutil.which("ffprobe") or "ffprobe"
        j = json.loads(subprocess.run([fp, "-v", "error", "-select_streams", "v:0",
                                       "-show_entries", "stream=r_frame_rate", "-of", "json", path],
                                      capture_output=True, text=True).stdout)
        num, den = j["streams"][0]["r_frame_rate"].split("/")
        fps = float(num) / float(den or 1)
    except Exception:
        pass
    k = max(1, int(round(fps / sample_fps)))
    p = subprocess.Popen([ff, "-v", "error", "-i", path, "-vf",
                          f"scale={GW}:{GH}:flags=area", "-pix_fmt", "rgb24", "-f", "rawvideo", "-"],
                         stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    frames, i, buf = [], 0, b""
    while True:
        chunk = p.stdout.read(FSIZE * 64)
        if not chunk:
            break
        buf += chunk
        while len(buf) >= FSIZE:
            if i % k == 0:
                fr = np.frombuffer(buf[:FSIZE], np.uint8).reshape(GH, GW, 3)
                frames.append(fr.astype(np.float32) / 255.0)
            buf = buf[FSIZE:]
            i += 1
    err = p.stderr.read().decode(errors="replace")
    p.wait()
    if p.returncode not in (0, None) or err.strip():
        raise RuntimeError("ffmpeg: rc=%d %s" % (p.returncode, err.strip()[:400]))
    if not frames:
        raise RuntimeError("ffmpeg produced no frames (missing FFMPEG env? install ffmpeg)")
    return np.stack(frames), k / fps  # frames, seconds-per-sample


def read_stills(src):
    frames = []
    for f in sorted(glob.glob(os.path.join(src, "*.png")) + glob.glob(os.path.join(src, "*.jpg"))):
        try:
            from PIL import Image
            im = Image.open(f).convert("RGB").resize((GW, GH))
            frames.append(np.asarray(im, dtype=np.float32) / 255.0)
        except Exception:
            pass
    return np.stack(frames) if frames else None


def metrics(A):
    """A: (n, GH, GW, 3). subj_x = darkness-weighted centroid over the middle 60% of rows
    (the action band), so night skies/pools of black frame-wide do not drag the estimate."""
    Y = A @ WU
    mx = A.max(-1); mn = A.min(-1)
    S = np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0.0)
    ink = float((Y < 0.10).mean())
    band = Y[:, GH // 5: GH - GH // 5, :]                      # middle 60% rows
    w = np.clip(0.35 - band, 0, 0.35)                          # darkness weight
    sx = 0.5
    if w.sum() > 25:
        xs = np.arange(band.shape[-1], dtype=np.float32)
        prob = w / max(w.sum(), 1e-6)
        sx = float((prob * xs[None, None, :]).sum() / GW)
    top = float(Y[:, : GH // 5].mean()); bot = float(Y[:, -GH // 5:].mean())
    return dict(luma=round(float(Y.mean()), 3), sat=round(float(S.mean()), 3), ink=round(ink, 3),
                subj_x=round(sx, 3), top=round(top, 3), bot=round(bot, 3))


def shots_of(F, cut_thr=None, min_frames=None):
    """shots = runs between frame-diff peaks (same idea as the reference cut detector)"""
    n = len(F)
    d = np.array([np.abs(F[i] - F[i + 1]).mean() for i in range(n - 1)], dtype=np.float32)
    ct = cut_thr or SPEC["cut_thr"]; mf = min_frames or SPEC["min_shot_frames"]
    cuts = [i + 1 for i, v in enumerate(d) if v > ct]
    bnd = [0] + [c for u, c in enumerate(cuts) if u == 0 or c - cuts[u - 1] >= mf] + [n]
    return bnd, d


def run(src, out_json, strict, bands):
    spc = dict(SPEC)
    if bands:
        spc.update(json.load(open(bands)))
    sps = None
    if os.path.isdir(src):
        F = read_stills(src)
    else:
        F, sps = read_video(src)
    if F is None or len(F) < 2:
        print("FAIL: no frames decoded"); return 2
    if sps:  # sampled input: ~1 s of samples between cuts, threshold on the 6 fps grid
        spc["min_shot_frames"] = max(3, int(round(1.0 / sps)))
    bnd, d = shots_of(F, spc["cut_thr"], spc["min_shot_frames"])
    rows = []; bad = []; dips = 0; warn = []
    for kk in range(len(bnd) - 1):
        a, b = bnd[kk], bnd[kk + 1]
        if b - a < 2:
            continue
        A = F[a:b]
        M = metrics(A)
        dsp = float(d[a:max(b - 1, a + 1)].mean()) if b - 1 > a else 0.0
        t0 = round(a * (sps or 1.0 / 30.0), 2)
        t1 = round(b * (sps or 1.0 / 30.0), 2)
        # change as a per-second rate (reference band measured per ~1 s cells: 0.066..0.36)
        rate = dsp / (sps or 1.0 / 30.0)
        r = dict(shot=kk, t0=t0, t1=t1, frames=b - a, **M,
                 change=round(rate, 3), change_raw=round(dsp, 4))
        r["viol"] = []
        if M["luma"] < SPEC["luma_lo"] - 1e-6 and M["luma"] < SPEC["luma_lo"]:
            # below band: counts as mood dip (allowed, capped), not a violation
            dips += 1; r["mood_dip"] = True
        elif M["luma"] > SPEC["luma_hi"]:
            r["viol"].append("luma")
        if not (SPEC["subj_lo"] <= M["subj_x"] <= SPEC["subj_hi"]):
            r["viol"].append("subj_x")
        if rate < spc["change_min"]:  # per-second floor (raw diffs shrink with sampling fps)
            r["viol"].append("still")
        if M["ink"] > SPEC["ink_warn"]:
            warn.append(f"shot {kk} [{r['t0']}-{r['t1']}s]: ink {M['ink']:.2f} > {SPEC['ink_warn']}")
        for v in r["viol"]:
            bad.append(f"shot {kk} [{r['t0']}-{r['t1']}s]: " +
                       {"luma": f"luma {M['luma']:.2f} > {SPEC['luma_hi']}",
                        "subj_x": f"subj_x {M['subj_x']:.2f} outside 0.38..0.62",
                        "still": f"in-shot change {rate:.3f}/s < {SPEC['change_min']}"}[v])
        rows.append(r)
    bad_txt = []
    if dips > SPEC["max_dips"]:
        bad_txt.append(f"{dips} mood-dip shots > max {SPEC['max_dips']}")
        okland = False
    if out_json:
        with open(out_json, "w", newline="") as f:
            fields = sorted({k2 for r2 in rows for k2 in r2.keys()}) if rows else ["shot"]
            w = csv.DictWriter(f, fieldnames=fields)
            w.writeheader(); w.writerows(rows)
    print(f"qa_shots: {len(rows)} shots, {dips} dips, {len(bad)} violations, {len(warn)} warnings")
    for x in bad:
        print("VIOLATION", x)
    for x in warn:
        print("warn", x)
    ok = not bad and not bad_txt and (not strict or not warn)
    print("PASS" if ok else "FAIL")
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("--json")
    ap.add_argument("--strict", action="store_true")
    ap.add_argument("--bands", help="JSON with per-film band overrides (luma_lo/luma_hi/subj_lo/subj_hi/change_min/...)")
    a = ap.parse_args()
    try:
        sys.exit(run(a.src, a.json, a.strict, a.bands))
    except RuntimeError as e:
        print("FAIL:", e); sys.exit(2)


if __name__ == "__main__":
    main()
