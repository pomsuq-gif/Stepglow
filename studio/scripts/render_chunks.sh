#!/usr/bin/env bash
# Render a composition in frame-range chunks (muted video), concatenate, add the
# audio track rendered separately, then loudness-master for YouTube.
# Usage: [RESUME=1] scripts/render_chunks.sh <CompositionId> <lastFrame> <chunks> <out.mp4>
set -euo pipefail
ID=$1; LAST=$2; N=$3; OUT=$4
DIR=$(dirname "$OUT")/chunks-$ID; mkdir -p "$DIR"; : > "$DIR/list.txt"
STEP=$(( (LAST + 1 + N - 1) / N ))
for ((i=0; i<N; i++)); do
  A=$(( i * STEP )); B=$(( A + STEP - 1 )); (( B > LAST )) && B=$LAST
  F="$DIR/part$i.mp4"
  echo "file '$(realpath -m "$F")'" >> "$DIR/list.txt"
  # RESUME=1 keeps chunks already rendered (delete a part to re-render just that range)
  if [[ -n "${RESUME:-}" && -s "$F" ]]; then echo "chunk $i: keep"; continue; fi
  echo "chunk $i: frames $A-$B"
  npx remotion render src/index.ts "$ID" "$F" --frames="$A-$B" --muted --codec=h264 --crf=17 --gl=swangle --log=error
done
ffmpeg -v error -y -f concat -safe 0 -i "$DIR/list.txt" -c copy "$DIR/video.mp4"
npx remotion render src/index.ts "$ID" "$DIR/audio.wav" --codec=wav --frames="0-$LAST" --log=error
ffmpeg -v error -y -i "$DIR/video.mp4" -i "$DIR/audio.wav" -c:v copy -c:a aac -b:a 192k -shortest "$DIR/muxed.mp4"
bash ../tools/master.sh "$DIR/muxed.mp4" "$OUT"
echo "done -> $OUT"
