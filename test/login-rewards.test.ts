import { describe, expect, it } from "vitest";

import { LOGIN_GIFTS, canClaimLogin, claimLogin, emptyLogin, visitLogin } from "@/engine/meta/loginRewards";

describe("login gift and streak", () => {
  it("gives one gift per day and walks the 7-day calendar, restarting after day 7", () => {
    let state = emptyLogin();
    for (let day = 100; day < 108; day += 1) {
      state = visitLogin(state, day);
      const claimed = claimLogin(state, day)!;
      expect(claimed.reward).toEqual(LOGIN_GIFTS[(day - 100) % 7]);
      state = claimed.state;
      expect(claimLogin(state, day)).toBeNull();
    }
    expect(state.nextDay).toBe(1);
  });

  it("does not reset the gift calendar when days are skipped, but resets the streak", () => {
    let state = visitLogin(emptyLogin(), 100);
    state = claimLogin(state, 100)!.state;
    state = visitLogin(state, 101);
    state = claimLogin(state, 101)!.state;
    expect(state.streak).toBe(2);
    state = visitLogin(state, 105);
    expect(state.streak).toBe(1);
    expect(state.bestStreak).toBe(2);
    expect(claimLogin(state, 105)!.reward).toEqual(LOGIN_GIFTS[2]);
  });

  it("counts the streak from visits, so a gift left unclaimed does not break it", () => {
    let state = emptyLogin();
    for (const day of [10, 11, 12]) state = visitLogin(state, day);
    expect(state).toMatchObject({ streak: 3, bestStreak: 3, nextDay: 0 });
  });

  it("treats an earlier day (a westward time-zone move) as the same day", () => {
    let state = visitLogin(emptyLogin(), 50);
    state = claimLogin(state, 50)!.state;
    expect(visitLogin(state, 49)).toBe(state);
    expect(canClaimLogin(state, 49)).toBe(false);
  });
});
