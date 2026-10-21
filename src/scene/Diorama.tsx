import { memo, useMemo, type ReactNode } from "react";
import { StyleSheet } from "react-native";
import { useDerivedValue, type SharedValue } from "react-native-reanimated";
import { BlendColor, Canvas, Circle, Group, Image, RadialGradient, vec, type SkImage } from "react-native-skia";

import { opaqueRect } from "@/engine/puzzle/mask";
import { BOARD_SIZE, type MaskSet, type PlacedItem, type Point, type Rect, type SpriteMask } from "@/engine/puzzle/types";
import { COLORS } from "@/hud/theme";

import { boardRectToScreen, type Viewport } from "./viewport";

export interface Shake {
  id: string;
  progress: SharedValue<number>;
}

interface DioramaProps {
  viewport: Viewport;
  background: SkImage;
  // Back to front.
  items: readonly PlacedItem[];
  covered: ReadonlySet<string>;
  images: Readonly<Record<string, SkImage>>;
  masks: MaskSet;
  itemOffset: SharedValue<Point>;
  backgroundOffset: SharedValue<Point>;
  shake: Shake | null;
  // Screen-space layers drawn above the board (tray, flying items).
  children?: ReactNode;
}

// One Skia canvas for the whole play area: the diorama background, the item sprites in draw
// order with contact shadows, then the overlay children. Covered items are tinted dark.
export const Diorama = memo(function Diorama({ viewport, background, items, covered, images, masks, itemOffset, backgroundOffset, shake, children }: DioramaProps) {
  const backgroundTransform = useOffsetTransform(backgroundOffset);
  const itemTransform = useOffsetTransform(itemOffset);
  const board = boardRectToScreen(viewport, { x: 0, y: 0, width: BOARD_SIZE, height: BOARD_SIZE });

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Group transform={backgroundTransform}>
        <Image image={background} x={board.x} y={board.y} width={board.width} height={board.height} fit="fill" />
      </Group>
      <Group transform={itemTransform}>
        {items.map((item) => {
          const image = images[item.kind];
          const mask = masks[item.kind];
          if (!image || !mask) return null;
          return (
            <BoardSprite
              key={item.id}
              item={item}
              mask={mask}
              viewport={viewport}
              image={image}
              covered={covered.has(item.id)}
              shake={shake?.id === item.id ? shake.progress : undefined}
            />
          );
        })}
      </Group>
      {children}
    </Canvas>
  );
});

// A Skia transform that follows a shared screen offset on the UI thread.
function useOffsetTransform(offset: SharedValue<Point>) {
  return useDerivedValue(() => [{ translateX: offset.get().x }, { translateY: offset.get().y }]);
}

interface BoardSpriteProps {
  item: PlacedItem;
  mask: SpriteMask;
  viewport: Viewport;
  image: SkImage;
  covered: boolean;
  shake?: SharedValue<number>;
}

// Items are immutable and keep their identity across taps, so the memo skips the React render
// of every sprite except those whose covered state or shake changed. Skia still re-walks the
// whole canvas tree on each commit, so commits themselves should stay rare.
const BoardSprite = memo(function BoardSprite({ item, mask, viewport, image, covered, shake }: BoardSpriteProps) {
  const { rect, opaque } = useMemo(
    () => ({ rect: boardRectToScreen(viewport, item.rect), opaque: boardRectToScreen(viewport, opaqueRect(mask, item.rect)) }),
    [item, mask, viewport],
  );
  const sprite = (
    <>
      <ContactShadow opaque={opaque} />
      <Image image={image} x={rect.x} y={rect.y} width={rect.width} height={rect.height} fit="fill">
        {covered ? <BlendColor color={COLORS.coveredTint} mode="srcATop" /> : null}
      </Image>
    </>
  );
  return shake ? <ShakeGroup progress={shake}>{sprite}</ShakeGroup> : sprite;
});

// A soft oval under the sprite's opaque footprint.
export function ContactShadow({ opaque }: { opaque: Rect }) {
  const radius = opaque.width * 0.42;
  return (
    <Group transform={[{ translateX: opaque.x + opaque.width / 2 }, { translateY: opaque.y + opaque.height * 0.94 }, { scaleY: 0.28 }]}>
      <Circle cx={0} cy={0} r={radius}>
        <RadialGradient c={vec(0, 0)} r={radius} colors={[COLORS.shadow, COLORS.shadowClear]} />
      </Circle>
    </Group>
  );
}

// A short decaying side-to-side wobble for a tap on a covered item.
function ShakeGroup({ progress, children }: { progress: SharedValue<number>; children: ReactNode }) {
  const transform = useDerivedValue(() => {
    const p = progress.get();
    return [{ translateX: Math.sin(p * Math.PI * 6) * (1 - p) * 5 }];
  });
  return <Group transform={transform}>{children}</Group>;
}
