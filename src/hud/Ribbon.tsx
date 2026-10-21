import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { OutlinedText } from "./OutlinedText";
import { COLORS, FACE, FONT, INK_BORDER, UI, displayType, type Face } from "./theme";

type Tone = Extract<Face, "go" | "red" | "night">;

interface RibbonProps {
  title: string;
  // A smaller second line under the title (the district's star count on the map).
  subtitle?: string;
  tone?: Tone;
  size?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const TAIL_W = 30;
const NOTCH = 11;

// One tail as Views: a block plus two border-trick triangles that leave a V notch at the outer edge.
function TailShape({ color, w, h }: { color: string; w: number; h: number }) {
  const half = h / 2;
  return (
    <View style={{ width: w, height: h }}>
      <View style={{ position: "absolute", left: NOTCH, top: 0, width: w - NOTCH, height: h, backgroundColor: color }} />
      <View style={[styles.tri, { borderTopWidth: half, borderLeftWidth: NOTCH, borderTopColor: color }]} />
      <View style={[styles.tri, { top: half, borderBottomWidth: half, borderLeftWidth: NOTCH, borderBottomColor: color }]} />
    </View>
  );
}

// Ink first, then the tone's lip colour inset by the border, so the tail reads as outlined.
function Tail({ color, height, side }: { color: string; height: number; side: "left" | "right" }) {
  const h = height - 10;
  return (
    <View style={[styles.tail, { top: 14, height: h }, side === "left" ? { left: 0 } : { right: 0, transform: [{ scaleX: -1 }] }]}>
      <TailShape color={COLORS.ink} w={TAIL_W} h={h} />
      <View style={{ position: "absolute", left: INK_BORDER + 1, top: INK_BORDER }}>
        <TailShape color={color} w={TAIL_W - INK_BORDER - 1} h={h - INK_BORDER * 2} />
      </View>
    </View>
  );
}

// The title banner of sheets and map districts: an outlined band with folded, notched tails.
export function Ribbon({ title, subtitle, tone = "red", size = 30, style, testID }: RibbonProps) {
  const { face, lip } = FACE[tone];
  const height = subtitle ? size + 34 : size + 24;
  return (
    <View style={[styles.wrap, style]} testID={testID}>
      <Tail color={lip} height={height} side="left" />
      <Tail color={lip} height={height} side="right" />
      <View style={[styles.band, { height, backgroundColor: face }]}>
        <View style={[styles.lip, { backgroundColor: lip }]} />
        <View style={styles.shine} />
        <OutlinedText size={size} align="center" accessibilityRole="header" numberOfLines={1}>
          {title}
        </OutlinedText>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: "center", paddingHorizontal: TAIL_W - 4 },
  band: {
    minWidth: 160,
    paddingHorizontal: 26,
    paddingBottom: 6,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: INK_BORDER,
    borderColor: COLORS.ink,
    borderRadius: 10,
    overflow: "hidden",
  },
  lip: { position: "absolute", left: 0, right: 0, bottom: 0, height: 6 },
  shine: { position: "absolute", left: 0, right: 0, top: 0, height: 3, backgroundColor: "rgba(255,255,255,0.3)" },
  subtitle: { fontFamily: FONT.displayBold, ...displayType(14), color: UI.ribbonText },
  tail: { position: "absolute", width: TAIL_W },
  tri: { position: "absolute", left: 0, top: 0, width: 0, height: 0, borderLeftColor: "transparent" },
});
