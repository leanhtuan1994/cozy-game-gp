/// <reference types="node" />
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CHAPTERS } from "@/engine/levels/chapterTemplates";
import { PlacementZoneSchema, polygonBounds } from "@/engine/levels/zones";
import { isCellSet } from "@/engine/puzzle/mask";
import { BOARD_SIZE, type MaskSet, type SpriteMask } from "@/engine/puzzle/types";

import { decodePng } from "../scripts/lib/png";

const root = new URL("..", import.meta.url).pathname;
const read = (path: string) => JSON.parse(readFileSync(`${root}${path}`, "utf8"));

// Share of the mask grid that is opaque: low for thin or stringy shapes that are hard to tap.
function fill(mask: SpriteMask): number {
  let opaque = 0;
  for (let row = 0; row < mask.size; row += 1) for (let col = 0; col < mask.size; col += 1) if (isCellSet(mask, col, row)) opaque += 1;
  return opaque / (mask.size * mask.size);
}

// Opaque bounding box of a background, in board units.
function opaqueBounds(path: string) {
  const png = decodePng(readFileSync(path));
  let minX = png.width;
  let minY = png.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      if (png.pixels[(y * png.width + x) * 4 + 3]! < 128) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  const k = BOARD_SIZE / png.width;
  return { x: minX * k, y: minY * k, width: (maxX - minX) * k, height: (maxY - minY) * k };
}

describe("art catalog", () => {
  for (const chapter of CHAPTERS) {
    describe(chapter.id, () => {
      it("has a background, a sprite and a hit mask for every kind", () => {
        expect(existsSync(`${root}assets/backgrounds/${chapter.id}.png`)).toBe(true);
        const masks: MaskSet = read(`assets/items/${chapter.id}/masks.json`);
        for (const kind of chapter.kinds) {
          expect(existsSync(`${root}assets/items/${chapter.id}/${kind}.png`), kind).toBe(true);
          expect(masks[kind], kind).toBeDefined();
        }
      });

      it("has item silhouettes that are easy to tap", () => {
        // Roughly as wide as tall, and mostly solid: no thin bottles, stems or strings.
        const masks: MaskSet = read(`assets/items/${chapter.id}/masks.json`);
        for (const kind of chapter.kinds) {
          const mask = masks[kind]!;
          const aspect = mask.bounds.width / mask.bounds.height;
          expect(aspect, `${kind} aspect`).toBeGreaterThanOrEqual(0.7);
          expect(aspect, `${kind} aspect`).toBeLessThanOrEqual(1.45);
          expect(fill(mask), `${kind} fill`).toBeGreaterThanOrEqual(0.5);
        }
      });

      it("has its zone on the opaque part of the background", () => {
        const art = opaqueBounds(`${root}assets/backgrounds/${chapter.id}.png`);
        const zone = polygonBounds(chapter.zone.polygon);
        expect(zone.x).toBeGreaterThanOrEqual(art.x);
        expect(zone.y).toBeGreaterThanOrEqual(art.y);
        expect(zone.x + zone.width).toBeLessThanOrEqual(art.x + art.width);
        expect(zone.y + zone.height).toBeLessThanOrEqual(art.y + art.height);
      });

      it("has a placement zone inside the board frame", () => {
        const zone = PlacementZoneSchema.parse(chapter.zone);
        for (const point of zone.polygon) {
          expect(point.x).toBeGreaterThanOrEqual(0);
          expect(point.x).toBeLessThanOrEqual(BOARD_SIZE);
          expect(point.y).toBeGreaterThanOrEqual(0);
          expect(point.y).toBeLessThanOrEqual(BOARD_SIZE);
        }
      });
    });
  }

  it("has six distinct kinds per chapter and no kind shared between chapters", () => {
    const all = CHAPTERS.flatMap((chapter) => chapter.kinds);
    for (const chapter of CHAPTERS) expect(new Set(chapter.kinds).size).toBe(6);
    expect(new Set(all).size).toBe(all.length);
  });
});
