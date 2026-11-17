#!/usr/bin/env bash
# Final audio mastering for YouTube: loudness-normalise to -14 LUFS, true peak -1.5 dBTP.
# Two passes: measure first, then apply the measured values (linear gain where it fits,
# so a long episode lands on target instead of drifting under it). Video is copied untouched.
# Usage: tools/master.sh studio/out/ep001-pilot.mp4 [out.mp4]
set -euo pipefail
in="$1"
out="${2:-${in%.mp4}-master.mp4}"
target="I=${LUFS:--14}:TP=${TP:--1.5}:LRA=11"
json=$(ffmpeg -hide_banner -nostats -i "$in" -af "loudnorm=$target:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
val() { printf '%s' "$json" | python3 -c "import json,sys; print(json.load(sys.stdin)['$1'])"; }
measured="measured_I=$(val input_i):measured_TP=$(val input_tp):measured_LRA=$(val input_lra):measured_thresh=$(val input_thresh):offset=$(val target_offset)"
ffmpeg -v error -y -i "$in" -c:v copy -af "loudnorm=$target:$measured:linear=true,aresample=48000" -c:a aac -b:a 192k "$out"
ffmpeg -hide_banner -nostats -i "$out" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+I:|Peak:" | tail -2
echo "-> $out"
