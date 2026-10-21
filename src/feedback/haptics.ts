import { AppState } from "react-native";
import { Presets, Settings, type Pattern } from "react-native-pulsar";

import { PRESET_NATIVE_NAMES, type Haptic } from "./plan";

// The only module that talks to Pulsar, so swapping the haptics library touches this file and
// HapticsHost.tsx alone. Pulsar 1.7.0 starts Core Haptics' engine on the main thread and can stall
// for seconds (software-mansion/pulsar#302); the splash covers the first start (see warmUp).

const TEST_BUILD = process.env.EXPO_PUBLIC_TEST_PROBES === "1" || process.env.EXPO_PUBLIC_DEBUG_HUD === "1";

// Pulsar plays an audible beep with each haptic in debug builds and on the simulator. Silencing it
// deactivates the shared audio session, so it runs once, at import, before MusicController starts
// the music, and never in a release build, where there is no beep.
if (__DEV__ || TEST_BUILD) Settings.enableSound(false);

function taps(points: readonly (readonly [time: number, amplitude: number, sharpness: number])[]): Pattern {
  return {
    discretePattern: points.map(([time, amplitude, frequency]) => ({ time, amplitude, frequency })),
    continuousPattern: { amplitude: [], frequency: [] },
  };
}

// Hand-made patterns. Amplitude is intensity and frequency is sharpness, both 0–1; times in ms.
// Module constants: usePatternComposer parses again whenever the pattern object changes.
export const PATTERNS = {
  // A key under the finger: one light, crisp tap, firm enough to feel on every button.
  tick: taps([[0, 0.6, 0.8]]),
  // "Not that one": two soft, round taps.
  nope: taps([
    [0, 0.5, 0.25],
    [90, 0.4, 0.2],
  ]),
  // A low heartbeat: the tray has one slot left.
  trayWarn: taps([
    [0, 0.75, 0.1],
    [150, 0.55, 0.1],
  ]),
  // Rewinding: three taps fading out.
  undo: taps([
    [0, 0.5, 0.5],
    [60, 0.35, 0.45],
    [120, 0.2, 0.4],
  ]),
  // A bright double ping, like the lantern lighting up.
  hint: taps([
    [0, 0.3, 0.9],
    [110, 0.45, 0.9],
  ]),
  // A short rumble that swells and fades while the items swap.
  shuffle: {
    discretePattern: [{ time: 0, amplitude: 0.4, frequency: 0.4 }],
    continuousPattern: {
      amplitude: [
        { time: 0, value: 0 },
        { time: 120, value: 0.45 },
        { time: 240, value: 0 },
      ],
      frequency: [
        { time: 0, value: 0.35 },
        { time: 240, value: 0.35 },
      ],
    },
  },
} satisfies Record<string, Pattern>;

export type PatternHaptic = keyof typeof PATTERNS;
export const PATTERN_HAPTICS = Object.keys(PATTERNS) as PatternHaptic[];

type PresetHaptic = Exclude<Haptic, PatternHaptic | "star">;

const PRESETS: Record<PresetHaptic, () => void> = {
  select: Presets.System.selection,
  take: Presets.System.impactLight,
  triple: Presets.System.impactMedium,
  reward: Presets.System.notificationSuccess,
  chest: Presets.coinDrop,
  lose: Presets.System.notificationWarning,
  win: Presets.System.notificationSuccess,
};

// Each star of the win sheet is stronger than the one before.
const STARS: readonly (() => void)[] = [Presets.System.impactLight, Presets.System.impactMedium, Presets.System.impactHeavy];

const players: Partial<Record<PatternHaptic, () => void>> = {};
let enabled = true;
let markReady: () => void = () => undefined;
// Resolves once the patterns are parsed and the presets preloaded for the first time.
export const hapticsReady = new Promise<void>((resolve) => {
  markReady = resolve;
});

export function registerPattern(kind: PatternHaptic, play: () => void): void {
  players[kind] = play;
}

// Called after every pattern is parsed (at launch and on each return to the foreground): parsing
// starts the engine on the JS thread and preloading starts it on the main thread, and the engine must
// not be started from both at once. The first call releases the splash.
export function warmUp(): void {
  try {
    Settings.preloadPresets([...PRESET_NATIVE_NAMES]);
  } finally {
    markReady();
  }
}

// The in-game "Rung" switch. Custom patterns ignore iOS's own haptics switch (pulsar#129), so this
// is the player's way to turn them off.
export function setHapticsEnabled(on: boolean): void {
  enabled = on;
  try {
    Settings.enableHaptics(on);
  } catch {
    // Haptics are a nicety; never let them break the game.
  }
}

export function playHaptic(kind: Haptic, star = 0): void {
  if (!enabled || AppState.currentState !== "active") return;
  if (TEST_BUILD) console.log(`[haptic] ${kind === "star" ? `star ${star + 1}` : kind}`);
  try {
    if (kind === "star") STARS[Math.min(star, STARS.length - 1)]?.();
    else if (kind in PATTERNS) players[kind as PatternHaptic]?.();
    else PRESETS[kind as PresetHaptic]();
  } catch {
    // Haptics are a nicety; never let them break the game.
  }
}
