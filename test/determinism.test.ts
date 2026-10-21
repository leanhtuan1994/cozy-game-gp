import { describe, expect, it } from "vitest";

import { generateLevel } from "@/engine/puzzle/generator";
import { createPuzzle, initialState, shuffle } from "@/engine/puzzle/rules";
import { solve } from "@/engine/puzzle/solver";
import { PlacementZoneSchema } from "@/engine/levels/zones";
import type { MaskSet } from "@/engine/puzzle/types";

import spikeMasks from "../assets/sprites/spike/masks.json";
import streetCorner from "./fixtures/zones/street-corner.json";

const masks: MaskSet = spikeMasks;
const options = { id: "d", chapter: "c", seed: "same", zone: PlacementZoneSchema.parse(streetCorner), kinds: Object.keys(masks), masks, difficulty: 0.7 };

describe("determinism", () => {
  it("generates the same level from the same seed", () => {
    expect(generateLevel(options)).toEqual(generateLevel(options));
    expect(generateLevel({ ...options, seed: "other" })).not.toEqual(generateLevel(options));
  });

  it("shuffles and solves the same way from the same seed", () => {
    const level = generateLevel(options);
    const puzzle = createPuzzle(level, masks);
    const once = shuffle(puzzle, initialState(level)).state;
    const twice = shuffle(puzzle, initialState(level)).state;
    expect(once).toEqual(twice);
    // A saved state carries its rng, so shuffling it again after a reload matches.
    const reloaded = JSON.parse(JSON.stringify(once));
    expect(shuffle(puzzle, reloaded).state).toEqual(shuffle(puzzle, once).state);
    expect(solve(once)).toEqual(solve(twice));
  });
});
