import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { COLORS, DISPLAY_FONT_SCALE, FONT, displayType } from "./theme";

interface OutlinedTextProps {
  children: ReactNode;
  size: number;
  color?: string;
  // Outline thickness in points.
  stroke?: number;
  // Hard ink shadow under the outline.
  shadow?: boolean;
  align?: TextStyle["textAlign"];
  numberOfLines?: number;
  accessibilityRole?: "header" | "text";
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

// Eight directions around the glyphs; together they read as a solid outline.
const RING: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [0.7, 0.7],
  [-0.7, 0.7],
  [0.7, -0.7],
  [-0.7, -0.7],
];

// Display text: cream letters with a thick ink outline and a hard drop shadow, in Baloo 2.
// RN Text takes a single textShadow, so the outline is ink copies of the text offset around it.
// Only the top copy is visible to accessibility, so VoiceOver and the QA flows see one element.
export function OutlinedText({
  children,
  size,
  color = COLORS.paper,
  stroke = 3,
  shadow = true,
  align = "left",
  numberOfLines,
  accessibilityRole,
  accessibilityLabel,
  testID,
  style,
}: OutlinedTextProps) {
  const text: TextStyle = { fontFamily: FONT.display, ...displayType(size), textAlign: align };
  const offsets = shadow ? [[0, stroke * 2] as const, ...RING.map(([x, y]) => [x * stroke, y * stroke] as const)] : RING.map(([x, y]) => [x * stroke, y * stroke] as const);
  return (
    <View style={style} testID={testID}>
      {offsets.map(([x, y], i) => (
        <Text
          key={i}
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          numberOfLines={numberOfLines}
          maxFontSizeMultiplier={DISPLAY_FONT_SCALE}
          style={[text, styles.copy, { color: COLORS.ink, transform: [{ translateX: x }, { translateY: y }] }]}
        >
          {children}
        </Text>
      ))}
      <Text style={[text, { color }]} numberOfLines={numberOfLines} maxFontSizeMultiplier={DISPLAY_FONT_SCALE} accessibilityRole={accessibilityRole} accessibilityLabel={accessibilityLabel}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  copy: { position: "absolute", left: 0, right: 0, top: 0 },
});
