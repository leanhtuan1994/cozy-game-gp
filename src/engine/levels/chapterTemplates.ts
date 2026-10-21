import type { PlacementZone } from "./zones";

// One district: its item kinds (sprite ids under assets/items/<id>/) and where items may stand
// on its background (assets/backgrounds/<id>.png), in board space; test/art-catalog.test.ts keeps
// the sprites, masks and background in step with it.
export interface ChapterTemplate {
  id: string;
  name: string;
  kinds: readonly string[];
  zone: PlacementZone;
}

export const CHAPTERS: readonly ChapterTemplate[] = [
  {
    id: "xe-banh-mi",
    name: "Xe bánh mì",
    kinds: ["banh-mi", "tuong-ot", "cha-lua", "do-chua", "trung-op-la", "ghe-nhua"],
    zone: {
      id: "xe-banh-mi",
      polygon: [
        { x: 45, y: 550 },
        { x: 240, y: 445 },
        { x: 500, y: 435 },
        { x: 745, y: 445 },
        { x: 960, y: 510 },
        { x: 500, y: 835 },
      ],
    },
  },
  {
    id: "cho-hoa-tet",
    name: "Chợ hoa Tết",
    kinds: ["mai-vang", "chau-quat", "li-xi", "banh-chung", "hop-mut", "hu-cu-kieu"],
    zone: {
      id: "cho-hoa-tet",
      polygon: [
        { x: 62, y: 500 },
        { x: 268, y: 438 },
        { x: 536, y: 414 },
        { x: 714, y: 438 },
        { x: 750, y: 509 },
        { x: 946, y: 536 },
        { x: 482, y: 830 },
      ],
    },
  },
  {
    id: "pho-long-den",
    name: "Phố lồng đèn",
    kinds: ["long-den-tron", "den-ong-sao", "den-ca-chep", "den-keo-quan", "mat-na", "trong-lac"],
    zone: {
      id: "pho-long-den",
      polygon: [
        { x: 54, y: 554 },
        { x: 250, y: 509 },
        { x: 536, y: 491 },
        { x: 696, y: 536 },
        { x: 946, y: 571 },
        { x: 482, y: 839 },
      ],
    },
  },
  {
    id: "ca-phe-via-he",
    name: "Cà phê vỉa hè",
    kinds: ["phin", "ca-phe-sua", "am-tra", "to-bao", "long-chim", "dia-hat-dua"],
    zone: {
      id: "ca-phe-via-he",
      polygon: [
        { x: 71, y: 598 },
        { x: 286, y: 479 },
        { x: 589, y: 468 },
        { x: 839, y: 527 },
        { x: 946, y: 545 },
        { x: 491, y: 830 },
      ],
    },
  },
  {
    id: "hem-che",
    name: "Hẻm chè",
    kinds: ["che-ba-mau", "banh-flan", "dua-xiem", "banh-da-lon", "che-troi-nuoc", "da-bao"],
    zone: {
      id: "hem-che",
      polygon: [
        { x: 63, y: 536 },
        { x: 232, y: 438 },
        { x: 464, y: 384 },
        { x: 750, y: 464 },
        { x: 929, y: 509 },
        { x: 571, y: 813 },
      ],
    },
  },
  {
    id: "cho-dem",
    name: "Chợ đêm",
    kinds: ["xien-nuong", "bap-nuong", "muc-kho", "banh-trang-nuong", "nuoc-mia", "bong-bay"],
    zone: {
      id: "cho-dem",
      polygon: [
        { x: 63, y: 554 },
        { x: 196, y: 446 },
        { x: 429, y: 429 },
        { x: 768, y: 429 },
        { x: 929, y: 571 },
        { x: 482, y: 875 },
      ],
    },
  },
];
