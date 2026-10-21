import type { Point } from "@/engine/puzzle/types";

// Ten level spots along the S-shaped path of the district map backgrounds, as fractions of the
// 1024×1536 image, first level at the top. Measured on district 1; all six backgrounds were drawn from
// that one, and the spots sit on the path in each (checked by eye).
export const MAP_SPOTS: readonly Point[] = [
  { x: 0.524, y: 0.266 },
  { x: 0.502, y: 0.336 },
  { x: 0.421, y: 0.386 },
  { x: 0.435, y: 0.456 },
  { x: 0.515, y: 0.507 },
  { x: 0.613, y: 0.543 },
  { x: 0.602, y: 0.608 },
  { x: 0.571, y: 0.679 },
  { x: 0.578, y: 0.751 },
  { x: 0.528, y: 0.818 },
];

const IMAGE_ASPECT = 1024 / 1536;
// Levels sit left or right of the path by this share of the screen width.
const STAGGER = 0.11;
const EDGE = 12;
// A district is one screen tall, but never shorter than this, so ten levels fit on small phones.
const MIN_SECTION = 860;

export function sectionHeight(windowHeight: number): number {
  return Math.max(windowHeight, MIN_SECTION);
}

// Centres of the level buttons in a district section `width` × `height` whose background is drawn
// with resizeMode "cover": the image is scaled to fill and its overflow cropped equally on both
// sides, so the spots move with the crop. Each level steps to whichever side of the path is farther
// from the level before it, and every button stays whole on screen, `EDGE` from the sides.
export function nodePositions(width: number, height: number, radius: number): Point[] {
  const imageHeight = Math.max(height, width / IMAGE_ASPECT);
  const imageWidth = imageHeight * IMAGE_ASPECT;
  const left = (width - imageWidth) / 2;
  const top = (height - imageHeight) / 2;
  const clamp = (x: number) => Math.min(width - radius - EDGE, Math.max(radius + EDGE, x));
  const nodes: Point[] = [];
  for (const spot of MAP_SPOTS) {
    const x = left + spot.x * imageWidth;
    const y = top + spot.y * imageHeight;
    const sides = [clamp(x - STAGGER * width), clamp(x + STAGGER * width)];
    const previous = nodes[nodes.length - 1];
    const pick = previous ? (Math.hypot(sides[0]! - previous.x, y - previous.y) >= Math.hypot(sides[1]! - previous.x, y - previous.y) ? sides[0]! : sides[1]!) : sides[0]!;
    nodes.push({ x: pick, y });
  }
  return nodes;
}
