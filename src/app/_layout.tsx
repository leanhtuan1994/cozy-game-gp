import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { hapticsReady } from "@/feedback/haptics";
import { HapticPatterns, HapticsSettingsSync } from "@/feedback/HapticsHost";
import { MusicController } from "@/feedback/MusicController";
import { COLORS } from "@/hud/theme";
import { ReduceMotionProvider } from "@/hud/useReduceMotion";
import { MotionProvider } from "@/motion/MotionProvider";
import { GameProvider } from "@/store/GameContext";

// The splash stays up until the haptic patterns are parsed and the presets preloaded, which starts the
// engine: Pulsar can stall the main thread while it starts (software-mansion/pulsar#302), and that
// stall should land behind the splash, not on the map. The limit covers a launch while inactive.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);
const SPLASH_LIMIT_MS = 3000;

export default function RootLayout() {
  useEffect(() => {
    let hidden = false;
    const hide = () => {
      if (hidden) return;
      hidden = true;
      void SplashScreen.hideAsync().catch(() => undefined);
    };
    void hapticsReady.then(hide);
    const timer = setTimeout(hide, SPLASH_LIMIT_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.paper }}>
      <HapticPatterns />
      <GameProvider>
        <ReduceMotionProvider>
          <MotionProvider>
            <StatusBar style="dark" />
            <HapticsSettingsSync />
            <MusicController />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.paper } }}>
              {/* The map stays mounted under a level; freezing it stops it re-rendering on every tap. */}
              <Stack.Screen name="index" options={{ freezeOnBlur: true }} />
              {/* A level owns the whole screen: no swipe-back mid-level. */}
              <Stack.Screen name="play/[level]" options={{ gestureEnabled: false }} />
              {/* The greeting leads straight into level 1; there is nothing to go back to. */}
              <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: "fade" }} />
            </Stack>
          </MotionProvider>
        </ReduceMotionProvider>
      </GameProvider>
    </GestureHandlerRootView>
  );
}
