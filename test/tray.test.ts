import { describe, expect, it } from "vitest";

import { insertIntoTray } from "@/engine/puzzle/tray";

describe("insertIntoTray", () => {
  it("appends a new kind at the end", () => {
    expect(insertIntoTray(["a", "b"], "c")).toEqual({ tray: ["a", "b", "c"], slot: 2, clearedAt: null, lost: false });
  });

  it("places an item right after the last of its kind", () => {
    expect(insertIntoTray(["a", "b", "c"], "a")).toMatchObject({ tray: ["a", "a", "b", "c"], slot: 1 });
  });

  it("clears a run of three and reports where it started", () => {
    expect(insertIntoTray(["b", "a", "a", "c"], "a")).toEqual({ tray: ["b", "c"], slot: 3, clearedAt: 1, lost: false });
  });

  it("loses when the seventh slot fills without a clear", () => {
    expect(insertIntoTray(["a", "b", "c", "d", "e", "f"], "g")).toMatchObject({ lost: true });
  });

  it("does not lose when the seventh item completes a triple", () => {
    expect(insertIntoTray(["a", "a", "b", "c", "d", "e"], "a")).toEqual({
      tray: ["b", "c", "d", "e"],
      slot: 2,
      clearedAt: 0,
      lost: false,
    });
  });
});
