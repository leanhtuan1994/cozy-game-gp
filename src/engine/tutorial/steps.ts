import { freeItems } from "../puzzle/board";
import { MATCH_SIZE, TRAY_CAPACITY } from "../puzzle/constants";
import type { PuzzleEvent } from "../puzzle/events";
import type { Booster, PuzzleState } from "../puzzle/types";

// The lessons taught while playing the first three levels, one mechanic each. Each lesson is a
// fixed list of steps planned from the level's opening position (never from hard-coded item
// ids), so a regenerated level gets a matching lesson or fails a test.
export const LESSON_IDS = ["tap", "covered", "hint"] as const;
export type LessonId = (typeof LESSON_IDS)[number];

// The level (index in play order) that teaches each lesson.
const LESSON_LEVEL: Record<LessonId, number> = { tap: 0, covered: 1, hint: 2 };

export type CoachTarget = { type: "item"; itemId: string } | { type: "hinted" } | { type: "tray" } | { type: "booster"; booster: Booster };

export interface LessonStep {
  text: string;
  target: CoachTarget;
  // The only items a tap may take or try during the step; "hinted" is the item the Hint points at.
  items: readonly string[] | "hinted";
  // The only booster that may be used during the step. It is free of charge.
  booster: Booster | null;
  // What ends the step; "next" is the bubble's "Tiếp" button.
  until: "itemTaken" | "itemBlocked" | "tripleCleared" | "boosterUsed" | "next";
}

export interface Lesson {
  id: LessonId;
  steps: readonly LessonStep[];
}

export interface LessonProgress {
  lesson: Lesson;
  step: number;
}

// The lesson a level teaches, unless the player has done (or skipped) it.
export function lessonFor(levelIndex: number, done: readonly LessonId[]): LessonId | null {
  const id = LESSON_IDS.find((lesson) => LESSON_LEVEL[lesson] === levelIndex);
  return id !== undefined && !done.includes(id) ? id : null;
}

// The steps of a lesson for a level's opening position, or null when the position has nothing to
// teach it with (then the level is played without a lesson).
export function planLesson(id: LessonId, state: PuzzleState): Lesson | null {
  const free = freeItems(state);
  if (id === "tap") {
    // A kind with a full triple free from the start: take it one by one.
    const byKind = new Map<string, string[]>();
    for (const itemId of free) byKind.set(state.kinds[itemId]!, [...(byKind.get(state.kinds[itemId]!) ?? []), itemId]);
    const triple = [...byKind.values()].find((ids) => ids.length >= MATCH_SIZE);
    if (!triple) return null;
    const [a, b, c] = triple as [string, string, string];
    return {
      id,
      steps: [
        { text: "Chạm vào món đang sáng để nhặt nó vào giỏ.", target: { type: "item", itemId: a }, items: [a], booster: null, until: "itemTaken" },
        {
          text: `Món vừa nhặt nằm trong giỏ. Giỏ chứa được ${TRAY_CAPACITY} món; đầy giỏ là thua.`,
          target: { type: "tray" },
          items: [],
          booster: null,
          until: "next",
        },
        { text: "Gom 3 món giống nhau thì chúng biến mất. Nhặt món thứ hai.", target: { type: "item", itemId: b }, items: [b], booster: null, until: "itemTaken" },
        { text: "Thêm một món nữa là đủ bộ ba!", target: { type: "item", itemId: c }, items: [c], booster: null, until: "tripleCleared" },
      ],
    };
  }
  if (id === "covered") {
    // An item covered by exactly one item, which is itself free.
    const onBoard = new Set(state.board);
    const pair = state.covers.find(
      (cover) =>
        free.includes(cover.top) &&
        onBoard.has(cover.bottom) &&
        state.covers.every((other) => other.bottom !== cover.bottom || other.top === cover.top || !onBoard.has(other.top)),
    );
    if (!pair) return null;
    const { top, bottom } = pair;
    return {
      id,
      steps: [
        { text: "Món tối màu đang bị món khác đè lên. Thử chạm vào nó xem.", target: { type: "item", itemId: bottom }, items: [bottom], booster: null, until: "itemBlocked" },
        { text: "Chưa nhặt được. Nhặt món đè phía trên trước.", target: { type: "item", itemId: top }, items: [top], booster: null, until: "itemTaken" },
        { text: "Giờ món bên dưới đã sáng lên. Nhặt nó đi!", target: { type: "item", itemId: bottom }, items: [bottom], booster: null, until: "itemTaken" },
      ],
    };
  }
  return {
    id,
    steps: [
      { text: "Bí thì dùng Gợi ý. Lần này miễn phí, không mất sao.", target: { type: "booster", booster: "hint" }, items: [], booster: "hint", until: "boosterUsed" },
      { text: "Gợi ý chỉ món nên nhặt tiếp. Chạm vào nó.", target: { type: "hinted" }, items: "hinted", booster: null, until: "itemTaken" },
    ],
  };
}

export function currentStep(progress: LessonProgress | null): LessonStep | null {
  return progress ? (progress.lesson.steps[progress.step] ?? null) : null;
}

// May this item be tapped now? Any item may when no lesson step is showing.
export function allowsItem(progress: LessonProgress | null, itemId: string, hintedId: string | null): boolean {
  const step = currentStep(progress);
  if (!step) return true;
  return step.items === "hinted" ? itemId === hintedId : step.items.includes(itemId);
}

// May this booster be used now?
export function allowsBooster(progress: LessonProgress | null, booster: Booster): boolean {
  const step = currentStep(progress);
  return !step || step.booster === booster;
}

// The progress after a rule's events (or the "next" button): the same object when the step goes
// on, the next step when it is done, and "done" after the last step.
export function advance(progress: LessonProgress, events: readonly PuzzleEvent[] | "next"): LessonProgress | "done" {
  const step = currentStep(progress);
  if (!step) return "done";
  const finished = events === "next" ? step.until === "next" : step.until !== "next" && events.some((event) => event.type === step.until);
  if (!finished) return progress;
  return progress.step + 1 >= progress.lesson.steps.length ? "done" : { lesson: progress.lesson, step: progress.step + 1 };
}
