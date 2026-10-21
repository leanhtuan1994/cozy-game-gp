import type { AchievementContext } from "@/engine/meta/achievements";
import { achievementContext, claim, claimable, clockCorrected, recordBoosterUse, recordRun, visit, type Claimable, type ClaimTarget, type Clock } from "@/engine/meta/meta";
import { completedCount, recordWin } from "@/engine/meta/progress";
import type { Reward } from "@/engine/meta/rewards";
import { NAME_MAX_LENGTH, type Settings } from "@/engine/meta/settings";
import type { PuzzleEvent } from "@/engine/puzzle/events";
import { hitTest } from "@/engine/puzzle/hitTest";
import { placeItems } from "@/engine/puzzle/level";
import { createPuzzle, hint, initialState, shuffle, tapItem, undo, type Puzzle, type RuleResult } from "@/engine/puzzle/rules";
import type { Booster, LevelDef, MaskSet, PlacedItem, Point, PuzzleState } from "@/engine/puzzle/types";
import { LESSON_IDS, advance, allowsBooster, allowsItem, currentStep, lessonFor, planLesson, type LessonId, type LessonProgress } from "@/engine/tutorial/steps";

import { defaultSave, loadSave, writeSave, type KeyValueStore, type Save } from "./save";

export type Outcome = { type: "won"; stars: number; reward: Booster | null; firstWin: boolean } | { type: "lost" };

// The level being played. Replaced (never mutated) on every change.
export interface Play {
  levelIndex: number;
  level: LevelDef;
  state: PuzzleState;
  // Every level item placed for drawing and hit testing, back to front; follows Shuffle's kinds.
  placed: readonly PlacedItem[];
  outcome: Outcome | null;
  // Item the last Hint pointed at, until the next tap.
  hintId: string | null;
  // Increases on every start or restart, so presentation state can tell runs apart.
  run: number;
  // Items taken this run that had been covered (a set: Undo and re-taking count once).
  coveredTaken: readonly string[];
  // The lesson this level is teaching, and its current step; null once it is done or skipped.
  lesson: LessonProgress | null;
}

export interface Snapshot {
  save: Save;
  play: Play | null;
}

export interface SessionDeps {
  store: KeyValueStore;
  now: () => number;
  // All levels in play order.
  levels: readonly LevelDef[];
  masksFor: (chapterId: string) => MaskSet;
  // Device offset from UTC in minutes, east positive, read at each call (it can change).
  tzOffset: () => number;
}

export interface TapResult {
  // The item under the tap (free or covered), or null for empty board space.
  hit: PlacedItem | null;
  events: PuzzleEvent[];
  // Set (only) when the tap landed on an item the current lesson step does not teach.
  lessonBlocked?: true;
}

export type BoosterResult = { status: "used"; events: PuzzleEvent[] } | { status: "empty" | "unavailable"; events: [] };

const LEVELS_PER_DISTRICT = 10;

// The one door from the UI into the game: it owns the save and the level in play, hit-tests taps,
// runs the engine rules, gates boosters on the inventory, and saves after every change to the
// save. UI code reads snapshots and calls these commands; it never runs rules itself.
export class GameSession {
  private snapshot: Snapshot;
  private puzzle: Puzzle | null = null;
  private runs = 0;
  private readonly readOnly: boolean;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly deps: SessionDeps) {
    const { save, readOnly } = loadSave(deps.store, deps.now());
    this.readOnly = readOnly;
    this.snapshot = { save, play: null };
    // Always written once at launch, so a migrated save is stored in the current version.
    this.refreshDay();
    this.persist();
  }

  // Time as the daily systems see it. Call it fresh for each use: the clock moves.
  clock = (): Clock => ({ now: this.deps.now(), tzOffsetMinutes: this.deps.tzOffset(), lastSeenAt: this.snapshot.save.lastSeenAt });

  // Starts a new day's streak and quests: on return to the foreground and at local midnight.
  // Nothing is saved or redrawn when the day has not changed.
  visit(): void {
    if (!this.refreshDay()) return;
    this.persist();
    this.notify();
  }

  achievementContext(): AchievementContext {
    const ids = this.deps.levels.map((level) => level.id);
    const districts = Array.from({ length: Math.ceil(ids.length / LEVELS_PER_DISTRICT) }, (_, i) => ids.slice(i * LEVELS_PER_DISTRICT, (i + 1) * LEVELS_PER_DISTRICT));
    return achievementContext(this.snapshot.save.meta, this.snapshot.save.progress, districts);
  }

  claimable(): Claimable {
    return claimable(this.snapshot.save.meta, this.clock(), this.achievementContext());
  }

  // Claims a login gift, quest, quest chest or achievement; null when it is not claimable now.
  claim(target: ClaimTarget): Reward | null {
    // A claim is a visit too: a session that crossed midnight counts the new day first.
    const dayChanged = this.refreshDay();
    const save = this.snapshot.save;
    const result = claim(save.meta, save.inventory, target, this.clock(), this.achievementContext());
    if (!result) {
      if (dayChanged) {
        this.persist();
        this.notify();
      }
      return null;
    }
    this.snapshot = { ...this.snapshot, save: { ...save, meta: result.meta, inventory: result.inventory } };
    this.persist();
    this.notify();
    return result.reward;
  }

  getSnapshot = (): Snapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  levelCount(): number {
    return this.deps.levels.length;
  }

  levelIndexOf(levelId: string): number {
    return this.deps.levels.findIndex((level) => level.id === levelId);
  }

  levelAt(levelIndex: number): LevelDef | null {
    return this.deps.levels[levelIndex] ?? null;
  }

  isUnlocked(levelIndex: number): boolean {
    return levelIndex >= 0 && levelIndex < this.deps.levels.length && levelIndex <= completedCount(this.snapshot.save.progress);
  }

  // Starts (or restarts) a level. Locked or unknown levels are refused.
  startLevel(levelIndex: number): boolean {
    const level = this.deps.levels[levelIndex];
    if (!level || !this.isUnlocked(levelIndex)) return false;
    const masks = this.deps.masksFor(level.chapter);
    this.puzzle = createPuzzle(level, masks);
    this.runs += 1;
    const state = initialState(level);
    const lessonId = lessonFor(levelIndex, this.snapshot.save.tutorial.lessonsDone);
    const lesson = lessonId ? planLesson(lessonId, state) : null;
    this.snapshot = {
      ...this.snapshot,
      play: {
        levelIndex,
        level,
        state,
        placed: placeItems(level.items, masks),
        outcome: null,
        hintId: null,
        run: this.runs,
        coveredTaken: [],
        lesson: lesson ? { lesson, step: 0 } : null,
      },
    };
    this.notify();
    return true;
  }

  restart(): void {
    const play = this.snapshot.play;
    if (play) this.startLevel(play.levelIndex);
  }

  quit(): void {
    this.puzzle = null;
    this.snapshot = { ...this.snapshot, play: null };
    this.notify();
  }

  // A tap at a board point (board space): takes the front-most item there if it is free.
  tapAt(point: Point): TapResult {
    const play = this.snapshot.play;
    if (!play || play.outcome) return { hit: null, events: [] };
    const onBoard = new Set(play.state.board);
    const hit = hitTest(
      point,
      play.placed.filter((item) => onBoard.has(item.id)),
      this.puzzle?.masks ?? {},
    );
    if (!hit) return { hit: null, events: [] };
    // During a lesson step only the item it teaches answers; other items do nothing but a "not that
    // one" vibration.
    if (!allowsItem(play.lesson, hit.id, play.hintId)) return { hit: null, events: [], lessonBlocked: true };
    return { hit, events: this.apply(play, tapItem(play.state, hit.id), null) };
  }

  // Taps an item by id (used by tests and automation).
  tap(itemId: string): PuzzleEvent[] {
    const play = this.snapshot.play;
    if (!play || play.outcome || !allowsItem(play.lesson, itemId, play.hintId)) return [];
    return this.apply(play, tapItem(play.state, itemId), null);
  }

  useBooster(booster: Booster): BoosterResult {
    const play = this.snapshot.play;
    if (!play || !this.puzzle) return { status: "unavailable", events: [] };
    // Undo is the only booster the lose screen offers; won levels take none.
    if (play.outcome && !(play.outcome.type === "lost" && booster === "undo")) return { status: "unavailable", events: [] };
    if (!allowsBooster(play.lesson, booster)) return { status: "unavailable", events: [] };
    // The booster a lesson step teaches is free: no charge, no star cost. Only the Hint is taught.
    if (booster === "hint" && currentStep(play.lesson)?.booster === "hint") return this.useLessonHint(play);
    if (currentStep(play.lesson)) return { status: "unavailable", events: [] };
    // Checked before running the rule: Undo and Shuffle change the position as soon as they run.
    if (this.snapshot.save.inventory[booster] <= 0) return { status: "empty", events: [] };
    // A hint already on screen is not paid for again.
    if (booster === "hint" && play.hintId !== null) return { status: "unavailable", events: [] };
    const result: RuleResult & { itemId?: string | null } =
      booster === "undo" ? undo(play.state) : booster === "shuffle" ? shuffle(this.puzzle, play.state) : hint(play.state);
    if (!result.events.some((event) => event.type === "boosterUsed")) return { status: "unavailable", events: [] };
    const inventory = { ...this.snapshot.save.inventory, [booster]: this.snapshot.save.inventory[booster] - 1 };
    this.snapshot = { ...this.snapshot, save: { ...this.snapshot.save, inventory, meta: recordBoosterUse(this.snapshot.save.meta) } };
    const events = this.apply(play, result, booster === "hint" ? (result.itemId ?? null) : null);
    this.persist();
    return { status: "used", events };
  }

  // Called when the app goes to the background.
  touch(): void {
    this.persist();
  }

  // The "Tiếp" button of a lesson step that only explains.
  nextLessonStep(): void {
    const play = this.snapshot.play;
    if (!play?.lesson) return;
    const next = advance(play.lesson, "next");
    // A late second tap on "Tiếp" changes nothing: keep the snapshot so nothing redraws.
    if (next !== play.lesson) this.setLesson(play, next);
  }

  // "Bỏ qua": ends the lesson; it is not shown again.
  skipLesson(): void {
    const play = this.snapshot.play;
    if (play?.lesson) this.setLesson(play, "done");
  }

  // "Xem lại hướng dẫn": every lesson is taught again the next time its level starts.
  resetLessons(): void {
    if (this.snapshot.save.tutorial.lessonsDone.length > 0) this.saveWith({ tutorial: { lessonsDone: [] } });
  }

  // The end of the first-run greeting, with the name the player gave (or null).
  finishOnboarding(name: string | null): void {
    const trimmed = name?.trim().slice(0, NAME_MAX_LENGTH) ?? "";
    this.saveWith({ profile: { ...this.snapshot.save.profile, name: trimmed === "" ? null : trimmed, welcomed: true } });
  }

  updateSettings(patch: Partial<Settings>): void {
    const settings = this.snapshot.save.settings;
    if ((Object.keys(patch) as (keyof Settings)[]).every((key) => patch[key] === settings[key])) return;
    this.saveWith({ settings: { ...settings, ...patch } });
  }

  // "Xoá tiến trình": a fresh save that keeps the settings and the player's name. Lessons start over.
  resetProgress(): void {
    const { profile, settings } = this.snapshot.save;
    const fresh = defaultSave(this.deps.now());
    this.puzzle = null;
    this.snapshot = { play: null, save: { ...fresh, profile: { ...fresh.profile, name: profile.name, welcomed: true }, settings } };
    this.refreshDay();
    this.persist();
    this.notify();
  }

  private saveWith(patch: Partial<Save>): void {
    this.snapshot = { ...this.snapshot, save: { ...this.snapshot.save, ...patch } };
    this.persist();
    this.notify();
  }

  private useLessonHint(play: Play): BoosterResult {
    if (play.hintId !== null) return { status: "unavailable", events: [] };
    const { itemId } = hint(play.state, true);
    if (itemId === null || !play.lesson) return { status: "unavailable", events: [] };
    const next = advance(play.lesson, [{ type: "boosterUsed", booster: "hint" }]);
    this.setLesson({ ...play, hintId: itemId }, next);
    return { status: "used", events: [] };
  }

  // Moves the lesson on; a finished lesson is recorded in the save.
  private setLesson(play: Play, next: LessonProgress | "done"): void {
    let save = this.snapshot.save;
    if (next === "done" && play.lesson) save = { ...save, tutorial: { lessonsDone: withLesson(save.tutorial.lessonsDone, play.lesson.lesson.id) } };
    const saveChanged = save !== this.snapshot.save;
    this.snapshot = { save, play: { ...play, lesson: next === "done" ? null : next } };
    if (saveChanged) this.persist();
    this.notify();
  }

  private apply(play: Play, result: RuleResult, hintId: string | null): PuzzleEvent[] {
    const lessonNext = play.lesson ? advance(play.lesson, result.events) : null;
    // A blocked tap reports an event but changes nothing: keep the snapshot so nothing redraws.
    if (result.state === play.state && hintId === play.hintId && lessonNext === play.lesson) return result.events;
    let outcome: Outcome | null = result.state.status === "playing" ? null : play.outcome;
    let coveredTaken = play.coveredTaken;
    for (const event of result.events) {
      if (event.type === "itemTaken" && event.wasCovered && !coveredTaken.includes(event.itemId)) coveredTaken = [...coveredTaken, event.itemId];
    }
    // A win just after midnight belongs to the new day's quests.
    if (result.events.some((event) => event.type === "levelWon")) this.refreshDay();
    let save = this.snapshot.save;
    if (lessonNext === "done" && play.lesson) save = { ...save, tutorial: { lessonsDone: withLesson(save.tutorial.lessonsDone, play.lesson.lesson.id) } };
    for (const event of result.events) {
      if (event.type === "levelWon") {
        const win = recordWin(save.progress, save.inventory, play.level.id, play.levelIndex, event.stars);
        const meta = recordRun(save.meta, { levelIndex: play.levelIndex, triples: play.level.items.length / 3, stars: event.stars, coveredTaken: coveredTaken.length });
        save = { ...save, progress: win.progress, inventory: win.inventory, meta };
        outcome = { type: "won", stars: event.stars, reward: win.reward, firstWin: win.firstWin };
      } else if (event.type === "levelLost") {
        outcome = { type: "lost" };
      }
    }
    const placed =
      result.state.kinds === play.state.kinds || !this.puzzle ? play.placed : placeItems(play.level.items, this.puzzle.masks, result.state.kinds);
    const saveChanged = save !== this.snapshot.save || (outcome !== null && outcome !== play.outcome);
    const lesson = lessonNext === "done" ? null : lessonNext;
    this.snapshot = { save, play: { ...play, state: result.state, placed, outcome, hintId, coveredTaken, lesson } };
    if (saveChanged) this.persist();
    this.notify();
    return result.events;
  }

  // Applies the day as the clock reads it now (new streak day, new quests, a corrected clock).
  // Returns whether the save changed; the caller persists and notifies.
  private refreshDay(): boolean {
    const clock = this.clock();
    let save = this.snapshot.save;
    // A clock corrected back by days rebases the last-seen moment, or every later day would pause.
    if (clockCorrected(clock)) save = { ...save, lastSeenAt: clock.now };
    const meta = visit(save.meta, clock);
    if (meta !== save.meta) save = { ...save, meta };
    if (save === this.snapshot.save) return false;
    this.snapshot = { ...this.snapshot, save };
    return true;
  }

  private persist(): void {
    // Never moves back: a clock wound back must not unlock a replayed day.
    const save = { ...this.snapshot.save, lastSeenAt: Math.max(this.snapshot.save.lastSeenAt, this.deps.now()) };
    this.snapshot = { ...this.snapshot, save };
    if (!this.readOnly) writeSave(this.deps.store, save);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

function withLesson(done: readonly LessonId[], id: LessonId): LessonId[] {
  return LESSON_IDS.filter((lesson) => lesson === id || done.includes(lesson));
}
