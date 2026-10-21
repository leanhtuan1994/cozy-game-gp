import * as Notifications from "expo-notifications";

import { planReminders } from "@/engine/meta/reminders";
import type { GameSession } from "@/store/session";

const TEST_BUILD = process.env.EXPO_PUBLIC_TEST_PROBES === "1" || process.env.EXPO_PUBLIC_DEBUG_HUD === "1";

// Replaces the scheduled reminders with the two the engine plans now. Runs when the app goes to
// the background and after a claim; does nothing until the player has allowed notifications, and
// only clears them when reminders are off in the game's settings.
export async function scheduleReminders(session: Pick<GameSession, "getSnapshot" | "clock">): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!session.getSnapshot().save.settings.reminders) {
      if (TEST_BUILD) console.log("[reminders] 0 scheduled: off in settings");
      return;
    }
    for (const reminder of planReminders(session.getSnapshot().save.meta, session.clock())) {
      await Notifications.scheduleNotificationAsync({
        identifier: reminder.id,
        content: { title: reminder.title, body: reminder.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.at },
      });
    }
    if (TEST_BUILD) {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`[reminders] ${scheduled.length} scheduled: ${JSON.stringify(scheduled.map((n) => ({ id: n.identifier, trigger: n.trigger })))}`);
    }
  } catch (error) {
    console.warn("scheduleReminders failed", error);
  }
}

// Asks once, when the player leaves a won level (never at launch, never over the win sheet).
// A player who answered, or who turned reminders off in the game's settings, is not asked.
export async function askForReminders(remindersOn: boolean): Promise<void> {
  if (!remindersOn) return;
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status === "undetermined" && canAskAgain) await Notifications.requestPermissionsAsync();
  } catch (error) {
    console.warn("askForReminders failed", error);
  }
}

// Whether iOS lets the game notify (the settings switch shows off while it does not).
export async function remindersAllowed(): Promise<boolean> {
  try {
    return (await Notifications.getPermissionsAsync()).status === "granted";
  } catch {
    return false;
  }
}

// The settings switch turning reminders on: asks if the player was never asked, and reports
// "denied" when iOS has them off (the caller then offers the system settings).
export async function requestReminders(): Promise<"granted" | "denied"> {
  try {
    let { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status === "undetermined" && canAskAgain) ({ status } = await Notifications.requestPermissionsAsync());
    return status === "granted" ? "granted" : "denied";
  } catch (error) {
    console.warn("requestReminders failed", error);
    return "denied";
  }
}
