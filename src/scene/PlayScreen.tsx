import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { ReduceMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Group, RoundedRect } from "react-native-skia";

import { CHAPTERS } from "@/engine/levels/chapterTemplates";
import { coveredItems } from "@/engine/puzzle/board";
import type { PuzzleEvent } from "@/engine/puzzle/events";
import { findTapPoint } from "@/engine/puzzle/hitTest";
import { opaqueRect } from "@/engine/puzzle/mask";
import { TRAY_CAPACITY } from "@/engine/puzzle/constants";
import type { Booster, PlacedItem, Rect } from "@/engine/puzzle/types";
import { currentStep } from "@/engine/tutorial/steps";
import { runFeedback } from "@/feedback";
import type { TrayChange } from "@/feedback/plan";
import { BOOSTER_HEIGHT, BoosterBar, boosterRect } from "@/hud/BoosterBar";
import { DEBUG_HUD_ENABLED, DebugHud } from "@/hud/DebugHud";
import { LoseSheet, PauseSheet, WinSheet } from "@/hud/OutcomeSheets";
import { OutlinedText } from "@/hud/OutlinedText";
import { COLORS, FONT, INK_BORDER, UI, displayType } from "@/hud/theme";
import { Button, Chip } from "@/hud/ui";
import { useReduceMotion } from "@/hud/useReduceMotion";
import { Artboard } from "@/motion/Artboard";
import { ClearBurst } from "@/motion/ClearBurst";
import { askForReminders } from "@/notifications/schedule";
import { useGame, useHeldPlay } from "@/store/GameContext";

import { CHAPTER_ASSETS } from "./chapterAssets";
import { CoachMark } from "./CoachMark";
import { Diorama, type Shake } from "./Diorama";
import { makeTrayLayout, slotCenter } from "./trayLayout";
import { emptyTrayView, entrySlots, trayReducer } from "./trayView";
import { TraySprite } from "./TraySprite";
import { preloadImages, useImages } from "./useImages";
import { useParallax } from "./useParallax";
import { boardRectToScreen, boardToScreen, fitBoard, screenToBoard } from "./viewport";

const HEADER_HEIGHT = 64;
// The header has a fixed height: large system text grows its two lines only this far.
const HEADER_FONT_SCALE = 1.3;
const SHAKE_MS = 360;
// Time for the last flight to land before the win or lose sheet opens.
const OUTCOME_DELAY_MS = 750;
const TAP_HINT_SIZE = 120;
// The still marker shown instead of the TapHint animation when reduce motion is on.
const HINT_RING = 64;
// The tray shelf: ink outline, bottom lip and drop shadow, and the darker top edge of each slot.
const TRAY_RIM = 4;
const TRAY_LIP = 7;
const TRAY_DROP = 5;
const TRAY_SLOT_SHADE = "#7C5A30";

// Hidden accessibility targets for UI tests (EXPO_PUBLIC_TEST_PROBES=1): one per free item, placed
// where a tap reaches it. Off by default because finding tap points costs a frame on each tap.
const TEST_PROBES = process.env.EXPO_PUBLIC_TEST_PROBES === "1";

interface PlayScreenProps {
  levelIndex: number;
  onMap: () => void;
  onNext: () => void;
}

// One level: the district's diorama low on the screen within thumb reach, the 7-slot tray right
// under it, and the booster bar under that. All game changes go through GameCommands.
export function PlayScreen({ levelIndex, onMap, onNext }: PlayScreenProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { snapshot, commands } = useGame();
  // This level, also while the screen leaves (then it is no longer live and takes no touches).
  const play = useHeldPlay(levelIndex);
  const live = snapshot.play !== null && snapshot.play === play;
  const reduceMotion = useReduceMotion();
  const lessonStep = currentStep(play?.lesson ?? null);
  // Parallax rests while a lesson step points at something, so the hole sits exactly on it.
  const parallax = useParallax(!reduceMotion && lessonStep === null);

  useEffect(() => {
    if (!commands.startLevel(levelIndex)) onMap();
  }, [commands, levelIndex, onMap]);

  const chapterId = commands.levelAt(levelIndex)?.chapter ?? CHAPTERS[0]!.id;
  const assets = CHAPTER_ASSETS[chapterId]!;
  const images = useImages(assets.images);

  // Layout, computed from the window so the canvas is right on the first frame.
  const boosterTop = height - insets.bottom - 12 - BOOSTER_HEIGHT;
  const trayProbe = makeTrayLayout(12, 0, width - 24);
  const trayTop = boosterTop - 14 - trayProbe.height;
  const boardTop = Math.max(insets.top + HEADER_HEIGHT, trayTop - 8 - width);
  const viewport = useMemo(() => fitBoard({ x: 0, y: boardTop, width, height: width }), [boardTop, width]);
  const tray = useMemo(() => makeTrayLayout(12, trayTop, width - 24), [trayTop, width]);

  // Keyed on the parts that change the board, so a blocked tap or a Hint does not redraw it.
  const placed = play?.placed;
  const boardIds = play?.state.board;
  const covers = play?.state.covers;
  const board = useMemo(() => {
    if (!placed || !boardIds) return [];
    const onBoard = new Set(boardIds);
    return placed.filter((item) => onBoard.has(item.id));
  }, [placed, boardIds]);
  const covered = useMemo(
    () => (boardIds && covers ? coveredItems({ board: boardIds, covers }) : new Set<string>()),
    [boardIds, covers],
  );

  const [trayView, dispatchTray] = useReducer(trayReducer, 0, emptyTrayView);
  const landed = useRef(new Set<string>());
  const run = play?.run ?? 0;
  useEffect(() => {
    landed.current = new Set();
    dispatchTray({ type: "reset", run, tray: [] });
  }, [run]);

  const [shakeId, setShakeId] = useState<string | null>(null);
  const shakeProgress = useSharedValue(1);
  const [paused, setPaused] = useState(false);

  const react = useCallback(
    (events: readonly PuzzleEvent[], hit: PlacedItem | null, tray?: TrayChange) => {
      const taken = events.find((event) => event.type === "itemTaken");
      const cleared = events.find((event) => event.type === "tripleCleared");
      if (taken && hit) {
        const offset = parallax.items.get();
        const shift = (rect: Rect): Rect => ({ ...rect, x: rect.x + offset.x, y: rect.y + offset.y });
        const mask = assets.masks[hit.kind];
        dispatchTray({
          type: "taken",
          itemId: taken.itemId,
          kind: taken.kind,
          slot: taken.slot,
          clearedIds: cleared?.itemIds ?? null,
          from: shift(boardRectToScreen(viewport, hit.rect)),
          fromOpaque: shift(boardRectToScreen(viewport, mask ? opaqueRect(mask, hit.rect) : hit.rect)),
        });
      }
      // With reduce motion a covered item does not shake; the sound and vibration remain.
      if (events.some((event) => event.type === "itemBlocked") && hit && !reduceMotion) {
        setShakeId(hit.id);
        shakeProgress.set(0);
        shakeProgress.set(withTiming(1, { duration: SHAKE_MS, reduceMotion: ReduceMotion.Never }));
      }
      runFeedback(events, commands.getSnapshot().save.settings, tray);
    },
    [assets.masks, commands, parallax.items, reduceMotion, shakeProgress, viewport],
  );

  const handleTap = useCallback(
    (x: number, y: number) => {
      // Nothing to aim at until the district's images are drawn.
      if (!images) return;
      const offset = parallax.items.get();
      const before = commands.getSnapshot().play?.state.tray.length ?? 0;
      const result = commands.tapAt(screenToBoard(viewport, { x: x - offset.x, y: y - offset.y }));
      if (result.lessonBlocked) {
        runFeedback([{ type: "lessonBlocked" }], commands.getSnapshot().save.settings);
        return;
      }
      const after = commands.getSnapshot().play?.state.tray.length ?? before;
      react(result.events, result.hit, { before, after, capacity: TRAY_CAPACITY });
    },
    [commands, images, parallax.items, react, viewport],
  );

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .runOnJS(true)
        .maxDuration(400)
        .onEnd((event, success) => {
          if (success) handleTap(event.x, event.y);
        }),
    [handleTap],
  );

  const applyBooster = useCallback(
    (booster: Booster) => {
      const result = commands.useBooster(booster);
      if (result.status !== "used") return;
      runFeedback([{ type: "boosterUsed", booster }], commands.getSnapshot().save.settings);
      // Undo can bring back items and a cleared triple: redraw the tray from the engine's tray.
      if (result.events.some((event) => event.type === "undone")) {
        landed.current = new Set();
        dispatchTray({ type: "reset", run, tray: commands.getSnapshot().play?.state.tray ?? [] });
      }
    },
    [commands, run],
  );

  const onLanded = useCallback((uid: string) => {
    landed.current.add(uid);
    dispatchTray({ type: "landed", uid, landed: landed.current });
  }, []);
  const onBurstDone = useCallback((id: number) => dispatchTray({ type: "burstDone", id }), []);

  // The win or lose sheet waits for the last item to land.
  const outcome = play?.outcome ?? null;
  const [readyOutcome, setReadyOutcome] = useState<typeof outcome>(null);
  useEffect(() => {
    if (!outcome) return;
    const timer = setTimeout(() => setReadyOutcome(outcome), OUTCOME_DELAY_MS);
    return () => clearTimeout(timer);
  }, [outcome]);
  // The next level is in another district: decode its art while the win sheet is up.
  const won = outcome?.type === "won";
  useEffect(() => {
    if (!won) return;
    const next = commands.levelAt(levelIndex + 1);
    if (next && next.chapter !== chapterId) preloadImages(CHAPTER_ASSETS[next.chapter]!.images);
  }, [won, commands, levelIndex, chapterId]);
  // Shown only while it is still the current outcome (Undo or a restart clears it at once).
  const shownOutcome = outcome && readyOutcome === outcome ? outcome : null;

  const shake: Shake | null = useMemo(() => (shakeId ? { id: shakeId, progress: shakeProgress } : null), [shakeId, shakeProgress]);

  const trayLayer = useMemo(() => {
    if (!images) return null;
    const slots = entrySlots(trayView.entries);
    const side = tray.slotWidth - 6;
    return (
      <>
        {/* A bamboo shelf: hard ink shadow, ink outline, bamboo face with a darker lip, sunken slots. */}
        <RoundedRect x={tray.x} y={tray.y + TRAY_DROP} width={tray.width} height={tray.height} r={22} color={COLORS.ink} />
        <RoundedRect x={tray.x} y={tray.y} width={tray.width} height={tray.height} r={22} color={COLORS.ink} />
        <RoundedRect x={tray.x + TRAY_RIM} y={tray.y + TRAY_RIM} width={tray.width - 2 * TRAY_RIM} height={tray.height - 2 * TRAY_RIM} r={18} color={UI.bambooLip} />
        <RoundedRect x={tray.x + TRAY_RIM} y={tray.y + TRAY_RIM} width={tray.width - 2 * TRAY_RIM} height={tray.height - 2 * TRAY_RIM - TRAY_LIP} r={18} color={UI.bamboo} />
        {Array.from({ length: TRAY_CAPACITY }, (_, slot) => {
          const center = slotCenter(tray, slot);
          return (
            <Group key={slot}>
              <RoundedRect x={center.x - side / 2} y={center.y - side / 2} width={side} height={side} r={11} color={TRAY_SLOT_SHADE} />
              <RoundedRect x={center.x - side / 2} y={center.y - side / 2 + 4} width={side} height={side - 4} r={11} color={UI.slot} />
            </Group>
          );
        })}
        {trayView.entries.map((entry, index) => (
          <TraySprite
            key={entry.uid}
            uid={entry.uid}
            image={images[entry.kind]!}
            from={entry.from}
            fromOpaque={entry.fromOpaque}
            slot={slots[index] ?? 0}
            layout={tray}
            clearing={entry.clearing}
            quick={reduceMotion}
            onLanded={onLanded}
          />
        ))}
      </>
    );
  }, [images, trayView.entries, tray, reduceMotion, onLanded]);

  const hintId = play?.hintId ?? null;
  const hintPoint = useMemo(() => {
    const target = hintId ? board.find((item) => item.id === hintId) : undefined;
    const point = target ? findTapPoint(target, board, assets.masks) : null;
    return point ? boardToScreen(viewport, point) : null;
  }, [hintId, board, assets.masks, viewport]);

  // The screen rect a lesson step points at.
  const lessonTarget = lessonStep?.target ?? null;
  const coach = useMemo((): { hole: Rect; tapPoint: { x: number; y: number } | null } | null => {
    if (!lessonTarget) return null;
    if (lessonTarget.type === "tray") return { hole: { x: tray.x, y: tray.y, width: tray.width, height: tray.height }, tapPoint: null };
    if (lessonTarget.type === "booster") return { hole: boosterRect(lessonTarget.booster, width, boosterTop), tapPoint: null };
    const id = lessonTarget.type === "item" ? lessonTarget.itemId : hintId;
    const item = id ? board.find((candidate) => candidate.id === id) : undefined;
    if (!item) return null;
    const mask = assets.masks[item.kind];
    // A covered item's centre can lie under the item on top: aim where this item is front-most.
    const point = findTapPoint(item, board, assets.masks);
    return { hole: boardRectToScreen(viewport, mask ? opaqueRect(mask, item.rect) : item.rect), tapPoint: point ? boardToScreen(viewport, point) : null };
  }, [lessonTarget, tray, width, boosterTop, hintId, board, assets.masks, viewport]);
  const coachHole = coach?.hole ?? null;

  const probes = useMemo(() => {
    if (!TEST_PROBES) return [];
    return board
      .filter((item) => !covered.has(item.id))
      .flatMap((item) => {
        const point = findTapPoint(item, board, assets.masks);
        return point ? [{ item, point: boardToScreen(viewport, point) }] : [];
      });
  }, [board, covered, assets.masks, viewport]);

  if (!play) {
    // Briefly true while a level starts; the button is the way out if it never does.
    return (
      <View style={[styles.screen, styles.empty]}>
        <Button label="Về bản đồ" variant="paper" onPress={onMap} testID="to-map" />
      </View>
    );
  }

  const chapter = CHAPTERS.find((c) => c.id === play.level.chapter)!;
  const levelNumber = play.levelIndex + 1;
  const trayNames = play.state.tray.map((item) => assets.names[item.kind] ?? item.kind);

  return (
    <View style={styles.screen} pointerEvents={live ? "auto" : "none"}>
      <GestureDetector gesture={tap}>
        <View style={StyleSheet.absoluteFill} testID="diorama">
          {images ? (
            <Diorama
              viewport={viewport}
              background={images.background!}
              items={board}
              covered={covered}
              images={images}
              masks={assets.masks}
              itemOffset={parallax.items}
              backgroundOffset={parallax.background}
              shake={shake}
            >
              {trayLayer}
            </Diorama>
          ) : null}
          {probes.map(({ item, point }) => (
            <View
              key={item.id}
              pointerEvents="none"
              accessible
              accessibilityLabel={`${assets.names[item.kind] ?? item.kind} tự do`}
              testID={`item-${item.id}`}
              style={[styles.probe, { left: point.x - 4, top: point.y - 4 }]}
            />
          ))}
        </View>
      </GestureDetector>

      {hintPoint && !coachHole ? (
        reduceMotion ? (
          <View pointerEvents="none" style={[styles.hintRing, { left: hintPoint.x - HINT_RING / 2, top: hintPoint.y - HINT_RING / 2 }]} />
        ) : (
          <Artboard name="TapHint" style={[styles.tapHint, { left: hintPoint.x - TAP_HINT_SIZE / 2, top: hintPoint.y - TAP_HINT_SIZE / 2 }]} />
        )
      ) : null}

      <View style={[styles.header, { top: insets.top, height: HEADER_HEIGHT }]}>
        <Button variant="paper" size="icon" accessibilityLabel="Tạm dừng" testID="pause" onPress={() => setPaused(true)}>
          <View style={styles.pauseBars} accessible={false}>
            <View style={styles.pauseBar} />
            <View style={styles.pauseBar} />
          </View>
        </Button>
        <View accessible accessibilityLabel={`${chapter.name}, màn ${levelNumber}, còn ${play.state.board.length} món`} testID="level-title" style={styles.plate}>
          <OutlinedText size={21} numberOfLines={1}>
            {chapter.name}
          </OutlinedText>
          <Text style={styles.subtitle} maxFontSizeMultiplier={HEADER_FONT_SCALE}>
            Màn {levelNumber}
          </Text>
        </View>
        <Chip text={`Còn ${play.state.board.length}`} hidden style={styles.left} />
      </View>

      <View
        pointerEvents="none"
        accessible
        accessibilityLabel={`Giỏ ${play.state.tray.length}/${TRAY_CAPACITY}: ${trayNames.join(", ") || "trống"}`}
        testID="tray"
        style={[styles.trayProbe, { left: tray.x, top: tray.y, width: tray.width, height: tray.height }]}
      />

      {trayView.bursts.map((burst) => {
        const first = slotCenter(tray, burst.slots[0] ?? 0);
        const last = slotCenter(tray, burst.slots[burst.slots.length - 1] ?? 0);
        return <ClearBurst key={burst.id} id={burst.id} x={(first.x + last.x) / 2} y={first.y} onDone={onBurstDone} />;
      })}

      <View style={[styles.boosters, { top: boosterTop }]}>
        <BoosterBar
          inventory={snapshot.save.inventory}
          disabled={play.outcome !== null}
          free={lessonStep?.booster ?? null}
          only={lessonStep ? lessonStep.booster : undefined}
          onUse={applyBooster}
        />
      </View>

      {lessonStep && play.lesson && !play.outcome && !paused ? (
        <CoachMark
          hole={coachHole}
          tapPoint={coach?.tapPoint ?? null}
          text={lessonStep.text}
          index={play.lesson.step}
          count={play.lesson.lesson.steps.length}
          explains={lessonStep.until === "next"}
          reduceMotion={reduceMotion}
          minTop={insets.top + HEADER_HEIGHT}
          onNext={() => commands.nextLessonStep()}
          onSkip={() => commands.skipLesson()}
        />
      ) : null}

      {DEBUG_HUD_ENABLED ? <DebugHud sprites={board.length + trayView.entries.length} top={insets.top + HEADER_HEIGHT + 4} /> : null}

      {shownOutcome?.type === "won" ? (
        <WinSheet
          subtitle={`${chapter.name} · Màn ${levelNumber}`}
          stars={shownOutcome.stars}
          reward={shownOutcome.reward}
          hasNext={commands.isUnlocked(levelIndex + 1)}
          onNext={() => {
            void askForReminders(snapshot.save.settings.reminders);
            onNext();
          }}
          onMap={() => {
            void askForReminders(snapshot.save.settings.reminders);
            onMap();
          }}
        />
      ) : null}
      {shownOutcome?.type === "lost" ? (
        <LoseSheet
          undoLeft={snapshot.save.inventory.undo}
          onRetry={() => {
            setPaused(false);
            commands.restart();
          }}
          onUndo={() => {
            setPaused(false);
            applyBooster("undo");
          }}
          onMap={onMap}
        />
      ) : null}
      {paused && !shownOutcome ? (
        <PauseSheet
          onResume={() => setPaused(false)}
          onRetry={() => {
            setPaused(false);
            commands.restart();
          }}
          onMap={onMap}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.paper },
  header: { position: "absolute", left: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  pauseBars: { flexDirection: "row", gap: 6 },
  pauseBar: { width: 6, height: 18, borderRadius: 2, backgroundColor: COLORS.ink },
  // A bamboo name plate for the district and the level number.
  plate: {
    flex: 1,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 14,
    paddingBottom: 6,
    borderRadius: 16,
    borderWidth: INK_BORDER,
    borderBottomWidth: INK_BORDER + 5,
    borderColor: COLORS.ink,
    borderBottomColor: UI.bambooLip,
    backgroundColor: UI.bamboo,
  },
  subtitle: { fontFamily: FONT.displayBold, ...displayType(14), color: COLORS.paper },
  left: { marginBottom: 4 },
  probe: { position: "absolute", width: 8, height: 8 },
  trayProbe: { position: "absolute" },
  tapHint: { position: "absolute", width: TAP_HINT_SIZE, height: TAP_HINT_SIZE },
  hintRing: { position: "absolute", width: HINT_RING, height: HINT_RING, borderRadius: HINT_RING / 2, borderWidth: 4, borderColor: COLORS.lantern },
  empty: { alignItems: "center", justifyContent: "center" },
  boosters: { position: "absolute", left: 0, right: 0 },
});
