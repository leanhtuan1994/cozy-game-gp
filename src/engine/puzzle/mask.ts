import type { Point, Rect, SpriteMask } from "./types";

// True when `point` (board space) falls on an opaque cell of a sprite drawn into `rect`.
export function maskContains(mask: SpriteMask, rect: Rect, point: Point): boolean {
  const sx = ((point.x - rect.x) / rect.width) * mask.sourceWidth;
  const sy = ((point.y - rect.y) / rect.height) * mask.sourceHeight;
  const { bounds, size } = mask;
  if (sx < bounds.x || sy < bounds.y || sx >= bounds.x + bounds.width || sy >= bounds.y + bounds.height) {
    return false;
  }
  const col = Math.min(size - 1, Math.floor(((sx - bounds.x) / bounds.width) * size));
  const row = Math.min(size - 1, Math.floor(((sy - bounds.y) / bounds.height) * size));
  return isCellSet(mask, col, row);
}

export function isCellSet(mask: SpriteMask, col: number, row: number): boolean {
  return (((mask.rows[row] ?? 0) >>> col) & 1) === 1;
}

// The opaque bounding box of a sprite drawn into `rect`, in board space.
export function opaqueRect(mask: SpriteMask, rect: Rect): Rect {
  const scaleX = rect.width / mask.sourceWidth;
  const scaleY = rect.height / mask.sourceHeight;
  return {
    x: rect.x + mask.bounds.x * scaleX,
    y: rect.y + mask.bounds.y * scaleY,
    width: mask.bounds.width * scaleX,
    height: mask.bounds.height * scaleY,
  };
}

// Board-space centre of mask cell (col, row) for a sprite drawn into `rect`.
export function cellCenter(mask: SpriteMask, rect: Rect, col: number, row: number): Point {
  const box = opaqueRect(mask, rect);
  return {
    x: box.x + ((col + 0.5) / mask.size) * box.width,
    y: box.y + ((row + 0.5) / mask.size) * box.height,
  };
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}
