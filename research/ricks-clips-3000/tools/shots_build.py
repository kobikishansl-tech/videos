#!/usr/bin/env python3
"""Build the shot database for the representative videos from the storyboard cell DB.

Shots = segments between detected change events (data/cut_tables.json timestamps).
Per shot: grid timestamps (documented limitation: ±0.5 s, storyboard ~1 fps),
representative frame, per-shot luma/sat/ink/subject-x, transition typing at shot start.

Outputs: data/shots.csv, data/shots_<vid>.json
"""
import sqlite3, json, csv, glob
import numpy as np
from PIL import Image

WU = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
db = sqlite3.connect("data/frames.db")
cuts_all = json.load(open("data/cut_tables.json"))
VIDS = ["VS1Z_Q-Klt8", "QlDPMzGmYac", "TRUkQ1wbV2E", "Mz72MuPgnGY", "RVnC1DSfK30"]

out = open("data/shots.csv", "w", newline="")
w = csv.writer(out)
w.writerow(["video", "shot_n", "t_start", "t_end", "n_cells", "repr_frame",
            "luma_mean", "sat_mean", "ink_frac", "subj_x", "top_luma", "bot_luma",
            "trans_diff", "trans_kind", "inshot_moving_frac", "translation_frac", "shift_px_per_pair", "inshot_change_mean"])

DATABASE = {}
for vid in VIDS:
    rows = db.execute("SELECT idx,t,path FROM cell WHERE video=? ORDER BY idx", (vid,)).fetchall()
    if len(rows) < 8:
        continue
    times = [t for _, t, _ in rows]
    cuts = cuts_all.get(vid, [])
    # seg boundaries in cell index space: last cell before each cut time
    bnds = [0]
    for c in cuts:
        for i, t in enumerate(times):
            if t >= c:
                bnds.append(min(i, len(rows) - 1)); break
    bnds.append(len(rows) - 1)
    bnds = sorted(set(bnds))
    shots = []
    for k in range(len(bnds) - 1):
        i0, i1 = bnds[k], bnds[k + 1]
        if i1 <= i0: continue
        cells = [(t, p) for (idx, t, p) in rows[i0:i1 + 1]]
        arrs = [np.asarray(Image.open(p).convert("RGB"), dtype=np.float32) / 255.0 for _, p in cells]
        Y = [a @ WU for a in arrs]
        mx = [a.max(-1) for a in arrs]; mn = [a.min(-1) for a in arrs]
        S = [np.where(m > 0, (m - n) / np.maximum(m, 1e-6), 0).mean() for m, n in zip(mx, mn)]
        inks = [(y < 0.10).mean() for y in Y]
        subj = []
        for y in Y:
            d = y < 0.35
            if d.sum() > 25:
                xs = np.where(d)[1]; subj.append(xs.mean() / y.shape[1])
            else: subj.append(0.5)
        # transition typing: diff between first cell and the previous shot's last cell
        trans_diff = None; kind = "?"
        if k > 0:
            pimg = np.asarray(Image.open(rows[i0 - 1][2]).convert("L").resize((25, 45)), dtype=np.float32)
            cimg = np.asarray(Image.open(cells[0][1]).convert("L").resize((25, 45)), dtype=np.float32)
            trans_diff = float(np.abs(pimg - cimg).mean())
            cuttimes = [c for c in cuts if abs(c - cells[0][0]) < 1.0 or abs(c - rows[i0 - 1][1]) < 1.0]
            if trans_diff > 25: kind = "hard/whip (large)"
            elif trans_diff > 12: kind = "hard/whip"
            else: kind = "soft (dissolve/evolution)"
        # in-shot motion proxy: integer shift search on consecutive cells (native 90x50).
        # For each consecutive-cell pair: d0 = mean|A-B|, then best mean|shift(A)-B|
        # over integer shifts dx,dy in [-4..4] px. A pair is 'changing' if the best
        # residual is still visibly different; 'translation-consistent' if a shift
        # reduces residual by >20% (camera pan / global motion signature).
        moving = 0; trans_ok = 0; pairs = 0; shift_sum = 0.0; d0_sum = 0.0
        for j in range(1, len(cells)):
            A = np.asarray(Image.open(cells[j - 1][1]).convert("L"), dtype=np.float32) / 255.0
            B = np.asarray(Image.open(cells[j][1]).convert("L"), dtype=np.float32) / 255.0
            if A.shape != B.shape: continue
            pairs += 1
            d0 = np.abs(A - B).mean()
            d0_sum += d0
            if d0 < 0.005:
                continue
            best = (d0, 0, 0)
            As = A[4:-4, 4:-4]
            for dx in range(-4, 5):
                for dy in range(-4, 5):
                    if dx == 0 and dy == 0: continue
                    Bw = B[4 + dy: B.shape[0] - 4 + dy, 4 + dx: B.shape[1] - 4 + dx]
                    d = np.abs(As - Bw).mean()
                    if d < best[0]: best = (d, dx, dy)
            if best[0] > 0.035: moving += 1
            if (d0 - best[0]) / d0 > 0.20 and np.hypot(best[1], best[2]) >= 1.0:
                trans_ok += 1; shift_sum += np.hypot(best[1], best[2])
        mf = moving
        shot = dict(video=vid, shot_n=k, t_start=round(cells[0][0], 2), t_end=round(cells[-1][0] + 1.0, 2),
                    n_cells=len(cells), repr_frame=cells[len(cells) // 2][1],
                    luma_mean=round(float(np.mean([y.mean() for y in Y])), 3),
                    sat_mean=round(float(np.mean(S)), 3),
                    ink_frac=round(float(np.mean(inks)), 3),
                    subj_x=round(float(np.median(subj)), 3),
                    top_luma=round(float(np.mean([y[: y.shape[0] // 5].mean() for y in Y])), 3),
                    bot_luma=round(float(np.mean([y[-y.shape[0] // 5:].mean() for y in Y])), 3),
                    trans_diff=round(trans_diff, 1) if trans_diff is not None else None,
                    trans_kind=kind, inshot_motion_cells=mf,
                    motion_pairs=pairs, translation_cells=trans_ok,
                    shift_px_per_pair=round(shift_sum / trans_ok, 2) if trans_ok else 0,
                    change_mean=round(d0_sum / max(pairs, 1), 4))
        shots.append(shot)
    DATABASE[vid] = shots
    for s in shots:
        w.writerow([s["video"], s["shot_n"], s["t_start"], s["t_end"], s["n_cells"], s["repr_frame"],
                    s["luma_mean"], s["sat_mean"], s["ink_frac"], s["subj_x"], s["top_luma"], s["bot_luma"],
                    s["trans_diff"], s["trans_kind"],
            round(s["inshot_motion_cells"] / max(s["motion_pairs"], 1), 2),
            round(s["translation_cells"] / max(s["motion_pairs"], 1), 2),
            s["shift_px_per_pair"], s["change_mean"]])
    json.dump(shots, open("data/shots_%s.json" % vid, "w"), indent=1, default=str)
    print(vid, len(shots), "shots;", "transitions:", ",".join(s["trans_kind"][:6] for s in shots[1:6]))
out.close()
json.dump(DATABASE, open("data/shots_db.json", "w"), indent=1, default=str)
print("total shots:", sum(len(v) for v in DATABASE.values()))
