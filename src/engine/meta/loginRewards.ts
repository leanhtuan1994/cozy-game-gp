import type { Reward } from "./rewards";

// The 7-day login gift and the daily streak.
// - The gift calendar advances only when a gift is claimed; skipping days never resets it.
// - The streak counts days with a visit (the first app open of each local day). Missing a day
//   resets it to 1; the best streak is kept for achievements.
export interface LoginState {
  // Index (0–6) of the next gift on the calendar.
  nextDay: number;
  // Local day number (calendar.ts) of the last claim, or null.
  lastClaimDay: number | null;
  streak: number;
  bestStreak: number;
  lastVisitDay: number | null;
}

export const LOGIN_GIFTS: readonly Reward[] = [{ hint: 1 }, { undo: 1 }, { shuffle: 1 }, { hint: 1 }, { undo: 1 }, { shuffle: 1 }, { undo: 2, shuffle: 2, hint: 2 }];

export function emptyLogin(): LoginState {
  return { nextDay: 0, lastClaimDay: null, streak: 0, bestStreak: 0, lastVisitDay: null };
}

// Records the first visit of a day. A day earlier than the last visit (the phone moved west
// across time zones) counts as the same day: nothing changes.
export function visitLogin(state: LoginState, today: number): LoginState {
  if (state.lastVisitDay !== null && today <= state.lastVisitDay) return state;
  const streak = state.lastVisitDay !== null && today === state.lastVisitDay + 1 ? state.streak + 1 : 1;
  return { ...state, lastVisitDay: today, streak, bestStreak: Math.max(state.bestStreak, streak) };
}

export function canClaimLogin(state: LoginState, today: number): boolean {
  return state.lastClaimDay === null || today > state.lastClaimDay;
}

export function claimLogin(state: LoginState, today: number): { state: LoginState; reward: Reward } | null {
  if (!canClaimLogin(state, today)) return null;
  return {
    state: { ...state, nextDay: (state.nextDay + 1) % LOGIN_GIFTS.length, lastClaimDay: today },
    reward: LOGIN_GIFTS[state.nextDay]!,
  };
}
