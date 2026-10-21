import { cellCenter, isCellSet, maskContains } from "./mask";
import { compareDrawOrder, type MaskSet, type PlacedItem, type Point } from "./types";

// The front-most item whose alpha mask contains `point` (board space), or null.
// It returns covered items too: the caller decides whether a covered item can be taken.
export function hitTest(point: Point, items: readonly PlacedItem[], masks: MaskSet): PlacedItem | null {
  let best: PlacedItem | null = null;
  for (const item of items) {
    if (best && compareDrawOrder(item, best) < 0) continue;
    const mask = masks[item.kind];
    if (mask && maskContains(mask, item.rect, point)) best = item;
  }
  return best;
}

// A board point where a tap lands on `target` itself: the opaque mask cell nearest the centre
// of the sprite's opaque bounds that no item in front covers. Null when the item is fully hidden.
// Used to aim tutorial hints and UI tests at an item.
export function findTapPoint(target: PlacedItem, items: readonly PlacedItem[], masks: MaskSet): Point | null {
  const mask = masks[target.kind];
  if (!mask) return null;
  const middle = (mask.size - 1) / 2;
  const cells: [number, number][] = [];
  for (let row = 0; row < mask.size; row += 1) {
    for (let col = 0; col < mask.size; col += 1) if (isCellSet(mask, col, row)) cells.push([col, row]);
  }
  cells.sort((a, b) => Math.hypot(a[0] - middle, a[1] - middle) - Math.hypot(b[0] - middle, b[1] - middle));
  for (const [col, row] of cells) {
    const point = cellCenter(mask, target.rect, col, row);
    if (hitTest(point, items, masks)?.id === target.id) return point;
  }
  return null;
}
