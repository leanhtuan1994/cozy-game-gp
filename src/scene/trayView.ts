import { MATCH_SIZE } from "@/engine/puzzle/constants";
import type { Rect, TrayItem } from "@/engine/puzzle/types";

// The tray as drawn. The engine's tray changes at once (a triple clears on the tap that completes
// it); the drawn tray lets each item fly in, keeps a cleared triple at the slots it held until all
// three have landed, shrinks it under a burst, and only then removes it. Every action that changes
// nothing visible returns the same state, so React skips the commit.
export interface TrayEntry {
  // Unique per run of a level, so a late animation callback cannot touch a restarted run.
  uid: string;
  itemId: string;
  kind: string;
  // Where the item left the board; null for an entry placed straight into its slot (Undo, restart).
  from: Rect | null;
  fromOpaque: Rect | null;
  // Set when the entry belongs to a triple the engine has cleared.
  group: number | null;
  // Slot the cleared entry keeps while it lands and shrinks; null for active entries.
  frozenSlot: number | null;
  // The whole triple has landed and is shrinking away.
  clearing: boolean;
}

export interface Burst {
  id: number;
  slots: number[];
}

export interface TrayView {
  run: number;
  entries: TrayEntry[];
  bursts: Burst[];
  nextGroup: number;
}

export type TrayAction =
  | { type: "taken"; itemId: string; kind: string; slot: number; clearedIds: readonly string[] | null; from: Rect; fromOpaque: Rect }
  // `landed` holds every uid whose flight has finished, tracked outside React state.
  | { type: "landed"; uid: string; landed: ReadonlySet<string> }
  | { type: "burstDone"; id: number }
  // Redraws the tray from the engine's tray with no flights (new run, Undo).
  | { type: "reset"; run: number; tray: readonly TrayItem[] };

export function emptyTrayView(run: number): TrayView {
  return { run, entries: [], bursts: [], nextGroup: 1 };
}

// Drawn slot of each entry: active entries follow the engine's tray, cleared ones stay put.
export function entrySlots(entries: readonly TrayEntry[]): number[] {
  let active = 0;
  return entries.map((entry) => entry.frozenSlot ?? active++);
}

export function trayReducer(view: TrayView, action: TrayAction): TrayView {
  switch (action.type) {
    case "taken": {
      const active = view.entries.filter((entry) => entry.group === null);
      const anchor = active[action.slot];
      const at = anchor ? view.entries.indexOf(anchor) : view.entries.length;
      const entry: TrayEntry = {
        uid: `${view.run}:${action.itemId}`,
        itemId: action.itemId,
        kind: action.kind,
        from: action.from,
        fromOpaque: action.fromOpaque,
        group: null,
        frozenSlot: null,
        clearing: false,
      };
      let entries = [...view.entries.slice(0, at), entry, ...view.entries.slice(at)];
      let nextGroup = view.nextGroup;
      if (action.clearedIds && action.clearedIds.length === MATCH_SIZE) {
        const activeNow = entries.filter((e) => e.group === null);
        const group = nextGroup;
        nextGroup += 1;
        entries = entries.map((e) => {
          if (e.group !== null || !action.clearedIds!.includes(e.itemId)) return e;
          return { ...e, group, frozenSlot: activeNow.indexOf(e) };
        });
      }
      return { ...view, entries, nextGroup };
    }
    case "landed": {
      const group = view.entries.find((e) => e.uid === action.uid)?.group ?? null;
      if (group === null) return view;
      const members = view.entries.filter((e) => e.group === group);
      if (members.some((e) => e.clearing || (e.from !== null && !action.landed.has(e.uid)))) return view;
      return {
        ...view,
        entries: view.entries.map((e) => (e.group === group ? { ...e, clearing: true } : e)),
        bursts: [...view.bursts, { id: group, slots: members.map((e) => e.frozenSlot ?? 0) }],
      };
    }
    case "burstDone":
      if (!view.bursts.some((burst) => burst.id === action.id)) return view;
      return {
        ...view,
        entries: view.entries.filter((e) => e.group !== action.id),
        bursts: view.bursts.filter((burst) => burst.id !== action.id),
      };
    case "reset":
      return {
        ...emptyTrayView(action.run),
        entries: action.tray.map((item) => ({
          uid: `${action.run}:${item.id}:placed`,
          itemId: item.id,
          kind: item.kind,
          from: null,
          fromOpaque: null,
          group: null,
          frozenSlot: null,
          clearing: false,
        })),
      };
  }
}
