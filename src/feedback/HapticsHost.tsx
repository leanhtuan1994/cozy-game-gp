import { memo, useEffect, useState } from "react";
import { AppState } from "react-native";
import { usePatternComposer } from "react-native-pulsar";

import { useGame } from "@/store/GameContext";

import { PATTERN_HAPTICS, PATTERNS, registerPattern, setHapticsEnabled, warmUp, type PatternHaptic } from "./haptics";

function PatternPlayer({ kind }: { kind: PatternHaptic }) {
  // Parses the pattern in its own effect, which runs before the parent's effect below.
  const { play } = usePatternComposer(PATTERNS[kind]);
  useEffect(() => registerPattern(kind, play), [kind, play]);
  return null;
}

// One parse of every hand-made pattern. Its effect runs after every child's parse, then preloads the
// presets: the engine is never started from two threads at once.
function PatternSet() {
  useEffect(() => warmUp(), []);
  return (
    <>
      {PATTERN_HAPTICS.map((kind) => (
        <PatternPlayer key={kind} kind={kind} />
      ))}
    </>
  );
}

// Keeps the hand-made patterns parsed for the life of the app (usePatternComposer is a hook, so they
// live in components). Parsing starts the haptic engine, and Pulsar makes no player when the app is
// not active at that moment, leaving the pattern silent for the session. So the patterns are parsed
// only while the app is active, and parsed again each time it comes back to the foreground. No props,
// so game commits never re-render it.
export const HapticPatterns = memo(function HapticPatterns() {
  const [round, setRound] = useState(() => (AppState.currentState === "active" ? 1 : 0));
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setRound((current) => current + 1);
    });
    return () => subscription.remove();
  }, []);
  return round === 0 ? null : <PatternSet key={round} />;
});

// Follows the "Rung" setting.
export function HapticsSettingsSync() {
  const on = useGame().snapshot.save.settings.haptics;
  useEffect(() => setHapticsEnabled(on), [on]);
  return null;
}
