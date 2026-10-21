import { Image, StyleSheet, Text, View } from "react-native";

import type { Booster, Rect } from "@/engine/puzzle/types";

import { BOOSTER_ICONS } from "./icons";
import { COLORS, DISPLAY_FONT_SCALE, FACE, FONT, displayType } from "./theme";
import { Badge, Button } from "./ui";

export const BOOSTER_NAMES: Record<Booster, string> = { undo: "Hoàn tác", shuffle: "Xáo", hint: "Gợi ý" };
const ORDER: readonly Booster[] = ["undo", "shuffle", "hint"];
const PADDING = 16;
const GAP = 12;
// The button face plus its 4 pt drop shadow. The board, the tray and the tutorial's cut-out are
// all placed from this, so change it with the button styles.
export const BOOSTER_HEIGHT = 80;
const FACE_HEIGHT = BOOSTER_HEIGHT - 4;

// Screen rect of a booster button in a bar `width` wide whose top is at `top` (matches the styles).
export function boosterRect(booster: Booster, width: number, top: number): Rect {
  const buttonWidth = (width - 2 * PADDING - (ORDER.length - 1) * GAP) / ORDER.length;
  return { x: PADDING + ORDER.indexOf(booster) * (buttonWidth + GAP), y: top, width: buttonWidth, height: BOOSTER_HEIGHT };
}

interface BoosterBarProps {
  inventory: Record<Booster, number>;
  disabled: boolean;
  // A booster the tutorial gives free: usable even with none in stock.
  free?: Booster | null;
  // During a tutorial step: the only booster that works (null: none). Undefined outside lessons.
  only?: Booster | null;
  onUse: (booster: Booster) => void;
}

// The three boosters with their stock, under the tray in thumb reach. A press has no tap of its own:
// each booster's vibration plays when the engine applies it.
export function BoosterBar({ inventory, disabled, free = null, only, onUse }: BoosterBarProps) {
  return (
    <View style={styles.bar}>
      {ORDER.map((booster) => {
        const count = inventory[booster];
        const isFree = booster === free;
        const empty = count === 0 && !isFree;
        const off = disabled || (only !== undefined && only !== booster) || empty;
        return (
          <View key={booster} style={styles.slot}>
            <Button
              variant="paper"
              pressFeedback={false}
              disabled={off}
              accessibilityLabel={isFree ? `${BOOSTER_NAMES[booster]}, miễn phí` : `${BOOSTER_NAMES[booster]}, còn ${count}`}
              testID={`booster-${booster}`}
              onPress={() => onUse(booster)}
              style={styles.button}
              faceStyle={styles.face}
            >
              <Image source={BOOSTER_ICONS[booster]} style={[styles.icon, empty && styles.iconEmpty]} />
              <Text style={[styles.name, off && styles.nameOff]} maxFontSizeMultiplier={DISPLAY_FONT_SCALE} numberOfLines={1}>
                {BOOSTER_NAMES[booster]}
              </Text>
            </Button>
            {isFree ? <Badge count="MIỄN PHÍ" tone="go" style={styles.badge} /> : <Badge count={count} tone={empty ? "off" : "red"} style={styles.badge} />}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", gap: GAP, justifyContent: "center", paddingHorizontal: PADDING },
  slot: { flex: 1 },
  button: { alignSelf: "stretch" },
  face: { height: FACE_HEIGHT, minHeight: FACE_HEIGHT, flexDirection: "column", gap: 0, paddingHorizontal: 4, borderRadius: 22 },
  // Icon and label fill the face at the largest allowed text size (DISPLAY_FONT_SCALE).
  icon: { width: 40, height: 40, marginTop: 2 },
  iconEmpty: { opacity: 0.45 },
  name: { fontFamily: FONT.display, ...displayType(15), color: COLORS.ink },
  nameOff: { color: FACE.off.text },
  badge: { position: "absolute", top: -12, right: -10 },
});
