import type { Settings } from "@/engine/meta/settings";
import type { PuzzleEvent } from "@/engine/puzzle/events";

// What the player hears and feels for each game event. Pure, so it is tested on Node: the
// simulator cannot vibrate and UI tests cannot hear.
export type Sfx = "tap" | "blocked" | "clear" | "win" | "lose" | "booster" | "reward" | "button";

// One kind per moment. Strength grows down the list (see HAPTIC_RANK); `star` has its own schedule.
export type Haptic =
  | "tick" // a button pressed whose press has no vibration of its own
  | "select" // a setting, tab or switch changed
  | "take" // an item picked up
  | "hint"
  | "undo"
  | "shuffle"
  | "nope" // a tap that cannot do anything: covered item, wrong item in a lesson, locked level
  | "trayWarn" // the tray just reached one free slot
  | "triple" // three alike cleared
  | "reward"
  | "chest"
  | "lose"
  | "win"
  | "star"; // one star popping in on the win sheet

// Game events plus the moments outside the rules, raised by the UI.
export type FeedbackEvent =
  | PuzzleEvent
  | { type: "rewardClaimed" }
  | { type: "chestOpened" }
  | { type: "lessonBlocked" }
  | { type: "lockedLevel" };

export interface Feedback {
  sfx: Sfx[];
  // One vibration per moment: the strongest one wins.
  haptic: Haptic | null;
}

// Tray fill around one take, to warn when it is one slot from losing.
export interface TrayChange {
  before: number;
  after: number;
  capacity: number;
}

// Weakest first. A win and a loss never share a moment, so they share the top.
const HAPTIC_RANK: Record<Haptic, number> = {
  tick: 0,
  select: 1,
  take: 2,
  hint: 3,
  undo: 4,
  shuffle: 5,
  nope: 6,
  trayWarn: 7,
  triple: 8,
  reward: 9,
  chest: 10,
  lose: 11,
  win: 11,
  star: 11,
};

function forEvent(event: FeedbackEvent): { sfx: Sfx | null; haptic: Haptic | null } {
  switch (event.type) {
    case "itemTaken":
      return { sfx: "tap", haptic: "take" };
    case "itemBlocked":
      return { sfx: "blocked", haptic: "nope" };
    case "tripleCleared":
      return { sfx: "clear", haptic: "triple" };
    case "boosterUsed":
      return { sfx: "booster", haptic: event.booster };
    // The win vibration follows the star pops on the win sheet (starSchedule).
    case "levelWon":
      return { sfx: "win", haptic: null };
    case "levelLost":
      return { sfx: "lose", haptic: "lose" };
    case "rewardClaimed":
      return { sfx: "reward", haptic: "reward" };
    case "chestOpened":
      return { sfx: "reward", haptic: "chest" };
    case "lessonBlocked":
    case "lockedLevel":
      return { sfx: null, haptic: "nope" };
    default:
      return { sfx: null, haptic: null };
  }
}

// A plain UI moment: a button pressed ("tick") or a setting, tab or switch changed ("select"). Both
// click, and each half follows its setting like any other moment.
export function uiFeedbackFor(kind: Extract<Haptic, "tick" | "select">, settings: Pick<Settings, "sound" | "haptics">): Feedback {
  return { sfx: settings.sound > 0 ? ["button"] : [], haptic: settings.haptics ? kind : null };
}

// True when a take without a clear brings the tray up to its last free slot. Only on the way up,
// so the warning does not repeat while the tray stays one short of full.
export function trayWarning(change: TrayChange, cleared: boolean): boolean {
  const edge = change.capacity - 1;
  return !cleared && change.before < edge && change.after === edge;
}

export function feedbackFor(events: readonly FeedbackEvent[], settings: Pick<Settings, "sound" | "haptics">, tray?: TrayChange): Feedback {
  const sfx: Sfx[] = [];
  let haptic: Haptic | null = null;
  const consider = (kind: Haptic | null) => {
    if (kind && settings.haptics && (haptic === null || HAPTIC_RANK[kind] > HAPTIC_RANK[haptic])) haptic = kind;
  };
  for (const event of events) {
    const out = forEvent(event);
    if (out.sfx && settings.sound > 0 && !sfx.includes(out.sfx)) sfx.push(out.sfx);
    consider(out.haptic);
  }
  if (tray && events.some((e) => e.type === "itemTaken") && trayWarning(tray, events.some((e) => e.type === "tripleCleared"))) consider("trayWarn");
  return { sfx, haptic };
}

// The `Stars` artboard starts growing one star every 14 frames at 60 fps, from frame 0, and the
// elastic overshoot lands about 7 frames into each (design/motion/rive/generate-scene.py, stars()).
// Change these with the animation.
export const STAR_GAP_MS = 233;
export const STAR_FIRST_MS = 117;
const WIN_AFTER_LAST_MS = 150;

export interface ScheduledHaptic {
  atMs: number;
  haptic: Haptic;
  // For "star": 0, 1 or 2; each star is stronger than the one before.
  star?: number;
}

// The win sheet's vibrations: one per star, then the win. With reduce motion the stars show at
// once, so only the win plays.
export function starSchedule(stars: number, reduceMotion: boolean, gapMs = STAR_GAP_MS, firstMs = STAR_FIRST_MS): ScheduledHaptic[] {
  if (reduceMotion || stars <= 0) return [{ atMs: 0, haptic: "win" }];
  const out: ScheduledHaptic[] = [];
  for (let i = 0; i < stars; i++) out.push({ atMs: firstMs + i * gapMs, haptic: "star", star: i });
  out.push({ atMs: firstMs + (stars - 1) * gapMs + WIN_AFTER_LAST_MS, haptic: "win" });
  return out;
}

// Pulsar's native names for the presets src/feedback/haptics.ts plays (Presets.ts in the package),
// preloaded at launch. preloadPresets ignores unknown names silently, so a test checks them.
export const PRESET_NATIVE_NAMES = [
  "SystemSelection",
  "SystemImpactLight",
  "SystemImpactMedium",
  "SystemImpactHeavy",
  "SystemNotificationSuccess",
  "SystemNotificationWarning",
  "CoinDrop",
] as const;

// The day-7 gift is a chest. Read the gift's day before claiming: claiming wraps it back to 0.
export function isChestGift(nextDay: number, giftCount: number): boolean {
  return nextDay === giftCount - 1;
}
