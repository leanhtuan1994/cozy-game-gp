import { useEffect } from "react";
import { StyleSheet } from "react-native";

import { Artboard } from "./Artboard";

export const CLEAR_BURST_SIZE = { width: 160, height: 110 };
// The one-shot runs 40 frames at 60 fps; the contract says to unmount after about 0.7 s.
const LIFETIME_MS = 700;

interface ClearBurstProps {
  id: number;
  // Centre of the three cleared tray slots, in screen points.
  x: number;
  y: number;
  onDone: (id: number) => void;
}

export function ClearBurst({ id, x, y, onDone }: ClearBurstProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDone(id), LIFETIME_MS);
    return () => clearTimeout(timer);
  }, [id, onDone]);

  return <Artboard name="ClearBurst" style={[styles.burst, { left: x - CLEAR_BURST_SIZE.width / 2, top: y - CLEAR_BURST_SIZE.height / 2 }]} />;
}

const styles = StyleSheet.create({
  burst: { position: "absolute", ...CLEAR_BURST_SIZE },
});
