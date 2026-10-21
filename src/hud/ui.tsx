import { useEffect, type ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { playUiFeedback } from "@/feedback";
import { useCommands } from "@/store/GameContext";

import { SWITCH_ART } from "./icons";
import { Ribbon } from "./Ribbon";
import { COLORS, DISPLAY_FONT_SCALE, FACE, FONT, INK_BORDER, displayType, type Face } from "./theme";
import { useReduceMotionFlag } from "./useReduceMotion";

type ButtonVariant = Exclude<Face, "night">;
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps {
  // The visible text. Buttons that show only an icon pass `children` and an accessibilityLabel.
  label?: string;
  children?: ReactNode;
  // What VoiceOver reads when the visible text alone is ambiguous ("Nhận" next to several items).
  accessibilityLabel?: string;
  onPress: () => void;
  testID?: string;
  // One choice of a group (a setting's levels, a pair of tabs): announced as a radio or a tab, with
  // `selected` saying whether it is the current one.
  role?: "button" | "radio" | "tab";
  selected?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  // Announced as unavailable but still pressable, for a locked level that answers with a shake.
  announceDisabled?: boolean;
  // A click and a light tap on press. Off only for buttons whose press already has its own sound or
  // vibration (claiming a reward, using a booster, a locked level).
  pressFeedback?: boolean;
  style?: StyleProp<ViewStyle>;
  faceStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

const SIZE: Record<ButtonSize, { height: number; font: number; padX: number }> = {
  sm: { height: 44, font: 16, padX: 6 },
  md: { height: 52, font: 20, padX: 22 },
  lg: { height: 60, font: 23, padX: 26 },
  icon: { height: 52, font: 20, padX: 0 },
};

// Press: the face sinks onto its lip and shrinks a little; release: it springs back with a small bounce.
const SINK = 3;
const SQUEEZE = 0.05;
const DROP = 4;
const LIP = 6;

// The game's chunky button: ink outline, coloured face with a darker lip, a hard ink shadow, at
// least 44 pt tall. Motion runs on a shared value, so pressing never re-renders React.
export function Button({
  label,
  children,
  accessibilityLabel,
  onPress,
  testID,
  role = "button",
  selected = false,
  variant = "go",
  size = "md",
  disabled = false,
  announceDisabled = false,
  pressFeedback = true,
  style,
  faceStyle,
  labelStyle,
}: ButtonProps) {
  const reduceMotion = useReduceMotionFlag();
  const commands = useCommands();
  const press = useSharedValue(0);
  const tone = FACE[disabled ? "off" : variant];
  const dims = SIZE[size];
  const squeeze = reduceMotion ? 0 : SQUEEZE;
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateY: press.get() * SINK }, { scale: 1 - press.get() * squeeze }],
  }));
  const springIn = { damping: 18, stiffness: 420, reduceMotion: ReduceMotion.Never };
  const springOut = { damping: 11, stiffness: 320, reduceMotion: ReduceMotion.Never };
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{
        disabled: disabled || announceDisabled,
        ...(role === "radio" && { checked: selected }),
        ...(role === "tab" && { selected }),
      }}
      testID={testID}
      disabled={disabled}
      onPressIn={() => {
        press.set(reduceMotion ? 1 : withSpring(1, springIn));
      }}
      onPressOut={() => {
        press.set(reduceMotion ? 0 : withSpring(0, springOut));
      }}
      onPress={() => {
        if (pressFeedback && !disabled && !announceDisabled) playUiFeedback("tick", commands.getSnapshot().save.settings);
        onPress();
      }}
      style={[styles.press, { paddingBottom: DROP }, style]}
    >
      <View style={[styles.drop, { top: DROP, borderRadius: size === "icon" ? 999 : 18 }]} />
      <Animated.View
        style={[
          styles.face,
          {
            minHeight: dims.height,
            paddingHorizontal: dims.padX,
            backgroundColor: tone.face,
            borderRadius: size === "icon" ? 999 : 18,
          },
          size === "icon" && { width: dims.height, height: dims.height },
          faceStyle,
          animated,
        ]}
      >
        <View style={[styles.lip, { backgroundColor: tone.lip }]} />
        <View style={styles.shine} />
        {label ? (
          <Text
            maxFontSizeMultiplier={DISPLAY_FONT_SCALE}
            style={[
              styles.label,
              { ...displayType(dims.font), color: tone.text },
              tone.text === "#FFFFFF" && styles.labelShadow,
              labelStyle,
            ]}
          >
            {label}
          </Text>
        ) : null}
        {children}
      </Animated.View>
    </Pressable>
  );
}

// The switch art's size in points. The knob sits a little taller than the track, centred on the
// track's face (its drop shadow hangs below), and slides from one end to the other.
const TRACK_W = 72;
const TRACK_H = 28;
const KNOB_W = 31;
const KNOB_H = 32;
const TRACK_TOP = 3;
const KNOB_OFF_X = -1;
const KNOB_ON_X = TRACK_W - KNOB_W + 1;

// The game's on/off switch: a chunky cream track that turns moss green, with a cream knob that
// springs across. Takes the place of the iOS switch, so it reads as one to VoiceOver.
export function ToggleSwitch({ value, onValueChange, accessibilityLabel, testID }: { value: boolean; onValueChange: (value: boolean) => void; accessibilityLabel: string; testID?: string }) {
  const reduceMotion = useReduceMotionFlag();
  const progress = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    progress.set(reduceMotion ? (value ? 1 : 0) : withSpring(value ? 1 : 0, { damping: 15, stiffness: 260, reduceMotion: ReduceMotion.Never }));
  }, [value, reduceMotion, progress]);
  const onTrack = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, progress.get())) }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: KNOB_OFF_X + (KNOB_ON_X - KNOB_OFF_X) * progress.get() }] }));
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      testID={testID}
      hitSlop={10}
      onPress={() => onValueChange(!value)}
      style={styles.switch}
    >
      <Image source={SWITCH_ART.trackOff} style={styles.switchTrack} />
      <Animated.Image source={SWITCH_ART.trackOn} style={[styles.switchTrack, onTrack]} />
      <Animated.Image source={SWITCH_ART.knob} style={[styles.switchKnob, knob]} />
    </Pressable>
  );
}

// A count or a dot on a corner of a button: red with a cream ring and an ink rim. Hidden from
// VoiceOver: the owner's label already says the count or the state.
export function Badge({ count, tone = "red", style }: { count?: number | string; tone?: "red" | "go" | "off"; style?: StyleProp<ViewStyle> }) {
  const dot = count === undefined;
  return (
    <View
      style={[styles.badge, dot ? styles.dot : null, { backgroundColor: tone === "red" ? COLORS.plasticRed : FACE[tone].face }, style]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {dot ? null : (
        <Text style={styles.badgeText} maxFontSizeMultiplier={DISPLAY_FONT_SCALE}>
          {count}
        </Text>
      )}
    </View>
  );
}

// A night-purple counter with an icon: total stars, streak days, items left.
// `hidden`: when a nearby label already says the same (the play header's title).
export function Chip({ icon, text, accessibilityLabel, hidden = false, testID, style }: { icon?: ImageSourcePropType; text: string; accessibilityLabel?: string; hidden?: boolean; testID?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[styles.chip, icon ? null : styles.chipPlain, style]}
      accessible={!hidden}
      accessibilityElementsHidden={hidden}
      accessibilityLabel={accessibilityLabel ?? text}
      testID={testID}
    >
      {icon ? <Image source={icon} style={styles.chipIcon} /> : null}
      <Text style={styles.chipText} maxFontSizeMultiplier={DISPLAY_FONT_SCALE}>
        {text}
      </Text>
    </View>
  );
}

// A thick outlined track with a moss (or gold, once done) fill and the count in the middle. Hidden
// from VoiceOver: the row's label carries the count.
export function ProgressBar({ value, max, label, style }: { value: number; max: number; label: string; style?: StyleProp<ViewStyle> }) {
  const done = value >= max;
  const width = `${Math.round(Math.min(1, max > 0 ? value / max : 0) * 100)}%` as const;
  return (
    <View style={[styles.track, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.fill, { width, backgroundColor: done ? FACE.gold.face : FACE.go.face, borderBottomColor: done ? FACE.gold.lip : FACE.go.lip }]} />
      <Text style={styles.trackLabel} maxFontSizeMultiplier={DISPLAY_FONT_SCALE}>
        {label}
      </Text>
    </View>
  );
}

type SheetTone = "go" | "red" | "night";

// A dimmed full-screen overlay with a paper panel; the title is a ribbon across its top edge.
// `backdrop` draws on the panel under the ribbon and the content (the win confetti).
export function Sheet({ title, testID, tone = "red", backdrop, children }: { title: string; testID: string; tone?: SheetTone; backdrop?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.scrim} testID={testID} accessibilityViewIsModal>
      <View style={styles.panel}>
        {backdrop}
        <View style={styles.sheetRibbon}>
          <Ribbon title={title} tone={tone} size={32} />
        </View>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  switch: { width: TRACK_W, height: TRACK_TOP + TRACK_H + 2 },
  switchTrack: { position: "absolute", left: 0, top: TRACK_TOP, width: TRACK_W, height: TRACK_H },
  switchKnob: { position: "absolute", left: 0, top: 0, width: KNOB_W, height: KNOB_H },
  press: { alignItems: "stretch" },
  drop: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: COLORS.ink },
  face: {
    borderWidth: INK_BORDER,
    borderColor: COLORS.ink,
    paddingBottom: LIP,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    overflow: "hidden",
  },
  lip: { position: "absolute", left: 0, right: 0, bottom: 0, height: LIP },
  shine: { position: "absolute", left: 0, right: 0, top: 0, height: 3, backgroundColor: "rgba(255,255,255,0.4)" },
  label: { fontFamily: FONT.display, textAlign: "center" },
  labelShadow: { textShadowColor: "rgba(43,42,51,0.55)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 },
  badge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 7,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: COLORS.paper,
    alignItems: "center",
    justifyContent: "center",
    // The ink rim around the cream ring.
    outlineColor: COLORS.ink,
    outlineWidth: 2.5,
    outlineStyle: "solid",
  },
  dot: { minWidth: 20, width: 20, height: 20, paddingHorizontal: 0, borderRadius: 10 },
  badgeText: { fontFamily: FONT.display, ...displayType(15), color: "#FFFFFF" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 44,
    paddingLeft: 4,
    paddingRight: 14,
    borderRadius: 22,
    borderWidth: INK_BORDER,
    borderColor: COLORS.ink,
    backgroundColor: FACE.night.face,
    borderBottomWidth: INK_BORDER + 3,
  },
  chipPlain: { paddingLeft: 14 },
  chipIcon: { width: 36, height: 36 },
  chipText: { fontFamily: FONT.display, ...displayType(19), color: FACE.night.text },
  track: {
    height: 26,
    borderRadius: 13,
    borderWidth: INK_BORDER,
    borderColor: COLORS.ink,
    backgroundColor: "#E6D2AE",
    overflow: "hidden",
    justifyContent: "center",
  },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, borderBottomWidth: 5 },
  trackLabel: { fontFamily: FONT.display, ...displayType(14), color: COLORS.ink, textAlign: "center" },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: COLORS.scrim, justifyContent: "center", padding: 24 },
  panel: {
    backgroundColor: COLORS.paper,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: COLORS.ink,
    paddingTop: 52,
    paddingHorizontal: 22,
    paddingBottom: 24,
    alignItems: "center",
    gap: 14,
    shadowColor: COLORS.ink,
    shadowOpacity: 0.3,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 8 },
  },
  sheetRibbon: { position: "absolute", top: -34, left: 0, right: 0, alignItems: "center" },
});
