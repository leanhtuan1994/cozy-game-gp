import { describe, expect, it } from "vitest";

import { computeCoveredBy } from "@/engine/puzzle/covers";
import { findTapPoint, hitTest } from "@/engine/puzzle/hitTest";
import { maskContains } from "@/engine/puzzle/mask";
import { item, ringMask, squareMask } from "./helpers";

const masks = { square: squareMask(), half: squareMask(16), ring: ringMask() };

describe("maskContains", () => {
  it("maps board points through the drawn rect into mask cells", () => {
    const rect = { x: 100, y: 100, width: 200, height: 200 };
    expect(maskContains(masks.half, rect, { x: 150, y: 150 })).toBe(true);
    // The right half of the half mask is transparent.
    expect(maskContains(masks.half, rect, { x: 250, y: 150 })).toBe(false);
    expect(maskContains(masks.square, rect, { x: 99, y: 150 })).toBe(false);
    expect(maskContains(masks.square, rect, { x: 300, y: 150 })).toBe(false);
  });

  it("respects the opaque bounds inside the source image", () => {
    const mask = { ...squareMask(), bounds: { x: 50, y: 50, width: 50, height: 50 } };
    const rect = { x: 0, y: 0, width: 100, height: 100 };
    expect(maskContains(mask, rect, { x: 25, y: 25 })).toBe(false);
    expect(maskContains(mask, rect, { x: 75, y: 75 })).toBe(true);
  });
});

describe("hitTest", () => {
  const back = item("back", "square", { x: 0, y: 0, width: 100, height: 100 }, 0);
  const front = item("front", "square", { x: 50, y: 50, width: 100, height: 100 }, 1);

  it("returns the front-most item under the point", () => {
    expect(hitTest({ x: 75, y: 75 }, [back, front], masks)?.id).toBe("front");
    expect(hitTest({ x: 75, y: 75 }, [front, back], masks)?.id).toBe("front");
  });

  it("returns a covered item where it still shows", () => {
    expect(hitTest({ x: 25, y: 25 }, [back, front], masks)?.id).toBe("back");
  });

  it("taps through transparent pixels to the item behind", () => {
    const ring = item("ring", "ring", { x: 0, y: 0, width: 100, height: 100 }, 1);
    expect(hitTest({ x: 50, y: 50 }, [back, ring], masks)?.id).toBe("back");
    expect(hitTest({ x: 2, y: 50 }, [back, ring], masks)?.id).toBe("ring");
  });

  it("uses order within a layer, then id", () => {
    const a = item("a", "square", { x: 0, y: 0, width: 100, height: 100 }, 0, 2);
    const b = item("b", "square", { x: 0, y: 0, width: 100, height: 100 }, 0, 1);
    expect(hitTest({ x: 50, y: 50 }, [a, b], masks)?.id).toBe("a");
    const c = item("c", "square", { x: 0, y: 0, width: 100, height: 100 }, 0, 2);
    expect(hitTest({ x: 50, y: 50 }, [c, a], masks)?.id).toBe("c");
  });

  it("returns null on empty board space", () => {
    expect(hitTest({ x: 500, y: 500 }, [back, front], masks)).toBeNull();
  });
});

describe("computeCoveredBy", () => {
  it("marks an item covered only by overlapping items drawn in front", () => {
    const back = item("back", "square", { x: 0, y: 0, width: 100, height: 100 }, 0);
    const front = item("front", "square", { x: 50, y: 50, width: 100, height: 100 }, 1);
    const far = item("far", "square", { x: 400, y: 400, width: 100, height: 100 }, 2);
    const covered = computeCoveredBy([back, front, far], masks);
    expect(covered.get("back")).toEqual(["front"]);
    expect(covered.get("front")).toEqual([]);
    expect(covered.get("far")).toEqual([]);
  });

  it("ignores overlap of transparent areas", () => {
    // The ring's hole sits over the small item, so they never share opaque pixels.
    const small = item("small", "square", { x: 30, y: 30, width: 40, height: 40 }, 0);
    const ring = item("ring", "ring", { x: 0, y: 0, width: 100, height: 100 }, 1);
    expect(computeCoveredBy([small, ring], masks).get("small")).toEqual([]);
  });
});

describe("findTapPoint", () => {
  it("finds a point on the visible part of a covered item", () => {
    const back = item("back", "square", { x: 0, y: 0, width: 100, height: 100 }, 0);
    const front = item("front", "square", { x: 30, y: 30, width: 100, height: 100 }, 1);
    const point = findTapPoint(back, [back, front], masks);
    expect(point).not.toBeNull();
    expect(hitTest(point!, [back, front], masks)?.id).toBe("back");
  });

  it("returns the centre area for a free item", () => {
    const solo = item("solo", "square", { x: 0, y: 0, width: 100, height: 100 }, 0);
    const point = findTapPoint(solo, [solo], masks)!;
    expect(Math.abs(point.x - 50)).toBeLessThan(4);
    expect(Math.abs(point.y - 50)).toBeLessThan(4);
  });

  it("returns null when the item is fully hidden", () => {
    const back = item("back", "half", { x: 0, y: 0, width: 100, height: 100 }, 0);
    const front = item("front", "square", { x: 0, y: 0, width: 100, height: 100 }, 1);
    expect(findTapPoint(back, [back, front], masks)).toBeNull();
  });
});
