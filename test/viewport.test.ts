import { describe, expect, it } from "vitest";

import { boardRectToScreen, boardToScreen, fitBoard, screenToBoard } from "@/scene/viewport";

describe("viewport", () => {
  it("fits the board to the short side and centres it", () => {
    const viewport = fitBoard({ x: 0, y: 100, width: 400, height: 600 });
    expect(viewport.scale).toBeCloseTo(0.4);
    expect(viewport.offsetX).toBeCloseTo(0);
    expect(viewport.offsetY).toBeCloseTo(200);
  });

  it("round-trips points between board and screen space", () => {
    const viewport = fitBoard({ x: 12, y: 40, width: 390, height: 500 });
    for (const point of [{ x: 0, y: 0 }, { x: 1000, y: 1000 }, { x: 333, y: 777 }]) {
      const back = screenToBoard(viewport, boardToScreen(viewport, point));
      expect(back.x).toBeCloseTo(point.x);
      expect(back.y).toBeCloseTo(point.y);
    }
  });

  it("maps board corners to the fitted square", () => {
    const viewport = fitBoard({ x: 0, y: 0, width: 390, height: 390 });
    expect(boardToScreen(viewport, { x: 1000, y: 1000 })).toEqual({ x: 390, y: 390 });
    expect(boardRectToScreen(viewport, { x: 500, y: 0, width: 100, height: 200 })).toEqual({ x: 195, y: 0, width: 39, height: 78 });
  });
});
