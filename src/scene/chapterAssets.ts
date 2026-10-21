import type { MaskSet } from "@/engine/puzzle/types";

import masks0 from "../../assets/items/xe-banh-mi/masks.json";
import masks1 from "../../assets/items/cho-hoa-tet/masks.json";
import masks2 from "../../assets/items/pho-long-den/masks.json";
import masks3 from "../../assets/items/ca-phe-via-he/masks.json";
import masks4 from "../../assets/items/hem-che/masks.json";
import masks5 from "../../assets/items/cho-dem/masks.json";

// Bundled art per district (static requires, as Metro needs). A play screen loads one district's
// images at a time. Names are the Vietnamese item names shown in labels.
export interface ChapterAssets {
  images: Readonly<Record<string, number>>;
  // The district's map background (not a Skia image: the map draws it with RN Image).
  map: number;
  masks: MaskSet;
  names: Readonly<Record<string, string>>;
}

export const CHAPTER_ASSETS: Readonly<Record<string, ChapterAssets>> = {
  "xe-banh-mi": {
    map: require("../../assets/map/xe-banh-mi.jpg"),
    images: {
      background: require("../../assets/backgrounds/xe-banh-mi.png"),
      "banh-mi": require("../../assets/items/xe-banh-mi/banh-mi.png"),
      "tuong-ot": require("../../assets/items/xe-banh-mi/tuong-ot.png"),
      "cha-lua": require("../../assets/items/xe-banh-mi/cha-lua.png"),
      "do-chua": require("../../assets/items/xe-banh-mi/do-chua.png"),
      "trung-op-la": require("../../assets/items/xe-banh-mi/trung-op-la.png"),
      "ghe-nhua": require("../../assets/items/xe-banh-mi/ghe-nhua.png"),
    },
    masks: masks0,
    names: {
      "banh-mi": "Ổ bánh mì",
      "tuong-ot": "Chai tương ớt",
      "cha-lua": "Đòn chả lụa",
      "do-chua": "Hũ đồ chua",
      "trung-op-la": "Đĩa trứng ốp la",
      "ghe-nhua": "Ghế nhựa xanh",
    },
  },
  "cho-hoa-tet": {
    map: require("../../assets/map/cho-hoa-tet.jpg"),
    images: {
      background: require("../../assets/backgrounds/cho-hoa-tet.png"),
      "mai-vang": require("../../assets/items/cho-hoa-tet/mai-vang.png"),
      "chau-quat": require("../../assets/items/cho-hoa-tet/chau-quat.png"),
      "li-xi": require("../../assets/items/cho-hoa-tet/li-xi.png"),
      "banh-chung": require("../../assets/items/cho-hoa-tet/banh-chung.png"),
      "hop-mut": require("../../assets/items/cho-hoa-tet/hop-mut.png"),
      "hu-cu-kieu": require("../../assets/items/cho-hoa-tet/hu-cu-kieu.png"),
    },
    masks: masks1,
    names: {
      "mai-vang": "Cành mai vàng",
      "chau-quat": "Chậu quất",
      "li-xi": "Bao lì xì",
      "banh-chung": "Bánh chưng",
      "hop-mut": "Hộp mứt Tết",
      "hu-cu-kieu": "Hũ củ kiệu",
    },
  },
  "pho-long-den": {
    map: require("../../assets/map/pho-long-den.jpg"),
    images: {
      background: require("../../assets/backgrounds/pho-long-den.png"),
      "long-den-tron": require("../../assets/items/pho-long-den/long-den-tron.png"),
      "den-ong-sao": require("../../assets/items/pho-long-den/den-ong-sao.png"),
      "den-ca-chep": require("../../assets/items/pho-long-den/den-ca-chep.png"),
      "den-keo-quan": require("../../assets/items/pho-long-den/den-keo-quan.png"),
      "mat-na": require("../../assets/items/pho-long-den/mat-na.png"),
      "trong-lac": require("../../assets/items/pho-long-den/trong-lac.png"),
    },
    masks: masks2,
    names: {
      "long-den-tron": "Lồng đèn tròn",
      "den-ong-sao": "Đèn ông sao",
      "den-ca-chep": "Đèn cá chép",
      "den-keo-quan": "Đèn kéo quân",
      "mat-na": "Mặt nạ ông địa",
      "trong-lac": "Trống lắc",
    },
  },
  "ca-phe-via-he": {
    map: require("../../assets/map/ca-phe-via-he.jpg"),
    images: {
      background: require("../../assets/backgrounds/ca-phe-via-he.png"),
      "phin": require("../../assets/items/ca-phe-via-he/phin.png"),
      "ca-phe-sua": require("../../assets/items/ca-phe-via-he/ca-phe-sua.png"),
      "am-tra": require("../../assets/items/ca-phe-via-he/am-tra.png"),
      "to-bao": require("../../assets/items/ca-phe-via-he/to-bao.png"),
      "long-chim": require("../../assets/items/ca-phe-via-he/long-chim.png"),
      "dia-hat-dua": require("../../assets/items/ca-phe-via-he/dia-hat-dua.png"),
    },
    masks: masks3,
    names: {
      "phin": "Phin cà phê",
      "ca-phe-sua": "Ly cà phê sữa đá",
      "am-tra": "Ấm trà",
      "to-bao": "Tờ báo",
      "long-chim": "Lồng chim",
      "dia-hat-dua": "Dĩa hạt dưa",
    },
  },
  "hem-che": {
    map: require("../../assets/map/hem-che.jpg"),
    images: {
      background: require("../../assets/backgrounds/hem-che.png"),
      "che-ba-mau": require("../../assets/items/hem-che/che-ba-mau.png"),
      "banh-flan": require("../../assets/items/hem-che/banh-flan.png"),
      "dua-xiem": require("../../assets/items/hem-che/dua-xiem.png"),
      "banh-da-lon": require("../../assets/items/hem-che/banh-da-lon.png"),
      "che-troi-nuoc": require("../../assets/items/hem-che/che-troi-nuoc.png"),
      "da-bao": require("../../assets/items/hem-che/da-bao.png"),
    },
    masks: masks4,
    names: {
      "che-ba-mau": "Ly chè ba màu",
      "banh-flan": "Bánh flan",
      "dua-xiem": "Trái dừa xiêm",
      "banh-da-lon": "Bánh da lợn",
      "che-troi-nuoc": "Chén chè trôi nước",
      "da-bao": "Ly đá bào",
    },
  },
  "cho-dem": {
    map: require("../../assets/map/cho-dem.jpg"),
    images: {
      background: require("../../assets/backgrounds/cho-dem.png"),
      "xien-nuong": require("../../assets/items/cho-dem/xien-nuong.png"),
      "bap-nuong": require("../../assets/items/cho-dem/bap-nuong.png"),
      "muc-kho": require("../../assets/items/cho-dem/muc-kho.png"),
      "banh-trang-nuong": require("../../assets/items/cho-dem/banh-trang-nuong.png"),
      "nuoc-mia": require("../../assets/items/cho-dem/nuoc-mia.png"),
      "bong-bay": require("../../assets/items/cho-dem/bong-bay.png"),
    },
    masks: masks5,
    names: {
      "xien-nuong": "Xiên thịt nướng",
      "bap-nuong": "Bắp nướng",
      "muc-kho": "Mực khô",
      "banh-trang-nuong": "Bánh tráng nướng",
      "nuoc-mia": "Ly nước mía",
      "bong-bay": "Bóng bay",
    },
  },
};
