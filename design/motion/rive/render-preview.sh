#!/bin/zsh
# Render every frame of one artboard on black and on white at 2x, for difference matting
# (matte-preview.py turns the pair into a transparent animated WebP for design previews).
# usage: render-preview.sh <artboard> <frames> <step> [out-root]
HERE=${0:A:h}
A=$1; N=$2; STEP=$3; ROOT=${4:-$HERE/../preview-frames}
for BG in FF000000 FFFFFFFF; do
  D=$ROOT/$A-$BG; mkdir -p $D/frames
  printf "name: r_%s\nmain: %s\n" $A $A > $D/rive.yaml
  RIVE_BG=$BG RIVE_SCALE=2 python3 -I $HERE/generate-scene.py $D/scene.rml >/dev/null
  ( cd $D && for ((f=0; f<N; f+=STEP)); do rive . --screenshot=frames/$(printf %04d $f).png --advance=$f >/dev/null 2>&1 || rive . --screenshot=frames/$(printf %04d $f).png >/dev/null 2>&1; done ) &
done
wait
echo "done $A"
