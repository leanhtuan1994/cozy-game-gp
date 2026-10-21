import { nextFloat, nextIndex, type RngState } from "../rng";
import { MATCH_SIZE, NEAR_FULL_TRAY, PLAYOUTS, SOLVER_NODE_BUDGET, TRAY_CAPACITY } from "./constants";
import type { LevelMetrics, PuzzleState } from "./types";

export interface SolveResult {
  // `unknown` when the search budget ran out before an answer.
  status: "solved" | "unsolvable" | "unknown";
  // Item ids to tap in order, from the given position to the win.
  solution: string[] | null;
  metrics: Omit<LevelMetrics, "lossRate"> | null;
  nodes: number;
}

// Compact, mutable model of a position for fast search: items are indices, covering is counted.
interface Model {
  ids: string[];
  kind: number[];
  // Items each item covers (that are still on the board).
  covers: number[][];
  // Remaining coverers per item; 0 means free.
  blockers: number[];
  removed: Uint8Array;
  remaining: number;
  trayCount: number[];
  trayLen: number;
}

function buildModel(state: PuzzleState): Model {
  const ids = [...state.board];
  const index = new Map(ids.map((id, i) => [id, i]));
  const kindIndex = new Map<string, number>();
  const kindOf = (kind: string) => {
    if (!kindIndex.has(kind)) kindIndex.set(kind, kindIndex.size);
    return kindIndex.get(kind)!;
  };
  const kind = ids.map((id) => kindOf(state.kinds[id]!));
  const trayKinds = state.tray.map((item) => kindOf(item.kind));
  const covers: number[][] = ids.map(() => []);
  const blockers = ids.map(() => 0);
  for (const cover of state.covers) {
    const top = index.get(cover.top);
    const bottom = index.get(cover.bottom);
    if (top === undefined || bottom === undefined) continue;
    covers[top]!.push(bottom);
    blockers[bottom]! += 1;
  }
  const trayCount = Array.from({ length: kindIndex.size }, () => 0);
  for (const k of trayKinds) trayCount[k]! += 1;
  return { ids, kind, covers, blockers, removed: new Uint8Array(ids.length), remaining: ids.length, trayCount, trayLen: trayKinds.length };
}

// Applies a tap and returns whether a triple cleared; the caller checks for a full tray.
function take(model: Model, i: number): boolean {
  model.removed[i] = 1;
  model.remaining -= 1;
  for (const b of model.covers[i]!) model.blockers[b]! -= 1;
  const k = model.kind[i]!;
  model.trayCount[k]! += 1;
  model.trayLen += 1;
  if (model.trayCount[k] === MATCH_SIZE) {
    model.trayCount[k] = 0;
    model.trayLen -= MATCH_SIZE;
    return true;
  }
  return false;
}

function untake(model: Model, i: number, cleared: boolean): void {
  const k = model.kind[i]!;
  if (cleared) {
    model.trayCount[k] = MATCH_SIZE;
    model.trayLen += MATCH_SIZE;
  }
  model.trayCount[k]! -= 1;
  model.trayLen -= 1;
  for (const b of model.covers[i]!) model.blockers[b]! += 1;
  model.removed[i] = 0;
  model.remaining += 1;
}

function freeIndices(model: Model): number[] {
  const free: number[] = [];
  for (let i = 0; i < model.ids.length; i += 1) if (!model.removed[i] && model.blockers[i] === 0) free.push(i);
  return free;
}

function positionKey(model: Model): string {
  let key = "";
  for (let i = 0; i < model.removed.length; i += 30) {
    let chunk = 0;
    for (let j = i; j < Math.min(i + 30, model.removed.length); j += 1) chunk = chunk * 2 + model.removed[j]!;
    key += `${chunk.toString(36)},`;
  }
  return `${key}|${model.trayCount.join("")}`;
}

// Taps worth trying first: complete a triple, then join a pair, then kinds whose triple can be
// finished from the free items, then taps that uncover the most items. Among free items of
// the same kind that uncover nothing, only one is tried: they lead to identical positions.
function orderedMoves(model: Model): number[] {
  const free = freeIndices(model);
  const freeOfKind = new Map<number, number>();
  for (const i of free) freeOfKind.set(model.kind[i]!, (freeOfKind.get(model.kind[i]!) ?? 0) + 1);
  const uncovers = (i: number) => model.covers[i]!.filter((b) => model.blockers[b] === 1).length;
  const seenPlain = new Set<number>();
  const moves = free.filter((i) => {
    if (model.covers[i]!.length > 0) return true;
    const k = model.kind[i]!;
    if (seenPlain.has(k)) return false;
    seenPlain.add(k);
    return true;
  });
  const score = (i: number) => {
    const k = model.kind[i]!;
    const inTray = model.trayCount[k]!;
    const finishable = inTray + (freeOfKind.get(k) ?? 0) >= MATCH_SIZE ? 1 : 0;
    return inTray * 100 + finishable * 50 + uncovers(i);
  };
  return moves.sort((a, b) => score(b) - score(a) || a - b);
}

// Depth-first search with a memo of dead positions. Deterministic: same input, same answer.
export function solve(state: PuzzleState, budget = SOLVER_NODE_BUDGET): SolveResult {
  const model = buildModel(state);
  const dead = new Set<string>();
  const path: number[] = [];
  let nodes = 0;
  let backtracks = 0;
  let outOfBudget = false;

  const search = (): boolean => {
    if (model.remaining === 0) return model.trayLen === 0;
    if (nodes >= budget) {
      outOfBudget = true;
      return false;
    }
    nodes += 1;
    const key = positionKey(model);
    if (dead.has(key)) return false;
    for (const i of orderedMoves(model)) {
      const cleared = take(model, i);
      if (model.trayLen < TRAY_CAPACITY) {
        path.push(i);
        if (search()) {
          untake(model, i, cleared);
          return true;
        }
        path.pop();
        if (outOfBudget) {
          untake(model, i, cleared);
          return false;
        }
        backtracks += 1;
      }
      untake(model, i, cleared);
    }
    dead.add(key);
    return false;
  };

  if (state.status === "won") return { status: "solved", solution: [], metrics: pathMetrics(model, [], backtracks), nodes };
  if (state.status === "lost") return { status: "unsolvable", solution: null, metrics: null, nodes };
  const found = search();
  if (!found) return { status: outOfBudget ? "unknown" : "unsolvable", solution: null, metrics: null, nodes };
  return { status: "solved", solution: path.map((i) => model.ids[i]!), metrics: pathMetrics(model, path, backtracks), nodes };
}

function pathMetrics(model: Model, path: readonly number[], backtracks: number): Omit<LevelMetrics, "lossRate"> {
  let maxTray = model.trayLen;
  let nearFullSteps = 0;
  const applied: [number, boolean][] = [];
  for (const i of path) {
    applied.push([i, take(model, i)]);
    maxTray = Math.max(maxTray, model.trayLen + (applied[applied.length - 1]![1] ? MATCH_SIZE : 0));
    if (model.trayLen >= NEAR_FULL_TRAY) nearFullSteps += 1;
  }
  for (let j = applied.length - 1; j >= 0; j -= 1) untake(model, applied[j]![0], applied[j]![1]);
  return { solutionLength: path.length, maxTray, nearFullSteps, backtracks };
}

// Share of `playouts` games lost by a casual but sensible player: it finishes a pair when it
// can (90%), joins an item already in the tray when it can (60%), and otherwise taps any free
// item at random. Deterministic for a given rng state.
export function estimateLossRate(state: PuzzleState, rng: RngState, playouts = PLAYOUTS): number {
  let losses = 0;
  for (let game = 0; game < playouts; game += 1) {
    const model = buildModel(state);
    while (model.remaining > 0) {
      const free = freeIndices(model);
      const pairs = free.filter((i) => model.trayCount[model.kind[i]!] === 2);
      const singles = free.filter((i) => model.trayCount[model.kind[i]!] === 1);
      const pool = pairs.length > 0 && nextFloat(rng) < 0.9 ? pairs : singles.length > 0 && nextFloat(rng) < 0.6 ? singles : free;
      take(model, pool[nextIndex(rng, pool.length)]!);
      if (model.trayLen >= TRAY_CAPACITY) break;
    }
    if (model.remaining > 0 || model.trayLen > 0) losses += 1;
  }
  return losses / playouts;
}

// The solver's top-ranked tap that does not fill the tray, without searching. Null when every
// free tap loses at once.
export function bestGuessMove(state: PuzzleState): string | null {
  const model = buildModel(state);
  for (const i of orderedMoves(model)) {
    const cleared = take(model, i);
    const safe = model.trayLen < TRAY_CAPACITY;
    untake(model, i, cleared);
    if (safe) return model.ids[i]!;
  }
  return null;
}
