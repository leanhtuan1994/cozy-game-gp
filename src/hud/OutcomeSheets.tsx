import { Image, StyleSheet, Text, View } from "react-native";

import type { Booster } from "@/engine/puzzle/types";
import { Artboard } from "@/motion/Artboard";
import { WinStars } from "@/motion/WinStars";

import { BOOSTER_NAMES } from "./BoosterBar";
import { BOOSTER_ICONS, ICONS } from "./icons";
import { COLORS, FONT, INK_BORDER, UI, displayType } from "./theme";
import { Badge, Button, Sheet } from "./ui";
import { useReduceMotionFlag } from "./useReduceMotion";

interface WinSheetProps {
  // "{district} · Màn n", under the ribbon.
  subtitle: string;
  stars: number;
  reward: Booster | null;
  hasNext: boolean;
  onNext: () => void;
  onMap: () => void;
}

export function WinSheet({ subtitle, stars, reward, hasNext, onNext, onMap }: WinSheetProps) {
  const reduceMotion = useReduceMotionFlag();
  // Paper confetti bursts from behind the ribbon and keeps drifting down; none with reduce motion.
  return (
    <Sheet title="Dọn xong!" tone="go" testID="win-sheet" backdrop={reduceMotion ? null : <Artboard name="WinConfetti" style={styles.confetti} />}>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <WinStars stars={stars} />
      {reward ? (
        <View style={styles.reward} accessible accessibilityLabel={`Nhận thêm 1 ${BOOSTER_NAMES[reward]}`}>
          <Text style={styles.rewardLabel}>THẮNG LẦN ĐẦU</Text>
          <View style={styles.rewardPill}>
            <Image source={BOOSTER_ICONS[reward]} style={styles.rewardIcon} />
            <Text style={styles.rewardText}>+1 {BOOSTER_NAMES[reward]}</Text>
          </View>
        </View>
      ) : null}
      <View style={styles.row}>
        <Button label="Bản đồ" variant="paper" onPress={onMap} testID="to-map" style={styles.grow} />
        {hasNext ? <Button label="Màn tiếp" onPress={onNext} testID="next-level" style={styles.growMore} /> : null}
      </View>
    </Sheet>
  );
}

interface LoseSheetProps {
  undoLeft: number;
  onRetry: () => void;
  onUndo: () => void;
  onMap: () => void;
}

// A lost level is free to retry. Undo is the one booster that can save it: it takes the last
// item back out of the full tray.
export function LoseSheet({ undoLeft, onRetry, onUndo, onMap }: LoseSheetProps) {
  const reduceMotion = useReduceMotionFlag();
  return (
    <Sheet title="Giỏ đầy rồi" tone="night" testID="lose-sheet">
      <Artboard name={reduceMotion ? "BasketFullStill" : "BasketFull"} style={styles.basket} />
      {undoLeft > 0 ? <Text style={styles.note}>Hoàn tác lấy món cuối ra khỏi giỏ để con chơi tiếp.</Text> : null}
      <View style={styles.wide}>
        <Button
          label="Dùng Hoàn tác"
          accessibilityLabel={`Dùng Hoàn tác (còn ${undoLeft})`}
          variant="gold"
          pressFeedback={false}
          disabled={undoLeft === 0}
          onPress={onUndo}
          testID="lose-undo"
          faceStyle={styles.undoFace}
        >
          <Image source={ICONS.undo} style={[styles.undoIcon, undoLeft === 0 && styles.dim]} />
        </Button>
        <Badge count={`còn ${undoLeft}`} tone={undoLeft === 0 ? "off" : "red"} style={styles.undoBadge} />
      </View>
      <Button label="Chơi lại" onPress={onRetry} testID="retry" style={styles.wide} />
      <Button label="Bản đồ" variant="paper" onPress={onMap} testID="to-map" style={styles.wide} />
    </Sheet>
  );
}

export function PauseSheet({ onResume, onRetry, onMap }: { onResume: () => void; onRetry: () => void; onMap: () => void }) {
  return (
    <Sheet title="Tạm dừng" tone="red" testID="pause-sheet">
      <Button label="Chơi tiếp" size="lg" onPress={onResume} testID="resume" style={styles.wide} />
      <View style={styles.row}>
        <Button label="Chơi lại" variant="paper" onPress={onRetry} testID="retry" style={styles.grow} />
        <Button label="Bản đồ" variant="paper" onPress={onMap} testID="to-map" style={styles.grow} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontFamily: FONT.displayBold, ...displayType(16), color: UI.label },
  row: { flexDirection: "row", gap: 12, alignSelf: "stretch" },
  grow: { flex: 1 },
  growMore: { flex: 1.4 },
  wide: { alignSelf: "stretch" },
  reward: { alignSelf: "stretch", alignItems: "center", gap: 8, paddingTop: 10, paddingBottom: 14, borderRadius: 18, backgroundColor: UI.panelInset },
  rewardLabel: { fontFamily: FONT.bold, fontSize: 12, letterSpacing: 0.8, color: UI.label },
  rewardPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 50,
    paddingLeft: 4,
    paddingRight: 18,
    borderRadius: 25,
    borderWidth: INK_BORDER,
    borderBottomWidth: INK_BORDER + 4,
    borderColor: COLORS.ink,
    backgroundColor: "#FFFFFF",
  },
  rewardIcon: { width: 46, height: 46, marginTop: -10 },
  rewardText: { fontFamily: FONT.display, ...displayType(20), color: COLORS.ink },
  // The 400×300 artboard, a little wider than the panel and reaching above it.
  confetti: { position: "absolute", left: -24, right: -24, top: -150, aspectRatio: 4 / 3 },
  basket: { width: 180, height: 160 },
  note: { fontFamily: FONT.semibold, fontSize: 15, lineHeight: 21, color: COLORS.inkSoft, textAlign: "center" },
  undoFace: { flexDirection: "row-reverse" },
  undoIcon: { width: 36, height: 36, marginVertical: -6 },
  dim: { opacity: 0.45 },
  undoBadge: { position: "absolute", top: -12, right: -8 },
});
