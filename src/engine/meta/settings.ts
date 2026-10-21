// Player settings kept in the save. Volumes are 0–1 and are set in four steps from the settings
// screen (Tắt, Nhỏ, Vừa, To).
export const VOLUME_STEPS = [0, 0.35, 0.7, 1] as const;
export const DEFAULT_VOLUME = 0.7;
// The longest name the greeting accepts.
export const NAME_MAX_LENGTH = 20;

export interface Settings {
  music: number;
  sound: number;
  haptics: boolean;
  // "system" follows the iOS Reduce Motion setting.
  reduceMotion: "system" | "on" | "off";
  reminders: boolean;
}

export function defaultSettings(): Settings {
  return { music: DEFAULT_VOLUME, sound: DEFAULT_VOLUME, haptics: true, reduceMotion: "system", reminders: true };
}
