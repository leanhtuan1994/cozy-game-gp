import { describe, expect, it } from "vitest";

import { emptyTrayView, entrySlots, trayReducer, type TrayView } from "@/scene/trayView";

const rect = { x: 0, y: 0, width: 10, height: 10 };
const take = (view: TrayView, itemId: string, slot: number, clearedIds: string[] | null = null) =>
  trayReducer(view, { type: "taken", itemId, kind: itemId[0]!, slot, clearedIds, from: rect, fromOpaque: rect });

describe("trayReducer", () => {
  it("inserts at the engine's slot and keeps a cleared triple drawn until all three land", () => {
    let view = emptyTrayView(1);
    view = take(view, "a1", 0);
    view = take(view, "b1", 1);
    view = take(view, "a2", 1);
    view = take(view, "a3", 2, ["a1", "a2", "a3"]);
    expect(view.entries.map((e) => e.itemId)).toEqual(["a1", "a2", "a3", "b1"]);
    expect(entrySlots(view.entries)).toEqual([0, 1, 2, 0]);

    const landed = new Set<string>();
    for (const uid of ["1:a1", "1:a2"]) {
      landed.add(uid);
      view = trayReducer(view, { type: "landed", uid, landed });
    }
    expect(view.bursts).toEqual([]);
    landed.add("1:a3");
    view = trayReducer(view, { type: "landed", uid: "1:a3", landed });
    expect(view.bursts).toEqual([{ id: 1, slots: [0, 1, 2] }]);
    view = trayReducer(view, { type: "burstDone", id: 1 });
    expect(view.entries.map((e) => e.itemId)).toEqual(["b1"]);
  });

  it("never draws past the seventh slot while a triple clears", () => {
    let view = emptyTrayView(1);
    view = take(view, "a1", 0);
    view = take(view, "a2", 1);
    for (const [id, slot] of [["b1", 2], ["c1", 3], ["d1", 4], ["e1", 5]] as const) view = take(view, id, slot);
    view = take(view, "a3", 2, ["a1", "a2", "a3"]);
    view = take(view, "f1", 4);
    expect(Math.max(...entrySlots(view.entries))).toBeLessThan(7);
  });

  it("returns the same state for actions that change nothing visible", () => {
    const view = take(emptyTrayView(1), "a1", 0);
    expect(trayReducer(view, { type: "landed", uid: "1:a1", landed: new Set(["1:a1"]) })).toBe(view);
    expect(trayReducer(view, { type: "burstDone", id: 4 })).toBe(view);
  });

  it("redraws from the engine tray without flights on reset", () => {
    const view = trayReducer(take(emptyTrayView(1), "a1", 0), { type: "reset", run: 2, tray: [{ id: "b1", kind: "b" }] });
    expect(view.run).toBe(2);
    expect(view.entries).toMatchObject([{ itemId: "b1", from: null, group: null }]);
  });
});
