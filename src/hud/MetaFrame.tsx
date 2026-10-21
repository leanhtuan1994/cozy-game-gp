import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Image, ImageBackground, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { mainBooster } from "@/engine/meta/meta";
import type { Reward } from "@/engine/meta/rewards";
import type { Booster } from "@/engine/puzzle/types";
import { runFeedback } from "@/feedback";
import { BoosterGain } from "@/motion/BoosterGain";
import { scheduleReminders } from "@/notifications/schedule";
import { useGame } from "@/store/GameContext";

import { BOOSTER_NAMES } from "./BoosterBar";
import { BOOSTER_ICONS, TILE_BACKGROUND } from "./icons";
import { OutlinedText } from "./OutlinedText";
import { COLORS, FACE, FONT, INK_BORDER, displayType } from "./theme";
import { Button } from "./ui";

// "1 Hoàn tác, 2 Xáo": a reward as text. Every number comes from the engine's reward tables.
export function rewardText(reward: Reward): string {
  return (Object.keys(BOOSTER_NAMES) as Booster[])
    .filter((kind) => (reward[kind] ?? 0) > 0)
    .map((kind) => `${reward[kind]} ${BOOSTER_NAMES[kind]}`)
    .join(", ");
}

// Shows what a claim paid: the BoosterGain animation for the kind it has most of (~1.2 s) and a
// toast that stays long enough to read. A claim also replans the reminders, so a gift claimed
// before 19:00 does not leave "Quà hôm nay đã sẵn sàng" pending.
const TOAST_MS = 3000;

export function useRewardFeedback() {
  const { commands } = useGame();
  const [shown, setShown] = useState<{ key: number; reward: Reward } | null>(null);
  // `chest`: the quest chest or the day-7 gift, which get a stronger vibration.
  const show = useCallback(
    (reward: Reward | null, chest = false) => {
      if (!reward) return;
      setShown({ key: Date.now(), reward });
      runFeedback([{ type: chest ? "chestOpened" : "rewardClaimed" }], commands.getSnapshot().save.settings);
      void scheduleReminders(commands);
    },
    [commands],
  );
  const key = shown?.key;
  useEffect(() => {
    if (key === undefined) return;
    const timer = setTimeout(() => setShown((current) => (current?.key === key ? null : current)), TOAST_MS);
    return () => clearTimeout(timer);
  }, [key]);
  const booster = shown ? mainBooster(shown.reward) : null;
  const overlay = shown ? (
    <View pointerEvents="none" style={styles.feedback} accessibilityLiveRegion="polite">
      {booster ? <BoosterGain key={shown.key} booster={booster} /> : null}
      <View style={styles.toast}>
        {booster ? <Image source={BOOSTER_ICONS[booster]} style={styles.toastIcon} /> : null}
        <Text style={styles.toastText} testID="reward-toast">
          {`Nhận ${rewardText(shown.reward)}`}
        </Text>
      </View>
    </View>
  ) : null;
  return { show, overlay };
}

// Shown while the device clock reads earlier than the last time the game was open.
export function ClockNote() {
  return (
    <Text style={styles.clockNote} testID="clock-note">
      Giờ trên máy đang sớm hơn lần chơi trước. Quà và nhiệm vụ sẽ mở lại khi giờ chạy tới lúc đó.
    </Text>
  );
}

interface MetaFrameProps {
  title: string;
  testID: string;
  onBack: () => void;
  children: ReactNode;
  overlay?: ReactNode;
}

function BackArrow() {
  return (
    <View style={styles.arrow} accessible={false}>
      <View style={[styles.arrowStroke, { transform: [{ rotate: "-45deg" }], top: 3 }]} />
      <View style={[styles.arrowStroke, { transform: [{ rotate: "45deg" }], top: 10 }]} />
    </View>
  );
}

// Page frame for the rewards, quests, achievements and settings screens: the tiled floor, a back
// button and the page title.
export function MetaFrame({ title, testID, onBack, children, overlay }: MetaFrameProps) {
  const insets = useSafeAreaInsets();
  return (
    // The testID sits on a plain View: ImageBackground hands it to its inner image.
    <View style={styles.screen} testID={testID}>
      <ImageBackground source={TILE_BACKGROUND} resizeMode="repeat" style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Button label="Bản đồ" variant="paper" size="md" onPress={onBack} testID="back-to-map" faceStyle={styles.backFace} labelStyle={styles.backLabel}>
            <BackArrow />
          </Button>
          <OutlinedText size={30} accessibilityRole="header" numberOfLines={1} style={styles.title}>
            {title}
          </OutlinedText>
        </View>
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}>{children}</ScrollView>
        {overlay}
      </ImageBackground>
    </View>
  );
}

// A raised cream card on the tiled floor, the base of every row on the meta screens.
export const cardStyle = {
  backgroundColor: COLORS.paper,
  borderRadius: 22,
  borderWidth: INK_BORDER,
  borderColor: COLORS.ink,
  borderBottomWidth: INK_BORDER + 5,
  borderBottomColor: COLORS.ink,
  padding: 14,
} as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EFD3A6" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
  backFace: { flexDirection: "row-reverse", paddingLeft: 12, paddingRight: 16 },
  backLabel: { ...displayType(17) },
  arrow: { width: 10, height: 18 },
  arrowStroke: { position: "absolute", left: 0, width: 11, height: 3.5, borderRadius: 2, backgroundColor: COLORS.ink },
  title: { flexShrink: 1 },
  body: { padding: 16, gap: 16 },
  clockNote: { fontFamily: FONT.semibold, fontSize: 14, color: COLORS.plasticRed, backgroundColor: "rgba(255, 244, 224, 0.92)", padding: 12, borderRadius: 14, overflow: "hidden" },
  feedback: { position: "absolute", left: 0, right: 0, bottom: 110, alignItems: "center" },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 60,
    paddingLeft: 8,
    paddingRight: 22,
    borderRadius: 30,
    borderWidth: INK_BORDER,
    borderColor: COLORS.ink,
    borderBottomWidth: INK_BORDER + 5,
    borderBottomColor: FACE.gold.lip,
    backgroundColor: FACE.gold.face,
  },
  toastIcon: { width: 52, height: 52, marginTop: -16 },
  toastText: { fontFamily: FONT.display, ...displayType(21), color: COLORS.ink },
});
