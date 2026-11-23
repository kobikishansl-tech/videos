"""records.py — Petrichor Engine R1: scene-record schema, loader and validator.

    python3 engine/records.py <records.json> [--words voice/words.json] [--json report.json]

The scene record (see research/ricks-clips-3000/reports/12_blueprint_p3.md §7.2) is the
contract object of the whole engine: script -> records -> everything downstream is generated.
This module validates records BEFORE anything renders.

Rules enforced (R1):
  R-EXACT   every scene.t_start / t_end equals the (word-derived) narration segment times of
            the words file: EXACTLY, never rounded or normalized (blueprint §7.2 immutable rule).
  R-SET     scene.set.family in {urban, domestic, industry, nature, period}; seed int >= 0;
            preset in {day, warm, night}.
  R-CAM     scene.camera.move in CAMERA_LIB (the 13 typed moves); params is an object;
            t0 <= t_start and t1 >= t_end (move covers the scene).
  R-CAST    every cast entry: char non-empty, variant in palette slots {a,b,c}, anchor = [x, y, z]
            (metres, y >= 0 = on the ground), actions verbs in {idle, walk, run, gesture, talk,
            look, turn, sit, stand, act, react}; action windows inside the scene; facing in
            [-pi, pi]; at most 4 actions overlapping in time per character (acting budget).
  R-STAGE   (a) portrait min-distance rule: an anchor whose z is nearer than 4.0 m of the
                camera pos is rejected unless the camera is a high-angle move (HIGHA / CRANE /
                POSTCARD) or anchor y >= 1.2 (on something raised).
            (b) same-set rule: all cast/props of one scene carry the scene's one set (cross-set
                beats must be separate scenes).
  R-LIGHT   lighting.rig in {day, warm, moody}; at most mood_dip_max (default 2) scenes with
            mood_dip: true, and dips must not be consecutive.
  R-SFX     sfx times inside the scene; name non-empty; gain 0..1.5.
Exit 0 = PASS (with warnings), exit 1 = any ERROR.
"""
import argparse, json, math, sys

CAMERA_LIB = {
    "ESTAB", "MED", "CLOSEUP", "LOWA", "HIGHA", "TRACK", "DOLLY", "ORBIT",
    "CRANE", "OTS", "PUSH", "PULL", "WHIP", "FROZEN", "POSTCARD",
}
SET_FAMILIES = {"urban", "domestic", "industry", "nature", "period"}
PRESETS = {"day", "warm", "night"}
VERBS = {"idle", "walk", "run", "gesture", "talk", "look", "turn", "sit", "stand", "act", "react"}
VARIANTS = {"a", "b", "c"}
HIGH_MOVES = {"HIGHA", "CRANE", "POSTCARD"}


def errors_of(recs, words):
    errs, warns = [], []

    def i2f(k):
        return (recs[k]["t_start"], recs[k]["t_end"])

    word_keys = {}
    if words:
        # words file: {"segments": [{"text":..., "t":..., "t_end":...}]} or a list of words
        segs = words.get("segments", []) if isinstance(words, dict) else []
        for s in segs:
            key = (round(s["t"], 3), round(s.get("t_end", s["t"]), 3))
            word_keys.setdefault(key, s.get("text", ""))

    prev_dip = False
    for i, r in enumerate(recs):
        sc = f"scene {i}"
        for f in ("id", "t_start", "t_end", "narration", "set", "cast", "camera", "lighting"):
            if f not in r:
                errs.append(f"{sc}: missing field '{f}'"); continue
        if not isinstance(r.get("id"), str) or not r["id"]:
            errs.append(f"{sc}: id must be a non-empty string")
        if r["t_end"] <= r["t_start"]:
            errs.append(f"{sc}: t_end <= t_start")
        # R-EXACT
        if words:
            key = (round(r["t_start"], 3), round(r["t_end"], 3))
            if key not in word_keys:
                a, b = key
                near = [k for k in word_keys if abs(k[0] - a) < 0.02 and abs(k[1] - b) < 0.02]
                if near:
                    k = near[0]
                    errs.append(f"{sc}: R-EXACT times differ from words.json by "
                                f"{abs(k[0]-a)*1000:.0f}+{abs(k[1]-b)*1000:.0f} ms — copy, never round "
                                f"(expected {k[0]},{k[1]})")
                else:
                    errs.append(f"{sc}: R-EXACT segment {key} not found in words.json segments")
        # R-SET
        st = r.get("set") or {}
        if st.get("family") not in SET_FAMILIES:
            errs.append(f"{sc}: set.family '{st.get('family')}' not in {sorted(SET_FAMILIES)}")
        if not isinstance(st.get("seed", 7), int) or st.get("seed", 7) < 0:
            errs.append(f"{sc}: set.seed must be a non-negative int")
        if st.get("preset", "day") not in PRESETS:
            errs.append(f"{sc}: set.preset '{st.get('preset')}' not in {sorted(PRESETS)}")
        # R-CAM: move known; camera covers the scene (whips may enter early)
        cam = r.get("camera") or {}
        if cam.get("move") not in CAMERA_LIB:
            errs.append(f"{sc}: camera.move '{cam.get('move')}' not in CAMERA_LIB.")
        p = cam.get("params") or {}
        if not isinstance(p, dict):
            errs.append(f"{sc}: camera.params must be an object")
        m = cam.get("move")
        if "t0" not in cam or "t1" not in cam:
            errs.append(f"{sc}: camera.t0/t1 missing")
        else:
            if cam["t0"] > r["t_start"] + 1e-6 and m not in {"WHIP"}:
                errs.append(f"{sc}: camera.t0 {cam['t0']} starts after the scene ({r['t_start']})")
            if m == "WHIP":
                if i + 1 < len(recs) and cam.get("t1", 0) > recs[i + 1]["t_start"] + 1.0:
                    errs.append(f"{sc}: WHIP overruns the next scene")
            elif cam.get("t1", 0) < r["t_end"] - 1e-6:
                errs.append(f"{sc}: camera.t1 {cam.get('t1')} ends before the scene ({r['t_end']})")
        # R-CAST + staging
        for j, c in enumerate(r.get("cast", [])):
            if not c.get("char"):
                errs.append(f"{sc}.cast[{j}]: empty char")
            if c.get("variant", "a") not in VARIANTS:
                errs.append(f"{sc}.cast[{j}]: variant '{c.get('variant')}' not in {sorted(VARIANTS)}")
            a = c.get("anchor")
            if not (isinstance(a, list) and len(a) == 3 and a[1] >= -1e-6):
                errs.append(f"{sc}.cast[{j}]: anchor must be [x, y, z], y >= 0 (on the ground)")
                a = None
            acts = c.get("actions") or []
            spans = []
            for k, ac in enumerate(acts):
                if ac.get("verb") not in VERBS:
                    errs.append(f"{sc}.cast[{j}].actions[{k}]: verb '{ac.get('verb')}' not in state machine")
                if ac.get("t0", 0) < r["t_start"] - 1e-6 or ac.get("t1", 0) > r["t_end"] + 1e-6:
                    errs.append(f"{sc}.cast[{j}].actions[{k}]: window outside the scene")
                spans.append((ac.get("t0", 0), ac.get("t1", 0)))
            # overlap count (acting budget <= 4 simultaneous verbs per char)
            events = []
            for t0, t1 in spans:
                events += [(t0, 1), (t1, -1)]
            events.sort()
            cur = mx = 0
            for _, d in events:
                cur += d; mx = max(mx, cur)
            if mx > 4:
                errs.append(f"{sc}.cast[{j}]: {mx} overlapping actions > 4 (acting budget)")
            f2 = c.get("facing", 0.0)
            if not (-math.pi - 1e-6 <= f2 <= math.pi + 1e-6):
                errs.append(f"{sc}.cast[{j}]: facing {f2} outside [-pi, pi]")
            # portrait min-distance rule
            if a and p and isinstance(p.get("pos"), list):
                cz = p["pos"][2] if len(p["pos"]) == 3 else 0
                dist = abs(p["pos"][2] - a[2])
                nearmin = p.get("nearMin", 4.0)
                if dist < nearmin and m not in HIGH_MOVES and a[1] < 1.2:
                    errs.append(f"{sc}: R-STAGE portrait rule — anchor [{a[0]},{a[1]},{a[2]}] is {dist:.1f} m "
                                f"from the camera (< {nearmin}) and the move {m} is not a high-angle: "
                                f"the ground anchor drops below frame; move the camera up/back or stage higher")
        # same-set rule
        sets_used = {c.get("parentSet", st.get("family")) for c in r.get("cast", [])}
        if len(sets_used) > 1:
            errs.append(f"{sc}: R-STAGE cast spans parents {sorted(sets_used)} — split into scenes")
        # R-LIGHT
        li = r.get("lighting") or {}
        if li.get("rig", "day") not in {"day", "warm", "moody"}:
            errs.append(f"{sc}: lighting.rig '{li.get('rig')}' not in day/warm/moody")
        dip = bool(li.get("mood_dip"))
        if dip and prev_dip:
            errs.append(f"{sc}: R-LIGHT two consecutive mood dips (are these real scenes?)")
        # R-SFX
        for k, s in enumerate(r.get("sfx", [])):
            if not s.get("name"):
                errs.append(f"{sc}.sfx[{k}]: empty name")
            g = s.get("gain", 0.7)
            if not (0 <= g <= 1.5):
                errs.append(f"{sc}.sfx[{k}]: gain {g} outside 0..1.5")
            if not (r["t_start"] <= s.get("t", r["t_start"]) <= r["t_end"]):
                errs.append(f"{sc}.sfx[{k}]: time outside the scene")
        prev_dip = dip

    total = sum(r["t_end"] - r["t_start"] for r in recs)
    gaps = []
    for i in range(1, len(recs)):
        g = recs[i]["t_start"] - recs[i - 1]["t_end"]
        if g > 1e-6:
            gaps.append((i, g))
    for i, g in gaps:
        warns.append(f"gap of {g:.3f} s before scene {i} (uncovered narration?)")
    dips = sum(1 for r in recs if (r.get("lighting") or {}).get("mood_dip"))
    if dips > 2:
        warns.append(f"{dips} mood-dip scenes > 2 (bands allow <= 2 per film)")
    return errs, warns, {"total": total, "scenes": len(recs), "gaps": gaps, "dips": dips}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("records")
    ap.add_argument("--words")
    ap.add_argument("--json")
    a = ap.parse_args()
    recs = json.load(open(a.records))
    if isinstance(recs, dict) and "scenes" in recs:
        recs = recs["scenes"]          # also accept the plan wrapper {"film":..., "scenes":[...]}
    words = json.load(open(a.words)) if a.words else None
    errs, warns, info = errors_of(recs, words)
    rep = {"ok": not errs, "errors": errs, "warnings": warns, "info": info}
    if a.json:
        open(a.json, "w").write(json.dumps(rep, indent=1))
    print(f"records: {info['scenes']} scenes, {info['total']:.2f} s total, {info['dips']} dips")
    for e in errs:
        print("ERROR", e)
    for w in warns:
        print("warn", w)
    print("PASS" if not errs else "FAIL")
    sys.exit(0 if not errs else 1)


if __name__ == "__main__":
    main()
