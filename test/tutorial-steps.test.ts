/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CHAPTERS } from "@/engine/levels/chapterTemplates";
import { LEVEL_DATA } from "@/engine/levels/data";
import { findTapPoint } from "@/engine/puzzle/hitTest";
import { placeItems } from "@/engine/puzzle/level";
import { initialState, tapItem } from "@/engine/puzzle/rules";
import { solve } from "@/engine/puzzle/solver";
import { LevelDefSchema, type MaskSet } from "@/engine/puzzle/types";
import { LESSON_IDS, currentStep, lessonFor, planLesson, type LessonId } from "@/engine/tutorial/steps";
import { SAVE_KEY, defaultSave, writeSave, type KeyValueStore } from "@/store/save";
import { GameSession } from "@/store/session";

const root = new URL("..", import.meta.url).pathname;
const levels = LEVEL_DATA.map((data) => LevelDefSchema.parse(data));
const masks = new Map(CHAPTERS.map((c) => [c.id, JSON.parse(readFileSync(`${root}assets/items/${c.id}/masks.json`, "utf8")) as MaskSet]));

// A session whose save has the first `won` levels won and the given lessons done.
function makeSession(won = 0, lessonsDone: LessonId[] = []) {
  const data = new Map<string, string>();
  const store: KeyValueStore = { getString: (key) => data.get(key), set: (key, value) => void data.set(key, value) };
  const stars = Object.fromEntries(levels.slice(0, won).map((level) => [level.id, 3]));
  writeSave(store, { ...defaultSave(1), progress: { stars }, tutorial: { lessonsDone } });
  const open = () => new GameSession({ store, now: () => 1000, tzOffset: () => 420, levels, masksFor: (id) => masks.get(id)! });
  return { session: open(), open, data };
}

const step = (session: GameSession) => currentStep(session.getSnapshot().play?.lesson ?? null);

describe("tutorial lessons", () => {
  it("teaches tapping on level 1, covered items on level 2 and the Hint on level 3, once each", () => {
    expect(lessonFor(0, [])).toBe("tap");
    expect(lessonFor(1, [])).toBe("covered");
    expect(lessonFor(2, [])).toBe("hint");
    expect(lessonFor(3, [])).toBeNull();
    expect(lessonFor(1, ["covered"])).toBeNull();
  });

  it("plans every lesson from the real level data, each target can be tapped, and the forced moves keep the level winnable", () => {
    for (const id of LESSON_IDS) {
      const level = levels[LESSON_IDS.indexOf(id)]!;
      const levelMasks = masks.get(level.chapter)!;
      let state = initialState(level);
      const lesson = planLesson(id, state);
      expect(lesson, `${id} on ${level.id}`).not.toBeNull();
      for (const s of lesson!.steps) {
        if (s.target.type !== "item") continue;
        // The taught item must show somewhere a finger reaches it, even when it is the covered one.
        const onBoard = new Set(state.board);
        const placed = placeItems(level.items, levelMasks, state.kinds).filter((item) => onBoard.has(item.id));
        const target = placed.find((item) => item.id === (s.target as { itemId: string }).itemId)!;
        expect(findTapPoint(target, placed, levelMasks), `${id} step "${s.text}"`).not.toBeNull();
        if (s.until !== "itemBlocked") state = tapItem(state, target.id).state;
      }
      expect(state.status).toBe("playing");
      expect(solve(state).status, `${id} on ${level.id} after the lesson`).toBe("solved");
    }
  });

  it("lets only the taught item answer during a step, then frees play when the lesson ends", () => {
    const { session, open } = makeSession();
    session.startLevel(0);
    const first = step(session)!;
    expect(first.target.type).toBe("item");
    const taught = first.target.type === "item" ? first.target.itemId : "";
    const other = session.getSnapshot().play!.state.board.find((id) => id !== taught)!;

    const before = session.getSnapshot();
    expect(session.tap(other)).toEqual([]);
    expect(session.getSnapshot()).toBe(before);
    expect(session.useBooster("shuffle").status).toBe("unavailable");

    expect(session.tap(taught).some((event) => event.type === "itemTaken")).toBe(true);
    expect(step(session)?.until).toBe("next");
    session.nextLessonStep();
    for (let i = 0; i < 2; i += 1) {
      const s = step(session)!;
      session.tap(s.target.type === "item" ? s.target.itemId : "");
    }
    expect(session.getSnapshot().play?.lesson).toBeNull();
    expect(session.getSnapshot().save.tutorial.lessonsDone).toEqual(["tap"]);
    // Free play after the lesson, and the lesson is not taught again.
    expect(session.useBooster("shuffle").status).toBe("used");
    const again = open();
    again.startLevel(0);
    expect(again.getSnapshot().play?.lesson).toBeNull();
  });

  it("advances the covered-item lesson on the blocked tap it asks for", () => {
    const { session } = makeSession(1, ["tap"]);
    session.startLevel(1);
    const blocked = step(session)!;
    expect(blocked.until).toBe("itemBlocked");
    const events = session.tap(blocked.target.type === "item" ? blocked.target.itemId : "");
    expect(events.map((event) => event.type)).toEqual(["itemBlocked"]);
    expect(session.getSnapshot().play?.lesson?.step).toBe(1);
  });

  it("gives the lesson's Hint free: no inventory charge and no star cost", () => {
    const { session } = makeSession(2, ["tap", "covered"]);
    session.startLevel(2);
    const inventory = session.getSnapshot().save.inventory;
    expect(session.useBooster("undo").status).toBe("unavailable");
    expect(session.useBooster("hint").status).toBe("used");
    const play = session.getSnapshot().play!;
    expect(session.getSnapshot().save.inventory).toEqual(inventory);
    expect(play.state.boosters.hint).toBe(0);
    expect(play.hintId).not.toBeNull();
    expect(step(session)?.target).toEqual({ type: "hinted" });
    session.tap(play.hintId!);
    expect(session.getSnapshot().play?.lesson).toBeNull();
    expect(session.getSnapshot().save.tutorial.lessonsDone).toEqual(["tap", "covered", "hint"]);
  });

  it("skips a lesson for good, and teaches all again after a reset", () => {
    const { session, open, data } = makeSession();
    session.startLevel(0);
    session.skipLesson();
    expect(session.getSnapshot().play?.lesson).toBeNull();
    expect(JSON.parse(data.get(SAVE_KEY)!).tutorial.lessonsDone).toEqual(["tap"]);
    session.resetLessons();
    const again = open();
    again.startLevel(0);
    expect(again.getSnapshot().play?.lesson?.lesson.id).toBe("tap");
  });
});

describe("profile and settings commands", () => {
  it("finishes the greeting with a trimmed name, or none", () => {
    const { session } = makeSession();
    session.finishOnboarding("  Tư  ");
    expect(session.getSnapshot().save.profile).toMatchObject({ name: "Tư", welcomed: true });
    session.finishOnboarding("   ");
    expect(session.getSnapshot().save.profile.name).toBeNull();
  });

  it("saves settings at once and keeps them (and the name) through a progress reset", () => {
    const { session, open } = makeSession(5, [...LESSON_IDS]);
    session.finishOnboarding("Na");
    session.updateSettings({ music: 0, haptics: false });
    session.resetProgress();
    const save = open().getSnapshot().save;
    expect(save.settings).toMatchObject({ music: 0, haptics: false });
    expect(save.profile).toMatchObject({ name: "Na", welcomed: true });
    expect(save.progress.stars).toEqual({});
    expect(save.tutorial.lessonsDone).toEqual([]);
  });

  it("changes nothing (no save, no redraw) for settings that are already set or a late second Tiếp", () => {
    const { session } = makeSession();
    const before = session.getSnapshot();
    session.updateSettings({ music: before.save.settings.music });
    session.resetLessons();
    expect(session.getSnapshot()).toBe(before);
    session.startLevel(0);
    const playing = session.getSnapshot();
    session.nextLessonStep();
    expect(session.getSnapshot()).toBe(playing);
  });
});
