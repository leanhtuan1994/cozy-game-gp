import { BOARD_SIZE, type Point, type Rect } from "@/engine/puzzle/types";

// Maps the 1000×1000 board frame onto a screen rectangle (points), centred and uniformly
// scaled to fit. Pure TS so tap handling and tests share one conversion.
export interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function fitBoard(area: Rect): Viewport {
  const scale = Math.min(area.width, area.height) / BOARD_SIZE;
  return {
    scale,
    offsetX: area.x + (area.width - BOARD_SIZE * scale) / 2,
    offsetY: area.y + (area.height - BOARD_SIZE * scale) / 2,
  };
}

export function boardToScreen(viewport: Viewport, point: Point): Point {
  "worklet";
  return { x: viewport.offsetX + point.x * viewport.scale, y: viewport.offsetY + point.y * viewport.scale };
}

export function screenToBoard(viewport: Viewport, point: Point): Point {
  "worklet";
  return { x: (point.x - viewport.offsetX) / viewport.scale, y: (point.y - viewport.offsetY) / viewport.scale };
}

export function boardRectToScreen(viewport: Viewport, rect: Rect): Rect {
  const origin = boardToScreen(viewport, rect);
  return { x: origin.x, y: origin.y, width: rect.width * viewport.scale, height: rect.height * viewport.scale };
}
