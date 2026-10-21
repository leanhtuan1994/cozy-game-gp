import { useEffect } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Fit, RiveView, useRiveBoolean, useViewModelInstance } from "@rive-app/react-native";

import { useMotionFile } from "./MotionProvider";

// The `Chest` artboard bound to `Chest.opened`: closed it wobbles and glows, opening pops the lid.
export function Chest({ opened, style }: { opened: boolean; style?: StyleProp<ViewStyle> }) {
  const file = useMotionFile();
  const { instance } = useViewModelInstance(file, { artboardName: "Chest", async: true });
  const { setValue } = useRiveBoolean("opened", instance);
  useEffect(() => {
    if (instance) setValue(opened);
  }, [instance, opened, setValue]);
  return (
    <View pointerEvents="none" style={[styles.box, style]}>
      {file && instance ? <RiveView file={file} artboardName="Chest" dataBind={instance} autoPlay fit={Fit.Contain} style={StyleSheet.absoluteFill} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ box: { width: 120, height: 110 } });
