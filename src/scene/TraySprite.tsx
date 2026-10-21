import { memo, useEffect } from "react";
import { Easing, ReduceMotion, useDerivedValue, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { Group, Image, type SkImage } from "react-native-skia";
import { scheduleOnRN } from "react-native-worklets";

import type { Rect } from "@/engine/puzzle/types";

import { ContactShadow } from "./Diorama";
import { slotCenter, type TrayLayout } from "./trayLayout";

const FLIGHT_MS = 520;
// With reduce motion: a short straight move with no lift and no arc.
const QUICK_FLIGHT_MS = 160;
// Share of the flight spent lifting off the board before the arc starts.
const LIFT_SHARE = 0.22;
const LIFT_PX = 10;
const LIFT_SCALE = 0.15;
const ARC_PX = 110;
const SLIDE_MS = 160;
const CLEAR_DELAY_MS = 80;
const CLEAR_MS = 200;

// Lift phase progress (0 to 1) at flight time `t`.
function liftProgress(t: number): number {
  "worklet";
  return Math.min(1, t / LIFT_SHARE);
}

// Arc phase progress (0 to 1) at flight time `t`; stays 0 during the lift.
function arcProgress(t: number): number {
  "worklet";
  return Math.max(0, (t - LIFT_SHARE) / (1 - LIFT_SHARE));
}

interface TraySpriteProps {
  uid: string;
  image: SkImage;
  // Screen rect the item left the board from; null places it straight into its slot.
  from: Rect | null;
  // Opaque footprint at takeoff, for the lift shadow.
  fromOpaque: Rect | null;
  slot: number;
  layout: TrayLayout;
  clearing: boolean;
  quick: boolean;
  onLanded: (uid: string) => void;
}

// An item in the tray. It starts as the flight from the board (lift with a growing shadow, then
// an arc into its slot), slides when its slot changes, and shrinks away when cleared. All motion
// runs on shared values; the memo keeps React from re-rendering it unless its props change.
export const TraySprite = memo(function TraySprite({ uid, image, from, fromOpaque, slot, layout, clearing, quick, onLanded }: TraySpriteProps) {
  const size = layout.spriteSize;
  const flight = useSharedValue(from ? 0 : 1);
  const slotX = useSharedValue(slotCenter(layout, slot).x);
  const clear = useSharedValue(0);

  useEffect(() => {
    if (!from) return;
    flight.set(
      // The game's own reduce-motion choice is applied through `quick`, not by Reanimated.
      withTiming(1, { duration: quick ? QUICK_FLIGHT_MS : FLIGHT_MS, easing: Easing.linear, reduceMotion: ReduceMotion.Never }, (finished) => {
        if (finished) scheduleOnRN(onLanded, uid);
      }),
    );
    // Mount-only: the flight runs once from where the item was tapped.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    slotX.set(withTiming(slotCenter(layout, slot).x, { duration: SLIDE_MS, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.Never }));
  }, [layout, slot, slotX]);

  useEffect(() => {
    if (!clearing) return;
    clear.set(
      withDelay(
        CLEAR_DELAY_MS,
        withTiming(1, { duration: CLEAR_MS, easing: Easing.in(Easing.cubic), reduceMotion: ReduceMotion.Never }),
      ),
    );
  }, [clearing, clear]);

  const startX = from ? from.x + from.width / 2 : 0;
  const startY = from ? from.y + from.height / 2 : 0;
  const startScale = from ? Math.max(from.width, from.height) / size : 1;
  const targetY = slotCenter(layout, 0).y;
  const liftPx = quick ? 0 : LIFT_PX;
  const liftScale = quick ? 0 : LIFT_SCALE;

  const transform = useDerivedValue(() => {
    const t = flight.get();
    const lift = quick ? 0 : liftProgress(t);
    const f = quick ? t : arcProgress(t);
    const e = f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2;
    const tx = slotX.get();
    const x0 = from ? startX : tx;
    const y0 = from ? startY - liftPx * lift : targetY;
    const cx = (x0 + tx) / 2;
    // A control point on the straight line makes the quick flight a straight move.
    const cy = quick ? (y0 + targetY) / 2 : Math.min(y0, targetY) - ARC_PX;
    const x = (1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * cx + e * e * tx;
    const y = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * cy + e * e * targetY;
    const liftedScale = startScale * (1 + liftScale * lift);
    const scale = (liftedScale + (1 - liftedScale) * e) * (1 - clear.get());
    return [{ translateX: x }, { translateY: y }, { scale: Math.max(scale, 0.001) }];
  });

  const shadowOpacity = useDerivedValue(() => {
    const t = flight.get();
    return t >= 1 ? 0 : 1 - arcProgress(t);
  });
  const shadowScale = useDerivedValue(() => [{ scale: 1 + 0.4 * liftProgress(flight.get()) }]);

  return (
    <>
      {/* The quick flight has no lift, so no lift shadow either. */}
      {fromOpaque && !quick ? (
        <Group opacity={shadowOpacity} origin={{ x: fromOpaque.x + fromOpaque.width / 2, y: fromOpaque.y + fromOpaque.height * 0.94 }} transform={shadowScale}>
          <ContactShadow opaque={fromOpaque} />
        </Group>
      ) : null}
      <Group transform={transform}>
        <Image image={image} x={-size / 2} y={-size / 2} width={size} height={size} fit="contain" />
      </Group>
    </>
  );
});
