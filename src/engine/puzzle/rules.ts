import { hashSeed, nextIndex, type RngState } from "../rng";
import { HINT_NODE_BUDGET, MATCH_SIZE } from "./constants";
import { isFree } from "./board";
import { computeCovers, coveredByIndex } from "./covers";
import type { PuzzleEvent } from "./events";
import { placeItems } from "./level";
import { bestGuessMove, solve } from "./solver";
import { starsFor } from "./stars";
import { insertIntoTray } from "./tray";
import type { LevelDef, MaskSet, PuzzleState, TrayItem } from "./types";

// A level and the sprite masks its kinds use. Shuffle needs the masks to recompute covering.
export interface Puzzle {
  level: LevelDef;
  masks: MaskSet;
}

export interface RuleResult {
  state: PuzzleState;
  events: PuzzleEvent[];
}

export function createPuzzle(level: LevelDef, masks: MaskSet = {}): Puzzle {
  return { level, masks };
}

export function initialState(level: LevelDef): PuzzleState {
  return {
    levelId: level.id,
    board: level.items.map((item) => item.id),
    tray: [],
    kinds: Object.fromEntries(level.items.map((item) => [item.id, item.kind])),
    covers: level.covers,
    rng: hashSeed(`${level.seed}/shuffle`),
    history: [],
    boosters: { undo: 0, shuffle: 0, hint: 0 },
    status: "playing",
  };
}

// For each item, the items that currently cover it.
export function coveredBy(state: PuzzleState): Map<string, string[]> {
  return coveredByIndex(state.board, state.covers);
}

export { freeItems, isFree } from "./board";

// Moves a free item into the tray, next to its kind, and clears a completed triple.
// Taking a covered item (or any tap after the level ended) changes nothing.
export function tapItem(state: PuzzleState, id: string): RuleResult {
  if (state.status !== "playing") return { state, events: [] };
  if (!isFree(state, id)) {
    return { state, events: state.board.includes(id) ? [{ type: "itemBlocked", itemId: id }] : [] };
  }
  const kind = state.kinds[id]!;
  const result = insertIntoTray(
    state.tray.map((item) => item.kind),
    kind,
  );
  const tray: TrayItem[] = [...state.tray.slice(0, result.slot), { id, kind }, ...state.tray.slice(result.slot)];
  const wasCovered = state.covers.some((cover) => cover.bottom === id);
  const events: PuzzleEvent[] = [{ type: "itemTaken", itemId: id, kind, slot: result.slot, wasCovered }];
  if (result.clearedAt !== null) {
    const cleared = tray.splice(result.clearedAt, MATCH_SIZE);
    events.push({ type: "tripleCleared", kind, slot: result.clearedAt, itemIds: cleared.map((item) => item.id) });
  }

  const board = state.board.filter((other) => other !== id);
  let next: PuzzleState = {
    ...state,
    board,
    tray,
    history: [...state.history, { board: state.board, tray: state.tray }],
  };
  if (board.length === 0 && tray.length === 0) {
    next = { ...next, status: "won" };
    events.push({ type: "levelWon", stars: starsFor(next) });
  } else if (result.lost) {
    next = { ...next, status: "lost" };
    events.push({ type: "levelLost" });
  }
  return { state: next, events };
}

// Puts the board and tray back as they were before the last tap, including any triple that
// tap cleared, and reopens a lost level (the lose screen's "use a booster"). It steps back one
// tap per use, back to the last shuffle. Not available after a win.
export function undo(state: PuzzleState): RuleResult {
  const last = state.history[state.history.length - 1];
  if (!last || state.status === "won") return { state, events: [] };
  const returned = last.board.filter((id) => !state.board.includes(id));
  return {
    state: {
      ...state,
      board: last.board,
      tray: last.tray,
      history: state.history.slice(0, -1),
      boosters: { ...state.boosters, undo: state.boosters.undo + 1 },
      status: "playing",
    },
    events: [
      { type: "boosterUsed", booster: "undo" },
      { type: "undone", itemIds: returned },
    ],
  };
}

// Deals the kinds of the items still on the board out again, then recomputes covering for the
// new sprites (same boxes, new shapes). The board's multiset of kinds is unchanged, so every
// kind still completes in threes. Undo history is cleared: a tap from before the shuffle cannot
// be restored onto the new kinds. Not available once the level has ended.
export function shuffle(puzzle: Puzzle, state: PuzzleState): RuleResult {
  if (state.status !== "playing" || state.board.length < 2) return { state, events: [] };
  const rng: RngState = [...state.rng];
  const dealt = state.board.map((id) => state.kinds[id]!);
  for (let i = dealt.length - 1; i > 0; i -= 1) {
    const j = nextIndex(rng, i + 1);
    [dealt[i], dealt[j]] = [dealt[j]!, dealt[i]!];
  }
  const kinds = { ...state.kinds };
  state.board.forEach((id, i) => {
    kinds[id] = dealt[i]!;
  });
  const onBoard = new Set(state.board);
  const items = puzzle.level.items.filter((item) => onBoard.has(item.id));
  const covers = computeCovers(placeItems(items, puzzle.masks, kinds), puzzle.masks);
  return {
    state: { ...state, kinds, covers, rng, history: [], boosters: { ...state.boosters, shuffle: state.boosters.shuffle + 1 } },
    events: [{ type: "boosterUsed", booster: "shuffle" }, { type: "shuffled" }],
  };
}

// The next tap on a winning line from the current position. The search budget is kept small for
// the phone; when it runs out, the best-ranked tap that does not lose at once is shown instead.
// Null when every tap loses: the hint is not consumed then. A free hint (the tutorial's) shows the
// item without counting against the stars.
export function hint(state: PuzzleState, free = false): RuleResult & { itemId: string | null } {
  if (state.status !== "playing") return { state, events: [], itemId: null };
  const result = solve(state, HINT_NODE_BUDGET);
  const itemId = result.solution?.[0] ?? (result.status === "unknown" ? bestGuessMove(state) : null);
  if (itemId === null || free) return { state, events: [], itemId };
  return {
    state: { ...state, boosters: { ...state.boosters, hint: state.boosters.hint + 1 } },
    events: [{ type: "boosterUsed", booster: "hint" }],
    itemId,
  };
}
