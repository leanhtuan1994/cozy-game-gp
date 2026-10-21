import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { ACHIEVEMENTS, isUnlocked, progressOf } from "@/engine/meta/achievements";
import { playUiFeedback } from "@/feedback";
import { Artboard } from "@/motion/Artboard";
import { useGame } from "@/store/GameContext";

import { ICONS } from "./icons";
import { MetaFrame, cardStyle, rewardText, useRewardFeedback } from "./MetaFrame";
import { COLORS, FACE, FONT, INK_BORDER, displayType } from "./theme";
import { useReduceMotion } from "./useReduceMotion";
import { Button, ProgressBar } from "./ui";

type Tab = "done" | "open";

const BADGE_MS = 2500;
// Badge colour by tier: bamboo, moss, lantern.
const TIER_COLOR = ["#C99A62", FACE.go.face, FACE.gold.face] as const;

// Tiered badges with progress ("3/10"), split into earned and remaining, with a claim per badge.
export function AchievementsScreen({ onBack }: { onBack: () => void }) {
  const { snapshot, commands } = useGame();
  const reduceMotion = useReduceMotion();
  const { show, overlay } = useRewardFeedback();
  const [tab, setTab] = useState<Tab>("done");
  const [justUnlocked, setJustUnlocked] = useState<string | null>(null);
  const context = commands.achievementContext();
  const claimed = snapshot.save.meta.achievementsClaimed;
  const list = ACHIEVEMENTS.filter((def) => (tab === "done") === isUnlocked(def, context));
  // The badge animation plays over the list once, then goes away.
  useEffect(() => {
    if (justUnlocked === null) return;
    const timer = setTimeout(() => setJustUnlocked(null), BADGE_MS);
    return () => clearTimeout(timer);
  }, [justUnlocked]);

  return (
    <MetaFrame
      title="Thành tích"
      testID="achievements-screen"
      onBack={onBack}
      overlay={
        <>
          {justUnlocked && !reduceMotion ? <Artboard key={justUnlocked} name="BadgeUnlock" style={styles.badgeAnim} /> : null}
          {overlay}
        </>
      }
    >
      <View style={styles.tabs} accessibilityRole="tablist">
        {(["done", "open"] as const).map((key) => (
          <Button
            key={key}
            role="tab"
            selected={tab === key}
            variant={tab === key ? "go" : "paper"}
            label={key === "done" ? "Đã đạt" : "Còn lại"}
            testID={`tab-${key}`}
            pressFeedback={false}
            onPress={() => {
              if (tab !== key) playUiFeedback("select", commands.getSnapshot().save.settings);
              setTab(key);
            }}
            style={styles.tab}
            faceStyle={styles.tabFace}
          />
        ))}
      </View>
      {list.length === 0 ? <Text style={styles.empty}>{tab === "done" ? "Chơi vài màn để mở thành tích đầu tiên." : "Bạn đã đạt hết thành tích!"}</Text> : null}
      {list.map((def) => {
        const progress = progressOf(def, context);
        const unlocked = isUnlocked(def, context);
        const isClaimed = claimed.includes(def.id);
        const tier = Math.min(Math.max(def.tier, 1), 3);
        return (
          <View key={def.id} style={[styles.card, isClaimed && styles.claimed]} testID={`achievement-${def.id}`}>
            <View style={[styles.badge, { backgroundColor: TIER_COLOR[tier - 1] }]} accessible={false}>
              {Array.from({ length: tier }, (_, i) => (
                <Image key={i} source={ICONS.star} style={[styles.badgeStar, tier > 1 && styles.badgeStarSmall]} />
              ))}
            </View>
            <View style={styles.info}>
              <Text style={styles.title} accessibilityLabel={`${def.title}, ${progress}/${def.target}, ${isClaimed ? "đã nhận" : unlocked ? "đã đạt, chưa nhận" : "chưa đạt"}`}>
                {def.title}
              </Text>
              <Text style={styles.meta} accessibilityLabel={`${def.group}, thưởng ${rewardText(def.reward)}`}>
                {def.group} · Thưởng {rewardText(def.reward)}
              </Text>
              {unlocked ? null : <ProgressBar value={progress} max={def.target} label={`${progress}/${def.target}`} style={styles.bar} />}
            </View>
            {unlocked && !isClaimed ? (
              <Button
                label="Nhận"
                variant="gold"
                pressFeedback={false}
                accessibilityLabel={`Nhận thưởng: ${def.title}`}
                onPress={() => {
                  const reward = commands.claim({ type: "achievement", id: def.id });
                  if (reward) setJustUnlocked(def.id);
                  show(reward);
                }}
                testID={`claim-achievement-${def.id}`}
              />
            ) : null}
          </View>
        );
      })}
    </MetaFrame>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 10 },
  tab: { flex: 1 },
  tabFace: { borderRadius: 999 },
  empty: { fontFamily: FONT.semibold, fontSize: 15, color: COLORS.ink, textAlign: "center", marginTop: 24 },
  card: { ...cardStyle, flexDirection: "row", alignItems: "center", gap: 12 },
  claimed: { opacity: 0.7 },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: INK_BORDER,
    borderColor: COLORS.ink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeStar: { width: 30, height: 30 },
  badgeStarSmall: { width: 17, height: 17, marginHorizontal: -1 },
  info: { flex: 1, gap: 4 },
  title: { fontFamily: FONT.display, ...displayType(18), color: COLORS.ink },
  meta: { fontFamily: FONT.regular, fontSize: 13, color: COLORS.inkSoft },
  bar: { marginTop: 2 },
  badgeAnim: { position: "absolute", top: 120, alignSelf: "center", width: 160, height: 160 },
});
