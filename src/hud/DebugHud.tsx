import { useCallback, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useDerivedValue, useFrameCallback, useSharedValue } from "react-native-reanimated";
import { Canvas, RoundedRect, Text } from "react-native-skia";

import { COLORS, hudFont } from "@/hud/theme";

export const DEBUG_HUD_ENABLED = process.env.EXPO_PUBLIC_DEBUG_HUD === "1";

const WIDTH = 236;
const HEIGHT = 30;
const WINDOW_MS = 1000;

// Frame stats for builds made with EXPO_PUBLIC_DEBUG_HUD=1. `fps` is the frame count over the
// last second; `min` is the worst single frame in that second, as a rate.
export function DebugHud({ sprites, top }: { sprites: number; top: number }) {
  const font = hudFont(13, "600");
  const fps = useSharedValue(0);
  const minFps = useSharedValue(0);
  const spriteCount = useSharedValue(sprites);
  const stats = useSharedValue({ start: 0, frames: 0, worst: 0 });

  useEffect(() => {
    spriteCount.set(sprites);
  }, [sprites, spriteCount]);

  const onFrame = useCallback(
    ({ timestamp, timeSincePreviousFrame }: { timestamp: number; timeSincePreviousFrame: number | null }) => {
      "worklet";
      const w = stats.get();
      const start = w.start === 0 ? timestamp : w.start;
      const frames = w.frames + 1;
      const worst = Math.max(w.worst, timeSincePreviousFrame ?? 0);
      if (timestamp - start >= WINDOW_MS) {
        fps.set((frames * 1000) / (timestamp - start));
        minFps.set(worst > 0 ? 1000 / worst : 0);
        stats.set({ start: timestamp, frames: 0, worst: 0 });
      } else {
        stats.set({ start, frames, worst });
      }
    },
    [fps, minFps, stats],
  );
  useFrameCallback(onFrame);

  const label = useDerivedValue(
    () => `fps ${Math.round(fps.get())} · min ${Math.round(minFps.get())} · ${spriteCount.get()} món`,
  );

  return (
    <View pointerEvents="none" accessible accessibilityLabel="Thông số khung hình" testID="debug-hud" style={[styles.box, { top }]}>
      <Canvas style={styles.canvas}>
        <RoundedRect x={0} y={0} width={WIDTH} height={HEIGHT} r={10} color={COLORS.night} opacity={0.85} />
        <Text x={12} y={20} text={label} font={font} color={COLORS.paper} />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: "absolute", right: 12, width: WIDTH, height: HEIGHT },
  canvas: { width: WIDTH, height: HEIGHT },
});
