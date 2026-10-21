import { describe, expect, it } from "vitest";

import { emptyMeta } from "@/engine/meta/meta";
import { DEFAULT_VOLUME } from "@/engine/meta/settings";
import { LESSON_IDS } from "@/engine/tutorial/steps";
import { SAVE_KEY, SaveSchema, defaultSave, loadSave, migrate, type KeyValueStore } from "@/store/save";

// A save as version 2 of the app wrote it.
const V2 = {
  version: 2,
  profile: { createdAt: 10 },
  progress: { stars: { "xe-banh-mi-01": 3 } },
  inventory: { undo: 2, shuffle: 2, hint: 4 },
  settings: { sound: false, music: true, haptics: false },
  tutorial: { done: false },
  meta: emptyMeta(),
  lastSeenAt: 20,
};

describe("save migration v2 → v3", () => {
  it("turns on/off sound into volumes and keeps haptics", () => {
    const save = SaveSchema.parse(migrate(V2));
    expect(save.version).toBe(3);
    expect(save.settings).toEqual({ music: DEFAULT_VOLUME, sound: 0, haptics: false, reduceMotion: "system", reminders: true });
    expect(save.progress).toEqual(V2.progress);
    expect(save.inventory).toEqual(V2.inventory);
    expect(save.lastSeenAt).toBe(20);
  });

  it("skips the greeting and the lessons for a player who has already won a level", () => {
    const save = SaveSchema.parse(migrate(V2));
    expect(save.profile).toEqual({ createdAt: 10, name: null, welcomed: true });
    expect(save.tutorial.lessonsDone).toEqual([...LESSON_IDS]);
  });

  it("keeps the greeting and the lessons for a player who has not won yet", () => {
    const save = SaveSchema.parse(migrate({ ...V2, progress: { stars: {} } }));
    expect(save.profile.welcomed).toBe(false);
    expect(save.tutorial.lessonsDone).toEqual([]);
  });

  it("chains a v1 save through v2 to v3", () => {
    const v1 = { ...V2, version: 1, meta: {} };
    const data = new Map([[SAVE_KEY, JSON.stringify(v1)]]);
    const store: KeyValueStore = { getString: (key) => data.get(key), set: (key, value) => void data.set(key, value) };
    const result = loadSave(store, 99);
    expect(result.recovered).toBe(false);
    expect(result.save.version).toBe(3);
    expect(result.save.meta).toEqual(emptyMeta());
  });

  it("writes new saves at version 3 with nothing taught yet", () => {
    const save = defaultSave(1);
    expect(save.version).toBe(3);
    expect(save.profile.welcomed).toBe(false);
    expect(save.tutorial.lessonsDone).toEqual([]);
  });
});
