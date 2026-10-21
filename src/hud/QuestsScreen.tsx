import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { msUntilNextDay } from "@/engine/meta/calendar";
import { QUEST_CHEST, isQuestDone, questDef } from "@/engine/meta/dailyQuests";
import { mainBooster, today } from "@/engine/meta/meta";
import type { Reward } from "@/engine/meta/rewards";
import type { Booster } from "@/engine/puzzle/types";
import { Chest } from "@/motion/Chest";
import { useGame } from "@/store/GameContext";

import { BOOSTER_ICONS } from "./icons";
import { ClockNote, MetaFrame, cardStyle, rewardText, useRewardFeedback } from "./MetaFrame";
import { COLORS, FACE, FONT, UI, displayType } from "./theme";
import { Button, ProgressBar } from "./ui";

function countdown(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  return `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`;
}

// "[icon] ×2" for every booster in a reward, numbers from the engine's reward tables.
function RewardIcons({ reward, light = false }: { reward: Reward; light?: boolean }) {
  return (
    <View style={styles.rewardIcons} accessible={false}>
      {(Object.keys(reward) as Booster[])
        .filter((kind) => (reward[kind] ?? 0) > 0)
        .map((kind) => (
          <View key={kind} style={styles.rewardIcon}>
            <Image source={BOOSTER_ICONS[kind]} style={styles.rewardImage} />
            <Text style={[styles.rewardCount, light && styles.light]}>×{reward[kind]}</Text>
          </View>
        ))}
    </View>
  );
}

// Today's three quests with progress bars, a reset countdown, and the chest for finishing all three.
export function QuestsScreen({ onBack }: { onBack: () => void }) {
  const { snapshot, commands } = useGame();
  const { show, overlay } = useRewardFeedback();
  const clock = commands.clock();
  const [left, setLeft] = useState(() => msUntilNextDay(clock.now, clock.tzOffsetMinutes));
  useEffect(() => {
    const timer = setInterval(() => {
      const c = commands.clock();
      setLeft(msUntilNextDay(c.now, c.tzOffsetMinutes));
    }, 30_000);
    return () => clearInterval(timer);
  }, [commands]);

  const quests = snapshot.save.meta.quests;
  const open = today(clock) !== null && quests.day === today(clock);
  const { chest, paused } = commands.claimable();
  const chestLabel = quests.chestClaimed ? "Rương đã mở" : chest ? "Rương: đã xong cả 3 nhiệm vụ, mở được" : "Rương: xong cả 3 nhiệm vụ để mở";

  return (
    <MetaFrame title="Nhiệm vụ hôm nay" testID="quests-screen" onBack={onBack} overlay={overlay}>
      <View style={styles.reset} accessible accessibilityLabel={`Làm mới sau ${countdown(left)}`}>
        <View style={styles.clock}>
          <View style={styles.clockHand} />
        </View>
        <Text style={styles.resetText}>Làm mới sau {countdown(left)}</Text>
      </View>
      {paused ? <ClockNote /> : null}
      {open
        ? quests.quests.map((quest) => {
            const def = questDef(quest.id);
            if (!def) return null;
            const done = isQuestDone(quest);
            const ready = done && !quest.claimed;
            const booster = mainBooster(def.reward);
            return (
              <View key={quest.id} style={[styles.card, ready && styles.ready, quest.claimed && styles.claimed]} testID={`quest-${quest.id}`}>
                <Text style={[styles.title, quest.claimed && styles.struck]} accessibilityLabel={`${def.title}, ${quest.progress}/${def.target}${quest.claimed ? ", đã nhận" : ""}`}>
                  {def.title}
                </Text>
                <View style={styles.row}>
                  <ProgressBar value={quest.progress} max={def.target} label={`${quest.progress}/${def.target}`} style={styles.bar} />
                  {ready ? (
                    <Button
                      label="Nhận"
                      variant="gold"
                      pressFeedback={false}
                      accessibilityLabel={`Nhận thưởng: ${def.title}`}
                      onPress={() => show(commands.claim({ type: "quest", id: quest.id }))}
                      testID={`claim-quest-${quest.id}`}
                      faceStyle={styles.claimFace}
                    >
                      {booster ? <Image source={BOOSTER_ICONS[booster]} style={styles.claimIcon} /> : null}
                    </Button>
                  ) : (
                    <View accessible accessibilityLabel={`Thưởng: ${rewardText(def.reward)}`}>
                      <RewardIcons reward={def.reward} />
                    </View>
                  )}
                </View>
              </View>
            );
          })
        : null}
      <View style={styles.chest} testID="quest-chest">
        {/* The label is on an inner group so the "Mở rương" button stays reachable on its own. */}
        <View style={styles.chestInfo} accessible accessibilityLabel={`${chestLabel}. Thưởng: ${rewardText(QUEST_CHEST)}`}>
          <Chest opened={quests.chestClaimed} />
          <View style={styles.chestText}>
            <Text style={styles.chestTitle}>Xong cả 3 nhiệm vụ để mở rương</Text>
            <RewardIcons reward={QUEST_CHEST} light />
          </View>
        </View>
        {chest ? <Button label="Mở rương" variant="gold" pressFeedback={false} onPress={() => show(commands.claim({ type: "questChest" }), true)} testID="claim-chest" /> : null}
      </View>
    </MetaFrame>
  );
}

const styles = StyleSheet.create({
  reset: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: FACE.night.face },
  clock: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: FACE.gold.face },
  clockHand: { position: "absolute", left: 5, top: 2, width: 2, height: 6, backgroundColor: FACE.gold.face },
  resetText: { fontFamily: FONT.semibold, fontSize: 14, color: COLORS.paper },
  card: { ...cardStyle, gap: 10 },
  ready: { backgroundColor: "#FFF1CF", borderColor: COLORS.ink },
  claimed: { opacity: 0.7 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  bar: { flex: 1 },
  title: { fontFamily: FONT.display, ...displayType(19), color: COLORS.ink },
  struck: { textDecorationLine: "line-through", color: COLORS.inkSoft },
  claimFace: { paddingLeft: 8, paddingRight: 14, flexDirection: "row-reverse" },
  claimIcon: { width: 32, height: 32, marginTop: -6 },
  rewardIcons: { flexDirection: "row", gap: 8 },
  rewardIcon: { flexDirection: "row", alignItems: "center", gap: 1 },
  rewardImage: { width: 28, height: 28 },
  rewardCount: { fontFamily: FONT.displayBold, ...displayType(15), color: COLORS.inkSoft },
  light: { color: UI.nightSoft },
  chest: { ...cardStyle, alignItems: "center", gap: 12, backgroundColor: FACE.night.face },
  chestInfo: { flexDirection: "row", alignItems: "center", gap: 12, alignSelf: "stretch" },
  chestText: { flex: 1, gap: 6 },
  chestTitle: { fontFamily: FONT.display, ...displayType(18), color: COLORS.paper },
});
