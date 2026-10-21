import { dayNumber, nextLocalTime } from "./calendar";
import { isQuestDone } from "./dailyQuests";
import { canClaimLogin } from "./loginRewards";
import type { Clock, MetaState } from "./meta";

export interface Reminder {
  id: "gift" | "quests";
  // Fire time, ms since the epoch.
  at: number;
  title: string;
  body: string;
}

export const GIFT_HOUR = 19;
export const QUESTS_TIME = { hour: 20, minute: 30 };
const DAY_MS = 86_400_000;

// The two local reminders to keep scheduled, planned when the app goes to the background:
// - the daily gift, at the next 19:00 when that day's gift will still be unclaimed;
// - unfinished quests, at the next 20:30 when that day's quests will not all be done.
// Today's slot is skipped (moved to tomorrow) when today's gift is claimed or quests are done.
export function planReminders(meta: MetaState, clock: Clock): Reminder[] {
  const { now, tzOffsetMinutes: tz } = clock;
  const today = dayNumber(now, tz);

  let giftAt = nextLocalTime(now, tz, GIFT_HOUR);
  if (dayNumber(giftAt, tz) === today && !canClaimLogin(meta.login, today)) giftAt += DAY_MS;

  let questsAt = nextLocalTime(now, tz, QUESTS_TIME.hour, QUESTS_TIME.minute);
  const questsDoneToday = meta.quests.day === today && meta.quests.quests.length > 0 && meta.quests.quests.every(isQuestDone);
  if (dayNumber(questsAt, tz) === today && questsDoneToday) questsAt += DAY_MS;

  return [
    { id: "gift", at: giftAt, title: "Quà hôm nay đã sẵn sàng", body: "Ghé Ghép Phố nhận quà mỗi ngày nhé." },
    { id: "quests", at: questsAt, title: "Nhiệm vụ còn dang dở", body: "Còn nhiệm vụ hôm nay chưa xong, vào dọn thêm vài góc phố đi." },
  ];
}
