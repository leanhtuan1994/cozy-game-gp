import { useRouter } from "expo-router";

import { OnboardingScreen } from "@/hud/OnboardingScreen";
import { useGame } from "@/store/GameContext";

// The first-run greeting; it ends in level 1, which teaches the first lesson.
export default function OnboardingRoute() {
  const router = useRouter();
  const { commands } = useGame();
  return (
    <OnboardingScreen
      onDone={(name) => {
        commands.finishOnboarding(name);
        const first = commands.levelAt(0);
        router.replace(first ? `/play/${first.id}` : "/");
      }}
    />
  );
}
