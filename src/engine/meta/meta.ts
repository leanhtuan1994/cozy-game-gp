import type { Booster } from "../puzzle/types";
import { ACHIEVEMENTS, isUnlocked, type AchievementContext } from "./achievements";
import { checkClock, clockWentBack, dayNumber } from "./calendar";
import { addRunToQuests, canClaimChest, claimChest, claimQuest, emptyQuests, isQuestDone, visitQuests, type QuestState } from "./dailyQuests";
import { canClaimLogin, claimLogin, emptyLogin, visitLogin, type LoginState } from "./loginRewards";
import { completedCount, type Progress } from "./progress";
import { addReward, type Inventory, type Reward } from "./rewards";
import { addRun, emptyStats, type RunSummary, type Stats } from "./stats";

// The retention layer kept in the save: counters, the login gift and streak, the day's quests,
// and which achievements have been claimed (unlocks are derived, never stored).
export interface MetaState {
  stats: Stats;
  login: LoginState;
  quests: QuestState;
  achievementsClaimed: string[];
}

// Time as the caller sees it. `lastSeenAt` is the save's last-seen moment before this call.
export interface Clock {
  now: number;
  tzOffsetMinutes: number;
  lastSeenAt: number;
}

export function emptyMeta(): MetaState {
  return { stats: emptyStats(), login: emptyLogin(), quests: emptyQuests(), achievementsClaimed: [] };
}

// The local day for daily systems, or null while the clock reads earlier than a moment already
// seen (wound back): daily systems then pause instead of replaying a day.
export function today(clock: Clock): number | null {
  return clockWentBack(clock.lastSeenAt, clock.now) ? null : dayNumber(clock.now, clock.tzOffsetMinutes);
}

// True when the clock jumped back by more than a pause allows: the caller rebases `lastSeenAt`.
export function clockCorrected(clock: Clock): boolean {
  return checkClock(clock.lastSeenAt, clock.now) === "corrected";
}

// Moves day markers that lie after `day` back to it, so a clock that had been running ahead does
// not lock the gift and quests until real time catches up. Nothing is paid twice: today's gift
// counts as claimed when a later day's was.
function rebase(meta: MetaState, day: number): MetaState {
  const { login, quests } = meta;
  const lastClaimDay = login.lastClaimDay !== null && login.lastClaimDay > day ? day : login.lastClaimDay;
  const lastVisitDay = login.lastVisitDay !== null && login.lastVisitDay > day ? day : login.lastVisitDay;
  const futureQuests = quests.day !== null && quests.day > day;
  if (lastClaimDay === login.lastClaimDay && lastVisitDay === login.lastVisitDay && !futureQuests) return meta;
  return { ...meta, login: { ...login, lastClaimDay, lastVisitDay }, quests: futureQuests ? emptyQuests() : quests };
}

// The first visit of a new day starts the streak day and the day's quests.
export function visit(meta: MetaState, clock: Clock): MetaState {
  const day = today(clock);
  if (day === null) return meta;
  if (clockCorrected(clock)) meta = rebase(meta, day);
  const login = visitLogin(meta.login, day);
  const quests = visitQuests(meta.quests, day);
  return login === meta.login && quests === meta.quests ? meta : { ...meta, login, quests };
}

export function recordRun(meta: MetaState, run: RunSummary): MetaState {
  return { ...meta, stats: addRun(meta.stats, run), quests: addRunToQuests(meta.quests, run) };
}

export function recordBoosterUse(meta: MetaState): MetaState {
  return { ...meta, stats: { ...meta.stats, boostersUsed: meta.stats.boostersUsed + 1 } };
}

// levelIdsByDistrict: the level ids of each district, in play order.
export function achievementContext(meta: MetaState, progress: Progress, levelIdsByDistrict: readonly (readonly string[])[]): AchievementContext {
  return {
    levelsCompleted: completedCount(progress),
    threeStarLevels: Object.values(progress.stars).filter((stars) => stars === 3).length,
    triplesCleared: meta.stats.triplesCleared,
    bestStreak: meta.login.bestStreak,
    boostersUsed: meta.stats.boostersUsed,
    districtsDone: levelIdsByDistrict.flatMap((ids, i) => (ids.length > 0 && ids.every((id) => progress.stars[id] !== undefined) ? [i] : [])),
  };
}

export type ClaimTarget = { type: "login" } | { type: "quest"; id: string } | { type: "questChest" } | { type: "achievement"; id: string };

export interface ClaimResult {
  meta: MetaState;
  inventory: Inventory;
  reward: Reward;
}

// Claims a gift, quest, chest or achievement. Null when it is not claimable now (already
// claimed, not done, or the clock was wound back).
export function claim(
  meta: MetaState,
  inventory: Inventory,
  target: ClaimTarget,
  clock: Clock,
  context: AchievementContext,
): ClaimResult | null {
  const day = today(clock);
  let next: { meta: MetaState; reward: Reward } | null = null;
  if (target.type === "login") {
    const result = day === null ? null : claimLogin(meta.login, day);
    next = result && { meta: { ...meta, login: result.state }, reward: result.reward };
  } else if (target.type === "quest") {
    const result = day === null || meta.quests.day !== day ? null : claimQuest(meta.quests, target.id);
    next = result && { meta: { ...meta, quests: result.state }, reward: result.reward };
  } else if (target.type === "questChest") {
    const result = day === null || meta.quests.day !== day ? null : claimChest(meta.quests);
    next = result && { meta: { ...meta, quests: result.state }, reward: result.reward };
  } else {
    const def = ACHIEVEMENTS.find((a) => a.id === target.id);
    if (def && isUnlocked(def, context) && !meta.achievementsClaimed.includes(def.id)) {
      next = { meta: { ...meta, achievementsClaimed: [...meta.achievementsClaimed, def.id] }, reward: def.reward };
    }
  }
  return next && { meta: next.meta, inventory: addReward(inventory, next.reward), reward: next.reward };
}

export interface Claimable {
  login: boolean;
  quests: number;
  chest: boolean;
  achievements: number;
  any: boolean;
  // The clock reads earlier than a moment already seen: daily gifts and quests wait for it.
  paused: boolean;
}

// What can be claimed right now, for the red dots on the map.
export function claimable(meta: MetaState, clock: Clock, context: AchievementContext): Claimable {
  const day = today(clock);
  const login = day !== null && canClaimLogin(meta.login, day);
  const questsOpen = day !== null && meta.quests.day === day;
  const quests = questsOpen ? meta.quests.quests.filter((quest) => !quest.claimed && isQuestDone(quest)).length : 0;
  const chest = questsOpen && canClaimChest(meta.quests);
  const achievements = ACHIEVEMENTS.filter((def) => isUnlocked(def, context) && !meta.achievementsClaimed.includes(def.id)).length;
  return { login, quests, chest, achievements, any: login || quests > 0 || chest || achievements > 0, paused: day === null };
}

// The booster a reward has most of (the first listed on a tie), for the BoosterGain animation.
export function mainBooster(reward: Reward): Booster | null {
  let best: Booster | null = null;
  for (const kind of Object.keys(reward) as Booster[]) {
    if ((reward[kind] ?? 0) > (best === null ? 0 : (reward[best] ?? 0))) best = kind;
  }
  return best;
}
