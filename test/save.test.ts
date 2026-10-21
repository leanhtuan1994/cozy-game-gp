import { describe, expect, it } from "vitest";

import { recordWin } from "@/engine/meta/progress";
import { CORRUPT_KEY, SAVE_KEY, defaultSave, loadSave, migrate, writeSave, type KeyValueStore } from "@/store/save";

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return { data, getString: (key) => data.get(key), set: (key, value) => void data.set(key, value) };
}

describe("save", () => {
  it("starts fresh when there is no save", () => {
    const store = memoryStore();
    expect(loadSave(store, 1000)).toEqual({ save: defaultSave(1000), recovered: false, readOnly: false });
    expect(store.data.size).toBe(0);
  });

  it("round-trips through the store", () => {
    const store = memoryStore();
    const win = recordWin(defaultSave(1).progress, defaultSave(1).inventory, "xe-banh-mi-01", 0, 3);
    const save = { ...defaultSave(1), progress: win.progress, tutorial: { lessonsDone: ["tap" as const] } };
    writeSave(store, save);
    expect(loadSave(store, 2).save).toEqual(save);
  });

  it("keeps a corrupt save under the backup key instead of overwriting it", () => {
    for (const raw of ["{not json", JSON.stringify({ version: 1, progress: "nope" }), JSON.stringify({ nothing: true })]) {
      const store = memoryStore({ [SAVE_KEY]: raw });
      const result = loadSave(store, 5000);
      expect(result.recovered).toBe(true);
      expect(store.data.get(CORRUPT_KEY)).toBe(raw);
      expect(result.save).toEqual(defaultSave(5000));
      expect(JSON.parse(store.data.get(SAVE_KEY)!)).toEqual(defaultSave(5000));
    }
  });

  it("treats a save from a newer app version as read-only and leaves it alone", () => {
    const raw = JSON.stringify({ version: 99, anything: true });
    const store = memoryStore({ [SAVE_KEY]: raw });
    expect(loadSave(store, 7)).toEqual({ save: defaultSave(7), recovered: false, readOnly: true });
    expect(store.data.get(SAVE_KEY)).toBe(raw);
    expect(store.data.has(CORRUPT_KEY)).toBe(false);
  });

  it("migrates nothing at the current version and passes unknown shapes through for validation", () => {
    expect(migrate(defaultSave(1))).toEqual(defaultSave(1));
    expect(migrate("text")).toBe("text");
  });

  it("refuses to write an invalid save", () => {
    const store = memoryStore();
    expect(() => writeSave(store, { ...defaultSave(1), inventory: { undo: -1, shuffle: 0, hint: 0 } })).toThrow();
  });
});

describe("progress", () => {
  it("opens the next level on a first win, keeps best stars, and pays first-win rewards once", () => {
    const start = defaultSave(0);
    const first = recordWin(start.progress, start.inventory, "a", 1, 2);
    expect(first).toMatchObject({ firstWin: true, reward: "undo", progress: { stars: { a: 2 } } });
    expect(first.inventory.undo).toBe(start.inventory.undo + 1);
    const again = recordWin(first.progress, first.inventory, "a", 1, 3);
    expect(again).toMatchObject({ firstWin: false, reward: null, progress: { stars: { a: 3 } } });
    expect(again.inventory).toEqual(first.inventory);
    expect(recordWin(again.progress, again.inventory, "a", 1, 1).progress.stars.a).toBe(3);
  });
});
