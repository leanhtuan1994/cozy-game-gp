import { hashSeed, nextIndex } from "../rng";
import type { Reward } from "./rewards";
import type { RunSummary } from "./stats";

export type QuestMeasure = "levelsWon" | "triples" | "threeStars" | "coveredTaken";

export interface QuestDef {
  id: string;
  title: string;
  measure: QuestMeasure;
  target: number;
  reward: Reward;
}

export interface QuestProgress {
  id: string;
  progress: number;
  claimed: boolean;
}

export interface QuestState {
  // Local day number these quests belong to, or null before the first visit.
  day: number | null;
  quests: QuestProgress[];
  chestClaimed: boolean;
}

// The first quest of every day is always the same easy one, so a short session can finish it.
const FIRST: QuestDef = { id: "win-1", title: "Thắng 1 màn", measure: "levelsWon", target: 1, reward: { hint: 1 } };

export const QUEST_POOL: readonly QuestDef[] = [
  { id: "win-3", title: "Thắng 3 màn", measure: "levelsWon", target: 3, reward: { undo: 1 } },
  { id: "triples-15", title: "Xoá 15 bộ ba", measure: "triples", target: 15, reward: { shuffle: 1 } },
  { id: "triples-30", title: "Xoá 30 bộ ba", measure: "triples", target: 30, reward: { hint: 1, undo: 1 } },
  { id: "stars-2", title: "Đạt 3 sao ở 2 màn", measure: "threeStars", target: 2, reward: { hint: 1 } },
  { id: "covered-10", title: "Gom 10 món từng bị đè", measure: "coveredTaken", target: 10, reward: { shuffle: 1 } },
  { id: "covered-25", title: "Gom 25 món từng bị đè", measure: "coveredTaken", target: 25, reward: { undo: 1, shuffle: 1 } },
];

export const QUEST_CHEST: Reward = { undo: 1, shuffle: 1, hint: 1 };

const DEFS = new Map([FIRST, ...QUEST_POOL].map((quest) => [quest.id, quest]));

export function questDef(id: string): QuestDef | undefined {
  return DEFS.get(id);
}

export function emptyQuests(): QuestState {
  return { day: null, quests: [], chestClaimed: false };
}

// The day's three quests: the fixed first one plus two from the pool, picked by the day number.
export function questsForDay(day: number): QuestDef[] {
  const rng = hashSeed(`quests/${day}`);
  const pool = [...QUEST_POOL];
  const picked: QuestDef[] = [FIRST];
  for (let i = 0; i < 2; i += 1) picked.push(pool.splice(nextIndex(rng, pool.length), 1)[0]!);
  return picked;
}

// Starts the day's quests on the first visit of a new day (a westward time-zone move that lands
// on an earlier day keeps the current set).
export function visitQuests(state: QuestState, today: number): QuestState {
  if (state.day !== null && today <= state.day) return state;
  return { day: today, quests: questsForDay(today).map((quest) => ({ id: quest.id, progress: 0, claimed: false })), chestClaimed: false };
}

function amount(measure: QuestMeasure, run: RunSummary): number {
  switch (measure) {
    case "levelsWon":
      return 1;
    case "triples":
      return run.triples;
    case "threeStars":
      return run.stars === 3 ? 1 : 0;
    case "coveredTaken":
      return run.coveredTaken;
  }
}

export function addRunToQuests(state: QuestState, run: RunSummary): QuestState {
  return {
    ...state,
    quests: state.quests.map((quest) => {
      const def = DEFS.get(quest.id);
      return def ? { ...quest, progress: Math.min(def.target, quest.progress + amount(def.measure, run)) } : quest;
    }),
  };
}

export function isQuestDone(quest: QuestProgress): boolean {
  const def = DEFS.get(quest.id);
  return def !== undefined && quest.progress >= def.target;
}

export function claimQuest(state: QuestState, id: string): { state: QuestState; reward: Reward } | null {
  const quest = state.quests.find((q) => q.id === id);
  const def = DEFS.get(id);
  if (!quest || !def || quest.claimed || !isQuestDone(quest)) return null;
  return { state: { ...state, quests: state.quests.map((q) => (q.id === id ? { ...q, claimed: true } : q)) }, reward: def.reward };
}

export function canClaimChest(state: QuestState): boolean {
  return !state.chestClaimed && state.quests.length > 0 && state.quests.every((quest) => quest.claimed);
}

export function claimChest(state: QuestState): { state: QuestState; reward: Reward } | null {
  if (!canClaimChest(state)) return null;
  return { state: { ...state, chestClaimed: true }, reward: QUEST_CHEST };
}
