import type { SpriteMask } from "../../src/engine/puzzle/types";
import type { DecodedPng } from "./png";

export const MASK_SIZE = 32;
// A pixel counts as opaque from this alpha up; soft shadow edges stay below it.
const ALPHA_THRESHOLD = 128;
// A cell is opaque when at least this share of its pixels is opaque.
const CELL_COVERAGE = 0.25;

export function buildMask(png: DecodedPng, size = MASK_SIZE): SpriteMask {
  // Each row is one 32-bit integer.
  if (!Number.isInteger(size) || size < 1 || size > 32) throw new Error(`mask size must be 1–32, got ${size}`);
  const { width, height, pixels } = png;
  const opaque = (x: number, y: number) => pixels[(y * width + x) * 4 + 3]! >= ALPHA_THRESHOLD;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!opaque(x, y)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error("sprite has no opaque pixels");

  const bounds = { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  const rows: number[] = [];
  for (let row = 0; row < size; row += 1) {
    let bits = 0;
    const y0 = bounds.y + Math.floor((row * bounds.height) / size);
    const y1 = Math.max(y0 + 1, bounds.y + Math.floor(((row + 1) * bounds.height) / size));
    for (let col = 0; col < size; col += 1) {
      const x0 = bounds.x + Math.floor((col * bounds.width) / size);
      const x1 = Math.max(x0 + 1, bounds.x + Math.floor(((col + 1) * bounds.width) / size));
      let count = 0;
      for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) if (opaque(x, y)) count += 1;
      if (count >= CELL_COVERAGE * (x1 - x0) * (y1 - y0)) bits |= 1 << col;
    }
    rows.push(bits >>> 0);
  }
  return { sourceWidth: width, sourceHeight: height, bounds, size, rows };
}
