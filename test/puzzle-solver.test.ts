import { describe, expect, it } from "vitest";

import { hashSeed } from "@/engine/rng";
import { hint, initialState, tapItem } from "@/engine/puzzle/rules";
import { bestGuessMove, estimateLossRate, solve } from "@/engine/puzzle/solver";
import { makeLevel } from "./helpers";

// Seven kinds; one of each sits on top and covers every other item. Any win must take all
// seven tops first, which fills the tray with seven different kinds: a forced loss.
function trapLevel() {
  const kinds = ["a", "b", "c", "d", "e", "f", "g"];
  const tops = kinds.map((k) => `${k}1`);
  const bottoms = kinds.flatMap((k) => [`${k}2`, `${k}3`]);
  return makeLevel([...tops, ...bottoms], bottoms.flatMap((b) => tops.map((t) => `${t}>${b}`)));
}

describe("solve", () => {
  it("finds a winning line that the rules accept", () => {
    const level = makeLevel(["a1", "a2", "a3", "b1", "b2", "b3", "c1", "c2", "c3"], ["a1>b1", "b1>c1", "c2>a2"]);
    const result = solve(initialState(level));
    expect(result.status).toBe("solved");
    let state = initialState(level);
    for (const id of result.solution!) state = tapItem(state, id).state;
    expect(state.status).toBe("won");
    expect(result.metrics).toMatchObject({ solutionLength: 9 });
  });

  it("proves a trap level unsolvable", () => {
    const level = trapLevel();
    expect(solve(initialState(level)).status).toBe("unsolvable");
  });

  it("reports unknown when the budget runs out", () => {
    const level = trapLevel();
    expect(solve(initialState(level), 3).status).toBe("unknown");
  });

  it("solves from a position in the middle of a level", () => {
    const level = makeLevel(["a1", "a2", "a3", "b1", "b2", "b3"]);
    const mid = tapItem(initialState(level), "b2").state;
    expect(solve(mid).solution).toHaveLength(5);
  });

  it("falls back to a safe best guess when the hint budget runs out", () => {
    const level = makeLevel(["a1", "a2", "a3", "b1", "b2", "b3"], ["a1>b1"]);
    expect(bestGuessMove(initialState(level))).toBe("a1");
    // The trap loses on every line, but its first taps are still safe: Hint shows one when the
    // search cannot finish, and nothing when the position is lost outright.
    const trap = trapLevel();
    expect(bestGuessMove(initialState(trap))).not.toBeNull();
    expect(hint(initialState(trap)).itemId).toBeNull();
  });

  it("estimates casual losses: none on a flat level, all on a trap", () => {
    const flat = makeLevel(["a1", "a2", "a3", "b1", "b2", "b3"]);
    expect(estimateLossRate(initialState(flat), hashSeed("x"))).toBe(0);
    const trap = trapLevel();
    expect(estimateLossRate(initialState(trap), hashSeed("x"))).toBe(1);
  });
});
