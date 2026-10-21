import type { PuzzleState } from "./types";

// Read-only questions about a position, safe for the UI to ask (they change nothing). They need
// only the items on the board and the covering among them.
type Position = Pick<PuzzleState, "board" | "covers">;

// On the board and not covered by any item still on the board.
export function isFree(state: Position, id: string): boolean {
  if (!state.board.includes(id)) return false;
  return state.covers.every((cover) => cover.bottom !== id || !state.board.includes(cover.top));
}

export function freeItems(state: Position): string[] {
  const present = new Set(state.board);
  const blocked = new Set(state.covers.filter((cover) => present.has(cover.top)).map((cover) => cover.bottom));
  return state.board.filter((id) => !blocked.has(id));
}

export function coveredItems(state: Position): Set<string> {
  const free = new Set(freeItems(state));
  return new Set(state.board.filter((id) => !free.has(id)));
}
