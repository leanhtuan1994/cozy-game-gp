// Calendar days for the daily systems (login gift, quests, streak). The engine never reads the
// clock: callers pass `now` (ms since the epoch) and the device's offset from UTC in minutes,
// east positive (Vietnam is +420; in JS that is `-new Date().getTimezoneOffset()`).
// A day is an integer: days since 1970-01-01 in device-local time, rolling over at 00:00.

const DAY_MS = 86_400_000;

// A clock that went back by less than this (sync jitter, a small manual fix) is not treated as
// tampering.
export const CLOCK_TOLERANCE_MS = 5 * 60_000;

// A clock this far behind a moment already seen is taken as corrected (it had been running ahead),
// not wound back: the daily systems rebase onto it instead of pausing for days.
export const MAX_CLOCK_PAUSE_MS = 2 * DAY_MS;

export type ClockCheck = "ok" | "wentBack" | "corrected";

export function dayNumber(now: number, tzOffsetMinutes: number): number {
  return Math.floor((now + tzOffsetMinutes * 60_000) / DAY_MS);
}

// Local midnight that starts the given day, in ms since the epoch.
export function dayStart(day: number, tzOffsetMinutes: number): number {
  return day * DAY_MS - tzOffsetMinutes * 60_000;
}

// The next moment at hour:minute local time that is strictly after `now`.
export function nextLocalTime(now: number, tzOffsetMinutes: number, hour: number, minute = 0): number {
  const today = dayNumber(now, tzOffsetMinutes);
  const at = dayStart(today, tzOffsetMinutes) + (hour * 60 + minute) * 60_000;
  return at > now ? at : at + DAY_MS;
}

// How the clock compares with the last moment the game has seen:
// - "wentBack": earlier by more than the tolerance but at most MAX_CLOCK_PAUSE_MS. Daily systems
//   pause (no claims, no streak change) until the clock catches up, so winding the clock back
//   cannot replay a day.
// - "corrected": earlier by more than MAX_CLOCK_PAUSE_MS. The daily systems rebase onto it.
export function checkClock(lastSeenAt: number, now: number): ClockCheck {
  const behind = lastSeenAt - now;
  if (behind <= CLOCK_TOLERANCE_MS) return "ok";
  return behind > MAX_CLOCK_PAUSE_MS ? "corrected" : "wentBack";
}

export function clockWentBack(lastSeenAt: number, now: number): boolean {
  return checkClock(lastSeenAt, now) === "wentBack";
}

// Ms until the next local midnight, for "resets in" countdowns.
export function msUntilNextDay(now: number, tzOffsetMinutes: number): number {
  return dayStart(dayNumber(now, tzOffsetMinutes) + 1, tzOffsetMinutes) - now;
}
