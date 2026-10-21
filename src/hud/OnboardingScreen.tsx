import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, KeyboardAvoidingView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NAME_MAX_LENGTH } from "@/engine/meta/settings";
import { Artboard } from "@/motion/Artboard";

import { COLORS, FACE, FONT, INK_BORDER, displayType } from "./theme";
import { Button } from "./ui";
import { useReduceMotion } from "./useReduceMotion";

const LINES = [
  "Chào con! Cô là cô Tư, bán bánh mì đầu hẻm.",
  "Phố mình bừa quá: ghế nhựa, chả lụa, bánh mì nằm lung tung cả.",
  "Con giúp cô gom từng bộ ba món giống nhau cho gọn nha.",
] as const;
const ASK = "Cô gọi con là gì đây?";

// The first-run greeting: cô Tư says three short lines, asks the player's name (optional), and
// the game goes straight to level 1. No form, no account.
export function OnboardingScreen({ onDone }: { onDone: (name: string | null) => void }) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [line, setLine] = useState(0);
  const [name, setName] = useState("");
  const asking = line >= LINES.length;
  const current = asking ? ASK : LINES[line]!;

  // "Vào chơi" and the keyboard's Done can both fire: finish once.
  const finished = useRef(false);
  const finish = (value: string | null) => {
    if (finished.current) return;
    finished.current = true;
    // Baloo 2 cannot place loose combining marks, so keep names in composed form.
    onDone(value === null ? null : value.normalize("NFC"));
  };

  // VoiceOver reads each new line out (a live region only works on Android).
  useEffect(() => {
    if (line > 0) AccessibilityInfo.announceForAccessibility(current);
  }, [line, current]);

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.screen} testID="onboarding">
      {/* Padding lives on an inner view: KeyboardAvoidingView sets its own bottom padding. */}
      <View style={[styles.body, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        {reduceMotion ? <View style={styles.lanternsStill} /> : <Artboard name="Lanterns" style={styles.lanterns} />}
        <View style={styles.dialog}>
          <View style={styles.avatar} accessible={false}>
            <Text style={styles.avatarText}>Tư</Text>
          </View>
          <View style={styles.speaker}>
            <Text style={styles.speakerName}>Cô Tư</Text>
            <Text style={styles.line} testID="onboarding-line">
              {current}
            </Text>
            {!asking ? <Text style={styles.progress}>{`${line + 1}/${LINES.length}`}</Text> : null}
          </View>
        </View>
        {asking ? (
          <View style={styles.ask}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Tên của con (không bắt buộc)"
              placeholderTextColor={COLORS.inkSoft}
              maxLength={NAME_MAX_LENGTH}
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => finish(name)}
              accessibilityLabel="Tên của con"
              testID="onboarding-name"
              style={styles.input}
            />
            <View style={styles.actions}>
              <Button label="Bỏ qua" variant="paper" onPress={() => finish(null)} testID="onboarding-skip-name" accessibilityLabel="Bỏ qua, không nhập tên" />
              <Button label="Vào chơi" onPress={() => finish(name)} testID="onboarding-start" />
            </View>
          </View>
        ) : (
          <Button label="Tiếp" onPress={() => setLine(line + 1)} testID="onboarding-next" style={styles.next} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.paper },
  body: { flex: 1, paddingHorizontal: 20, justifyContent: "space-between" },
  lanterns: { width: "100%", height: 110 },
  lanternsStill: { height: 110 },
  dialog: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: INK_BORDER,
    borderBottomWidth: INK_BORDER + 4,
    borderColor: COLORS.ink,
    backgroundColor: FACE.gold.face,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: FONT.display, ...displayType(24), color: COLORS.ink },
  speaker: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 22,
    borderBottomLeftRadius: 6,
    borderWidth: INK_BORDER,
    borderBottomWidth: INK_BORDER + 4,
    borderColor: COLORS.ink,
    backgroundColor: "#FFFFFF",
    gap: 6,
  },
  speakerName: { fontFamily: FONT.bold, fontSize: 14, color: COLORS.plasticRed },
  line: { fontFamily: FONT.displayBold, fontSize: 23, lineHeight: 29, color: COLORS.ink },
  progress: { fontFamily: FONT.semibold, fontSize: 13, color: COLORS.inkSoft, alignSelf: "flex-end" },
  ask: { gap: 14 },
  input: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: INK_BORDER,
    borderColor: COLORS.ink,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    fontFamily: FONT.regular,
    fontSize: 18,
    color: COLORS.ink,
  },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  next: { alignSelf: "flex-end", minWidth: 140 },
});
