import { useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";

import { useGame } from "@/store/GameContext";

import { initAudio, setMusic, stopSfx } from "./audio";

function subscribeAppState(listener: () => void): () => void {
  const subscription = AppState.addEventListener("change", listener);
  return () => subscription.remove();
}
const isActive = () => AppState.currentState === "active";

// Sets up audio once, and keeps the music playing only while the app is in front, at the volume
// the settings give. Renders nothing.
export function MusicController() {
  const volume = useGame().snapshot.save.settings.music;
  // Read through the store hook, so a change between the first render and the subscription is not missed.
  const active = useSyncExternalStore(subscribeAppState, isActive);

  useEffect(() => initAudio(), []);
  useEffect(() => {
    // No jingle resumes halfway when the app comes back.
    if (!active) stopSfx();
    setMusic(active, volume);
  }, [active, volume]);
  return null;
}
