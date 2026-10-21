import { STARS_BY_BOOSTER_USES } from "./constants";
import type { PuzzleState } from "./types";

export function boosterUses(state: PuzzleState): number {
  return state.boosters.undo + state.boosters.shuffle + state.boosters.hint;
}

// 3 stars without boosters, 2 with one use, 1 with more (see constants.ts).
export function starsFor(state: PuzzleState): number {
  const uses = boosterUses(state);
  return STARS_BY_BOOSTER_USES[Math.min(uses, STARS_BY_BOOSTER_USES.length - 1)]!;
}
