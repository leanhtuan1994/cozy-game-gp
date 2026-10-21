import type { ImageSourcePropType } from "react-native";

import type { Booster } from "@/engine/puzzle/types";

// Interface icons drawn in the sprites' style.
export const ICONS = {
  undo: require("../../assets/ui/icons/undo.png"),
  shuffle: require("../../assets/ui/icons/shuffle.png"),
  hint: require("../../assets/ui/icons/hint.png"),
  star: require("../../assets/ui/icons/star.png"),
  chest: require("../../assets/ui/icons/chest.png"),
  gift: require("../../assets/ui/icons/gift.png"),
  flame: require("../../assets/ui/icons/flame.png"),
  lock: require("../../assets/ui/icons/lock.png"),
} satisfies Record<string, ImageSourcePropType>;

export const BOOSTER_ICONS: Record<Booster, ImageSourcePropType> = {
  undo: ICONS.undo,
  shuffle: ICONS.shuffle,
  hint: ICONS.hint,
};

// The on/off switch, drawn in the buttons' style.
// The two tracks share one size, so one fades into the other.
export const SWITCH_ART = {
  trackOff: require("../../assets/ui/switch/track-off.png"),
  trackOn: require("../../assets/ui/switch/track-on.png"),
  knob: require("../../assets/ui/switch/knob.png"),
} satisfies Record<string, ImageSourcePropType>;

export const TILE_BACKGROUND: ImageSourcePropType = require("../../assets/ui/tile-gach-bong.png");
