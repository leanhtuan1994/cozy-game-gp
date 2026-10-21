// Tunable numbers for the puzzle rules and level generation.

export const TRAY_CAPACITY = 7;
export const MATCH_SIZE = 3;

// Side of an item's box in board units at scale 1; the sprite is fitted inside it.
export const ITEM_SIZE = 116;

// Stars by number of booster uses: index = uses, the last entry covers every higher count.
export const STARS_BY_BOOSTER_USES = [3, 2, 1] as const;

// An item counts as covered when at least this share of its opaque mask cells lies under
// another item drawn in front of it. Below that, a sliver of overlap does not block a tap.
export const COVER_MIN_SHARE = 0.04;

// Tray fill at which a position counts as "near full" in difficulty metrics.
export const NEAR_FULL_TRAY = 5;

// Solver search budget (states visited) before it gives up and reports "unknown".
export const SOLVER_NODE_BUDGET = 200_000;

// Smaller budget for the in-game Hint, which runs on the phone's JS thread. When it runs out,
// Hint falls back to the solver's best-ranked safe tap.
export const HINT_NODE_BUDGET = 20_000;

// Random playouts used to estimate how often a casual player loses a level.
export const PLAYOUTS = 80;
