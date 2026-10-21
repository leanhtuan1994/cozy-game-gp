import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { DataBindMode, Fit, RiveView } from "@rive-app/react-native";

import { useMotionFile } from "./MotionProvider";

// An artboard without a view model (TapHint, BasketFull, Lanterns, …), playing its default state
// machine. Data binding is off: Auto binding would probe for a view model and log an error.
export function Artboard({ name, style }: { name: string; style?: StyleProp<ViewStyle> }) {
  const file = useMotionFile();
  return (
    <View pointerEvents="none" style={style}>
      {file ? <RiveView file={file} artboardName={name} dataBind={DataBindMode.None} autoPlay fit={Fit.Contain} style={StyleSheet.absoluteFill} /> : null}
    </View>
  );
}
