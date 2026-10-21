import { COVER_MIN_SHARE } from "./constants";
import { cellCenter, isCellSet, maskContains, opaqueRect, rectsIntersect } from "./mask";
import { compareDrawOrder, type MaskSet, type PlacedItem, type SpriteMask } from "./types";

export interface Cover {
  // Drawn in front.
  top: string;
  // Drawn behind, and blocked until `top` leaves the board.
  bottom: string;
}

// Covering relation from geometry: `top` covers `bottom` when `top` is drawn in front and at
// least `minShare` of `bottom`'s opaque mask cells lie under `top`'s opaque pixels. Overlap is
// sampled at the centres of the bottom item's mask cells. Because covers always point from a
// later item to an earlier one in draw order, the relation has no cycles.
export function computeCovers(items: readonly PlacedItem[], masks: MaskSet, minShare = COVER_MIN_SHARE): Cover[] {
  const covers: Cover[] = [];
  for (const bottom of items) {
    const bottomMask = masks[bottom.kind];
    if (!bottomMask) continue;
    const bottomBox = opaqueRect(bottomMask, bottom.rect);
    const opaqueCells = countCells(bottomMask);
    for (const top of items) {
      if (top === bottom || compareDrawOrder(top, bottom) <= 0) continue;
      const topMask = masks[top.kind];
      if (!topMask || !rectsIntersect(bottomBox, opaqueRect(topMask, top.rect))) continue;
      const shared = overlapCells(bottom, bottomMask, top, topMask);
      if (shared > 0 && shared >= minShare * opaqueCells) covers.push({ top: top.id, bottom: bottom.id });
    }
  }
  return covers;
}

// For each item, the ids of the items that cover it (empty when free).
export function coveredByIndex(itemIds: readonly string[], covers: readonly Cover[]): Map<string, string[]> {
  const index = new Map<string, string[]>(itemIds.map((id) => [id, []]));
  for (const { top, bottom } of covers) index.get(bottom)?.push(top);
  return index;
}

export function computeCoveredBy(items: readonly PlacedItem[], masks: MaskSet, minShare = COVER_MIN_SHARE): Map<string, string[]> {
  return coveredByIndex(
    items.map((item) => item.id),
    computeCovers(items, masks, minShare),
  );
}

function countCells(mask: SpriteMask): number {
  let count = 0;
  for (let row = 0; row < mask.size; row += 1) for (let col = 0; col < mask.size; col += 1) if (isCellSet(mask, col, row)) count += 1;
  return count;
}

function overlapCells(bottom: PlacedItem, bottomMask: SpriteMask, top: PlacedItem, topMask: SpriteMask): number {
  let count = 0;
  for (let row = 0; row < bottomMask.size; row += 1) {
    for (let col = 0; col < bottomMask.size; col += 1) {
      if (!isCellSet(bottomMask, col, row)) continue;
      if (maskContains(topMask, top.rect, cellCenter(bottomMask, bottom.rect, col, row))) count += 1;
    }
  }
  return count;
}
