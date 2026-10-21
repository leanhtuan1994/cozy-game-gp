/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CHAPTERS } from "@/engine/levels/chapterTemplates";
import { LEVEL_DATA } from "@/engine/levels/data";
import { freeItems } from "@/engine/puzzle/board";
import { solve } from "@/engine/puzzle/solver";
import { LevelDefSchema, type MaskSet } from "@/engine/puzzle/types";
import { LESSON_IDS } from "@/engine/tutorial/steps";
import { SAVE_KEY, defaultSave, writeSave, type KeyValueStore } from "@/store/save";
import { GameSession } from "@/store/session";

const root = new URL("..", import.meta.url).pathname;
const levels = LEVEL_DATA.map((data) => LevelDefSchema.parse(data));
const masks = new Map(CHAPTERS.map((c) => [c.id, JSON.parse(readFileSync(`${root}assets/items/${c.id}/masks.json`, "utf8")) as MaskSet]));

// Sessions here test the game rules, so the save starts with the lessons done (the tutorial has
// its own tests).
function makeSession(data = new Map<string, string>()) {
  const store: KeyValueStore = { getString: (key) => data.get(key), set: (key, value) => void data.set(key, value) };
  if (!data.has(SAVE_KEY)) writeSave(store, { ...defaultSave(1000), tutorial: { lessonsDone: [...LESSON_IDS] } });
  let clock = 1000;
  const session = new GameSession({ store, now: () => (clock += 1), tzOffset: () => 420, levels, masksFor: (id) => masks.get(id)! });
  return { session, data };
}

describe("GameSession", () => {
  it("only opens levels in order", () => {
    const { session } = makeSession();
    expect(session.startLevel(1)).toBe(false);
    expect(session.startLevel(0)).toBe(true);
    expect(session.getSnapshot().play?.level.id).toBe("xe-banh-mi-01");
  });

  it("wins a level, records stars and progress, and persists them", () => {
    const { session, data } = makeSession();
    session.startLevel(0);
    const events = solve(session.getSnapshot().play!.state).solution!.flatMap((id) => session.tap(id));
    const { play, save } = session.getSnapshot();
    expect(play?.outcome).toEqual({ type: "won", stars: 3, reward: null, firstWin: true });
    expect(save.progress).toEqual({ stars: { "xe-banh-mi-01": 3 } });
    expect(events.some((event) => event.type === "levelWon")).toBe(true);
    expect(JSON.parse(data.get(SAVE_KEY)!).progress.stars).toEqual({ "xe-banh-mi-01": 3 });

    // A fresh session reads the same progress back, and the next level is open.
    const reloaded = makeSession(data).session;
    expect(reloaded.isUnlocked(1)).toBe(true);
    expect(reloaded.isUnlocked(2)).toBe(false);
    expect(reloaded.startLevel(reloaded.levelIndexOf("xe-banh-mi-02"))).toBe(true);
  });

  it("spends inventory only when a booster does something", () => {
    const { session } = makeSession();
    session.startLevel(0);
    const before = session.getSnapshot().save.inventory;
    expect(session.useBooster("undo").status).toBe("unavailable");
    expect(session.getSnapshot().save.inventory).toEqual(before);

    expect(session.useBooster("hint").status).toBe("used");
    const hinted = session.getSnapshot();
    expect(hinted.save.inventory.hint).toBe(before.hint - 1);
    expect(hinted.play?.hintId).not.toBeNull();
    session.tap(hinted.play!.hintId!);
    expect(session.getSnapshot().play?.hintId).toBeNull();
    expect(session.useBooster("undo").status).toBe("used");
    expect(session.useBooster("undo").status).toBe("unavailable");
  });

  it("persists booster use at once, so killing the app does not refund it", () => {
    const { session, data } = makeSession();
    session.startLevel(0);
    session.useBooster("hint");
    expect(JSON.parse(data.get(SAVE_KEY)!).inventory.hint).toBe(1);
  });

  it("does not charge again for a hint that is still showing", () => {
    const { session } = makeSession();
    session.startLevel(0);
    expect(session.useBooster("hint").status).toBe("used");
    const shown = session.getSnapshot().play!.hintId;
    expect(session.useBooster("hint")).toEqual({ status: "unavailable", events: [] });
    expect(session.getSnapshot().save.inventory.hint).toBe(1);
    expect(session.getSnapshot().play!.hintId).toBe(shown);
  });

  it("refuses a booster when the inventory is empty", () => {
    const { session } = makeSession();
    session.startLevel(0);
    session.useBooster("hint");
    session.tap(session.getSnapshot().play!.hintId!);
    session.useBooster("hint");
    expect(session.getSnapshot().save.inventory.hint).toBe(0);
    expect(session.useBooster("hint").status).toBe("empty");
  });

  it("keeps the snapshot when a tap is blocked, so nothing redraws", () => {
    const { session } = makeSession();
    session.startLevel(0);
    const before = session.getSnapshot();
    expect(before.play!.level.covers.length).toBeGreaterThan(0);
    const covered = before.play!.level.covers[0]!.bottom;
    expect(session.tap(covered)).toEqual([{ type: "itemBlocked", itemId: covered }]);
    expect(session.getSnapshot()).toBe(before);
  });

  it("hit-tests taps on the board and reports the item under the finger", () => {
    const { session } = makeSession();
    session.startLevel(0);
    const play = session.getSnapshot().play!;
    const target = play.placed[play.placed.length - 1]!;
    const centre = { x: target.rect.x + target.rect.width / 2, y: target.rect.y + target.rect.height / 2 };
    expect(session.tapAt(centre).hit?.id).toBe(target.id);
    expect(session.tapAt({ x: -50, y: -50 })).toEqual({ hit: null, events: [] });
  });

  it("reports a tap on an item the lesson step does not teach, and takes nothing", () => {
    // A fresh save: level 1 opens with the tapping lesson.
    const data = new Map<string, string>();
    writeSave({ getString: (key) => data.get(key), set: (key, value) => void data.set(key, value) }, defaultSave(1000));
    const { session } = makeSession(data);
    session.startLevel(0);
    const play = session.getSnapshot().play!;
    const taught = play.lesson!.lesson.steps[0]!.items;
    // Lessons are planned from the opening position, so look for any other item whose centre it owns.
    const free = new Set(freeItems(play.state));
    const results = play.placed
      .filter((item) => free.has(item.id) && !taught.includes(item.id))
      .map((item) => session.tapAt({ x: item.rect.x + item.rect.width / 2, y: item.rect.y + item.rect.height / 2 }));
    const blocked = results.find((result) => result.lessonBlocked);
    expect(blocked).toEqual({ hit: null, events: [], lessonBlocked: true });
    expect(session.getSnapshot().play!.state.tray).toEqual([]);
  });

  it("offers only Undo after a loss, and Undo reopens the level", () => {
    // Open every level, then lose the hardest one by never letting a kind reach three.
    const data = new Map<string, string>();
    makeSession(data).session.touch();
    const save = JSON.parse(data.get(SAVE_KEY)!);
    data.set(SAVE_KEY, JSON.stringify({ ...save, progress: { stars: Object.fromEntries(levels.map((level) => [level.id, 1])) } }));
    const { session } = makeSession(data);
    expect(session.startLevel(levels.length - 1)).toBe(true);
    while (!session.getSnapshot().play!.outcome) {
      const { state } = session.getSnapshot().play!;
      const inTray = (kind: string) => state.tray.filter((item) => item.kind === kind).length;
      const pick = freeItems(state).find((id) => inTray(state.kinds[id]!) < 2);
      if (!pick) break;
      session.tap(pick);
    }
    expect(session.getSnapshot().play!.outcome).toEqual({ type: "lost" });
    expect(session.useBooster("hint").status).toBe("unavailable");
    expect(session.useBooster("shuffle").status).toBe("unavailable");
    expect(session.useBooster("undo").status).toBe("used");
    expect(session.getSnapshot().play!.outcome).toBeNull();
    expect(session.getSnapshot().play!.state.status).toBe("playing");
  });

  it("counts a won run into stats and quests once, and claims the day's first quest", () => {
    const { session } = makeSession();
    expect(session.claimable()).toMatchObject({ login: true, quests: 0 });
    expect(session.claim({ type: "login" })).toEqual({ hint: 1 });
    expect(session.claim({ type: "login" })).toBeNull();
    session.startLevel(0);
    for (const id of solve(session.getSnapshot().play!.state).solution!) session.tap(id);
    const meta = session.getSnapshot().save.meta;
    expect(meta.stats).toMatchObject({ levelsWon: 1, triplesCleared: 3, threeStarWins: 1 });
    expect(meta.quests.quests[0]).toEqual({ id: "win-1", progress: 1, claimed: false });
    expect(session.claim({ type: "quest", id: "win-1" })).toEqual({ hint: 1 });
    expect(session.claim({ type: "achievement", id: "first-win" })).toEqual({ hint: 1 });
    expect(session.getSnapshot().save.inventory.hint).toBe(2 + 1 + 1 + 1);
  });

  it("retries the same level with a new run number", () => {
    const { session } = makeSession();
    session.startLevel(0);
    const run = session.getSnapshot().play!.run;
    session.restart();
    expect(session.getSnapshot().play!.run).toBe(run + 1);
    session.quit();
    expect(session.getSnapshot().play).toBeNull();
  });
});

describe("GameSession across days", () => {
  const DAY = 86_400_000;
  // 2026-10-16 23:50 in Vietnam (UTC+7).
  const lateEvening = Date.UTC(2026, 9, 16, 16, 50);

  function clocked(start: number) {
    const data = new Map<string, string>();
    const store: KeyValueStore = { getString: (key) => data.get(key), set: (key, value) => void data.set(key, value) };
    const time = { now: start };
    const open = () => new GameSession({ store, now: () => time.now, tzOffset: () => 420, levels, masksFor: (id) => masks.get(id)! });
    return { time, open };
  }

  it("counts a claim after midnight as the new day's visit, so the streak survives", () => {
    const { time, open } = clocked(lateEvening);
    const session = open();
    expect(session.getSnapshot().save.meta.login.streak).toBe(1);
    time.now = lateEvening + 40 * 60_000;
    expect(session.claim({ type: "login" })).toEqual({ hint: 1 });
    const meta = session.getSnapshot().save.meta;
    expect(meta.login.streak).toBe(2);
    expect(meta.quests.day).toBe(meta.login.lastVisitDay);

    time.now = lateEvening + 40 * 60_000 + DAY;
    expect(open().getSnapshot().save.meta.login.streak).toBe(3);
  });

  it("starts the new day on visit, and does nothing (no save, no redraw) within the same day", () => {
    const { time, open } = clocked(lateEvening);
    const session = open();
    let notified = 0;
    session.subscribe(() => (notified += 1));
    const before = session.getSnapshot();
    time.now += 60_000;
    session.visit();
    expect(notified).toBe(0);
    expect(session.getSnapshot()).toBe(before);

    time.now = lateEvening + 20 * 60_000;
    session.visit();
    expect(notified).toBe(1);
    expect(session.claimable()).toMatchObject({ login: true, paused: false });
  });

  it("pauses gifts while the clock is wound back, then resumes when it catches up", () => {
    const { time, open } = clocked(lateEvening + 20 * 60_000);
    open().claim({ type: "login" });
    time.now = lateEvening - 3 * 60 * 60_000;
    const wound = open();
    expect(wound.claimable()).toMatchObject({ login: false, quests: 0, paused: true });
    expect(wound.claim({ type: "login" })).toBeNull();

    time.now = lateEvening + 20 * 60_000 + DAY;
    expect(wound.claimable()).toMatchObject({ login: true, paused: false });
  });

  it("rebases onto a clock corrected back by days instead of freezing until it catches up", () => {
    const { time, open } = clocked(lateEvening + 10 * DAY);
    open().claim({ type: "login" });
    time.now = lateEvening;
    const corrected = open();
    // Today counts as claimed (a later day already was), but nothing waits ten days.
    expect(corrected.claimable()).toMatchObject({ login: false, paused: false });
    expect(corrected.getSnapshot().save.lastSeenAt).toBe(lateEvening);
    expect(corrected.getSnapshot().save.meta.quests.day).toBe(corrected.getSnapshot().save.meta.login.lastVisitDay);

    time.now = lateEvening + 20 * 60_000;
    corrected.visit();
    expect(corrected.claim({ type: "login" })).toEqual({ undo: 1 });
  });
});
