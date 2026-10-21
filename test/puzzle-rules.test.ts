import { describe, expect, it } from "vitest";

import { createPuzzle, freeItems, hint, initialState, isFree, shuffle, tapItem, undo } from "@/engine/puzzle/rules";
import { starsFor } from "@/engine/puzzle/stars";
import { LevelDefSchema, PuzzleStateSchema } from "@/engine/puzzle/types";
import { PlacementZoneSchema } from "@/engine/levels/zones";
import { computeCovers } from "@/engine/puzzle/covers";
import { generateLevel } from "@/engine/puzzle/generator";
import { placeItems } from "@/engine/puzzle/level";
import type { MaskSet } from "@/engine/puzzle/types";
import { makeLevel } from "./helpers";

import spikeMasks from "../assets/sprites/spike/masks.json";
import streetCorner from "./fixtures/zones/street-corner.json";

const masks: MaskSet = spikeMasks;

const tapAll = (puzzle: ReturnType<typeof createPuzzle>, ids: string[]) => {
  let state = initialState(puzzle.level);
  const events = [];
  for (const id of ids) {
    const result = tapItem(state, id);
    state = result.state;
    events.push(...result.events);
  }
  return { state, events };
};

describe("rules", () => {
  it("inserts next to the same kind and clears a triple", () => {
    const puzzle = createPuzzle(makeLevel(["a1", "b1", "a2", "a3", "b2", "b3"]));
    const { state, events } = tapAll(puzzle, ["a1", "b1", "a2"]);
    expect(state.tray.map((t) => t.id)).toEqual(["a1", "a2", "b1"]);
    const cleared = tapItem(state, "a3");
    expect(cleared.state.tray.map((t) => t.id)).toEqual(["b1"]);
    expect(cleared.events).toContainEqual({ type: "tripleCleared", kind: "a", slot: 0, itemIds: ["a1", "a2", "a3"] });
    expect(events.filter((e) => e.type === "itemTaken")).toHaveLength(3);
  });

  it("wins when the board and tray are empty, with stars from booster use", () => {
    const puzzle = createPuzzle(makeLevel(["a1", "a2", "a3"]));
    const { state, events } = tapAll(puzzle, ["a1", "a2", "a3"]);
    expect(state.status).toBe("won");
    expect(events).toContainEqual({ type: "levelWon", stars: 3 });
  });

  it("loses when the seventh slot fills without a clear, and ignores taps after", () => {
    const ids = ["a1", "b1", "c1", "d1", "e1", "f1", "g1"];
    const kinds = Object.fromEntries(ids.map((id) => [id, id[0]!]));
    const level = makeLevel([...ids, ...ids.flatMap((id) => [`${id[0]}2`, `${id[0]}3`])], [], kinds);
    const puzzle = createPuzzle(level);
    const { state, events } = tapAll(puzzle, ids);
    expect(state.status).toBe("lost");
    expect(events[events.length - 1]).toEqual({ type: "levelLost" });
    expect(tapItem(state, "a2").state).toBe(state);
  });

  it("blocks covered items until every coverer has left", () => {
    const puzzle = createPuzzle(makeLevel(["a1", "a2", "a3", "b1", "b2", "b3"], ["b1>a1", "b2>a1"]));
    let state = initialState(puzzle.level);
    expect(isFree(state, "a1")).toBe(false);
    const blocked = tapItem(state, "a1");
    expect(blocked.state).toBe(state);
    expect(blocked.events).toEqual([{ type: "itemBlocked", itemId: "a1" }]);
    state = tapItem(state, "b1").state;
    expect(isFree(state, "a1")).toBe(false);
    state = tapItem(state, "b2").state;
    expect(isFree(state, "a1")).toBe(true);
    expect(freeItems(state)).toEqual(["a1", "a2", "a3", "b3"]);
  });

  it("undo puts the item back, restores covering and a cleared triple, and reopens a loss", () => {
    const puzzle = createPuzzle(makeLevel(["a1", "a2", "a3", "b1", "b2", "b3"], ["a3>b1"]));
    const before = tapAll(puzzle, ["a1", "a2"]).state;
    const after = tapItem(before, "a3").state;
    expect(isFree(after, "b1")).toBe(true);
    const undone = undo(after);
    expect(undone.state.board).toEqual(before.board);
    expect(undone.state.tray).toEqual(before.tray);
    expect(isFree(undone.state, "b1")).toBe(false);
    expect(undone.events).toEqual([
      { type: "boosterUsed", booster: "undo" },
      { type: "undone", itemIds: ["a3"] },
    ]);
    expect(starsFor(undone.state)).toBe(2);

    const ids = ["a1", "b1", "c1", "d1", "e1", "f1", "g1"];
    const lostLevel = makeLevel([...ids, ...ids.flatMap((id) => [`${id[0]}2`, `${id[0]}3`])]);
    const lost = tapAll(createPuzzle(lostLevel), ids).state;
    expect(undo(lost).state.status).toBe("playing");
    expect(undo(initialState(puzzle.level)).events).toEqual([]);
  });

  it("shuffle deals kinds again but keeps every kind a multiple of three", () => {
    const ids = ["a1", "a2", "a3", "b1", "b2", "b3", "c1", "c2", "c3"];
    const puzzle = createPuzzle(makeLevel(ids));
    const start = tapItem(initialState(puzzle.level), "a1").state;
    const { state, events } = shuffle(puzzle, start);
    const count = (kind: string) => state.board.filter((id) => state.kinds[id] === kind).length + state.tray.filter((t) => t.kind === kind).length;
    expect(["a", "b", "c"].map(count)).toEqual([3, 3, 3]);
    expect(state.history).toEqual([]);
    expect(state.boosters.shuffle).toBe(1);
    expect(state.rng).not.toEqual(start.rng);
    expect(events).toEqual([{ type: "boosterUsed", booster: "shuffle" }, { type: "shuffled" }]);
    expect(starsFor(shuffle(puzzle, state).state)).toBe(1);
  });

  it("shuffle recomputes covering for the new sprites", () => {
    const level = generateLevel({ id: "s", chapter: "c", seed: "cover", zone: PlacementZoneSchema.parse(streetCorner), kinds: Object.keys(masks), masks, difficulty: 1 });
    const puzzle = createPuzzle(level, masks);
    const { state } = shuffle(puzzle, initialState(level));
    expect(state.covers).toEqual(computeCovers(placeItems(level.items, masks, state.kinds), masks));
    expect(state.covers).not.toEqual(level.covers);
  });

  it("hint names a tap on a winning line", () => {
    const puzzle = createPuzzle(makeLevel(["a1", "a2", "a3", "b1", "b2", "b3"], ["a1>b1"]));
    const { state, itemId } = hint(initialState(puzzle.level));
    expect(itemId).not.toBeNull();
    expect(isFree(initialState(puzzle.level), itemId!)).toBe(true);
    expect(state.boosters.hint).toBe(1);
  });

  it("states and levels round-trip through their Zod schemas", () => {
    const level = makeLevel(["a1", "a2", "a3"]);
    expect(LevelDefSchema.parse(JSON.parse(JSON.stringify(level)))).toEqual(level);
    const state = tapItem(initialState(level), "a1").state;
    expect(PuzzleStateSchema.parse(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it("rejects levels whose kinds do not come in threes, or whose covers loop", () => {
    expect(() => makeLevel(["a1", "a2"])).toThrow("multiple of 3");
    expect(() => makeLevel(["a1", "a2", "a3"], ["a1>a1"])).toThrow("covers itself");
    expect(() => makeLevel(["a1", "a2", "a3"], ["a1>a2", "a2>a3", "a3>a1"])).toThrow("cycle");
  });

  it("rejects saves with negative booster counts", () => {
    const state = { ...initialState(makeLevel(["a1", "a2", "a3"])), boosters: { undo: -1, shuffle: 0, hint: 0 } };
    expect(PuzzleStateSchema.safeParse(state).success).toBe(false);
  });
});
