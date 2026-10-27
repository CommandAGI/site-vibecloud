#!/usr/bin/env bash
# The generated clips (.media-raw/, from scripts/media.mjs) → seamless loops in media/: AV1 WebM, H.264 MP4 and a
# poster each, 1280 px wide, no audio. The loop: the clip from 1.5 s to the end, its last 1.5 s crossfaded into its
# first 1.5 s, so the last frame meets the first. FFMPEG names an ffmpeg with libaom-av1 and libx264.
set -euo pipefail
cd "$(dirname "$0")/.."
FFMPEG="${FFMPEG:-ffmpeg}"
for name in deck relief; do
  src=".media-raw/$name-loop.mp4"
  loop="[0:v]split[a][b];[a]trim=1.5:10,setpts=PTS-STARTPTS,fps=24,settb=AVTB[x];[b]trim=0:1.5,setpts=PTS-STARTPTS,fps=24,settb=AVTB[y];[x][y]xfade=transition=fade:duration=1.5:offset=7,scale=1280:-2:flags=lanczos,format=yuv420p"
  "$FFMPEG" -v error -y -i "$src" -filter_complex "$loop" -an -c:v libaom-av1 -crf 42 -b:v 0 -cpu-used 6 -row-mt 1 "media/$name-loop.webm"
  "$FFMPEG" -v error -y -i "$src" -filter_complex "$loop" -an -c:v libx264 -preset slow -crf 27 -movflags +faststart "media/$name-loop.mp4"
  "$FFMPEG" -v error -y -ss 1.5 -i "$src" -frames:v 1 -vf scale=1600:-2:flags=lanczos -q:v 5 "media/$name-loop-poster.jpg"
done
ls -la media
