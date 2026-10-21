import { LevelDefSchema, type LevelDef, type PlacedItem, type Rect, type SpriteMask } from "@/engine/puzzle/types";

// A sprite whose opaque area is a filled square of `cells`×`cells` in the top-left of a
// 32×32 grid laid over a 100×100 source image.
export function squareMask(cells = 32): SpriteMask {
  const rows = Array.from({ length: 32 }, (_, row) => (row < cells ? (cells === 32 ? 0xffffffff : (1 << cells) - 1) >>> 0 : 0));
  return { sourceWidth: 100, sourceHeight: 100, bounds: { x: 0, y: 0, width: 100, height: 100 }, size: 32, rows };
}

// A ring: opaque border two cells wide, transparent middle.
export function ringMask(): SpriteMask {
  const rows = Array.from({ length: 32 }, (_, row) => {
    if (row < 2 || row >= 30) return 0xffffffff;
    return (0b11 | (0b11 << 30)) >>> 0;
  });
  return { sourceWidth: 100, sourceHeight: 100, bounds: { x: 0, y: 0, width: 100, height: 100 }, size: 32, rows };
}

export function item(id: string, kind: string, rect: Rect, layer = 0, order = 0): PlacedItem {
  return { id, kind, rect, layer, order };
}

// A hand-built level: `spec` maps item id to kind (the id's first letter by default), covers
// are "top>bottom" pairs. Positions are irrelevant to the rules.
export function makeLevel(ids: string[], covers: string[] = [], kinds: Record<string, string> = {}): LevelDef {
  return LevelDefSchema.parse({
    id: "test",
    chapter: "test",
    seed: "test",
    items: ids.map((id, i) => ({ id, kind: kinds[id] ?? id[0]!, x: 100 + i, y: 100, z: 0, scale: 1 })),
    covers: covers.map((pair) => {
      const [top, bottom] = pair.split(">");
      return { top: top!, bottom: bottom! };
    }),
    traySize: 7,
  });
}
