import { createContext, createElement, useContext, useSyncExternalStore, type ReactNode } from "react";
import { AccessibilityInfo } from "react-native";

import { useGame } from "@/store/GameContext";

// iOS Reduce Motion, kept current while the app runs (Reanimated's own flag is read once at launch).
let systemReduceMotion = false;
const listeners = new Set<() => void>();
const emit = (value: boolean) => {
  systemReduceMotion = value;
  for (const listener of listeners) listener();
};
void AccessibilityInfo.isReduceMotionEnabled().then(emit, () => undefined);
AccessibilityInfo.addEventListener("reduceMotionChanged", emit);

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Reduce motion as the player set it in the game, or as iOS has it when the game setting is "system".
// Animations that honour it pass `ReduceMotion.Never` to Reanimated, so this hook alone decides.
export function useReduceMotion(): boolean {
  const system = useSyncExternalStore(subscribe, () => systemReduceMotion);
  const setting = useGame().snapshot.save.settings.reduceMotion;
  return setting === "system" ? system : setting === "on";
}

const ReduceMotionContext = createContext(false);

// Shares the flag with widgets used everywhere (buttons), which then re-render only when the flag
// changes rather than on every game commit, as useGame() consumers do.
export function ReduceMotionProvider({ children }: { children: ReactNode }) {
  return createElement(ReduceMotionContext.Provider, { value: useReduceMotion() }, children);
}

export function useReduceMotionFlag(): boolean {
  return useContext(ReduceMotionContext);
}
