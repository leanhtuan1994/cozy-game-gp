import { describe, expect, it } from "vitest";

import { ACHIEVEMENTS, isUnlocked, progressOf } from "@/engine/meta/achievements";
import { achievementContext, claim, claimable, emptyMeta, recordRun } from "@/engine/meta/meta";

const districts = Array.from({ length: 6 }, (_, d) => Array.from({ length: 10 }, (_, l) => `d${d}-${l}`));
const clock = { now: 1_800_000_000_000, tzOffsetMinutes: 420, lastSeenAt: 1_800_000_000_000 };
const inventory = { undo: 0, shuffle: 0, hint: 0 };

describe("achievements", () => {
  it("has about twenty unique achievements with rewards", () => {
    expect(ACHIEVEMENTS.length).toBe(20);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(20);
    for (const a of ACHIEVEMENTS) expect(Object.values(a.reward).reduce((s, n) => s + (n ?? 0), 0)).toBeGreaterThan(0);
  });

  it("unlocks from progress and stats, shows capped progress, and pays each once", () => {
    const stars = Object.fromEntries(districts[0]!.map((id) => [id, 3]));
    let meta = emptyMeta();
    for (let i = 0; i < 10; i += 1) meta = recordRun(meta, { levelIndex: i, triples: 12, stars: 3, coveredTaken: 2 });
    const context = achievementContext(meta, { stars }, districts);
    const byId = (id: string) => ACHIEVEMENTS.find((a) => a.id === id)!;
    expect(isUnlocked(byId("levels-10"), context)).toBe(true);
    expect(isUnlocked(byId("district-1"), context)).toBe(true);
    expect(isUnlocked(byId("district-2"), context)).toBe(false);
    expect(isUnlocked(byId("triples-100"), context)).toBe(true);
    expect(progressOf(byId("levels-30"), context)).toBe(10);

    expect(claimable(meta, clock, context).achievements).toBeGreaterThanOrEqual(4);
    const first = claim(meta, inventory, { type: "achievement", id: "levels-10" }, clock, context)!;
    expect(first.inventory.undo).toBe(1);
    expect(claim(first.meta, first.inventory, { type: "achievement", id: "levels-10" }, clock, context)).toBeNull();
    expect(claim(meta, inventory, { type: "achievement", id: "district-2" }, clock, context)).toBeNull();
  });

  it("pauses daily claims while the clock reads earlier than a moment already seen", () => {
    const context = achievementContext(emptyMeta(), { stars: {} }, districts);
    const wound = { ...clock, now: clock.lastSeenAt - 3_600_000 };
    expect(claim(emptyMeta(), inventory, { type: "login" }, wound, context)).toBeNull();
    expect(claimable(emptyMeta(), wound, context).login).toBe(false);
    expect(claim(emptyMeta(), inventory, { type: "login" }, clock, context)?.reward).toEqual({ hint: 1 });
  });
});
