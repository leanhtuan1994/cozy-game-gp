import { describe, expect, it } from "vitest";

import { computeCovers } from "@/engine/puzzle/covers";
import { compareDrawOrder } from "@/engine/puzzle/types";
import { item, squareMask } from "./helpers";

const masks = { square: squareMask() };
// Each mask cell of a 100-unit square is 3.125 units wide.
const pair = (shift: number) => [
  item("back", "square", { x: 0, y: 0, width: 100, height: 100 }, 0),
  item("front", "square", { x: 100 - shift, y: 0, width: 100, height: 100 }, 1),
];

describe("computeCovers", () => {
  it("covers when the overlap reaches the share threshold", () => {
    // 10 units of overlap = 3 columns of 32 ≈ 9% of the back item.
    expect(computeCovers(pair(10), masks, 0.04)).toEqual([{ top: "front", bottom: "back" }]);
    expect(computeCovers(pair(10), masks, 0.2)).toEqual([]);
  });

  it("ignores overlap thinner than one mask cell", () => {
    // 1 unit of overlap reaches no cell centre of the back item.
    expect(computeCovers(pair(1), masks, 0)).toEqual([]);
    // 2 units reach the centres of the last column (at 98.4).
    expect(computeCovers(pair(2), masks, 0)).toEqual([{ top: "front", bottom: "back" }]);
  });

  it("only points from front to back, so the relation has no cycles", () => {
    const items = Array.from({ length: 12 }, (_, i) =>
      item(`i${i}`, "square", { x: (i % 4) * 40, y: Math.floor(i / 4) * 40, width: 100, height: 100 }, i % 3, i),
    );
    const covers = computeCovers(items, masks, 0.01);
    expect(covers.length).toBeGreaterThan(0);
    const byId = new Map(items.map((it) => [it.id, it]));
    for (const { top, bottom } of covers) expect(compareDrawOrder(byId.get(top)!, byId.get(bottom)!)).toBeGreaterThan(0);
  });
});
