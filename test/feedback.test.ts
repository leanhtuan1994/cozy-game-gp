/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { defaultSettings } from "@/engine/meta/settings";
import { LOGIN_GIFTS } from "@/engine/meta/loginRewards";
import { PRESET_NATIVE_NAMES, feedbackFor, isChestGift, starSchedule, trayWarning, uiFeedbackFor, type FeedbackEvent } from "@/feedback/plan";

const on = defaultSettings();
const taken: FeedbackEvent = { type: "itemTaken", itemId: "i0", kind: "a", slot: 0, wasCovered: false };
const cleared: FeedbackEvent = { type: "tripleCleared", kind: "a", slot: 0, itemIds: ["i0", "i1", "i2"] };

describe("feedback", () => {
  it("plays every sound of a moment once and the strongest vibration", () => {
    expect(feedbackFor([taken], on)).toEqual({ sfx: ["tap"], haptic: "take" });
    expect(feedbackFor([taken, cleared], on)).toEqual({ sfx: ["tap", "clear"], haptic: "triple" });
    expect(feedbackFor([taken, { type: "levelLost" }], on)).toEqual({ sfx: ["tap", "lose"], haptic: "lose" });
    expect(feedbackFor([{ type: "itemBlocked", itemId: "i3" }], on)).toEqual({ sfx: ["blocked"], haptic: "nope" });
  });

  it("leaves the win vibration to the star schedule", () => {
    expect(feedbackFor([taken, cleared, { type: "levelWon", stars: 3 }], on)).toEqual({ sfx: ["tap", "clear", "win"], haptic: "triple" });
  });

  it("gives each booster its own vibration", () => {
    expect(feedbackFor([{ type: "boosterUsed", booster: "undo" }], on).haptic).toBe("undo");
    expect(feedbackFor([{ type: "boosterUsed", booster: "shuffle" }, { type: "shuffled" }], on).haptic).toBe("shuffle");
    expect(feedbackFor([{ type: "boosterUsed", booster: "hint" }], on)).toEqual({ sfx: ["booster"], haptic: "hint" });
  });

  it("clicks and taps for a button press or a changed setting, each as its setting allows", () => {
    expect(uiFeedbackFor("tick", on)).toEqual({ sfx: ["button"], haptic: "tick" });
    expect(uiFeedbackFor("select", on)).toEqual({ sfx: ["button"], haptic: "select" });
    expect(uiFeedbackFor("tick", { sound: 0, haptics: true })).toEqual({ sfx: [], haptic: "tick" });
    expect(uiFeedbackFor("tick", { sound: 0.35, haptics: false })).toEqual({ sfx: ["button"], haptic: null });
  });

  it("maps the moments raised by the UI", () => {
    expect(feedbackFor([{ type: "rewardClaimed" }], on)).toEqual({ sfx: ["reward"], haptic: "reward" });
    expect(feedbackFor([{ type: "chestOpened" }], on)).toEqual({ sfx: ["reward"], haptic: "chest" });
    expect(feedbackFor([{ type: "lessonBlocked" }], on)).toEqual({ sfx: [], haptic: "nope" });
    expect(feedbackFor([{ type: "lockedLevel" }], on)).toEqual({ sfx: [], haptic: "nope" });
  });

  it("warns when a take leaves one free slot, unless it cleared a triple", () => {
    const tray = (before: number, after: number) => ({ before, after, capacity: 7 });
    expect(feedbackFor([taken], on, tray(5, 6)).haptic).toBe("trayWarn");
    expect(feedbackFor([taken, cleared], on, tray(5, 6)).haptic).toBe("triple");
    expect(feedbackFor([taken], on, tray(4, 5)).haptic).toBe("take");
    expect(feedbackFor([{ type: "undone", itemIds: ["i0"] }], on, tray(5, 6)).haptic).toBeNull();
  });

  it("raises the tray warning only on the way up to the last slot", () => {
    const capacity = 7;
    expect(trayWarning({ before: 5, after: 6, capacity }, false)).toBe(true);
    expect(trayWarning({ before: 6, after: 6, capacity }, false)).toBe(false);
    expect(trayWarning({ before: 6, after: 7, capacity }, false)).toBe(false);
    expect(trayWarning({ before: 5, after: 6, capacity }, true)).toBe(false);
  });

  it("stays silent with sound at 0 and still with haptics off", () => {
    expect(feedbackFor([taken, cleared], { sound: 0, haptics: true }).sfx).toEqual([]);
    expect(feedbackFor([taken, cleared], { sound: 1, haptics: false }).haptic).toBeNull();
    expect(feedbackFor([{ type: "lockedLevel" }], { sound: 1, haptics: false }).haptic).toBeNull();
  });

  it("gives nothing for events with no feedback", () => {
    expect(feedbackFor([{ type: "shuffled" }, { type: "undone", itemIds: [] }], on)).toEqual({ sfx: [], haptic: null });
  });
});

describe("star schedule", () => {
  it("pops one vibration per star, growing, then the win", () => {
    expect(starSchedule(3, false, 200, 100)).toEqual([
      { atMs: 100, haptic: "star", star: 0 },
      { atMs: 300, haptic: "star", star: 1 },
      { atMs: 500, haptic: "star", star: 2 },
      { atMs: 650, haptic: "win" },
    ]);
    expect(starSchedule(1, false, 200, 100)).toEqual([
      { atMs: 100, haptic: "star", star: 0 },
      { atMs: 250, haptic: "win" },
    ]);
  });

  it("plays only the win with no stars or with reduce motion", () => {
    expect(starSchedule(0, false)).toEqual([{ atMs: 0, haptic: "win" }]);
    expect(starSchedule(3, true)).toEqual([{ atMs: 0, haptic: "win" }]);
  });
});

describe("day-7 chest", () => {
  it("is the last gift of the week, read before claiming", () => {
    expect(isChestGift(LOGIN_GIFTS.length - 1, LOGIN_GIFTS.length)).toBe(true);
    expect(isChestGift(LOGIN_GIFTS.length - 2, LOGIN_GIFTS.length)).toBe(false);
    expect(isChestGift(0, LOGIN_GIFTS.length)).toBe(false);
  });
});

describe("Pulsar presets", () => {
  it("preloads only names the package knows", () => {
    // Read the package source: preloadPresets ignores unknown names silently.
    const source = readFileSync(new URL("../node_modules/react-native-pulsar/src/Presets.ts", import.meta.url), "utf8");
    for (const name of PRESET_NATIVE_NAMES) expect(source).toContain(`Pulsar_play('${name}')`);
  });
});
