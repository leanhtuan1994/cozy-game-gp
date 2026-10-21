import type { Reward } from "./rewards";

// Everything achievements are measured on, gathered by meta.ts from the save.
export interface AchievementContext {
  levelsCompleted: number;
  threeStarLevels: number;
  triplesCleared: number;
  bestStreak: number;
  boostersUsed: number;
  // Districts (0–5) whose ten levels are all won.
  districtsDone: readonly number[];
}

export interface AchievementDef {
  id: string;
  title: string;
  // Group shown together on the achievements screen, with tiers 1–3 in order.
  group: string;
  tier: number;
  target: number;
  measure: (context: AchievementContext) => number;
  reward: Reward;
}

const tiered = (group: string, idPrefix: string, title: (n: number) => string, targets: readonly number[], measure: AchievementDef["measure"], rewards: readonly Reward[]): AchievementDef[] =>
  targets.map((target, i) => ({ id: `${idPrefix}-${target}`, title: title(target), group, tier: i + 1, target, measure, reward: rewards[i]! }));

const DISTRICTS = ["Xe bánh mì", "Chợ hoa Tết", "Phố lồng đèn", "Cà phê vỉa hè", "Hẻm chè", "Chợ đêm"];

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: "first-win", title: "Màn đầu tiên", group: "Khởi đầu", tier: 1, target: 1, measure: (c) => c.levelsCompleted, reward: { hint: 1 } },
  ...tiered("Màn đã xong", "levels", (n) => `Xong ${n} màn`, [10, 30, 60], (c) => c.levelsCompleted, [{ undo: 1 }, { undo: 1, hint: 1 }, { undo: 2, shuffle: 2, hint: 2 }]),
  ...tiered("Bộ ba", "triples", (n) => `Xoá ${n} bộ ba`, [100, 500, 1000], (c) => c.triplesCleared, [{ shuffle: 1 }, { shuffle: 1, hint: 1 }, { undo: 2, shuffle: 2, hint: 2 }]),
  ...tiered("Ba sao", "stars", (n) => `${n} màn 3 sao`, [10, 30, 60], (c) => c.threeStarLevels, [{ hint: 1 }, { hint: 1, undo: 1 }, { undo: 2, shuffle: 2, hint: 2 }]),
  ...tiered("Chuỗi ngày", "streak", (n) => `Ghé ${n} ngày liền`, [3, 7, 30], (c) => c.bestStreak, [{ undo: 1 }, { undo: 1, shuffle: 1 }, { undo: 2, shuffle: 2, hint: 2 }]),
  ...DISTRICTS.map((name, i) => ({
    id: `district-${i + 1}`,
    title: `Dọn xong ${name}`,
    group: "Khu phố",
    tier: 1,
    target: 1,
    measure: (c: AchievementContext) => (c.districtsDone.includes(i) ? 1 : 0),
    reward: { undo: 1, shuffle: 1, hint: 1 },
  })),
  { id: "boosters-10", title: "Dùng 10 trợ giúp", group: "Khởi đầu", tier: 2, target: 10, measure: (c) => c.boostersUsed, reward: { shuffle: 1 } },
];

export function isUnlocked(def: AchievementDef, context: AchievementContext): boolean {
  return def.measure(context) >= def.target;
}

// Progress for display, capped at the target ("3/10").
export function progressOf(def: AchievementDef, context: AchievementContext): number {
  return Math.min(def.target, def.measure(context));
}
