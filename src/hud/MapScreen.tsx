import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CHAPTERS } from "@/engine/levels/chapterTemplates";
import { completedCount } from "@/engine/meta/progress";
import type { Point } from "@/engine/puzzle/types";
import { runFeedback } from "@/feedback";
import { Artboard } from "@/motion/Artboard";
import { CHAPTER_ASSETS } from "@/scene/chapterAssets";
import { useGame } from "@/store/GameContext";

import { ICONS } from "./icons";
import { nodePositions, sectionHeight } from "./mapPath";
import { OutlinedText } from "./OutlinedText";
import { Ribbon } from "./Ribbon";
import { COLORS, FACE, FONT, INK_BORDER, UI, displayType } from "./theme";
import { Badge, Button, Chip } from "./ui";
import { useReduceMotion } from "./useReduceMotion";

const LEVELS_PER_CHAPTER = 10;
const NODE = 56;
const CURRENT_NODE = 70;
const HUD_HEIGHT = 72;
const DOCK_HEIGHT = 112;
const SHAKE_MS = 240;
// The current level breathes: one swell (up and back) every 2 × BREATH_MS, growing by BREATH_SCALE.
const BREATH_MS = 700;
const BREATH_SCALE = 0.1;
// A lantern glow behind the current level, brightening with each breath.
const HALO = Math.round(CURRENT_NODE * 1.5);
// The "Chơi" tag bobs this many points, a quarter breath behind the button.
const BOB = 3;
// After a win, the newly opened level springs in from this size once the play screen has slid away.
const POP_FROM = 0.6;
const POP_DELAY_MS = 300;
const BREATH_TIMING = { duration: BREATH_MS, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.Never };

// The district map: six districts top to bottom, each a screen tall over its own painted street,
// ten levels along the street's path. Won levels show their stars, the next level glows, later
// levels are locked. The title bar and the dock stay on top while the map scrolls.
export type MetaPage = "rewards" | "quests" | "achievements" | "settings";

type NodeState = "done" | "current" | "open" | "locked";

interface LevelNodeProps {
  number: number;
  label: string;
  stars: number;
  state: NodeState;
  at: Point;
  reduceMotion: boolean;
  // Spring in: this level opened since the map was last on screen.
  pop: boolean;
  onPlay: () => void;
  onLocked: () => void;
  testID: string;
}

function LevelNode({ number, label, stars, state, at, reduceMotion, pop, onPlay, onLocked, testID }: LevelNodeProps) {
  const shake = useSharedValue(0);
  const shaking = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));
  const breath = useSharedValue(0);
  const bob = useSharedValue(0);
  const popIn = useSharedValue(1);
  const lively = state === "current" && !reduceMotion;
  useEffect(() => {
    if (!lively) return;
    breath.set(withRepeat(withTiming(1, BREATH_TIMING), -1, true));
    bob.set(withDelay(BREATH_MS / 2, withRepeat(withTiming(1, BREATH_TIMING), -1, true)));
    return () => {
      cancelAnimation(breath);
      cancelAnimation(bob);
      breath.set(0);
      bob.set(0);
    };
  }, [lively, breath, bob]);
  useEffect(() => {
    if (!pop || !lively) return;
    popIn.set(POP_FROM);
    popIn.set(withDelay(POP_DELAY_MS, withSpring(1, { damping: 9, stiffness: 180, reduceMotion: ReduceMotion.Never })));
  }, [pop, lively, popIn]);
  const swelling = useAnimatedStyle(() => ({ transform: [{ scale: popIn.get() * (1 + BREATH_SCALE * breath.get()) }] }));
  const glowing = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0.4 : 0.25 + 0.35 * breath.get(),
    transform: [{ scale: popIn.get() * (0.95 + 0.15 * breath.get()) }],
  }));
  const bobbing = useAnimatedStyle(() => ({ transform: [{ translateY: -BOB * bob.get() }] }));
  const size = state === "current" ? CURRENT_NODE : NODE;
  const variant = state === "done" ? "go" : state === "current" ? "gold" : state === "open" ? "paper" : "off";
  const press = () => {
    if (state !== "locked") return onPlay();
    onLocked();
    if (reduceMotion) return;
    const step = { duration: SHAKE_MS / 6, reduceMotion: ReduceMotion.Never };
    shake.set(withSequence(withTiming(-6, step), withTiming(6, step), withTiming(-5, step), withTiming(5, step), withTiming(-2, step), withTiming(0, step)));
  };
  return (
    <Animated.View style={[styles.node, { left: at.x - size / 2, top: at.y - size / 2, width: size }, shaking]}>
      {state === "current" ? <Animated.View pointerEvents="none" style={[styles.halo, glowing]} /> : null}
      {state === "current" ? (
        reduceMotion ? (
          <View pointerEvents="none" style={styles.ring} />
        ) : (
          <Artboard name="TapHint" style={styles.tapHint} />
        )
      ) : null}
      <Animated.View style={[styles.swell, swelling]}>
        <Button
          variant={variant}
          size="icon"
          label={state === "locked" ? undefined : String(number)}
          accessibilityLabel={label}
          announceDisabled={state === "locked"}
          pressFeedback={state !== "locked"}
          onPress={press}
          testID={testID}
          faceStyle={{ width: size, height: size, minHeight: size }}
          labelStyle={state === "current" ? styles.currentLabel : undefined}
        >
          {state === "locked" ? <Image source={ICONS.lock} style={styles.lock} /> : null}
        </Button>
        {state === "current" ? (
          <Animated.View pointerEvents="none" style={[styles.play, bobbing]}>
            <Badge count="Chơi" style={styles.playTag} />
          </Animated.View>
        ) : null}
      </Animated.View>
      {stars > 0 ? (
        <View style={styles.stars} accessible={false}>
          {[0, 1, 2].map((i) => (
            <Image key={i} source={ICONS.star} style={[styles.star, i >= stars && styles.starOff]} />
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
}

export function MapScreen({ onPlay, onOpen }: { onPlay: (levelId: string) => void; onOpen: (page: MetaPage) => void }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const { snapshot, commands } = useGame();
  const progress = snapshot.save.progress;
  const current = completedCount(progress);
  const currentChapter = Math.floor(Math.min(current, commands.levelCount() - 1) / LEVELS_PER_CHAPTER);
  const totalStars = Object.values(progress.stars).reduce((sum, stars) => sum + stars, 0);
  const claimable = commands.claimable();
  const name = snapshot.save.profile.name;
  const section = sectionHeight(height);
  const spots = useMemo(() => nodePositions(width, section, CURRENT_NODE / 2), [width, section]);
  const locked = () => runFeedback([{ type: "lockedLevel" }], commands.getSnapshot().save.settings);

  // Progress changes while a level covers the map, so the newly opened level springs in only when the
  // map comes back on screen, and only if it moved on since the map was last shown (not at launch).
  const seenCurrent = useRef(current);
  const [popLevel, setPopLevel] = useState<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      setPopLevel(current > seenCurrent.current ? current : null);
      seenCurrent.current = current;
    }, [current]),
  );

  const dockButton = (page: Exclude<MetaPage, "settings">, label: string, icon: number, dot: boolean, variant: "gold" | "paper") => (
    <View key={page} style={styles.dockItem}>
      <View>
        <Button
          variant={variant}
          accessibilityLabel={dot ? `${label}, có quà chưa nhận` : label}
          testID={`open-${page}`}
          onPress={() => onOpen(page)}
          faceStyle={styles.dockFace}
        >
          <Image source={icon} style={styles.dockIcon} />
        </Button>
        {dot ? <Badge style={styles.dockDot} /> : null}
      </View>
      <Text style={styles.dockLabel} accessible={false}>
        {label}
      </Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        testID="map"
        // Opens on the district being played.
        contentOffset={{ x: 0, y: currentChapter * section }}
        contentContainerStyle={{ paddingBottom: DOCK_HEIGHT + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {CHAPTERS.map((chapter, c) => {
          const first = c * LEVELS_PER_CHAPTER;
          const open = commands.isUnlocked(first);
          const chapterStars = Array.from({ length: LEVELS_PER_CHAPTER }, (_, i) => progress.stars[commands.levelAt(first + i)?.id ?? ""] ?? 0).reduce((a, b) => a + b, 0);
          return (
            <View key={chapter.id} style={{ height: section }}>
              {/* Explicit size: a bundled image otherwise takes its own pixel size over absolute insets. */}
              <Image source={CHAPTER_ASSETS[chapter.id]!.map} style={[styles.background, { width, height: section }]} resizeMode="cover" />
              <View style={[styles.ribbon, { top: insets.top + HUD_HEIGHT + 10 }]}>
                <Ribbon title={chapter.name} subtitle={open ? `Khu ${c + 1} · ${chapterStars}/30 sao` : `Khu ${c + 1}`} size={24} />
              </View>
              {Array.from({ length: LEVELS_PER_CHAPTER }, (_, i) => {
                const index = first + i;
                const level = commands.levelAt(index);
                if (!level) return null;
                const stars = progress.stars[level.id] ?? 0;
                const unlocked = commands.isUnlocked(index);
                const state: NodeState = !unlocked ? "locked" : index === current ? "current" : stars > 0 ? "done" : "open";
                const label = unlocked ? (stars > 0 ? `Màn ${index + 1}, ${stars} sao` : `Màn ${index + 1}, chưa chơi`) : `Màn ${index + 1}, đang khoá`;
                return (
                  <LevelNode
                    key={level.id}
                    number={index + 1}
                    label={label}
                    stars={stars}
                    state={state}
                    at={spots[i]!}
                    reduceMotion={reduceMotion}
                    pop={index === popLevel}
                    onPlay={() => onPlay(level.id)}
                    onLocked={locked}
                    testID={`level-${index + 1}`}
                  />
                );
              })}
              {!open ? (
                <View style={styles.lockedNote} pointerEvents="none">
                  <Image source={ICONS.lock} style={styles.lockedIcon} />
                  <Text style={styles.lockedText}>Mở khi xong {CHAPTERS[c - 1]?.name}</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.hud, { top: insets.top + 6 }]}>
        <View style={styles.hudTitle}>
          <OutlinedText size={24} accessibilityRole="header">
            Ghép Phố
          </OutlinedText>
          {name ? <Text style={styles.greeting} testID="greeting">{`Chào ${name}!`}</Text> : null}
        </View>
        <Chip icon={ICONS.star} text={String(totalStars)} accessibilityLabel={`Tổng ${totalStars} sao`} style={styles.hudChip} />
        <Button variant="paper" size="icon" accessibilityLabel="Cài đặt" testID="open-settings" onPress={() => onOpen("settings")} faceStyle={styles.settingsFace}>
          <View style={styles.menu} accessible={false}>
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </View>
        </Button>
      </View>

      <View style={[styles.dock, { height: DOCK_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}>
        {dockButton("rewards", "Quà", ICONS.gift, claimable.login, "gold")}
        {dockButton("quests", "Nhiệm vụ", ICONS.chest, claimable.quests > 0 || claimable.chest, "paper")}
        {dockButton("achievements", "Thành tích", ICONS.star, claimable.achievements > 0, "paper")}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: FACE.night.face },
  background: { position: "absolute", left: 0, top: 0 },
  ribbon: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  node: { position: "absolute", alignItems: "center" },
  currentLabel: { ...displayType(28) },
  lock: { width: 26, height: 26 },
  swell: { alignItems: "center" },
  play: { position: "absolute", top: -26 },
  playTag: { height: 26, paddingHorizontal: 10 },
  halo: { position: "absolute", top: CURRENT_NODE / 2 - HALO / 2, width: HALO, height: HALO, borderRadius: HALO / 2, backgroundColor: COLORS.lantern },
  ring: { position: "absolute", top: -10, width: CURRENT_NODE + 20, height: CURRENT_NODE + 20, borderRadius: (CURRENT_NODE + 20) / 2, borderWidth: 5, borderColor: FACE.gold.face },
  tapHint: { position: "absolute", top: -28, width: 126, height: 126 },
  stars: { flexDirection: "row", marginTop: -2, paddingHorizontal: 4, borderRadius: 10, backgroundColor: "rgba(43, 42, 51, 0.6)" },
  star: { width: 17, height: 17 },
  starOff: { opacity: 0.35 },
  lockedNote: {
    position: "absolute",
    alignSelf: "center",
    top: "44%",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: INK_BORDER,
    borderColor: COLORS.ink,
    backgroundColor: "rgba(46, 42, 79, 0.88)",
  },
  lockedIcon: { width: 40, height: 40 },
  lockedText: { fontFamily: FONT.display, ...displayType(17), color: COLORS.paper },
  hud: {
    position: "absolute",
    left: 12,
    right: 12,
    height: HUD_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: 24,
    borderWidth: INK_BORDER,
    borderBottomWidth: INK_BORDER + 5,
    borderColor: COLORS.ink,
    borderBottomColor: FACE.night.lip,
    backgroundColor: FACE.night.face,
  },
  hudTitle: { flex: 1 },
  greeting: { fontFamily: FONT.displayBold, ...displayType(14), color: UI.nightSoft },
  hudChip: { backgroundColor: FACE.night.lip, borderColor: FACE.night.lip },
  settingsFace: { width: 48, height: 48, minHeight: 48 },
  menu: { gap: 4 },
  menuLine: { width: 20, height: 3, borderRadius: 2, backgroundColor: COLORS.ink },
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 14,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 4,
    borderColor: COLORS.ink,
    backgroundColor: FACE.night.face,
  },
  dockItem: { alignItems: "center", gap: 4 },
  dockFace: { width: 96, height: 60, minHeight: 60, borderRadius: 20 },
  dockIcon: { width: 50, height: 50, marginTop: -12 },
  dockDot: { position: "absolute", top: -6, right: -6 },
  dockLabel: { fontFamily: FONT.display, ...displayType(15), color: COLORS.paper },
});
