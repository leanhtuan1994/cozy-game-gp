"""Recover transparent frames from black/white renders, then pack an animated WebP.

usage: python3 matte.py <render-root> <artboard> <out.webp> <frame-ms>
"""
import os
import subprocess
import sys

from PIL import Image, ImageChops

root, name, out, ms = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
black_dir = os.path.join(root, f"{name}-FF000000", "frames")
white_dir = os.path.join(root, f"{name}-FFFFFFFF", "frames")
alpha_dir = os.path.join(root, f"{name}-alpha")
os.makedirs(alpha_dir, exist_ok=True)

frames = sorted(f for f in os.listdir(black_dir) if f.endswith(".png") and os.path.exists(os.path.join(white_dir, f)))
paths = []
for f in frames:
    b = Image.open(os.path.join(black_dir, f)).convert("RGB")
    w = Image.open(os.path.join(white_dir, f)).convert("RGB")
    # alpha = 1 - (white - black); colour = black / alpha
    diff = ImageChops.subtract(w, b).convert("L")
    alpha = diff.point(lambda v: 255 - v)
    bp, ap = b.load(), alpha.load()
    outimg = Image.new("RGBA", b.size)
    op = outimg.load()
    for y in range(b.size[1]):
        for x in range(b.size[0]):
            a = ap[x, y]
            if a == 0:
                op[x, y] = (0, 0, 0, 0)
            else:
                r, g, bl = bp[x, y]
                op[x, y] = (min(255, r * 255 // a), min(255, g * 255 // a), min(255, bl * 255 // a), a)
    p = os.path.join(alpha_dir, f)
    outimg.save(p)
    paths.append(p)

subprocess.run(["img2webp", "-loop", "0", "-lossy", "-q", "82", "-d", ms, *paths, "-o", out], check=True,
               stdout=subprocess.DEVNULL)
print(name, len(paths), "frames ->", out)
