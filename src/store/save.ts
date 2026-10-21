import { z } from "zod";

import { emptyMeta } from "@/engine/meta/meta";
import { STARTING_INVENTORY, emptyProgress } from "@/engine/meta/progress";
import { DEFAULT_VOLUME, NAME_MAX_LENGTH, defaultSettings } from "@/engine/meta/settings";
import { LESSON_IDS } from "@/engine/tutorial/steps";

// Persistent save, versioned. Progress only: a level in play is not saved, so reopening the app
// returns to the map. Add a new version with a migration step when the shape changes.
export const SAVE_KEY = "save";
// The last unreadable save is kept here (one key, so a bug cannot fill storage with copies).
export const CORRUPT_KEY = "save.corrupt";
export const SAVE_VERSION = 3;

const count = z.number().int().min(0);
const day = z.number().int().nullable();

const MetaSchema = z.object({
  stats: z.object({ levelsWon: count, triplesCleared: count, threeStarWins: count, coveredTaken: count, boostersUsed: count }),
  login: z.object({ nextDay: z.number().int().min(0).max(6), lastClaimDay: day, streak: count, bestStreak: count, lastVisitDay: day }),
  quests: z.object({
    day,
    quests: z.array(z.object({ id: z.string(), progress: count, claimed: z.boolean() })),
    chestClaimed: z.boolean(),
  }),
  achievementsClaimed: z.array(z.string()),
});

export const SaveSchema = z.object({
  version: z.literal(SAVE_VERSION),
  // `welcomed`: the first-run greeting is done (or skipped); `name` is optional.
  profile: z.object({ createdAt: z.number(), name: z.string().max(NAME_MAX_LENGTH).nullable(), welcomed: z.boolean() }),
  progress: z.object({ stars: z.record(z.string(), z.number().int().min(1).max(3)) }),
  inventory: z.object({ undo: count, shuffle: count, hint: count }),
  settings: z.object({
    music: z.number().min(0).max(1),
    sound: z.number().min(0).max(1),
    haptics: z.boolean(),
    reduceMotion: z.enum(["system", "on", "off"]),
    reminders: z.boolean(),
  }),
  // Lessons done or skipped; each of levels 1–3 teaches one until it is in this list. Renaming or
  // removing a lesson id needs a save migration, or saves holding the old id fail to load.
  tutorial: z.object({ lessonsDone: z.array(z.enum(LESSON_IDS)) }),
  // Retention systems: counters, login gift and streak, daily quests, claimed achievements.
  meta: MetaSchema,
  lastSeenAt: z.number(),
});
export type Save = z.infer<typeof SaveSchema>;

// The tiny slice of MMKV the save needs, so tests can use a Map.
export interface KeyValueStore {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
}

export function defaultSave(now: number): Save {
  return {
    version: SAVE_VERSION,
    profile: { createdAt: now, name: null, welcomed: false },
    progress: emptyProgress(),
    inventory: { ...STARTING_INVENTORY },
    settings: defaultSettings(),
    tutorial: { lessonsDone: [] },
    meta: emptyMeta(),
    lastSeenAt: now,
  };
}

// Upgrades older saves step by step to the current version. Each step turns version n into n + 1.
const MIGRATIONS: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {
  // v1 kept an untyped, always-empty `meta`; v2 types it for rewards, quests and achievements.
  1: (data) => ({ ...data, version: 2, meta: emptyMeta() }),
  // v3 adds the welcome and per-lesson tutorial state, volumes instead of on/off, reduce motion and
  // reminders. A player who has won a level has seen the game: no greeting and no lessons.
  2: (data) => {
    const settings = (data.settings ?? {}) as { sound?: boolean; music?: boolean; haptics?: boolean };
    const tutorial = (data.tutorial ?? {}) as { done?: boolean };
    const profile = (data.profile ?? {}) as { createdAt?: number };
    const stars = ((data.progress ?? {}) as { stars?: Record<string, unknown> }).stars ?? {};
    const played = Object.keys(stars).length > 0;
    return {
      ...data,
      version: 3,
      profile: { ...profile, name: null, welcomed: played },
      settings: {
        ...defaultSettings(),
        music: settings.music === false ? 0 : DEFAULT_VOLUME,
        sound: settings.sound === false ? 0 : DEFAULT_VOLUME,
        haptics: settings.haptics !== false,
      },
      tutorial: { lessonsDone: played || tutorial.done === true ? [...LESSON_IDS] : [] },
    };
  },
};

export function migrate(data: unknown): unknown {
  let current = data as Record<string, unknown> | null;
  while (current && typeof current.version === "number" && current.version < SAVE_VERSION) {
    const step = MIGRATIONS[current.version];
    if (!step) return current;
    current = step(current);
  }
  return current;
}

export interface LoadResult {
  save: Save;
  // True when an existing save could not be read; its raw text was kept under CORRUPT_KEY.
  recovered: boolean;
  // True when the save comes from a newer app version (for example after a rollback). The game
  // then plays from a fresh save and must not write, so the newer save survives.
  readOnly: boolean;
}

// Reads the save. A missing save starts fresh. A save that cannot be parsed or migrated is never
// overwritten in place: its raw text is first copied to CORRUPT_KEY, then a fresh save is used.
export function loadSave(store: KeyValueStore, now: number): LoadResult {
  const raw = store.getString(SAVE_KEY);
  if (raw === undefined) return { save: defaultSave(now), recovered: false, readOnly: false };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    data = undefined;
  }
  const version = z.object({ version: z.number().int() }).safeParse(data);
  if (version.success && version.data.version > SAVE_VERSION) return { save: defaultSave(now), recovered: false, readOnly: true };
  const parsed = SaveSchema.safeParse(migrate(data));
  if (parsed.success) return { save: parsed.data, recovered: false, readOnly: false };
  store.set(CORRUPT_KEY, raw);
  const fresh = defaultSave(now);
  writeSave(store, fresh);
  return { save: fresh, recovered: true, readOnly: false };
}

export function writeSave(store: KeyValueStore, save: Save): void {
  store.set(SAVE_KEY, JSON.stringify(SaveSchema.parse(save)));
}
