#!/bin/sh
# Stills before any film: one PNG at each time given, into stills/ (or the folder given second), plus contact sheets
# (contact-sheet*.jpg: every still of the round on one page, with its time). Then it runs `hyperframes check --json`
# (about 5 s), prints its verdict and warns about every view whose camera stands inside a set's solid (a wall, a house,
# a pillar), naming the view: engine/cam.js tests each view's camera when the page loads.
#   sh tools/stills.sh 1.0,3.8,5.2
#   sh tools/stills.sh 1.0,3.8,5.2 stills/round2
# Look at every one. A render needs check's "ok": true (its full report is in <folder>/check.json).
cd "$(dirname "$0")/.." || exit 1
export HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_NO_UPDATE_CHECK=1 HYPERFRAMES_SKIP_SKILLS=1 CI=1
HF="${HF:-npx --yes hyperframes@0.8.189}"
OUT="${2:-stills}"
$HF snapshot --describe false --no-end --at "${1:?give the times, e.g. 1.0,3.8,5.2}" -o "$OUT" || exit 1
for s in "$OUT"/contact-sheet*.jpg; do [ -f "$s" ] && echo "contact sheet: $s"; done
$HF check --json > "$OUT/check.json" 2> "$OUT/check.err"
python3 - "$OUT/check.json" <<'PY'
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception as e:
    sys.exit(f"check: no report ({e}); run: npx --yes hyperframes@0.8.189 check --json")
fs = [f for v in d.values() if isinstance(v, dict) for f in v.get("findings", [])]
cam = [f.get("message", "") for f in fs if str(f.get("message", "")).startswith("camera inside")]
other = sorted({f.get("code", "?") for f in fs if not str(f.get("message", "")).startswith("camera inside")})
errs = [f.get("message", "") for f in fs if f.get("severity") == "error"]
print(f'check: "ok": {str(d.get("ok")).lower()}' + (f'  (findings: {", ".join(other)})' if other else ""))
for m in errs[:5]:
    print("  error: " + m)
for m in cam:
    print("WARNING " + m)
print("cameras: none inside a set's solid" if not cam else f"{len(cam)} view(s) with the camera inside a solid: move the camera (or the set piece) and take the stills again")
PY
