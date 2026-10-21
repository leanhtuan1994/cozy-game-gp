import { useRouter } from "expo-router";

import { AchievementsScreen } from "@/hud/AchievementsScreen";

export default function Route() {
  const router = useRouter();
  return <AchievementsScreen onBack={() => router.back()} />;
}
