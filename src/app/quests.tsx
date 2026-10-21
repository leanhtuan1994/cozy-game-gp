import { useRouter } from "expo-router";

import { QuestsScreen } from "@/hud/QuestsScreen";

export default function Route() {
  const router = useRouter();
  return <QuestsScreen onBack={() => router.back()} />;
}
