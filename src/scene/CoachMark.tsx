import { useEffect } from "react";
import { AccessibilityInfo, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import type { Point, Rect } from "@/engine/puzzle/types";
import { COLORS, FACE, FONT, INK_BORDER, displayType } from "@/hud/theme";
import { Button } from "@/hud/ui";
import { Artboard } from "@/motion/Artboard";

const PAD = 10;
const SCRIM = "rgba(43, 42, 51, 0.55)";
const TAP_HINT_SIZE = 120;
const BUBBLE_GAP = 18;

interface CoachMarkProps {
  // Screen rect of what the step points at, and the point where a tap reaches it. Null when the
  // target is not on screen: the bubble (with "Bỏ qua") still shows, so the player is never stuck.
  hole: Rect | null;
  tapPoint: Point | null;
  text: string;
  index: number;
  count: number;
  // The step only explains: show "Tiếp".
  explains: boolean;
  reduceMotion: boolean;
  // Where the bubble may go above the hole (below the header).
  minTop: number;
  onNext: () => void;
  onSkip: () => void;
}

// A tutorial step: the screen dimmed except a hole around the target, a ring (or TapHint) on it, and
// a bubble with the step counter. The dimming never takes touches: the session decides which taps
// count, so the target under the hole works as it always does.
export function CoachMark({ hole, tapPoint, text, index, count, explains, reduceMotion, minTop, onNext, onSkip }: CoachMarkProps) {
  const { width, height } = useWindowDimensions();
  // VoiceOver reads each new step out (a live region only works on Android).
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`Bước ${index + 1}/${count}. ${text}`);
  }, [index, count, text]);

  const x = hole ? Math.max(0, hole.x - PAD) : 0;
  const y = hole ? Math.max(0, hole.y - PAD) : 0;
  const w = hole ? Math.min(width - x, hole.width + 2 * PAD) : 0;
  const h = hole ? Math.min(height - y, hole.height + 2 * PAD) : 0;
  // The bubble sits under the header when the hole is low on the screen (clear of the board and
  // the tray), and right under the hole otherwise.
  const above = !hole || y - minTop > height - (y + h);
  const center = tapPoint ?? { x: x + w / 2, y: y + h / 2 };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID="coach-mark">
      {hole ? (
        <>
          <View pointerEvents="none" style={[styles.scrim, { left: 0, top: 0, width, height: y }]} />
          <View pointerEvents="none" style={[styles.scrim, { left: 0, top: y + h, width, height: height - y - h }]} />
          <View pointerEvents="none" style={[styles.scrim, { left: 0, top: y, width: x, height: h }]} />
          <View pointerEvents="none" style={[styles.scrim, { left: x + w, top: y, width: width - x - w, height: h }]} />
          <View pointerEvents="none" style={[styles.ring, { left: x, top: y, width: w, height: h }]} />
          {!reduceMotion && !explains ? (
            <Artboard name="TapHint" style={[styles.tapHint, { left: center.x - TAP_HINT_SIZE / 2, top: center.y - TAP_HINT_SIZE / 2 }]} />
          ) : null}
          {/* Where to tap, for VoiceOver and UI tests (it takes no touches itself). */}
          {!explains ? (
            <View pointerEvents="none" accessible accessibilityLabel="Chỗ cần chạm" testID="coach-target" style={[styles.probe, { left: center.x - 4, top: center.y - 4 }]} />
          ) : null}
        </>
      ) : null}
      <View style={[styles.bubble, above ? { top: minTop + 8 } : { top: y + h + BUBBLE_GAP }]}>
        <View style={styles.counter}>
          <Text style={styles.counterText} testID="coach-step" accessibilityLabel={`Bước ${index + 1}/${count}`}>
            {index + 1}/{count}
          </Text>
        </View>
        <Text style={styles.text} testID="coach-text">
          {text}
        </Text>
        <View style={styles.actions}>
          <Button label="Bỏ qua" variant="paper" onPress={onSkip} testID="coach-skip" accessibilityLabel="Bỏ qua hướng dẫn" />
          {explains ? <Button label="Tiếp" onPress={onNext} testID="coach-next" /> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { position: "absolute", backgroundColor: SCRIM },
  ring: { position: "absolute", borderRadius: 18, borderWidth: 3, borderColor: COLORS.lantern },
  tapHint: { position: "absolute", width: TAP_HINT_SIZE, height: TAP_HINT_SIZE },
  probe: { position: "absolute", width: 8, height: 8 },
  bubble: {
    position: "absolute",
    left: 16,
    right: 16,
    padding: 16,
    gap: 10,
    borderRadius: 22,
    borderWidth: INK_BORDER,
    borderBottomWidth: INK_BORDER + 5,
    borderColor: COLORS.ink,
    backgroundColor: COLORS.paper,
  },
  counter: { alignSelf: "flex-start", height: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: COLORS.ink, justifyContent: "center" },
  counterText: { fontFamily: FONT.display, ...displayType(15), color: FACE.gold.face },
  text: { fontFamily: FONT.displayBold, fontSize: 19, lineHeight: 25, color: COLORS.ink },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
});
