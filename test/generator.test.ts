import { describe, expect, it } from "vitest";

import { PlacementZoneSchema, rectInPolygon } from "@/engine/levels/zones";
import { curveDifficulty, generateChapter, generateLevel, shapeFor } from "@/engine/puzzle/generator";
import { placeItems } from "@/engine/puzzle/level";
import { opaqueRect } from "@/engine/puzzle/mask";
import { initialState } from "@/engine/puzzle/rules";
import { solve } from "@/engine/puzzle/solver";
import { LevelDefSchema, type MaskSet } from "@/engine/puzzle/types";

import spikeMasks from "../assets/sprites/spike/masks.json";
import marketSquare from "./fixtures/zones/market-square.json";
import streetCorner from "./fixtures/zones/street-corner.json";

const masks: MaskSet = spikeMasks;
const kinds = Object.keys(masks);
const zones = [PlacementZoneSchema.parse(streetCorner), PlacementZoneSchema.parse(marketSquare)];

describe("generateLevel", () => {
  for (const zone of zones) {
    it(`makes 20 solvable levels that stay inside ${zone.id}`, () => {
      for (let n = 0; n < 20; n += 1) {
        const difficulty = n / 19;
        const level = LevelDefSchema.parse(generateLevel({ id: `${zone.id}-${n}`, chapter: "test", seed: `seed-${n}`, zone, kinds, masks, difficulty }));
        const shape = shapeFor(difficulty, kinds.length);
        expect(level.items).toHaveLength(shape.kindCount * shape.triplesPerKind * 3);
        expect(solve(initialState(level)).status).toBe("solved");
        for (const placed of placeItems(level.items, masks)) {
          expect(rectInPolygon(opaqueRect(masks[placed.kind]!, placed.rect), zone.polygon)).toBe(true);
        }
      }
    });
  }

  it("gets harder along the difficulty axis", () => {
    const loss = (difficulty: number) =>
      [0, 1, 2].map((s) => generateLevel({ id: "x", chapter: "c", seed: `d${s}`, zone: zones[0]!, kinds, masks, difficulty }).metrics!.lossRate);
    const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
    expect(average(loss(0))).toBeLessThan(average(loss(1)));
  });
});

describe("zones", () => {
  // An L shape: the notch at the top right is outside.
  const lShape = PlacementZoneSchema.parse({
    id: "l-shape",
    polygon: [
      { x: 100, y: 300 },
      { x: 500, y: 300 },
      { x: 500, y: 600 },
      { x: 900, y: 600 },
      { x: 900, y: 900 },
      { x: 100, y: 900 },
    ],
  });

  it("rejects a box that a concave notch cuts into", () => {
    // All four corners are inside, but the notch corner (500, 600) is inside the box.
    expect(rectInPolygon({ x: 420, y: 520, width: 160, height: 60 }, lShape.polygon)).toBe(false);
    expect(rectInPolygon({ x: 150, y: 650, width: 160, height: 160 }, lShape.polygon)).toBe(true);
  });

  it("keeps every item inside a concave zone", () => {
    for (let n = 0; n < 8; n += 1) {
      const level = generateLevel({ id: `l${n}`, chapter: "c", seed: `l${n}`, zone: lShape, kinds, masks, difficulty: n / 7 });
      for (const placed of placeItems(level.items, masks)) {
        expect(rectInPolygon(opaqueRect(masks[placed.kind]!, placed.rect), lShape.polygon)).toBe(true);
      }
    }
  });

  it("fails loudly when a zone is too narrow for any item", () => {
    const strip = PlacementZoneSchema.parse({ id: "strip", polygon: [{ x: 100, y: 500 }, { x: 900, y: 500 }, { x: 900, y: 540 }, { x: 100, y: 540 }] });
    expect(() => generateLevel({ id: "s", chapter: "c", seed: "s", zone: strip, kinds, masks, difficulty: 0.5, maxAttempts: 5 })).toThrow("fits zone strip");
  });
});

describe("generateChapter", () => {
  it("ends every chapter on its hardest level", () => {
    const levels = generateChapter({ chapter: "c", chapterIndex: 2, zone: zones[1]!, kinds, masks });
    expect(levels.map((level) => level.id)).toEqual(Array.from({ length: 10 }, (_, i) => `c-${String(i + 1).padStart(2, "0")}`));
    const loss = levels.map((level) => level.metrics!.lossRate);
    expect(loss[9]).toBeGreaterThanOrEqual(Math.max(...loss.slice(0, 9)));
  });
});

describe("curveDifficulty", () => {
  it("teaches first, ramps within a chapter, and rises across chapters", () => {
    expect(curveDifficulty(0, 0)).toBe(0);
    expect(curveDifficulty(0, 2)).toBeLessThan(0.1);
    for (let c = 0; c < 6; c += 1) {
      for (let l = 3; l < 10; l += 1) expect(curveDifficulty(c, l)).toBeGreaterThan(curveDifficulty(c, l - 1));
    }
    expect(curveDifficulty(5, 0)).toBeGreaterThan(curveDifficulty(0, 3));
    expect(curveDifficulty(5, 9)).toBe(1);
  });
});
