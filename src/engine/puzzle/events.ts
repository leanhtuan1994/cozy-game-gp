import type { Booster } from "./types";

// What a rule call did, for the HUD, sound, haptics and the meta systems (quests, achievements).
export type PuzzleEvent =
  // `wasCovered`: another item covered it earlier in the run (for "items that were covered" quests).
  | { type: "itemTaken"; itemId: string; kind: string; slot: number; wasCovered: boolean }
  | { type: "itemBlocked"; itemId: string }
  | { type: "tripleCleared"; kind: string; slot: number; itemIds: string[] }
  // Undo put these items back on the board (the last tap, plus any triple it had cleared).
  | { type: "undone"; itemIds: string[] }
  // Shuffle dealt new kinds; covering may have changed with them.
  | { type: "shuffled" }
  | { type: "boosterUsed"; booster: Booster }
  | { type: "levelWon"; stars: number }
  | { type: "levelLost" };
