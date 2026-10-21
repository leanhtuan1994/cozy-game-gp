"""Draws the encaustic cement tile (gạch bông) that backs the meta screens.

Usage: python3 scripts/art/make-tile.py
Writes assets/ui/tile-gach-bong@3x.png: one 46 pt tile at @3x, meant to repeat. Cream ground,
a tan dot in the middle and a quarter circle in each corner, so four tiles meet in a full circle.
"""
import os

from PIL import Image, ImageDraw

SCALE = 3
TILE = 46 * SCALE
GROUND = (0xEF, 0xD3, 0xA6)
DOT = (0xE2, 0xB9, 0x7E)
CORNER = (0xF6, 0xE3, 0xC2)
DOT_R = 7.5 * SCALE
CORNER_R = 13.5 * SCALE
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "assets", "ui", "tile-gach-bong@3x.png")


def circle(draw: ImageDraw.ImageDraw, cx: float, cy: float, r: float, fill: tuple) -> None:
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=fill)


def main() -> None:
    # Drawn at 4x then reduced, for smooth edges.
    big = 4
    img = Image.new("RGB", (TILE * big, TILE * big), GROUND)
    draw = ImageDraw.Draw(img)
    size = TILE * big
    for cx in (0, size):
        for cy in (0, size):
            circle(draw, cx, cy, CORNER_R * big, CORNER)
    circle(draw, size / 2, size / 2, DOT_R * big, DOT)
    img.resize((TILE, TILE), Image.LANCZOS).save(os.path.normpath(OUT), optimize=True)
    print(os.path.normpath(OUT))


if __name__ == "__main__":
    main()
