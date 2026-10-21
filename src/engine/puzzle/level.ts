import { ITEM_SIZE } from "./constants";
import { compareDrawOrder, type LevelItem, type MaskSet, type PlacedItem, type Rect, type SpriteMask } from "./types";

// Board rect of a level item: its sprite fitted (keeping aspect) into a box of ITEM_SIZE × scale
// centred on (x, y).
export function itemRect(item: LevelItem, mask: SpriteMask | undefined): Rect {
  const side = ITEM_SIZE * item.scale;
  const aspect = mask ? mask.sourceWidth / mask.sourceHeight : 1;
  const width = aspect >= 1 ? side : side * aspect;
  const height = aspect >= 1 ? side / aspect : side;
  return { x: item.x - width / 2, y: item.y - height / 2, width, height };
}

// Level items as drawable, hit-testable items, back to front. `kinds` overrides each item's kind
// (after Shuffle); the sprite then fits the same box. Within a layer, items whose box sits lower
// on the board are drawn in front (isometric depth). Draw order uses the box, not the sprite,
// so it does not change when Shuffle changes a kind.
export function placeItems(items: readonly LevelItem[], masks: MaskSet, kinds?: Readonly<Record<string, string>>): PlacedItem[] {
  return items
    .map((item) => {
      const kind = kinds?.[item.id] ?? item.kind;
      const rect = itemRect(item, masks[kind]);
      return { id: item.id, kind, rect, layer: item.z, order: Math.round(item.y + (ITEM_SIZE * item.scale) / 2) };
    })
    .sort(compareDrawOrder);
}
