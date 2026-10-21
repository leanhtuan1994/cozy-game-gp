import { matchFont, type SkFont } from "react-native-skia";

export const COLORS = {
  paper: "#FFF4E0",
  ink: "#2B2A33",
  plasticRed: "#D9412B",
  lantern: "#F5B841",
  moss: "#3F7D5C",
  night: "#2E2A4F",
  bamboo: "#C99A62",
  // On paper: 7.0:1. For secondary text.
  inkSoft: "#55535F",
  // Tray slots on the paper background.
  traySlot: "rgba(201, 154, 98, 0.22)",
  trayFrame: "rgba(201, 154, 98, 0.55)",
  // Darkens covered items while keeping their shape readable.
  coveredTint: "rgba(38, 30, 52, 0.42)",
  shadow: "rgba(43, 42, 51, 0.34)",
  // Dims the game behind sheets.
  scrim: "rgba(20, 18, 34, 0.55)",
  shadowClear: "rgba(43, 42, 51, 0)",
} as const;

// RN <Text> uses the PostScript names with no fontWeight: CoreText then loads exactly that face.
export const FONT = {
  regular: "BeVietnamPro-Regular",
  semibold: "BeVietnamPro-SemiBold",
  bold: "BeVietnamPro-Bold",
  // Baloo 2: titles, buttons and numbers. Every use takes its size from displayType().
  display: "Baloo2-ExtraBold",
  displayBold: "Baloo2-Bold",
} as const;

// Baloo 2's own line box is 1.6 em, with the letters sitting high in it. A tighter lineHeight makes
// iOS clip the stacked Vietnamese marks (ẫ, ặ, ỗ), so the text keeps a 1.5 em box and negative
// margins take the empty space back, more below the letters than above.
// Large system text grows display text only this far: buttons, badges and headers have fixed sizes.
export const DISPLAY_FONT_SCALE = 1.2;

export function displayType(size: number) {
  return {
    fontSize: size,
    lineHeight: Math.round(size * 1.5),
    marginTop: -Math.round(size * 0.12),
    marginBottom: -Math.round(size * 0.22),
  };
}

// The chunky surfaces: every button, card and panel has an ink outline, a face and a darker lip
// along its bottom edge. Roles: go = carry on, gold = take a reward, red = attention,
// paper = secondary, night = counters and bars, off = unavailable.
export type Face = "go" | "gold" | "red" | "paper" | "night" | "off";

export const FACE: Record<Face, { face: string; lip: string; text: string }> = {
  go: { face: "#4E9A6F", lip: "#2F6B4B", text: "#FFFFFF" },
  gold: { face: "#F5B841", lip: "#C98A1C", text: "#2B2A33" },
  red: { face: "#E0533B", lip: "#A8301F", text: "#FFFFFF" },
  paper: { face: "#FFF4E0", lip: "#D9BC8E", text: "#2B2A33" },
  night: { face: "#2E2A4F", lip: "#1E1B36", text: "#FFF4E0" },
  off: { face: "#D8CFBF", lip: "#B3A894", text: "#7A7266" },
};

export const INK_BORDER = 3;

export const UI = {
  // Warm grey for secondary text on cream cards: 5.3:1.
  muted: "#6B6458",
  label: "#7A6A52",
  panelInset: "#F3DFBC",
  bamboo: "#C99A62",
  bambooLip: "#9A7240",
  slot: "#9C7444",
  doneCard: "#DCEBDF",
  doneLip: "#A9CDB4",
  nightSoft: "#CFC8F0",
  ribbonText: "#FFE7B8",
} as const;

const cache = new Map<string, SkFont>();

// Skia fonts for the few labels Skia draws. The fonts are embedded at build time (app.config.js),
// so Skia's CoreText manager can match them by family and weight.
export function hudFont(size: number, weight: "400" | "600" | "700"): SkFont {
  const key = `${size}:${weight}`;
  let font = cache.get(key);
  if (!font) {
    font = matchFont({ fontFamily: "Be Vietnam Pro", fontWeight: weight, fontSize: size });
    cache.set(key, font);
  }
  return font;
}
