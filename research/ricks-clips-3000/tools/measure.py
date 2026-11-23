#!/usr/bin/env python3
"""Measure every unravelled storyboard timeline in the sqlite DB.

Per video, from ~1 fps 50x90 storyboard cells:
  - luma/sat/ink stats (per-frame + percentiles)
  - frame-diff series -> shot-cut candidates -> shot duration distribution
  - global-motion estimate per consecutive pair (phase cross-correlation, 32x57)
  - dark/ink centroid placement (composition)
  - poster palette (k-means k=5) at full 1280x720

Writes data/timeline_metrics.csv, data/shot_lengths.csv, data/palette.csv.
"""
import sqlite3, csv, glob, json
import numpy as np
from PIL import Image

VIDEOS = sorted(glob.glob("frames/*"))
OUT_T = open("data/timeline_metrics.csv", "w", newline="")
OUT_S = open("data/shot_lengths.csv", "w", newline="")
OUT_C = open("data/palette.csv", "w", newline="")
TW = csv.writer(OUT_T); TS = csv.writer(OUT_S); TC = csv.writer(OUT_C)
TW.writerow(["video", "duration", "cells", "luma_p50", "luma_p90", "luma_p10", "ink_frac_mean",
             "sat_mean", "sat_p90", "cuts", "shots", "shot_med_s", "shot_p90_s", "motion_frac",
             "motion_med_px", "subject_x_med", "subject_x_p10", "subject_x_p90",
             "top_luma_mean", "bot_luma_mean", "dark_frames_frac"])
TS.writerow(["video", "shot_start_s", "shot_len_s"])
TC.writerow(["video", "kind", "hex", "share"])

WU = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)


def cellarr(p):
    im = np.asarray(Image.open(p).convert("RGB"), dtype=np.float32) / 255.0
    return im


def motion(a, b):
    # tiny phase correlation on 32x57 grids of luma
    A = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).convert("L").resize((32, 57)), dtype=np.float32)
    B = np.asarray(Image.fromarray((b * 255).astype(np.uint8)).convert("L").resize((32, 57)), dtype=np.float32)
    FA = np.fft.rfft2(A - A.mean()); FB = np.fft.rfft2(B - B.mean())
    R = FA * np.conj(FB); R /= (np.abs(R) + 1e-6)
    corr = np.fft.irfft2(R, A.shape)
    i, j = np.unravel_index(np.argmax(corr), corr.shape)
    di = i if i < A.shape[0] // 2 else i - A.shape[0]
    dj = j if j < A.shape[1] // 2 else j - A.shape[1]
    return float(np.hypot(di, dj)), float(corr[i, j])


for vd in VIDEOS:
    vid = vd.split("/")[-1]
    files = sorted(glob.glob(vd + "/t*.jpg"))
    if len(files) < 8:
        continue
    lums, sats, inks, subj, topl, botl = [], [], [], [], [], []
    arrs = []
    for p in files:
        im = cellarr(p)
        Y = im @ WU
        mx = im.max(-1); mn = im.min(-1)
        S = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
        lums.append(Y.mean()); sats.append(S.mean()); inks.append((Y < 0.10).mean())
        topl.append(Y[: Y.shape[0] // 5].mean()); botl.append(Y[-Y.shape[0] // 5:].mean())
        dark = Y < 0.35
        if dark.sum() > 25:
            ys, xs = np.where(dark)
            subj.append(xs.mean() / Y.shape[1])
        else:
            subj.append(0.5)
        arrs.append(im)
    # diffs at 1s sampling
    diff = []
    small = [np.asarray(Image.fromarray((a * 255).astype(np.uint8)).convert("L").resize((25, 45)), dtype=np.float32) for a in arrs]
    for i in range(1, len(small)):
        diff.append(float(np.abs(small[i] - small[i - 1]).mean()))
    diffs = np.array(diff)
    thr = max(12.0, float(np.percentile(diffs, 82))) if len(diffs) > 5 else 12.0
    cuts = [i + 1 for i in range(len(diffs)) if diffs[i] > thr]
    # shot lengths in seconds (1s sampling granularity)
    bounds = [0] + cuts + [len(files)]
    shots = [(bounds[k + 1] - bounds[k]) for k in range(len(bounds) - 1)]
    # motion (proxy) over pairs
    mov = []
    for i in range(1, min(len(arrs), 60)):
        px, pc = motion(arrs[i - 1], arrs[i])
        if pc > 0.35 and px > 0.8:  # confident shift
            mov.append(px)
    fps_eff = len(files) / 60.0
    mov_frac = len(mov) / max(1, min(len(arrs) - 1, 59))
    mov_med = float(np.median(mov)) if mov else 0.0
    # palette from poster at 1280x720
    tc = []
    post = f"thumbs/{vid}.jpg"
    if glob.glob(post):
       im = None
    try:
        pim = np.asarray(Image.open(post).convert("RGB").resize((160, 284)), dtype=np.float32)
        px = pim.reshape(-1, 3)
        k = 5
        rng = np.random.default_rng(7)
        cent = px[rng.choice(len(px), k, replace=False)]
        for _ in range(12):
            d = ((px[:, None, :] - cent[None]) ** 2).sum(-1)
            a = d.argmin(1)
            for j in range(k):
                if (a == j).any(): cent[j] = px[a == j].mean(0)
        shares = np.bincount(a, minlength=k) / len(a)
        for j in np.argsort(-shares):
            tc.append((j, tuple(int(round(v)) for v in cent[j]), float(shares[j])))
    except Exception:
        pass
    L = np.array(lums)
    TW.writerow([vid, round(len(files) / fps_eff, 2), len(files),
                 round(float(np.percentile(L, 50)), 3), round(float(np.percentile(L, 90)), 3), round(float(np.percentile(L, 10)), 3),
                 round(float(np.mean(inks)), 3), round(float(np.mean(sats)), 3), round(float(np.percentile(np.array(sats), 90)), 3),
                 len(cuts), len(shots), round(float(np.median(shots)) / fps_eff, 2), round(float(np.percentile(shots, 90)) / fps_eff, 2),
                 round(mov_frac, 3), round(mov_med, 2),
                 round(float(np.median(subj)), 3), round(float(np.percentile(subj, 10)), 3), round(float(np.percentile(subj, 90)), 3),
                 round(float(np.mean(topl)), 3), round(float(np.mean(botl)), 3),
                 round(float((L < 0.10).mean()), 3)])
    for sh in shots:
        TS.writerow([vid, 0, round(sh / fps_eff, 2)])
    for j, rgb, sh in tc:
        TC.writerow([vid, "poster_kmeans", "#%02x%02x%02x" % rgb, round(sh, 4)])

OUT_T.close(); OUT_S.close(); OUT_C.close()
print("done")
