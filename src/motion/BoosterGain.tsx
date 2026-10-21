import { useEffect, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Fit, RiveView, useRiveNumber, useViewModelInstance } from "@rive-app/react-native";

import type { Booster } from "@/engine/puzzle/types";

import { useMotionFile } from "./MotionProvider";

const KIND: Record<Booster, number> = { undo: 0, shuffle: 1, hint: 2 };
// The icon pops and flies off in about a second; the contract says to unmount after ~1.2 s, since
// it repeats while `kind` holds its value.
const LIFETIME_MS = 1200;

// The `BoosterGain` artboard bound to `BoosterGain.kind`, shown once when a booster is gained. It
// hides itself after one play.
export function BoosterGain({ booster, style }: { booster: Booster; style?: StyleProp<ViewStyle> }) {
  const file = useMotionFile();
  const { instance } = useViewModelInstance(file, { artboardName: "BoosterGain", async: true });
  const { setValue } = useRiveNumber("kind", instance);
  useEffect(() => {
    if (instance) setValue(KIND[booster]);
  }, [instance, booster, setValue]);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setPlaying(false), LIFETIME_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <View pointerEvents="none" style={[styles.box, style]}>
      {playing && file && instance ? <RiveView file={file} artboardName="BoosterGain" dataBind={instance} autoPlay fit={Fit.Contain} style={StyleSheet.absoluteFill} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ box: { width: 120, height: 110 } });
