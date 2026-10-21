import { useCallback, useEffect } from "react";
import { SensorType, useAnimatedSensor, useFrameCallback, useSharedValue, type SharedValue } from "react-native-reanimated";

import type { Point } from "@/engine/puzzle/types";

// Largest shift of the item layer, in points. The background moves the other way, less.
const MAX_SHIFT = 5;
const BACKGROUND_FACTOR = -0.35;
// Points of shift per m/s² of gravity change; about 0.2 rad of tilt reaches the clamp.
const GAIN = 2.5;
// Share of the gap to the current pose that the resting pose closes each frame, so a phone
// held still drifts back to centre.
const REST_FOLLOW = 0.02;

export interface Parallax {
  items: SharedValue<Point>;
  background: SharedValue<Point>;
}

// A light tilt parallax that sells the 2.5D depth. It reads the gravity vector rather than
// Euler angles, which are unstable with the phone upright and wrap at ±π. Off when `enabled`
// is false (reduce motion), and a no-op where the sensor is missing (the simulator).
export function useParallax(enabled: boolean): Parallax {
  const { sensor, isAvailable } = useAnimatedSensor(SensorType.GRAVITY, { interval: "auto" });
  const rest = useSharedValue<Point | null>(null);
  const items = useSharedValue<Point>({ x: 0, y: 0 });
  const background = useSharedValue<Point>({ x: 0, y: 0 });

  const step = useCallback(() => {
    "worklet";
    const { x: gx, y: gy } = sensor.get();
    const base = rest.get() ?? { x: gx, y: gy };
    const next = { x: base.x + (gx - base.x) * REST_FOLLOW, y: base.y + (gy - base.y) * REST_FOLLOW };
    rest.set(next);

    const x = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, (gx - next.x) * GAIN));
    const y = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, (next.y - gy) * GAIN));
    const current = items.get();
    // Writing only on a visible change keeps an idle board from redrawing every frame.
    if (Math.abs(current.x - x) < 0.05 && Math.abs(current.y - y) < 0.05) return;
    items.set({ x, y });
    background.set({ x: x * BACKGROUND_FACTOR, y: y * BACKGROUND_FACTOR });
  }, [sensor, rest, items, background]);
  const frame = useFrameCallback(step, false);

  useEffect(() => {
    // A fresh resting pose on every enable, so the layer does not jump to the clamp.
    rest.set(null);
    frame.setActive(enabled && isAvailable);
    if (!enabled) {
      items.set({ x: 0, y: 0 });
      background.set({ x: 0, y: 0 });
    }
  }, [enabled, isAvailable, frame, rest, items, background]);

  return { items, background };
}
