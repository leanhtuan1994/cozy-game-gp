import type { Booster } from "../puzzle/types";
import type { Inventory } from "./rewards";

export type { Inventory };

// Player progress across the 60 levels, kept in the save. Levels are played in order: level `i`
// (0-based, play order) is open once `i` levels have been won, so a district opens when the
// previous district's last level is won. Because play is linear, the won levels are always the
// first ones, and their count is the index of the next level to open.
export interface Progress {
  // Best stars per level id (1–3); absent means never won.
  stars: Record<string, number>;
}


export const STARTING_INVENTORY: Inventory = { undo: 2, shuffle: 2, hint: 2 };

// First wins on every second level hand out one booster, cycling through the three kinds.
const REWARD_CYCLE: readonly Booster[] = ["undo", "hint", "shuffle"];

export function emptyProgress(): Progress {
  return { stars: {} };
}

export function completedCount(progress: Progress): number {
  return Object.keys(progress.stars).length;
}

export function isUnlocked(progress: Progress, levelIndex: number): boolean {
  return levelIndex <= completedCount(progress);
}

// The booster a first win of this level hands out, if any.
export function firstWinReward(levelIndex: number): Booster | null {
  if (levelIndex % 2 === 0) return null;
  return REWARD_CYCLE[Math.floor(levelIndex / 2) % REWARD_CYCLE.length]!;
}

export interface WinResult {
  progress: Progress;
  inventory: Inventory;
  reward: Booster | null;
  firstWin: boolean;
}

// Records a win: keeps the best stars (which also opens the next level on a first win) and pays
// the first-win reward. Replaying a won level never pays again.
export function recordWin(progress: Progress, inventory: Inventory, levelId: string, levelIndex: number, stars: number): WinResult {
  const firstWin = progress.stars[levelId] === undefined;
  const reward = firstWin ? firstWinReward(levelIndex) : null;
  return {
    progress: { stars: { ...progress.stars, [levelId]: Math.max(stars, progress.stars[levelId] ?? 0) } },
    inventory: reward ? { ...inventory, [reward]: inventory[reward] + 1 } : inventory,
    reward,
    firstWin,
  };
}
