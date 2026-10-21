import { describe, expect, it } from "vitest";

import { QUEST_CHEST, addRunToQuests, claimChest, claimQuest, emptyQuests, questDef, questsForDay, visitQuests } from "@/engine/meta/dailyQuests";
import { dayNumber, nextLocalTime } from "@/engine/meta/calendar";
import { claim, emptyMeta, recordRun, visit } from "@/engine/meta/meta";
import { planReminders } from "@/engine/meta/reminders";

const run = (over: Partial<{ triples: number; stars: number; coveredTaken: number }> = {}) => ({ levelIndex: 0, triples: 3, stars: 3, coveredTaken: 1, ...over });

describe("daily quests", () => {
  it("picks three distinct quests per day, always starting with 'Thắng 1 màn', the same way for the same day", () => {
    for (let day = 0; day < 40; day += 1) {
      const quests = questsForDay(day).map((q) => q.id);
      expect(quests[0]).toBe("win-1");
      expect(new Set(quests).size).toBe(3);
      expect(questsForDay(day).map((q) => q.id)).toEqual(quests);
    }
    expect(new Set(Array.from({ length: 40 }, (_, d) => questsForDay(d).slice(1).map((q) => q.id).join())).size).toBeGreaterThan(5);
  });

  it("progresses from won runs, claims each finished quest once, then the chest", () => {
    let state = visitQuests(emptyQuests(), 7);
    expect(claimQuest(state, "win-1")).toBeNull();
    for (let i = 0; i < 40; i += 1) state = addRunToQuests(state, run({ triples: 5, coveredTaken: 3 }));
    expect(claimChest(state)).toBeNull();
    for (const quest of state.quests) {
      const claimed = claimQuest(state, quest.id)!;
      expect(claimed.reward).toEqual(questDef(quest.id)!.reward);
      state = claimed.state;
      expect(claimQuest(state, quest.id)).toBeNull();
    }
    const chest = claimChest(state)!;
    expect(chest.reward).toEqual(QUEST_CHEST);
    expect(claimChest(chest.state)).toBeNull();
  });

  it("starts fresh quests on a new day and keeps them on an earlier day", () => {
    const today = addRunToQuests(visitQuests(emptyQuests(), 7), run());
    expect(visitQuests(today, 6)).toBe(today);
    expect(visitQuests(today, 8).quests.every((q) => q.progress === 0)).toBe(true);
  });
});

describe("reminders", () => {
  const VN = 420;
  // 2026-10-16 10:00 in Vietnam.
  const morning = Date.UTC(2026, 9, 16, 3, 0, 0);
  const clock = (now: number) => ({ now, tzOffsetMinutes: VN, lastSeenAt: now });

  it("always plans exactly the gift and the quest reminders", () => {
    const meta = visit(emptyMeta(), clock(morning));
    const plan = planReminders(meta, clock(morning));
    expect(plan.map((r) => r.id)).toEqual(["gift", "quests"]);
    expect(plan[0]!.at).toBe(nextLocalTime(morning, VN, 19));
    expect(plan[1]!.at).toBe(nextLocalTime(morning, VN, 20, 30));
  });

  it("moves today's quest reminder to tomorrow once all of today's quests are done", () => {
    const meta = visit(emptyMeta(), clock(morning));
    const done = { ...meta, quests: { ...meta.quests, quests: meta.quests.quests.map((quest) => ({ ...quest, progress: questDef(quest.id)!.target })) } };
    const [gift, quests] = planReminders(done, clock(morning));
    expect(dayNumber(gift!.at, VN)).toBe(dayNumber(morning, VN));
    expect(dayNumber(quests!.at, VN)).toBe(dayNumber(morning, VN) + 1);
  });

  it("does not pay yesterday's finished quest after the day has changed", () => {
    const won = recordRun(visit(emptyMeta(), clock(morning)), run());
    const inventory = { undo: 0, shuffle: 0, hint: 0 };
    const context = { levelsCompleted: 1, threeStarLevels: 1, triplesCleared: 3, bestStreak: 1, boostersUsed: 0, districtsDone: [] };
    expect(claim(won, inventory, { type: "quest", id: "win-1" }, clock(morning), context)).not.toBeNull();
    expect(claim(won, inventory, { type: "quest", id: "win-1" }, clock(morning + 86_400_000), context)).toBeNull();
  });

  it("moves today's gift reminder to tomorrow once today's gift is claimed", () => {
    const meta = visit(emptyMeta(), clock(morning));
    const claimed = { ...meta, login: { ...meta.login, lastClaimDay: dayNumber(morning, VN), nextDay: 1 } };
    const gift = planReminders(claimed, clock(morning))[0]!;
    expect(dayNumber(gift.at, VN)).toBe(dayNumber(morning, VN) + 1);
  });
});
