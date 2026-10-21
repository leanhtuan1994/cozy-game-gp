import { describe, expect, it } from "vitest";

import { clockWentBack, dayNumber, dayStart, msUntilNextDay, nextLocalTime } from "@/engine/meta/calendar";

const VN = 420; // UTC+7
const HOUR = 3_600_000;
// 2026-10-16 00:00 in Vietnam = 2026-10-15 17:00 UTC.
const MIDNIGHT_VN = Date.UTC(2026, 9, 15, 17, 0, 0);

describe("calendar", () => {
  it("rolls the day over at local midnight, not UTC midnight", () => {
    const day = dayNumber(MIDNIGHT_VN, VN);
    expect(dayNumber(MIDNIGHT_VN - 1, VN)).toBe(day - 1);
    expect(dayNumber(MIDNIGHT_VN + 23 * HOUR, VN)).toBe(day);
    expect(dayStart(day, VN)).toBe(MIDNIGHT_VN);
    // In UTC the same instant is still the previous day's afternoon.
    expect(dayNumber(MIDNIGHT_VN, 0)).toBe(day - 1);
  });

  it("counts a long absence in whole local days", () => {
    const day = dayNumber(MIDNIGHT_VN + 9 * HOUR, VN);
    expect(dayNumber(MIDNIGHT_VN + 9 * HOUR + 10 * 24 * HOUR, VN) - day).toBe(10);
  });

  it("can repeat or skip a day when the time zone changes, by design", () => {
    // 23:30 in Vietnam, then the phone lands in Japan (UTC+9): it is now 01:30 the next day.
    const late = MIDNIGHT_VN + 23.5 * HOUR;
    expect(dayNumber(late, 540) - dayNumber(late, VN)).toBe(1);
    // Flying west from UTC+7 to UTC+0 at 03:00 local goes back to the previous day.
    const early = MIDNIGHT_VN + 3 * HOUR;
    expect(dayNumber(early, 0) - dayNumber(early, VN)).toBe(-1);
  });

  it("detects a clock wound back past what the game has seen, with a small tolerance", () => {
    const seen = MIDNIGHT_VN + 10 * HOUR;
    expect(clockWentBack(seen, seen - 2 * 60_000)).toBe(false);
    expect(clockWentBack(seen, seen - 6 * 60_000)).toBe(true);
    expect(clockWentBack(seen, seen + HOUR)).toBe(false);
  });

  it("finds the next 19:00 and the time to midnight", () => {
    expect(nextLocalTime(MIDNIGHT_VN + 10 * HOUR, VN, 19)).toBe(MIDNIGHT_VN + 19 * HOUR);
    expect(nextLocalTime(MIDNIGHT_VN + 20 * HOUR, VN, 19)).toBe(MIDNIGHT_VN + 43 * HOUR);
    expect(nextLocalTime(MIDNIGHT_VN + 19 * HOUR, VN, 19)).toBe(MIDNIGHT_VN + 43 * HOUR);
    expect(msUntilNextDay(MIDNIGHT_VN + 22 * HOUR, VN)).toBe(2 * HOUR);
  });
});
