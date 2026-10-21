import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect } from "react";

import { PlayScreen } from "@/scene/PlayScreen";
import { releaseHeldPlay, useGame } from "@/store/GameContext";

// /play/<level id>, for example /play/xe-banh-mi-01.
export default function PlayRoute() {
  const { level } = useLocalSearchParams<{ level: string }>();
  const router = useRouter();
  const { commands } = useGame();
  const levelIndex = commands.levelIndexOf(level ?? "");

  // Back to the map, closing every play screen above it (a deep link can stack more than one).
  const toMap = useCallback(() => router.dismissTo("/"), [router]);

  // The level ends when its screen goes away (after the closing animation, which keeps drawing
  // it), unless the next level has already replaced it in the session.
  useEffect(
    () => () => {
      releaseHeldPlay(levelIndex);
      if (commands.getSnapshot().play?.levelIndex === levelIndex) commands.quit();
    },
    [commands, levelIndex],
  );

  const toNext = useCallback(() => {
    const next = commands.levelAt(levelIndex + 1);
    if (next) router.replace(`/play/${next.id}`);
    else toMap();
  }, [commands, levelIndex, router, toMap]);

  return <PlayScreen key={levelIndex} levelIndex={levelIndex} onMap={toMap} onNext={toNext} />;
}
