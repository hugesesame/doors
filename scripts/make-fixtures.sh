#!/bin/sh
# Makes small test files with the native ffmpeg and saves the analysis log of each
# to tests/fixtures/, for the analysis tests. Run again after changing the analysis command.
set -eu

root=$(cd "$(dirname "$0")/.." && pwd)
out="$root/tests/fixtures"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p "$out"

ff() { ffmpeg -hide_banner -loglevel error -y "$@"; }

# A plain tone at about -13 LUFS.
ff -f lavfi -i "sine=frequency=440:duration=10" -af "volume=-10dB" "$work/tone.flac"
# 2 s of silence, a 6 s tone, then 3 s of silence.
ff -f lavfi -i "sine=frequency=440:duration=6" -af "volume=-20dB,adelay=2000:all=1,apad=pad_dur=3" "$work/padded.wav"
# Nothing but silence.
ff -f lavfi -i "anullsrc=r=44100:cl=stereo" -t 5 "$work/silent.wav"
# A picture without sound.
ff -f lavfi -i "testsrc=duration=2:size=160x120:rate=10" -c:v mpeg4 "$work/video-only.mp4"
# Not a media file at all.
printf 'this is not audio\n' > "$work/broken.mp3"

# The analysis command, as in src/core/analysis.ts. Relative names keep the logs the same on every run.
cd "$work"
for file in tone.flac padded.wav silent.wav video-only.mp4 broken.mp3; do
  ffmpeg -hide_banner -i "$file" -vn \
    -af "silencedetect=n=-50dB:d=0.5,loudnorm=I=-16:TP=-1.5:print_format=json" \
    -f null - > "$out/native-${file%.*}.log" 2>&1 || true
done
