import { useRouter } from "expo-router";

import { SettingsScreen } from "@/hud/SettingsScreen";
import { useGame } from "@/store/GameContext";

export default function SettingsRoute() {
  const router = useRouter();
  const { commands } = useGame();
  return (
    <SettingsScreen
      onBack={() => router.back()}
      onReplayTutorial={() => {
        const first = commands.levelAt(0);
        if (first) router.replace(`/play/${first.id}`);
      }}
    />
  );
}
