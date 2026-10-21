import { MATCH_SIZE, TRAY_CAPACITY } from "./constants";

export { MATCH_SIZE, TRAY_CAPACITY };

export interface TrayInsertResult {
  // Tray contents after the insert and any clear.
  tray: string[];
  // Slot the new item landed in, before any clear.
  slot: number;
  // First slot of the cleared run (before removal), or null when nothing cleared.
  clearedAt: number | null;
  // The tray is full and nothing cleared.
  lost: boolean;
}

// Places `kind` right after the last item of the same kind (or at the end), then clears
// the run when it reaches MATCH_SIZE.
export function insertIntoTray(tray: readonly string[], kind: string, capacity = TRAY_CAPACITY): TrayInsertResult {
  const lastSame = tray.lastIndexOf(kind);
  const slot = lastSame === -1 ? tray.length : lastSame + 1;
  const next = [...tray.slice(0, slot), kind, ...tray.slice(slot)];

  let runStart = slot;
  while (runStart > 0 && next[runStart - 1] === kind) runStart -= 1;
  const runLength = next.lastIndexOf(kind) - runStart + 1;

  if (runLength >= MATCH_SIZE) {
    next.splice(runStart, MATCH_SIZE);
    return { tray: next, slot, clearedAt: runStart, lost: false };
  }
  return { tray: next, slot, clearedAt: null, lost: next.length >= capacity };
}
