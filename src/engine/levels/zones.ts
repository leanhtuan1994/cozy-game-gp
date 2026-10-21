import { z } from "zod";

import type { Point, Rect } from "../puzzle/types";

// Where items may stand on a background: a polygon in board space (1000×1000). Every corner
// of an item's opaque box must fall inside it, so items never hang off the diorama base.
export const PlacementZoneSchema = z.object({
  id: z.string().min(1),
  polygon: z.array(z.object({ x: z.number(), y: z.number() })).min(3),
});
export type PlacementZone = z.infer<typeof PlacementZoneSchema>;

// Even-odd ray casting; points on an edge may land either side.
export function pointInPolygon(point: Point, polygon: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

// The whole rect lies inside the polygon: every corner is inside and no polygon edge crosses a
// rect edge. The second check matters for concave zones, whose notches can cut into a rect
// that has all four corners inside.
export function rectInPolygon(rect: Rect, polygon: readonly Point[]): boolean {
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];
  if (!corners.every((corner) => pointInPolygon(corner, polygon))) return false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    for (let c = 0; c < 4; c += 1) {
      if (segmentsCross(polygon[j]!, polygon[i]!, corners[c]!, corners[(c + 1) % 4]!)) return false;
    }
  }
  return true;
}

// Proper crossing of segments ab and cd (touching at an end point does not count).
function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const cross = (o: Point, p: Point, q: Point) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

export function polygonBounds(polygon: readonly Point[]): Rect {
  const xs = polygon.map((p) => p.x);
  const ys = polygon.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
