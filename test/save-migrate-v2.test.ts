import { describe, expect, it } from "vitest";

import { emptyMeta } from "@/engine/meta/meta";
import { SAVE_KEY, loadSave, migrate, type KeyValueStore } from "@/store/save";

// A save as version 1 of the app wrote it.
const V1 = {
  version: 1,
  profile: { createdAt: 10 },
  progress: { stars: { "xe-banh-mi-01": 3, "xe-banh-mi-02": 2 } },
  inventory: { undo: 3, shuffle: 1, hint: 0 },
  settings: { sound: false, music: true, haptics: true },
  tutorial: { done: true },
  meta: {},
  lastSeenAt: 20,
};

describe("save migration v1 → v2", () => {
  it("keeps progress and inventory and adds empty retention state", () => {
    expect(migrate(V1)).toMatchObject({ progress: V1.progress, inventory: V1.inventory, meta: emptyMeta(), lastSeenAt: 20 });
  });

  it("loads a v1 save from storage without treating it as corrupt", () => {
    const data = new Map([[SAVE_KEY, JSON.stringify(V1)]]);
    const store: KeyValueStore = { getString: (key) => data.get(key), set: (key, value) => void data.set(key, value) };
    const result = loadSave(store, 99);
    expect(result).toMatchObject({ recovered: false, readOnly: false });
    expect(result.save.progress).toEqual(V1.progress);
    expect(result.save.inventory).toEqual(V1.inventory);
    expect(result.save.meta).toEqual(emptyMeta());
  });

  it("migrates a v1 save that has no meta key at all", () => {
    const { meta: _meta, ...withoutMeta } = V1;
    expect(migrate(withoutMeta)).toEqual(migrate(V1));
  });
});
