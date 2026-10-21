import { rectInPolygon, polygonBounds, type PlacementZone } from "../levels/zones";
import { hashSeed, nextFloat, nextIndex, type RngState } from "../rng";
import { MATCH_SIZE, TRAY_CAPACITY } from "./constants";
import { computeCovers } from "./covers";
import { itemRect, placeItems } from "./level";
import { opaqueRect, rectsIntersect } from "./mask";
import { initialState } from "./rules";
import { estimateLossRate, solve } from "./solver";
import { LevelDefSchema, type LevelDef, type LevelItem, type MaskSet, type Rect } from "./types";

export interface GenerateOptions {
  id: string;
  chapter: string;
  seed: string;
  zone: PlacementZone;
  // Kinds available in this chapter; the level uses the first `kindCount` after a seeded shuffle.
  kinds: readonly string[];
  masks: MaskSet;
  // 0 easiest, 1 hardest.
  difficulty: number;
  maxAttempts?: number;
}

export interface LevelShape {
  kindCount: number;
  triplesPerKind: number;
  layers: number;
}

// How big and deep a level is at a given difficulty: 3 kinds × 1 triple on one layer at 0,
// up to 6 kinds × 3 triples on 4 layers at 1.
export function shapeFor(difficulty: number, availableKinds: number): LevelShape {
  const t = Math.max(0, Math.min(1, difficulty));
  const maxKinds = Math.min(availableKinds, 6);
  return {
    kindCount: Math.round(MATCH_SIZE + t * (maxKinds - MATCH_SIZE)),
    triplesPerKind: 1 + Math.round(t * 2),
    layers: 1 + Math.round(t * 3),
  };
}

// Share of casual playouts the generator aims to see lost at a given difficulty, and how far
// off it may be.
export function targetLossRate(difficulty: number): number {
  return 0.02 + 0.55 * Math.max(0, Math.min(1, difficulty));
}
export const LOSS_RATE_TOLERANCE = 0.1;

// Difficulty along the 60-level curve: level 1–3 of the first chapter teach the game, each
// chapter ramps up to its tenth level, and every chapter starts a little harder than the last.
export function curveDifficulty(chapterIndex: number, levelIndex: number, chapters = 6, levelsPerChapter = 10): number {
  if (chapterIndex === 0 && levelIndex < 3) return levelIndex * 0.03;
  const base = (chapterIndex / Math.max(1, chapters - 1)) * 0.45;
  const ramp = levelIndex / Math.max(1, levelsPerChapter - 1);
  return Math.min(1, base + ramp * 0.55);
}

// Builds a solvable level: deals kinds in threes, scatters them over the zone in layers, computes
// covering, and keeps trying seeded variations until the solver finds a win and casual playouts
// lose about as often as the difficulty asks. An attempt that is too easy packs the next one
// into a tighter part of the zone (more covering); one that is too hard spreads it out.
// Falls back to the closest solvable attempt.
export function generateLevel(options: GenerateOptions): LevelDef {
  const { maxAttempts = 30 } = options;
  const target = targetLossRate(options.difficulty);
  let best: { level: LevelDef; distance: number } | null = null;
  let spread = 1;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const rng = hashSeed(`${options.seed}#${attempt}`);
    const level = layOut(options, rng, spread);
    if (!level) {
      // The zone could not hold this many items at this spread: give the next attempt more room.
      spread = Math.min(1, spread * 1.15);
      continue;
    }
    const state = initialState(level);
    const result = solve(state);
    if (result.status !== "solved" || !result.metrics) continue;
    const lossRate = estimateLossRate(state, rng);
    const scored: LevelDef = { ...level, target: round(options.difficulty, 3), metrics: { ...result.metrics, lossRate } };
    const distance = Math.abs(lossRate - target);
    if (distance <= LOSS_RATE_TOLERANCE) return LevelDefSchema.parse(scored);
    if (!best || distance < best.distance) best = { level: scored, distance };
    spread = lossRate < target ? Math.max(MIN_SPREAD, spread * 0.85) : Math.min(1, spread * 1.1);
  }
  if (!best) throw new Error(`no solvable layout for ${options.id} that fits zone ${options.zone.id} after ${maxAttempts} attempts`);
  return LevelDefSchema.parse(best.level);
}

export interface ChapterOptions extends Omit<GenerateOptions, "id" | "seed" | "difficulty"> {
  chapterIndex: number;
  levels?: number;
  // Extra seeds tried for the last level until it is the chapter's hardest.
  finaleRetries?: number;
}

// A chapter of levels along curveDifficulty. Ids and seeds are "<chapter>-01" … The last level
// is regenerated with alternative seeds until its loss rate tops every other level's, so each
// chapter ends on its hardest level; if no seed manages that, the hardest attempt is kept.
export function generateChapter(options: ChapterOptions): LevelDef[] {
  const { levels: count = 10, finaleRetries = 12, chapterIndex, ...rest } = options;
  const levels: LevelDef[] = [];
  for (let index = 0; index < count; index += 1) {
    const id = `${options.chapter}-${String(index + 1).padStart(2, "0")}`;
    levels.push(generateLevel({ ...rest, id, seed: id, difficulty: curveDifficulty(chapterIndex, index, 6, count) }));
  }
  const last = levels[count - 1];
  if (!last || count < 2) return levels;
  const loss = (level: LevelDef) => level.metrics?.lossRate ?? 0;
  const ceiling = Math.max(...levels.slice(0, -1).map(loss));
  let finale = last;
  for (let retry = 1; retry <= finaleRetries && loss(finale) <= ceiling; retry += 1) {
    const candidate = generateLevel({ ...rest, id: last.id, seed: `${last.id}~${retry}`, difficulty: last.target ?? 1 });
    if (loss(candidate) > loss(finale)) finale = candidate;
  }
  levels[count - 1] = finale;
  return levels;
}

// Smallest share of the zone's bounds the generator packs a level into.
const MIN_SPREAD = 0.65;

// One candidate layout, or null when some item found no spot fully inside the zone.
function layOut(options: GenerateOptions, rng: RngState, spread: number): LevelDef | null {
  const shape = shapeFor(options.difficulty, options.kinds.length);
  const kinds = shuffled(options.kinds, rng).slice(0, shape.kindCount);
  const pool = shuffled(
    kinds.flatMap((kind) => Array.from({ length: shape.triplesPerKind * MATCH_SIZE }, () => kind)),
    rng,
  );

  // Lower layers hold more items, so upper layers sit on top of a crowd.
  const weights = Array.from({ length: shape.layers }, (_, layer) => shape.layers - layer);
  const total = weights.reduce((sum, w) => sum + w, 0);
  const zoneBounds = polygonBounds(options.zone.polygon);
  // Sampling area: the zone bounds shrunk by `spread` around their centre.
  const bounds: Rect = {
    x: zoneBounds.x + (zoneBounds.width * (1 - spread)) / 2,
    y: zoneBounds.y + (zoneBounds.height * (1 - spread)) / 2,
    width: zoneBounds.width * spread,
    height: zoneBounds.height * spread,
  };
  const items: LevelItem[] = [];
  const opaque: { rect: Rect; layer: number }[] = [];
  let next = 0;
  for (const [layer, weight] of weights.entries()) {
    const count = layer === shape.layers - 1 ? pool.length - next : Math.round((pool.length * weight) / total);
    for (let n = 0; n < count; n += 1) {
      const kind = pool[next]!;
      const placed = placeOne(kind, layer, `i${next}`, options, bounds, opaque, rng);
      if (!placed) return null;
      items.push(placed.item);
      opaque.push({ rect: placed.opaque, layer });
      next += 1;
    }
  }

  const covers = computeCovers(placeItems(items, options.masks), options.masks);
  return { id: options.id, chapter: options.chapter, seed: options.seed, items, covers, traySize: TRAY_CAPACITY };
}

// Samples spots inside the zone and keeps the one that overlaps its own layer the least, so a
// layer spreads out while layers stack on each other.
function placeOne(
  kind: string,
  layer: number,
  id: string,
  options: GenerateOptions,
  bounds: Rect,
  placed: readonly { rect: Rect; layer: number }[],
  rng: RngState,
): { item: LevelItem; opaque: Rect } | null {
  const mask = options.masks[kind];
  let best: { item: LevelItem; opaque: Rect; overlap: number } | null = null;
  for (let sample = 0; sample < 40; sample += 1) {
    const item: LevelItem = {
      id,
      kind,
      x: round(bounds.x + nextFloat(rng) * bounds.width, 1),
      y: round(bounds.y + nextFloat(rng) * bounds.height, 1),
      z: layer,
      scale: round(0.92 + nextFloat(rng) * 0.16, 3),
    };
    const rect = itemRect(item, mask);
    const box = mask ? opaqueRect(mask, rect) : rect;
    if (!rectInPolygon(box, options.zone.polygon)) continue;
    const overlap = placed.filter((other) => other.layer === layer && rectsIntersect(box, other.rect)).reduce((sum, other) => sum + intersectionArea(box, other.rect), 0);
    if (!best || overlap < best.overlap) best = { item, opaque: box, overlap };
    if (overlap === 0) break;
  }
  return best;
}

function intersectionArea(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

function shuffled<T>(list: readonly T[], rng: RngState): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = nextIndex(rng, i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
