import { useEffect } from "react";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Fit, RiveView, useRiveNumber, useViewModelInstance } from "@rive-app/react-native";

import { runStarHaptics } from "@/feedback";
import { ICONS } from "@/hud/icons";
import { useReduceMotion } from "@/hud/useReduceMotion";

import { useMotionFile } from "./MotionProvider";

interface WinStarsProps {
  // 0–3, always from the engine.
  stars: number;
  style?: StyleProp<ViewStyle>;
}

// The `Stars` artboard: binds `WinStars.stars`; raising it pops stars in turn, lowering hides them.
// With reduce motion the final count shows at once, without the pop.
// The star vibrations follow the animation: they start once the Rive instance has the count, or at
// once when the stars show still.
export function WinStars({ stars, style }: WinStarsProps) {
  const reduceMotion = useReduceMotion();
  if (reduceMotion) return <StillStars stars={stars} style={style} />;
  return <AnimatedStars stars={stars} style={style} />;
}

function StillStars({ stars, style }: WinStarsProps) {
  useEffect(() => runStarHaptics(stars, true), [stars]);
  return (
    <View style={[styles.stars, styles.still, style]} accessible accessibilityLabel={`${stars} sao`} testID="win-stars">
      {[0, 1, 2].map((i) => (
        <Image key={i} source={ICONS.star} style={[styles.stillStar, i === 1 && styles.stillStarMiddle, i >= stars && styles.stillStarOff]} />
      ))}
    </View>
  );
}

function AnimatedStars({ stars, style }: WinStarsProps) {
  const file = useMotionFile();
  const { instance, error: instanceError } = useViewModelInstance(file, { artboardName: "Stars", async: true });
  const { setValue, error } = useRiveNumber("stars", instance);

  useEffect(() => {
    if (instance) setValue(stars);
  }, [instance, setValue, stars]);
  // Kept apart from the effect above so a new setValue identity does not restart the vibrations.
  useEffect(() => (instance ? runStarHaptics(stars, false) : undefined), [instance, stars]);
  useEffect(() => {
    const failure = error ?? instanceError;
    if (!failure) return;
    console.error("WinStars:", failure);
    // No animation to follow: the win still vibrates.
    return runStarHaptics(stars, true);
  }, [error, instanceError, stars]);

  return (
    <View style={[styles.stars, style]} accessible accessibilityLabel={`${stars} sao`} testID="win-stars">
      {file && instance ? (
        <RiveView file={file} artboardName="Stars" dataBind={instance} autoPlay fit={Fit.Contain} style={StyleSheet.absoluteFill} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stars: { width: 280, height: 120 },
  // Same spots as the artboard's stars.
  still: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 5, paddingBottom: 16 },
  stillStar: { width: 74, height: 74 },
  stillStarMiddle: { width: 92, height: 92 },
  stillStarOff: { opacity: 0.3 },
});
