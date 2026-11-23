#!/usr/bin/env python3
"""Unravel YouTube storyboard sheets into (a) per-second frame cells, (b) raw sheet contact images.

Usage: python3 data/storyboards.py <meta.json...>
Reads yt-dlp metadata JSONs, downloads the biggest storyboard level from i.ytimg.com
(video streams are blocked in this sandbox; storyboards are not).
DB at data/frames.db records cell -> timestamp mapping.
"""
import urllib.request, ssl, json, os, io, sqlite3, sys
from PIL import Image

ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
HDR = {"User-Agent": "Mozilla/5.0"}
DB = sqlite3.connect("data/frames.db")
DB.executescript("""
CREATE TABLE IF NOT EXISTS video(id TEXT PRIMARY KEY, duration REAL, sheet_w INT, sheet_h INT,
                                 cols INT, rows INT, fps REAL, cells INT, sheets INT);
CREATE TABLE IF NOT EXISTS cell(video TEXT, idx INT, t REAL, path TEXT);
""")


def fetch(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers=HDR), timeout=15, context=ctx).read()


def pick_storyboard(meta):
    cands = []
    for f in meta.get("formats", []):
        if f.get("format_id", "").startswith("sb") and (f.get("fragments") or []):
            cands.append(f)
    if not cands:
        return None
    cands.sort(key=lambda f: -f.get("width", 0) * f.get("height", 0))
    return cands[0]


def process(meta_path):
    meta = json.load(open(meta_path))
    vid, dur = meta["id"], float(meta.get("duration") or 0)
    sb = pick_storyboard(meta)
    if not sb or dur <= 0:
        print(vid, "no storyboard"); return
    cols, rows, fps = sb["columns"], sb["rows"], float(sb.get("fps") or 1.0)
    per_sheet = cols * rows
    cells_meta = []
    for frag_i, frag in enumerate(sb["fragments"]):
        try:
            raw = fetch(frag["url"])
        except Exception as e:
            print(vid, "sheet", frag_i, "FAIL", str(e)[:40]); continue
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        w, h = img.size
        os.makedirs(f"frames/{vid}", exist_ok=True)
        n_cells = 0
        for r in range(rows):
            for c in range(cols):
                idx = frag_i * per_sheet + r * cols + c
                t = idx / fps
                if t > dur + 0.5:
                    break
                x0, y0 = c * w // cols, r * h // rows
                cell = img.crop((x0, y0, x0 + w // cols, y0 + h // rows))
                cell = cell.resize((cell.width * 4, cell.height * 4), Image.LANCZOS)
                p = f"frames/{vid}/t{idx:06d}.jpg"; cell.save(p, quality=85)
                cells_meta.append((vid, idx, round(t, 3), p)); n_cells += 1
        img.resize((w * 2, h * 2), Image.LANCZOS).save(f"sheets/{vid}_sheet{frag_i}_raw.jpg", quality=88)
        print(f"{vid} sheet{frag_i} {w}x{h} cells+{n_cells}")
    if not cells_meta:
        return
    DB.executemany("REPLACE INTO video VALUES (?,?,?,?,?,?,?,?,?)",
                   [(vid, dur, sb.get("width"), sb.get("height"), cols, rows, fps,
                     len(cells_meta), len(sb["fragments"]))])
    DB.executemany("REPLACE INTO cell VALUES (?,?,?,?)", cells_meta)
    DB.commit()


if __name__ == "__main__":
    for p in sys.argv[1:]:
        try:
            process(p)
        except Exception as e:
            print(p, "ERROR", e)
