<p align="center">
  <img src="docs/media/hero.png" alt="Ghép Phố: game ghép ba trên sa bàn 2.5D một góc phố Sài Gòn" width="100%">
</p>

<p align="center">
  <b>Game giải đố ghép ba nhẹ nhàng trên sa bàn 2.5D một góc phố Sài Gòn.</b><br>
  Màn dọc, chơi một tay, không cần mạng. Làm bằng React Native, Expo, Skia, Reanimated và Rive.
</p>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="docs/architecture.md">Kiến trúc (EN)</a> ·
  <a href="docs/game-design.md">Luật chơi</a>
</p>

<p align="center">
  <img alt="Expo SDK 57" src="https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white">
  <img alt="React Native 0.86" src="https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react&logoColor=black">
  <img alt="TypeScript 6" src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white">
  <img alt="Skia 3" src="https://img.shields.io/badge/Skia-3.4-F5B841">
  <img alt="Rive" src="https://img.shields.io/badge/Rive-0.5-1D1D1D">
  <img alt="Giấy phép: MIT (mã nguồn)" src="https://img.shields.io/badge/code-MIT-3F7D5C">
</p>

## Cách chơi

<p align="center">
  <img src="docs/media/gifs/play-level.gif" alt="Chạm món trên sa bàn, món bay vào giỏ và bộ ba được xoá" width="300">
  &nbsp;&nbsp;
  <img src="docs/media/gifs/win.gif" alt="Bảng thắng: ba ngôi sao bật lên, confetti rơi" width="300">
</p>

- Chạm vào một món **không bị món nào che**. Món nhấc lên, bay vào **giỏ 7 ô** và xếp cạnh món cùng loại.
- Đủ ba món giống nhau liền nhau thì bộ ba được xoá. Dọn sạch sa bàn là thắng.
- Giỏ đầy 7 ô mà không xoá được bộ nào là thua. **Hoàn tác**, **Xáo** và **Gợi ý** giúp con qua màn, đổi lại bớt một sao.

## Ảnh chụp

<table>
  <tr>
    <td align="center"><img src="docs/media/screens/03-map-xe-banh-mi.jpg" alt="Bản đồ khu Xe bánh mì" width="240"><br><sub>Bản đồ khu phố</sub></td>
    <td align="center"><img src="docs/media/screens/05-play-xe-banh-mi.jpg" alt="Đang chơi một màn ở khu Xe bánh mì" width="240"><br><sub>Đang chơi</sub></td>
    <td align="center"><img src="docs/media/screens/11-booster-hint.jpg" alt="Gợi ý làm sáng một món an toàn" width="240"><br><sub>Gợi ý chỉ món nên chạm</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/media/screens/12-win.jpg" alt="Bảng thắng ba sao" width="240"><br><sub>Dọn xong màn</sub></td>
    <td align="center"><img src="docs/media/screens/13-lose.jpg" alt="Bảng thua với giỏ đầy" width="240"><br><sub>Giỏ đầy: hoàn tác, chơi lại hay về bản đồ</sub></td>
    <td align="center"><img src="docs/media/screens/02-tutorial.jpg" alt="Bài dạy ở màn 1" width="240"><br><sub>Hướng dẫn ở mấy màn đầu</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/media/screens/14-rewards.jpg" alt="Quà 7 ngày" width="240"><br><sub>Quà 7 ngày và chuỗi ngày</sub></td>
    <td align="center"><img src="docs/media/screens/15-quests.jpg" alt="Nhiệm vụ hôm nay" width="240"><br><sub>Nhiệm vụ mỗi ngày</sub></td>
    <td align="center"><img src="docs/media/screens/16-achievements.jpg" alt="Thành tích" width="240"><br><sub>Thành tích</sub></td>
  </tr>
</table>

<details>
<summary><b>Sáu khu phố</b></summary>
<br>
<table>
  <tr>
    <td align="center"><img src="docs/media/screens/05-play-xe-banh-mi.jpg" alt="Khu Xe bánh mì" width="240"><br><sub>Xe bánh mì</sub></td>
    <td align="center"><img src="docs/media/screens/06-play-cho-hoa-tet.jpg" alt="Khu Chợ hoa Tết" width="240"><br><sub>Chợ hoa Tết</sub></td>
    <td align="center"><img src="docs/media/screens/07-play-pho-long-den.jpg" alt="Khu Phố lồng đèn" width="240"><br><sub>Phố lồng đèn</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/media/screens/08-play-ca-phe-via-he.jpg" alt="Khu Cà phê vỉa hè" width="240"><br><sub>Cà phê vỉa hè</sub></td>
    <td align="center"><img src="docs/media/screens/09-play-hem-che.jpg" alt="Khu Hẻm chè" width="240"><br><sub>Hẻm chè</sub></td>
    <td align="center"><img src="docs/media/screens/10-play-cho-dem.jpg" alt="Khu Chợ đêm" width="240"><br><sub>Chợ đêm</sub></td>
  </tr>
</table>
</details>

<details>
<summary><b>Thêm màn hình và khoảnh khắc</b></summary>
<br>
<table>
  <tr>
    <td align="center"><img src="docs/media/screens/01-onboarding.jpg" alt="Cô Tư chào người chơi" width="240"><br><sub>Cô Tư chào</sub></td>
    <td align="center"><img src="docs/media/screens/04-map-cho-dem.jpg" alt="Bản đồ khu Chợ đêm" width="240"><br><sub>Mỗi khu một bản đồ riêng</sub></td>
    <td align="center"><img src="docs/media/screens/17-settings.jpg" alt="Cài đặt" width="240"><br><sub>Cài đặt</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/media/gifs/lose.gif" alt="Món thứ bảy làm đầy giỏ và bảng thua hiện ra" width="240"><br><sub>Giỏ đầy</sub></td>
    <td align="center"><img src="docs/media/gifs/daily-reward.gif" alt="Nhận quà ngày đầu tiên" width="240"><br><sub>Nhận quà mỗi ngày</sub></td>
    <td align="center"><img src="design/motion/preview/chest.webp" alt="Hoạt ảnh rương bằng Rive" width="200"><br><sub>Rive: rương nhiệm vụ</sub></td>
  </tr>
</table>
</details>

## Tính năng

- **60 màn trong 6 khu phố** Sài Gòn, mỗi khu có sa bàn, món, bản đồ và giờ trong ngày riêng.
- **Ba trợ giúp**: Hoàn tác (cứu được cả màn đã thua), Xáo và Gợi ý. Chỉ nhận qua chơi, không mua: không xu, không cửa hàng, không quảng cáo.
- **Sao** thưởng cho lối chơi gọn: ba sao khi không dùng trợ giúp, hai sao khi dùng một lần, một sao khi dùng nhiều hơn.
- **Vòng lặp mỗi ngày**: quà 7 ngày kèm chuỗi ngày, ba nhiệm vụ mỗi ngày có rương, và thành tích.
- **Bắt đầu có người dẫn**: lời chào ngắn, rồi bài dạy ở màn 1 đến 3, chỉ nhận đúng lần chạm đang dạy.
- **Cảm giác**: rung soạn tay, hiệu ứng âm thanh, nhạc nền, và chế độ giảm chuyển động theo máy hoặc theo cài đặt trong game.
- **Offline và riêng tư**: tiến trình lưu trên máy; hai lời nhắc cục bộ, tắt được.
- **Giao diện tiếng Việt**, font chọn để dấu chồng (ẫ, ặ, ỗ) không bị cắt.

## Bên trong

```mermaid
flowchart LR
  View["Hiển thị<br/>sa bàn Skia · HUD RN · Rive"] -- lệnh --> Session["GameSession"]
  Session --> Engine["Engine TS thuần<br/>luật · solver · sinh màn · meta"]
  Engine -- trạng thái + sự kiện --> View
  Engine <--> Save[("MMKV + Zod<br/>save có version")]
```

- **Engine thuần và tất định.** Mọi thứ trong `src/engine/` là TypeScript thuần, không import React, Expo, Skia hay Rive, lint chặn việc này. Ngẫu nhiên đi qua RNG có seed, thời gian truyền từ ngoài vào, nên cùng màn và cùng các lần chạm luôn ra cùng kết quả. Bộ test Vitest (hơn 160 test) chạy trên Node, không cần thiết bị.
- **Màn chơi sinh tự động, solver kiểm từng màn.** Bộ sinh đặt món trong vùng của mỗi khu theo đường cong độ khó, và solver chứng minh mỗi màn thắng được trước khi ghi ra. `bun run level-report` giải lại và in bảng độ khó.
- **Chạm đúng từng điểm ảnh mà không đọc điểm ảnh.** Độ trong suốt của sprite được nướng thành mặt nạ lúc build (`scripts/make-hit-masks.ts`); chạm chọn và quan hệ "món nào đè món nào" đều tính trên mặt nạ đó.
- **Một canvas Skia, không re-render React mỗi frame.** Sa bàn, sprite và bóng vẽ trong một canvas; món bay vào giỏ chạy bằng shared value của Reanimated trên UI thread. React chỉ re-render khi có sự kiện (chạm, món đáp xuống, bộ ba được xoá). Mục tiêu là mọi khung dưới 16,7 ms, kiểm trên bản Release chạy trong simulator iOS.
- **Rive cho những khoảnh khắc lớn.** Sao, confetti, giỏ đầy, rương và huy hiệu nằm trong một file `.riv` sinh bằng script (`design/motion/rive/generate-scene.py`), nên chuyển động được review như code.
- **Save có version.** Lưu bằng MMKV, kiểm bằng Zod, có migration giữa các phiên bản save.

<p align="center">
  <img src="design/motion/preview/stars.webp" alt="Hoạt ảnh sao bằng Rive" width="180">
  <img src="design/motion/preview/basketfull.webp" alt="Hoạt ảnh giỏ đầy bằng Rive" width="140">
  <img src="design/motion/preview/boostergain.webp" alt="Hoạt ảnh nhận trợ giúp bằng Rive" width="140">
  <img src="design/motion/preview/streakflame.webp" alt="Hoạt ảnh lửa chuỗi ngày bằng Rive" width="100">
</p>

Đọc [docs/architecture.md](docs/architecture.md) (tiếng Anh) để biết các lớp, quy tắc và chi tiết stack.

## Chạy thử

Cần macOS có Xcode và simulator iOS, cùng [Bun](https://bun.sh). App dùng module native (Skia, Rive, MMKV) nên chạy bằng development build của Expo, không chạy trong Expo Go.

```bash
bun install
bunx expo prebuild --platform ios
bunx expo run:ios
```

Kiểm tra:

```bash
bun run lint && bunx tsc --noEmit && bun run test
```

Công cụ cho màn chơi và asset:

```bash
bun run levels --all                        # sinh lại 60 màn
bun run level-report src/engine/levels/data # bảng độ khó, giải lại từng màn
bun run masks assets/items/<khu>            # sinh lại mặt nạ chạm sau khi đổi sprite
```

## Cấu trúc thư mục

```
src/
  engine/         logic game TS thuần: luật, solver, sinh màn, màn chơi, meta, bài dạy
  store/          GameSession (cửa duy nhất xuống engine), React context, save có version
  scene/          màn chơi: sa bàn Skia, giỏ, món bay, khoét lỗ hướng dẫn
  hud/            bản đồ, các bảng, màn meta, cài đặt và bộ UI
  motion/         artboard Rive
  feedback/       âm thanh và rung
  notifications/  nhắc nhở cục bộ
  app/            route của expo-router
scripts/          sinh màn, báo cáo màn, mặt nạ chạm
assets/           nền, sprite, bản đồ, ảnh UI, âm thanh, font
design/motion/    file Rive, script sinh ra nó, ảnh xem trước
test/             Vitest
docs/             kiến trúc, luật chơi, hợp đồng hoạt ảnh, ảnh demo
```

## Ghi công

- Font: [Be Vietnam Pro](https://github.com/bettergui/BeVietnamPro) và [Baloo 2](https://github.com/EkType/Baloo2), giấy phép SIL Open Font License.
- Hiệu ứng âm thanh: [Kenney](https://kenney.nl) (CC0). Nhạc: "Slow Stride" của isaiah658 trên [OpenGameArt](https://opengameart.org/content/slow-stride) (CC0). Xem [assets/audio/CREDITS.txt](assets/audio/CREDITS.txt).
- Hình ảnh và hoạt ảnh: hình gốc làm riêng cho dự án này.

## Giấy phép

Mã nguồn phát hành theo [giấy phép MIT](LICENSE). Hình ảnh, hoạt ảnh và ảnh chụp gốc của game **không** thuộc giấy phép này: tác giả giữ toàn quyền, xem [ASSETS-LICENSE.md](ASSETS-LICENSE.md). Font và âm thanh giữ giấy phép riêng của chúng.
