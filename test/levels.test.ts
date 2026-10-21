/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CHAPTERS } from "@/engine/levels/chapterTemplates";
import { LEVEL_DATA } from "@/engine/levels/data";
import { rectInPolygon } from "@/engine/levels/zones";
import { computeCovers } from "@/engine/puzzle/covers";
import { placeItems } from "@/engine/puzzle/level";
import { opaqueRect } from "@/engine/puzzle/mask";
import { initialState } from "@/engine/puzzle/rules";
import { solve } from "@/engine/puzzle/solver";
import { LevelDefSchema, type MaskSet } from "@/engine/puzzle/types";

const root = new URL("..", import.meta.url).pathname;
const levels = LEVEL_DATA.map((data) => LevelDefSchema.parse(data));
const masksFor = new Map(CHAPTERS.map((chapter) => [chapter.id, JSON.parse(readFileSync(`${root}assets/items/${chapter.id}/masks.json`, "utf8")) as MaskSet]));

describe("the 60 levels", () => {
  it("are ten per chapter, in chapter order", () => {
    expect(levels).toHaveLength(CHAPTERS.length * 10);
    CHAPTERS.forEach((chapter, c) => {
      const ids = levels.slice(c * 10, c * 10 + 10).map((level) => level.id);
      expect(ids).toEqual(Array.from({ length: 10 }, (_, i) => `${chapter.id}-${String(i + 1).padStart(2, "0")}`));
    });
  });

  it("use only their chapter's kinds and stay inside its zone", () => {
    for (const level of levels) {
      const chapter = CHAPTERS.find((c) => c.id === level.chapter)!;
      const masks = masksFor.get(chapter.id)!;
      for (const item of level.items) expect(chapter.kinds).toContain(item.kind);
      for (const placed of placeItems(level.items, masks)) {
        expect(rectInPolygon(opaqueRect(masks[placed.kind]!, placed.rect), chapter.zone.polygon), `${level.id} ${placed.id}`).toBe(true);
      }
    }
  });

  it("store the covering that the current sprites produce", () => {
    // Fails when a sprite is regenerated without regenerating its levels.
    for (const level of levels) {
      const masks = masksFor.get(level.chapter)!;
      expect(level.covers, level.id).toEqual(computeCovers(placeItems(level.items, masks), masks));
    }
  });

  it("are all solvable", () => {
    for (const level of levels) expect(solve(initialState(level)).status, level.id).toBe("solved");
  });

  it("end each chapter on its hardest level", () => {
    for (let c = 0; c < CHAPTERS.length; c += 1) {
      const loss = levels.slice(c * 10, c * 10 + 10).map((level) => level.metrics!.lossRate);
      expect(loss[9]).toBeGreaterThanOrEqual(Math.max(...loss.slice(0, 9)));
    }
  });
});
