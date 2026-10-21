import { describe, expect, it } from "vitest";

import { MAP_SPOTS, nodePositions, sectionHeight } from "@/hud/mapPath";

const RADIUS = 28;
// iPhone 17 Pro Max and the smallest supported phone, in points; a district is at least 860 tall.
const WINDOWS = [
  { width: 440, height: sectionHeight(956) },
  { width: 375, height: sectionHeight(667) },
];

describe("map level spots", () => {
  it("has ten spots, first at the top", () => {
    expect(MAP_SPOTS).toHaveLength(10);
    for (let i = 1; i < MAP_SPOTS.length; i++) expect(MAP_SPOTS[i]!.y).toBeGreaterThan(MAP_SPOTS[i - 1]!.y);
  });

  for (const { width, height } of WINDOWS) {
    it(`keeps every button whole and apart on a ${width}×${height} screen`, () => {
      const nodes = nodePositions(width, height, RADIUS);
      for (const node of nodes) {
        expect(node.x - RADIUS).toBeGreaterThanOrEqual(12);
        expect(node.x + RADIUS).toBeLessThanOrEqual(width - 12);
        expect(node.y - RADIUS).toBeGreaterThanOrEqual(0);
        expect(node.y + RADIUS).toBeLessThanOrEqual(height);
      }
      for (let i = 1; i < nodes.length; i++) {
        const a = nodes[i - 1]!;
        const b = nodes[i]!;
        expect(b.y).toBeGreaterThan(a.y);
        // Buttons never touch, with room for the star row under each.
        expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThanOrEqual(2 * RADIUS + 4);
      }
    });
  }
});
