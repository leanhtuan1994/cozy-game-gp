import { Image, StyleSheet, Text, View } from "react-native";

import { mainBooster, today } from "@/engine/meta/meta";
import { LOGIN_GIFTS } from "@/engine/meta/loginRewards";
import { isChestGift } from "@/feedback/plan";
import { Artboard } from "@/motion/Artboard";
import { Chest } from "@/motion/Chest";
import { useGame } from "@/store/GameContext";

import { BOOSTER_ICONS, ICONS } from "./icons";
import { ClockNote, MetaFrame, cardStyle, rewardText, useRewardFeedback } from "./MetaFrame";
import { OutlinedText } from "./OutlinedText";
import { COLORS, FACE, FONT, INK_BORDER, UI, displayType } from "./theme";
import { useReduceMotion } from "./useReduceMotion";
import { Button } from "./ui";

// The 7-day login gift: six tiles and a large day-7 chest, plus the visit streak.
export function RewardsScreen({ onBack }: { onBack: () => void }) {
  const { snapshot, commands } = useGame();
  const reduceMotion = useReduceMotion();
  const { show, overlay } = useRewardFeedback();
  const login = snapshot.save.meta.login;
  const day = today(commands.clock());
  const { login: canClaim, paused } = commands.claimable();
  // Tiles before `nextDay` are claimed in this cycle; day 7 shows open on the day it was claimed,
  // and the next day the cycle starts over.
  const chestOpened = login.nextDay === 0 && login.lastClaimDay !== null && login.lastClaimDay === day;

  const tile = (index: number) => {
    const gift = LOGIN_GIFTS[index]!;
    const claimed = index < login.nextDay || (index === 6 && chestOpened);
    const isToday = index === login.nextDay && canClaim;
    const label = `Ngày ${index + 1}: ${rewardText(gift)}${claimed ? ", đã nhận" : isToday ? ", nhận hôm nay" : ""}`;
    const booster = mainBooster(gift);
    if (index === 6) {
      return (
        <View key={index} accessible accessibilityLabel={label} testID={`gift-day-${index + 1}`} style={[styles.chestTile, claimed && styles.claimed, isToday && styles.today]}>
          <Chest opened={chestOpened} />
          <View style={styles.chestText}>
            <Text style={styles.chestTitle}>{isToday ? "Hôm nay" : "Ngày 7"} · Rương lớn</Text>
            <Text style={styles.tileReward}>{rewardText(gift)}</Text>
          </View>
        </View>
      );
    }
    return (
      <View key={index} accessible accessibilityLabel={label} testID={`gift-day-${index + 1}`} style={[styles.tile, claimed && styles.claimed, isToday && styles.today]}>
        <Text style={styles.tileDay}>{isToday ? "Hôm nay" : `Ngày ${index + 1}`}</Text>
        {booster ? <Image source={BOOSTER_ICONS[booster]} style={styles.tileIcon} /> : null}
        <Text style={styles.tileReward}>{rewardText(gift)}</Text>
        {claimed ? (
          <View style={styles.check}>
            <View style={styles.checkMark} />
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <MetaFrame title="Quà mỗi ngày" testID="rewards-screen" onBack={onBack} overlay={overlay}>
      <View style={styles.streak} accessible accessibilityLabel={`Chuỗi ${login.streak} ngày, kỷ lục ${login.bestStreak}`} testID="streak">
        {reduceMotion ? <Image source={ICONS.flame} style={styles.flameIcon} /> : <Artboard name="StreakFlame" style={styles.flame} />}
        <View style={styles.streakText}>
          <OutlinedText size={24} color={FACE.gold.face}>
            Chuỗi {login.streak} ngày
          </OutlinedText>
          <Text style={styles.streakNote}>Quay lại mỗi ngày để giữ chuỗi</Text>
        </View>
        <View style={styles.best}>
          <Text style={styles.bestLabel}>KỶ LỤC</Text>
          <Text style={styles.bestValue}>{login.bestStreak}</Text>
        </View>
      </View>
      {paused ? <ClockNote /> : null}
      <View style={styles.grid}>{[0, 1, 2, 3, 4, 5].map(tile)}</View>
      {tile(6)}
      <Button
        label={canClaim ? "Nhận quà hôm nay" : "Mai quay lại nhé"}
        variant="gold"
        size="lg"
        pressFeedback={false}
        disabled={!canClaim}
        // Read the day before claiming: claiming day 7 wraps it back to day 1.
        onPress={() => {
          const chest = isChestGift(login.nextDay, LOGIN_GIFTS.length);
          show(commands.claim({ type: "login" }), chest);
        }}
        testID="claim-gift"
      />
    </MetaFrame>
  );
}

const styles = StyleSheet.create({
  streak: {
    ...cardStyle,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    backgroundColor: FACE.night.face,
  },
  flame: { width: 60, height: 64 },
  flameIcon: { width: 56, height: 56 },
  streakText: { flex: 1, gap: 2 },
  streakNote: { fontFamily: FONT.semibold, fontSize: 13, color: UI.nightSoft },
  best: { alignItems: "center" },
  bestLabel: { fontFamily: FONT.bold, fontSize: 11, letterSpacing: 0.8, color: UI.nightSoft },
  bestValue: { fontFamily: FONT.display, ...displayType(24), color: COLORS.paper },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { ...cardStyle, width: "31%", flexGrow: 1, minHeight: 112, alignItems: "center", justifyContent: "space-between", paddingHorizontal: 6, paddingVertical: 8 },
  chestTile: { ...cardStyle, flexDirection: "row", alignItems: "center", gap: 12, minHeight: 120 },
  chestText: { flex: 1, gap: 6 },
  chestTitle: { fontFamily: FONT.display, ...displayType(20), color: COLORS.ink },
  claimed: { backgroundColor: UI.doneCard, opacity: 0.85 },
  today: { backgroundColor: FACE.gold.face, borderColor: COLORS.ink, transform: [{ translateY: -4 }] },
  tileDay: { fontFamily: FONT.display, ...displayType(16), color: COLORS.ink },
  tileIcon: { width: 44, height: 44 },
  tileReward: { fontFamily: FONT.displayBold, ...displayType(14), color: COLORS.inkSoft, textAlign: "center" },
  check: {
    position: "absolute",
    top: -9,
    right: -9,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: FACE.go.face,
    borderWidth: 2.5,
    borderColor: COLORS.paper,
    outlineColor: COLORS.ink,
    outlineWidth: INK_BORDER - 0.5,
    outlineStyle: "solid",
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: { width: 7, height: 12, marginTop: -3, borderRightWidth: 3, borderBottomWidth: 3, borderColor: COLORS.paper, transform: [{ rotate: "45deg" }] },
});
