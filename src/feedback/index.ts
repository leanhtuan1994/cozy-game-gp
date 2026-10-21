import type { Settings } from "@/engine/meta/settings";

import { playSfx } from "./audio";
import { playHaptic } from "./haptics";
import { feedbackFor, starSchedule, uiFeedbackFor, type FeedbackEvent, type Haptic, type TrayChange } from "./plan";

export { HAS_MUSIC, initAudio, setMusic } from "./audio";

// Plays the sounds and the vibration for a moment, as the settings allow. Settings are passed in
// at the call (read from the session), so nothing re-renders to keep them current. `tray` is the
// tray fill around a take, for the one-slot-left warning.
export function runFeedback(events: readonly FeedbackEvent[], settings: Settings, tray?: TrayChange): void {
  const { sfx, haptic } = feedbackFor(events, settings, tray);
  for (const kind of sfx) playSfx(kind, settings.sound);
  if (haptic) playHaptic(haptic);
}

// The click and the vibration for a plain UI moment: a button pressed ("tick") or a changed
// setting ("select"). Pass the settings as they are after the change, so a new sound level is heard.
export function playUiFeedback(kind: Extract<Haptic, "tick" | "select">, settings: Settings): void {
  const { sfx, haptic } = uiFeedbackFor(kind, settings);
  for (const sound of sfx) playSfx(sound, settings.sound);
  if (haptic) playHaptic(haptic);
}

// The win sheet's star pops and the win itself, timed to the Stars animation. Returns a cancel for
// when the sheet closes first.
export function runStarHaptics(stars: number, reduceMotion: boolean): () => void {
  const timers = starSchedule(stars, reduceMotion).map(({ atMs, haptic, star }) => setTimeout(() => playHaptic(haptic, star), atMs));
  return () => timers.forEach(clearTimeout);
}
