#!/usr/bin/env python3
"""Category contact sheets from the 11,380-cell storyboard corpus.
Every image cell is labeled: video id + timestamp (s)."""
import sqlite3, json, glob, random
import numpy as np
from PIL import Image, ImageDraw

db = sqlite3.connect("data/frames.db")
random.seed(11)
CWL, CHL = 190, 320   # cell size incl label area
def labeled_grid(items, out, cols=6):
    # items: list of (label, path)
    n = len(items)
    rows = (n + cols - 1) // cols
    W, H = CWL - 10, CHL - 26
    sheet = Image.new("RGB", (cols * CWL, rows * CHL), (16, 16, 16))
    d = ImageDraw.Draw(sheet)
    for i, (lab, p) in enumerate(items):
        x, y = (i % cols) * CWL, (i // cols) * CHL
        try:
            im = Image.open(p).convert("RGB").resize((W, W * 16 // 9))
        except Exception:
            continue
        sheet.paste(im, (x + 5, y + 5))
        d.text((x + 6, y + H + 8), lab[:46], fill=(120, 255, 160) if "*" in lab else (230, 230, 90))
    sheet.save(out, quality=87)
    print(out, sheet.size, n)

# ---- 1. one representative frame per shot (shot grids)
for vid, shots in json.load(open("data/shots_db.json")).items():
    items = [(f"{vid} shot#{s['shot_n']} {s['t_start']:.1f}-{s['t_end']:.1f}s *",
              s["repr_frame"]) for s in shots]
    labeled_grid(items, f"sheets/shots_{vid}.jpg", cols=4)

# ---- 2. characters: era-2 poster centre crops (character band)
era2 = []
for t, p in [(r["video"], f"thumbs/{r['video']}.jpg") for r in __import__("csv").DictReader(open("data/timeline_metrics.csv"))]:
    import json as J
    try:
        m = J.load(open(f"data/meta_{t}.json"))
        if (m.get("upload_date") or "") >= "20261001" and m.get("duration", 0) and m["duration"] < 70:
            era2.append((t, p))
    except Exception:
        pass
items = []
import os
for vid, p in sorted(era2)[:18]:
    im = Image.open(p).convert("RGB")
    cw, ch = im.size
    # poster: layout band where characters usually live (middle third)
    crop = im.crop((int(cw * 0.18), int(ch * 0.30), int(cw * 0.82), int(ch * 0.78))).resize((CWL - 10, CWL - 10))
    op = f"sheets/crop_{vid}.jpg"; crop.save(op)
    items.append((vid, op))
labeled_grid(items, "sheets/cats_characters.jpg", cols=6)

# ---- 3. environments: era-2 cells with wide-ish composition (top sky visible)
cells = db.execute("SELECT video,t,path FROM cell ORDER BY RANDOM()").fetchall()
era2set = {v for v, _ in era2}
env, lit = [], []
WU = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
for vid, t, p in cells:
    if vid not in era2set: continue
    im = np.asarray(Image.open(p).convert("RGB"), dtype=np.float32) / 255.0
    Y = im @ WU
    env.append((vid, t, p, float(Y[: Y.shape[0]//4].mean()), float(Y.mean())))
    lit.append((float(Y.mean()), vid, t, p))
random.shuffle(env)
items = [(f"{v} @{t:.0f}s *", p) for v, t, p, tl, ym in env[:30]]
labeled_grid(items, "sheets/cats_environments.jpg", cols=6)

# ---- 4. lighting: luma deciles
lit.sort(key=lambda x: x[0])
picks = [lit[int(q * (len(lit) - 1))] for q in np.linspace(0.02, 0.98, 24)]
items = [(f"{v} @{t:.0f}s luma={l:.2f} *", p) for l, v, t, p in picks]
labeled_grid(items, "sheets/cats_lighting.jpg", cols=6)

# ---- 5. transitions: pre/post pairs for the representatives
cuts_all = json.load(open("data/cut_tables.json"))
items = []
for vid in ["VS1Z_Q-Klt8", "QlDPMzGmYac", "TRUkQ1wbV2E", "Mz72MuPgnGY"]:
    for c in cuts_all[vid][:6]:
        rows = db.execute("SELECT idx,t,path FROM cell WHERE video=? ORDER BY idx", (vid,)).fetchall()
        pre = [r for r in rows if r[1] < c]; post = [r for r in rows if r[1] >= c]
        if pre and post:
            items.append((f"{vid} @{c:.1f}s PRE *", pre[-1][2])); items.append((f"{vid} @{c:.1f}s POST *", post[0][2]))
labeled_grid(items[:36], "sheets/cats_transitions.jpg", cols=6)

# ---- 6. animation: consecutive triples from the highest mid-shot movement
mov = []
for vid in ["VS1Z_Q-Klt8", "QlDPMzGmYac", "TRUkQ1wbV2E", "Mz72MuPgnGY"]:
    rows = db.execute("SELECT idx,t,path FROM cell WHERE video=? ORDER BY idx", (vid,)).fetchall()
    for i in range(2, len(rows)):
        A = np.asarray(Image.open(rows[i-2][2]).convert("L").resize((25, 45)), dtype=np.float32)
        B = np.asarray(Image.open(rows[i-1][2]).convert("L").resize((25, 45)), dtype=np.float32)
        C = np.asarray(Image.open(rows[i][2]).convert("L").resize((25, 45)), dtype=np.float32)
        d = (np.abs(B - A).mean() + np.abs(C - B).mean()) / 2
        if d < 18:   # within-shot evolution, not a cut
            mov.append((d, vid, rows[i]))
mov.sort(key=lambda x: -x[0])
items = []
for d, vid, r in mov[:6]:
    for j in range(-1, 2):
        items.append((f"{vid} @{rows[min(j,0)][1]:.1f}s m={d:.1f} *", r[2]))
labeled_grid(items, "sheets/cats_animation.jpg", cols=3)

# ---- 7. camera: center-subject vs off-axis frames
cam = []
for vid, t, p in cells:
    if vid not in era2set: continue
    Y = np.asarray(Image.open(p).convert("L"), dtype=np.float32) / 255.0
    d = Y < 0.35
    if d.sum() > 25:
        xs = np.where(d)[1].mean() / Y.shape[1]
        cam.append((xs, vid, t, p))
cam.sort(key=lambda x: abs(x[0] - 0.5))
center = [(f"{v} @{t:.0f}s x={x:.2f} centered *", p) for x, v, t, p in cam[:6]]
off = [(f"{v} @{t:.0f}s x={x:.2f} off-axis *", p) for x, v, t, p in cam[-6:]]
labeled_grid(center + off, "sheets/cats_camera.jpg", cols=4)
print("ALL SHEETS DONE")
