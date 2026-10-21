import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { Alert, AppState, Linking, StyleSheet, Text, View } from "react-native";

import { VOLUME_STEPS, type Settings } from "@/engine/meta/settings";
import { HAS_MUSIC, playUiFeedback } from "@/feedback";
import { setHapticsEnabled } from "@/feedback/haptics";
import { remindersAllowed, requestReminders, scheduleReminders } from "@/notifications/schedule";
import { useCommands, useGame } from "@/store/GameContext";

import { MetaFrame, cardStyle } from "./MetaFrame";
import { COLORS, FONT, displayType } from "./theme";
import { Button, ToggleSwitch } from "./ui";

const VOLUME_NAMES = ["Tắt", "Nhỏ", "Vừa", "To"] as const;
const MOTION_OPTIONS: readonly { value: Settings["reduceMotion"]; label: string }[] = [
  { value: "system", label: "Theo máy" },
  { value: "on", label: "Bật" },
  { value: "off", label: "Tắt" },
];

// The nearest of the four steps, so a stored value always shows as one of them.
function volumeStep(volume: number): number {
  let best = 0;
  VOLUME_STEPS.forEach((step, i) => {
    if (Math.abs(step - volume) < Math.abs(VOLUME_STEPS[best]! - volume)) best = i;
  });
  return best;
}

function Segments<T>({ id, label, options, selected, onSelect }: { id: string; label: string; options: readonly { value: T; label: string }[]; selected: T; onSelect: (value: T) => void }) {
  const commands = useCommands();
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.segments} accessibilityRole="radiogroup" accessibilityLabel={label} testID={id}>
        {options.map((option, i) => {
          const on = option.value === selected;
          return (
            <Button
              key={i}
              role="radio"
              selected={on}
              variant={on ? "go" : "paper"}
              size="sm"
              label={option.label}
              accessibilityLabel={`${label}: ${option.label}${on ? ", đang chọn" : ""}`}
              testID={`${id}-${i}`}
              pressFeedback={false}
              onPress={() => {
                onSelect(option.value);
                // After the change, so choosing a sound level plays the click at that level.
                if (!on) playUiFeedback("select", commands.getSnapshot().save.settings);
              }}
              style={styles.segment}
            />
          );
        })}
      </View>
    </View>
  );
}

function Toggle({ id, label, value, onChange }: { id: string; label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={[styles.row, styles.toggleRow]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <ToggleSwitch value={value} onValueChange={onChange} accessibilityLabel={label} testID={id} />
    </View>
  );
}

interface SettingsScreenProps {
  onBack: () => void;
  onReplayTutorial: () => void;
}

// Sound, haptics, reminders and motion, then the tutorial, a progress reset, and app info.
export function SettingsScreen({ onBack, onReplayTutorial }: SettingsScreenProps) {
  const { snapshot, commands } = useGame();
  const settings = snapshot.save.settings;
  const volumes = VOLUME_STEPS.map((value, i) => ({ value: i, label: VOLUME_NAMES[i]! }));
  const update = (patch: Partial<Settings>) => commands.updateSettings(patch);
  // The switch shows on only while the game setting is on and iOS allows notifications. It is read
  // again when the player comes back from the iPhone's Settings. Null: not known yet.
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    const refresh = () => void remindersAllowed().then(setAllowed);
    refresh();
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") refresh();
    });
    return () => subscription.remove();
  }, []);

  const setReminders = async (on: boolean) => {
    if (on && (await requestReminders()) === "denied") {
      setAllowed(false);
      Alert.alert("Thông báo đang tắt", "Bật thông báo cho Ghép Phố trong Cài đặt của iPhone.", [
        { text: "Để sau", style: "cancel" },
        { text: "Mở Cài đặt", onPress: () => void Linking.openSettings() },
      ]);
      return;
    }
    if (on) setAllowed(true);
    update({ reminders: on });
    void scheduleReminders(commands);
  };

  const resetProgress = () =>
    Alert.alert("Xoá tiến trình?", "Sao, trợ giúp, quà và thành tích sẽ mất. Cài đặt được giữ lại.", [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xoá",
        style: "destructive",
        onPress: () =>
          Alert.alert("Chắc chắn chứ?", "Không lấy lại được đâu.", [
            { text: "Huỷ", style: "cancel" },
            { text: "Xoá hết", style: "destructive", onPress: () => commands.resetProgress() },
          ]),
      },
    ]);

  return (
    <MetaFrame title="Cài đặt" testID="settings-screen" onBack={onBack}>
      <Text style={styles.section}>Âm thanh</Text>
      {HAS_MUSIC ? <Segments id="setting-music" label="Nhạc" options={volumes} selected={volumeStep(settings.music)} onSelect={(i) => update({ music: VOLUME_STEPS[i] })} /> : null}
      <Segments id="setting-sound" label="Hiệu ứng" options={volumes} selected={volumeStep(settings.sound)} onSelect={(i) => update({ sound: VOLUME_STEPS[i] })} />
      <Toggle
        id="setting-haptics"
        label="Rung"
        value={settings.haptics}
        onChange={(haptics) => {
          update({ haptics });
          // Turning it back on plays one tap, so the player feels it at once.
          if (haptics) setHapticsEnabled(true);
          playUiFeedback(haptics ? "tick" : "select", commands.getSnapshot().save.settings);
        }}
      />
      <Text style={styles.section}>Trò chơi</Text>
      <Toggle id="setting-reminders" label="Nhắc quà và nhiệm vụ" value={settings.reminders && allowed !== false} onChange={(on) => {
          playUiFeedback("select", commands.getSnapshot().save.settings);
          void setReminders(on);
        }}
      />
      <Segments id="setting-reduce-motion" label="Giảm chuyển động" options={MOTION_OPTIONS} selected={settings.reduceMotion} onSelect={(reduceMotion) => update({ reduceMotion })} />
      <Button
        label="Xem lại hướng dẫn"
        variant="paper"
        onPress={() => {
          commands.resetLessons();
          onReplayTutorial();
        }}
        testID="replay-tutorial"
      />
      <Button label="Xoá tiến trình" variant="paper" onPress={resetProgress} testID="reset-progress" />
      <Text style={styles.section}>Thông tin</Text>
      <View style={styles.infoCard}>
        <Text style={styles.info} testID="app-version">
          Ghép Phố {Constants.expoConfig?.version ?? ""}
        </Text>
        <Text style={styles.info}>Phông chữ Be Vietnam Pro và Baloo 2, giấy phép SIL Open Font License 1.1.</Text>
        <Text style={styles.info}>Hiệu ứng âm thanh của Kenney (kenney.nl). Nhạc “Slow Stride” của isaiah658 (OpenGameArt). Tất cả theo giấy phép CC0.</Text>
      </View>
    </MetaFrame>
  );
}

const styles = StyleSheet.create({
  section: { fontFamily: FONT.display, ...displayType(15), letterSpacing: 0.8, color: COLORS.ink, textTransform: "uppercase" },
  row: { ...cardStyle, gap: 10 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowLabel: { fontFamily: FONT.display, ...displayType(18), color: COLORS.ink, flexShrink: 1 },
  segments: { flexDirection: "row", gap: 8 },
  segment: { flex: 1 },
  infoCard: { ...cardStyle, gap: 6 },
  info: { fontFamily: FONT.regular, fontSize: 14, color: COLORS.inkSoft },
});
