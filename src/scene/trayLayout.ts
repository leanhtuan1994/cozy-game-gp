import { TRAY_CAPACITY } from "@/engine/puzzle/constants";
import type { Point, Rect } from "@/engine/puzzle/types";

// Screen geometry of the 7-slot tray. Pure TS so the scene and its overlays agree on it.
export interface TrayLayout extends Rect {
  padding: number;
  slotWidth: number;
  // Side of the square each tray sprite is fitted into.
  spriteSize: number;
}

export function makeTrayLayout(x: number, y: number, width: number): TrayLayout {
  // Room for the shelf's ink rim and its bottom lip around the slots.
  const padding = 11;
  const slotWidth = (width - padding * 2) / TRAY_CAPACITY;
  return { x, y, width, height: slotWidth + padding * 2, padding, slotWidth, spriteSize: slotWidth * 0.86 };
}

export function slotCenter(layout: TrayLayout, slot: number): Point {
  "worklet";
  return {
    x: layout.x + layout.padding + layout.slotWidth * (slot + 0.5),
    y: layout.y + layout.height / 2,
  };
}
