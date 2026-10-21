import { z } from "zod";

import { MATCH_SIZE, TRAY_CAPACITY } from "./constants";

// Board space is a 1000×1000 frame laid over the diorama background; screens map to it in
// src/scene/viewport.ts. Every position the engine stores is in board space.
export const BOARD_SIZE = 1000;

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Low-resolution alpha mask of one sprite, generated at build time by scripts/make-hit-masks.ts.
// `bounds` is the opaque bounding box in source pixels; the grid covers only that box.
// Row r is `rows[r]`, and bit c (least significant first) is set when cell (c, r) is opaque.
export interface SpriteMask {
  sourceWidth: number;
  sourceHeight: number;
  bounds: Rect;
  size: number;
  rows: number[];
}

export type MaskSet = Readonly<Record<string, SpriteMask>>;

// One item placed on the board. The sprite is drawn into `rect` (board space), stretched
// from its full source image. Draw order is `layer`, then `order` (see compareDrawOrder).
export interface PlacedItem {
  id: string;
  kind: string;
  rect: Rect;
  layer: number;
  order: number;
}

// Back to front: lower layers first, then lower `order`, then id for a stable tie-break.
export function compareDrawOrder(a: PlacedItem, b: PlacedItem): number {
  return a.layer - b.layer || a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

// ---- Level data and play state (Zod schemas; parsed when levels and saves are loaded) ----

export const LevelItemSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  // Centre of the item's box in board space.
  x: z.number(),
  y: z.number(),
  // Draw layer; higher layers are drawn in front.
  z: z.number().int().min(0),
  // Box side is ITEM_SIZE × scale; the sprite is fitted inside, keeping its aspect.
  scale: z.number().positive(),
});
export type LevelItem = z.infer<typeof LevelItemSchema>;

export const CoverSchema = z.object({ top: z.string(), bottom: z.string() });

export const LevelMetricsSchema = z.object({
  solutionLength: z.number().int(),
  maxTray: z.number().int(),
  nearFullSteps: z.number().int(),
  backtracks: z.number().int(),
  // Share of random-but-sensible playouts that lose the level.
  lossRate: z.number().min(0).max(1),
});
export type LevelMetrics = z.infer<typeof LevelMetricsSchema>;

export const LevelDefSchema = z
  .object({
    id: z.string().min(1),
    chapter: z.string().min(1),
    seed: z.string(),
    items: z.array(LevelItemSchema).min(1),
    covers: z.array(CoverSchema),
    traySize: z.literal(TRAY_CAPACITY),
    // Difficulty the generator aimed for (0 easiest, 1 hardest) and what it measured.
    target: z.number().min(0).max(1).optional(),
    metrics: LevelMetricsSchema.optional(),
  })
  .superRefine((level, ctx) => {
    const ids = new Set(level.items.map((item) => item.id));
    if (ids.size !== level.items.length) ctx.addIssue({ code: "custom", message: "duplicate item id" });
    const counts = new Map<string, number>();
    for (const item of level.items) counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1);
    for (const [kind, count] of counts) {
      if (count % MATCH_SIZE !== 0) ctx.addIssue({ code: "custom", message: `kind ${kind} has ${count} items, not a multiple of ${MATCH_SIZE}` });
    }
    for (const cover of level.covers) {
      if (!ids.has(cover.top) || !ids.has(cover.bottom)) ctx.addIssue({ code: "custom", message: `cover ${cover.top}>${cover.bottom} names an unknown item` });
      if (cover.top === cover.bottom) ctx.addIssue({ code: "custom", message: `item ${cover.top} covers itself` });
    }
    if (hasCycle(level.covers)) ctx.addIssue({ code: "custom", message: "covers form a cycle" });
  });

// Depth-first search for a cycle in the "top covers bottom" graph.
function hasCycle(covers: readonly { top: string; bottom: string }[]): boolean {
  const next = new Map<string, string[]>();
  for (const { top, bottom } of covers) next.set(top, [...(next.get(top) ?? []), bottom]);
  const state = new Map<string, 1 | 2>();
  const visit = (id: string): boolean => {
    if (state.get(id) === 1) return true;
    if (state.get(id) === 2) return false;
    state.set(id, 1);
    if ((next.get(id) ?? []).some(visit)) return true;
    state.set(id, 2);
    return false;
  };
  return [...next.keys()].some(visit);
}
export type LevelDef = z.infer<typeof LevelDefSchema>;

export const TrayItemSchema = z.object({ id: z.string(), kind: z.string() });
export type TrayItem = z.infer<typeof TrayItemSchema>;

const SnapshotSchema = z.object({ board: z.array(z.string()), tray: z.array(TrayItemSchema) });

const count = z.number().int().min(0);
const uint32 = z.number().int().min(0).max(0xffffffff);

export const PuzzleStateSchema = z.object({
  levelId: z.string(),
  // Ids still on the board, in level order.
  board: z.array(z.string()),
  tray: z.array(TrayItemSchema),
  // Current kind of every item; Shuffle rewrites it.
  kinds: z.record(z.string(), z.string()),
  // Current covering among the items; Shuffle recomputes it for the new kinds.
  covers: z.array(CoverSchema),
  // Seeded state for Shuffle, so a saved game replays the same way.
  rng: z.tuple([uint32, uint32, uint32, uint32]),
  // Positions before each tap since the last shuffle, newest last, for Undo.
  history: z.array(SnapshotSchema),
  boosters: z.object({ undo: count, shuffle: count, hint: count }),
  status: z.enum(["playing", "won", "lost"]),
});
export type PuzzleState = z.infer<typeof PuzzleStateSchema>;
export type Booster = keyof PuzzleState["boosters"];
