import type { Booster } from "../puzzle/types";

// A bundle of boosters handed out by a gift, quest, chest or achievement.
export type Reward = Partial<Record<Booster, number>>;

export type Inventory = Record<Booster, number>;

export function addReward(inventory: Inventory, reward: Reward): Inventory {
  return {
    undo: inventory.undo + (reward.undo ?? 0),
    shuffle: inventory.shuffle + (reward.shuffle ?? 0),
    hint: inventory.hint + (reward.hint ?? 0),
  };
}
