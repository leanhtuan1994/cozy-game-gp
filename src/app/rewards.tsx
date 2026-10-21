import { useRouter } from "expo-router";

import { RewardsScreen } from "@/hud/RewardsScreen";

export default function Route() {
  const router = useRouter();
  return <RewardsScreen onBack={() => router.back()} />;
}
