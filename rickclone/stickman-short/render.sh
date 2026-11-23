#!/bin/sh
# Render this project to out/<name>.mp4 (default out/short.mp4), then finish its sound to the style's loudness.
#   sh render.sh                          -> out/short.mp4
#   sh render.sh demo.mp4 delivery        -> out/demo.mp4 at quality "delivery" (default "looks", CRF 16)
#   BED=music/bed.m4a sh render.sh        -> the same, with a music bed under the voice
#   SOUND_ONLY=1 sh render.sh             -> no new render: only the sound step again, from out/short-raw.mp4
#                                            (to try another bed or level in seconds)
# The render goes to out/<name>-raw.mp4 (the voice as HyperFrames placed it). The sound step (ffmpeg, a few seconds)
# writes out/<name>, the finished film (the picture is copied, not encoded again):
#   1. BED (optional): any music file you may use. It loops to the film's length, ducks under the words (ffmpeg
#      sidechaincompress keyed by the voice), sits BED_DB (default 15) dB under the voice over the whole film (both
#      measured, the bed after its ducking), fades in over 0.5 s and out over the last BED_FADE (default 2.5) s.
#   2. Loudness: two passes of ffmpeg loudnorm to -14 LUFS integrated with the true peak at most -1.5 dBFS (it aims at -2
#      so AAC's overshoot stays under -1.5), audio AAC 48 kHz 192 kb/s. It measures the result and prints it.
# Uses HyperFrames 0.8.189 through npx (set HF to another hyperframes command to override).
case "$BED" in ""|/*) ;; *) BED="$PWD/$BED" ;; esac          # a bed named from where you stand, before the cd below
cd "$(dirname "$0")" || exit 1
export HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_NO_UPDATE_CHECK=1 HYPERFRAMES_SKIP_SKILLS=1 CI=1 HYPERFRAMES_RENDER_DETACHED=1
HF="${HF:-npx --yes hyperframes@0.8.189}"
NAME="${1:-short.mp4}"; BASE="${NAME%.mp4}"; RAW="out/$BASE-raw.mp4"; OUT="out/$NAME"
LUFS=-14; TP_AIM=-2; TP_MAX=-1.5
mkdir -p out
if [ -z "$SOUND_ONLY" ]; then
  START=$(date +%s)
  rm -f "$RAW"
  $HF render --quality "${2:-looks}" --fps 30 --output "$RAW" 2>&1 | tail -12
  echo "render seconds: $(( $(date +%s) - START ))"
fi
[ -s "$RAW" ] || { echo "render.sh: no $RAW: the render failed (read the lines above)"; exit 1; }
command -v ffmpeg >/dev/null 2>&1 || { echo "render.sh: ffmpeg is not installed (README, What you need)"; exit 1; }

# ---- the sound step
T="out/.sound"; rm -rf "$T"; mkdir -p "$T"
FF="ffmpeg -y -hide_banner -nostats -loglevel error"
DUR=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$RAW")
field() { sed -n "s/.*\"$1\" *: *\"\([^\"]*\)\".*/\1/p" "$2" | tail -1; }          # a value from loudnorm's JSON report
measure() { ffmpeg -hide_banner -nostats -i "$1" -vn -af "loudnorm=I=${3:-$LUFS}:TP=$TP_AIM:LRA=11:print_format=json" -f null - 2> "$2"; }
calc() { awk "BEGIN { printf \"%.2f\", $1 }"; }

$FF -i "$RAW" -vn -af aformat=sample_rates=48000:channel_layouts=stereo -c:a pcm_s16le "$T/voice.wav" || exit 1
SOUND="$T/voice.wav"
if [ -n "$BED" ]; then
  [ -f "$BED" ] || { echo "render.sh: BED file not found: $BED"; exit 1; }
  BED_DB="${BED_DB:-15}"; BED_FADE="${BED_FADE:-2.5}"
  measure "$T/voice.wav" "$T/voice.txt"; VI=$(field input_i "$T/voice.txt")
  KEY=$(calc "-20 - ($VI)")                                     # the voice as the ducking key, brought to about -20 LUFS
  $FF -i "$T/voice.wav" -stream_loop -1 -i "$BED" -filter_complex \
    "[0:a]volume=${KEY}dB[key];[1:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:$DUR,asetpts=N/SR/TB[b];[b][key]sidechaincompress=threshold=0.05:ratio=3:attack=20:release=350[d]" \
    -map "[d]" -t "$DUR" -c:a pcm_s16le "$T/bed.wav" || exit 1
  measure "$T/bed.wav" "$T/bed.txt"; BI=$(field input_i "$T/bed.txt")
  G=$(calc "($VI) - $BED_DB - ($BI)"); FO=$(calc "$DUR - $BED_FADE")
  $FF -i "$T/voice.wav" -i "$T/bed.wav" -filter_complex \
    "[1:a]volume=${G}dB,afade=t=in:d=0.5,afade=t=out:st=$FO:d=$BED_FADE[b];[0:a][b]amix=inputs=2:duration=first:normalize=0[m]" \
    -map "[m]" -c:a pcm_s16le "$T/mix.wav" || exit 1
  SOUND="$T/mix.wav"
  echo "bed: $BED looped, $BED_DB dB under the voice (voice $VI LUFS, bed $(calc "$BI + $G") LUFS), ducked under the words, fading out from $FO s"
fi
loudnorm2() {      # pass 2 of loudnorm with pass 1's measurements; $1 = the integrated target
  $FF -i "$RAW" -i "$SOUND" -map 0:v -map 1:a -c:v copy \
    -af "loudnorm=I=$1:TP=$TP_AIM:LRA=11:measured_I=$(field input_i "$T/pass1.txt"):measured_TP=$(field input_tp "$T/pass1.txt"):measured_LRA=$(field input_lra "$T/pass1.txt"):measured_thresh=$(field input_thresh "$T/pass1.txt"):offset=$(field target_offset "$T/pass1.txt"):linear=true" \
    -ar 48000 -c:a aac -b:a 192k -t "$DUR" -movflags +faststart "$OUT"          # -t: the sound ends with the picture
}
result() { ffmpeg -hide_banner -nostats -i "$OUT" -vn -af ebur128=peak=true -f null - 2>&1 | awk '/Integrated loudness/ {s=1} s && /I:/ {i=$2} /True peak/ {p=1} p && /Peak:/ {tp=$2} END {print i, tp}'; }
measure "$SOUND" "$T/pass1.txt"
loudnorm2 "$LUFS" || exit 1
set -- $(result); I="$1"; TPK="$2"
# loudnorm falls back to its dynamic mode when the voice's peaks are high, and can land up to about 1 LU low: aim again
OFF=$(calc "$LUFS - ($I)")
if awk "BEGIN { exit !($OFF > 0.2 || $OFF < -0.2) }"; then
  AIM=$(calc "$LUFS + $OFF"); measure "$SOUND" "$T/pass1.txt" "$AIM"
  loudnorm2 "$AIM" || exit 1
  set -- $(result); I="$1"; TPK="$2"
fi
OK=$(awk "BEGIN { print (($I - ($LUFS)) <= 0.5 && ($I - ($LUFS)) >= -0.5 && $TPK <= $TP_MAX) ? \"ok\" : \"FIX\" }")
echo "loudness: $OK $I LUFS integrated (aim $LUFS), true peak $TPK dBFS (at most $TP_MAX)"
rm -rf "$T"
ls -la "$OUT"
