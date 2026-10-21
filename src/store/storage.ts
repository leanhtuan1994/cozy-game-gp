import { Platform, Settings } from "react-native";
import { createMMKV } from "react-native-mmkv";

import { LEVEL_DATA } from "@/engine/levels/data";
import { LESSON_IDS } from "@/engine/tutorial/steps";

import { SAVE_KEY, defaultSave, loadSave, writeSave, type KeyValueStore, type Save } from "./save";

// Kept before -ghepPhoUnlockAll replaces the save, so a test run never loses a real one.
const BEFORE_UNLOCK_KEY = "save.beforeUnlockAll";

// The app's single MMKV instance, behind the small interface the save module needs.
const mmkv = createMMKV({ id: "ghep-pho" });

export const appStore: KeyValueStore = {
  getString: (key) => mmkv.getString(key),
  set: (key, value) => mmkv.set(key, value),
};

// Test builds (EXPO_PUBLIC_TEST_PROBES=1 or EXPO_PUBLIC_DEBUG_HUD=1) accept three iOS launch
// arguments, read through NSUserDefaults, so automated flows and fps runs start from a known save:
//   -ghepPhoResetSave YES   a fresh save
//   -ghepPhoUnlockAll YES   every level won with 1 star, so any level can be opened (no greeting, no lessons)
//   -ghepPhoSkipIntro YES   the greeting and the lessons marked done, for flows that test other things
// Store builds ignore all three.
const skipIntro = (save: Save): Save => ({ ...save, profile: { ...save.profile, welcomed: true }, tutorial: { lessonsDone: [...LESSON_IDS] } });

const TEST_BUILD = process.env.EXPO_PUBLIC_TEST_PROBES === "1" || process.env.EXPO_PUBLIC_DEBUG_HUD === "1";
const isOn = (key: string) => String(Settings.get(key) ?? "").toUpperCase() === "YES";
if (TEST_BUILD && Platform.OS === "ios") {
  if (isOn("ghepPhoResetSave")) mmkv.remove(SAVE_KEY);
  if (isOn("ghepPhoUnlockAll")) {
    const existing = mmkv.getString(SAVE_KEY);
    if (existing !== undefined) mmkv.set(BEFORE_UNLOCK_KEY, existing);
    const save = skipIntro(defaultSave(0));
    const stars = Object.fromEntries(LEVEL_DATA.map((data) => [(data as { id: string }).id, 1]));
    writeSave(appStore, { ...save, progress: { stars } });
  }
  if (isOn("ghepPhoSkipIntro")) {
    const { save, readOnly } = loadSave(appStore, Date.now());
    if (!readOnly) writeSave(appStore, skipIntro(save));
  }
}
