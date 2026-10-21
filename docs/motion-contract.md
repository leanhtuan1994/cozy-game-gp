# Hoạt ảnh Rive: hợp đồng giữa file `.riv` và game

File: `design/motion/ghep-pho-motion.riv`, gồm 12 artboard. Mỗi artboard có một state machine mặc định tên `Motion` và tự chạy khi được nạp.

Nguồn: `design/motion/rive/generate-scene.py` sinh ra `scene.rml`, rồi Rive CLI build thành file `.riv`. Không sửa `scene.rml` bằng tay; sửa script rồi build lại (xem cuối trang).

Runtime trong app: `@rive-app/react-native`, cần thêm `react-native-nitro-modules` và dev build (không chạy trên Expo Go). Hoạt ảnh không có script Luau, nên bản build cục bộ chưa ký vẫn chạy được trên runtime.

## Danh sách artboard

| Artboard | Kích thước | Cách chạy | Dữ liệu (view model) | Dùng ở |
| --- | --- | --- | --- | --- |
| `Lanterns` | 390×110 | Lặp | — | Onboarding, Thắng màn |
| `TapHint` | 120×120 | Lặp | — | Nút màn hiện tại trên bản đồ, chỗ cần chạm trong tutorial |
| `TriplePop` | 245×110 | Lặp | — | Chỉ dùng cho canvas thiết kế. Trong game dùng `ClearBurst` cộng hoạt ảnh sprite bằng Reanimated |
| `ClearBurst` | 160×110 | Chạy một lần khi gắn vào | — | Phủ lên 3 ô vừa xoá trong giỏ; gỡ ra sau khoảng 0,7 giây |
| `Stars` | 280×120 | Theo dữ liệu | `WinStars.stars`: số 0–3 | Thắng màn. Sao ảnh lần lượt bật lên kèm tia lấp lánh tới đủ số sao, rồi thở và lấp lánh lặp lại; giảm số thì sao ẩn lại. Sao thứ i bắt đầu ở khung 14·i và đáp sau 30 khung, lịch rung sao trong `src/feedback/plan.ts` dựa vào nhịp này |
| `Chest` | 120×110 | Theo dữ liệu | `Chest.opened`: true/false | Quà ngày 7, rương nhiệm vụ. `false` thì rương lắc và toả sáng; `true` thì nắp bật mở và ánh sáng loé lên rồi giữ nguyên |
| `BoosterGain` | 120×110 | Theo dữ liệu | `BoosterGain.kind`: 0 Hoàn tác, 1 Xáo, 2 Gợi ý | Khi nhận trợ giúp. Icon nảy lên rồi bay đi; lặp lại chừng nào `kind` còn giữ giá trị, nên game đặt `kind` rồi gỡ artboard sau khoảng 1,2 giây |
| `WinConfetti` | 400×300 | Bung một lần, rồi rơi lặp | — | Thắng màn, sau dải tiêu đề. Giấy vector viền mực như các nút |
| `BasketFull` | 180×160 | Vào một lần, rồi lặp | — | Màn thua (giỏ đầy). Giỏ tre rơi xuống đầy món khu Xe bánh mì, chai tương bật qua miệng giỏ; sau đó giỏ lắc nhẹ, món nhấp nhô |
| `BasketFullStill` | 180×160 | Đứng yên | — | Màn thua khi bật giảm chuyển động: đúng tư thế cuối phần vào của `BasketFull` |
| `BadgeUnlock` | 160×160 | Chạy một lần, sau đó lặp nhún nhẹ | — | Thành tích vừa mở khoá |
| `StreakFlame` | 60×64 | Lặp | — | Chuỗi ngày trên màn Quà mỗi ngày |

Tên view model và tên thuộc tính là giao diện công khai của file. Đổi tên là thay đổi phá vỡ: phải sửa code gọi tương ứng trong cùng commit.

## Quy tắc khi dùng trong app

- Mọi số mà hoạt ảnh hiển thị (số sao, loại trợ giúp) phải lấy từ engine, đúng quy tắc "không hiển thị số mà engine không tạo ra".
- Khi bật giảm chuyển động, không gắn `Lanterns`, `TapHint`, `StreakFlame`, `BadgeUnlock` và `WinConfetti` (thay bằng hình tĩnh hoặc bỏ). `BasketFull` thay bằng `BasketFullStill`. Riêng `Stars` thì thay bằng ảnh sao tĩnh với số sao cuối, không chạy hiệu ứng bật.
- Nạp file `.riv` một lần lúc khởi động và dùng chung cho mọi màn.
- Artboard không có view model (cột "Dữ liệu" là "—": `Lanterns`, `TapHint`, `ClearBurst`, `WinConfetti`, `BasketFull`, `BasketFullStill`, `BadgeUnlock`, `StreakFlame`) phải gắn với `dataBind={DataBindMode.None}`. Nếu để mặc định (Auto), runtime iOS sẽ dò tìm view model, SDK ghi log lỗi trước khi bỏ qua, và bản dev hiện màn hình đỏ. Artboard có view model thì truyền instance tạo bằng `useViewModelInstance(file, { artboardName, async: true })`; bản đồng bộ đã bị đánh dấu deprecated vì chặn JS thread.

## Ảnh nhúng trong file

`Stars`, `BasketFull` và `BasketFullStill` vẽ bằng ảnh PNG nhúng vào `.riv`; Rive chỉ lo chuyển động. Helper `image()` trong `generate-scene.py` ghi đường dẫn ảnh tương đối so với file RML được ghi ra, nên bản sao ở thư mục khác (như `render-preview.sh`) vẫn tìm thấy ảnh.

| Ảnh | Dùng ở | Nguồn |
| --- | --- | --- |
| `assets/ui/icons/star.png` | `Stars` | Icon sao dùng chung với HUD |
| `assets/ui/basket.png`, `assets/ui/basket-front.png` | `BasketFull`, `BasketFullStill` | Ảnh giỏ tre, cắt làm hai lớp: cả giỏ vẽ sau các món, riêng vành trước vẽ đè lên món để món nằm trong lòng giỏ. Giảm còn 256 màu để file nhẹ |
| `assets/items/xe-banh-mi/{tuong-ot,banh-mi,trung-op-la}.png` | `BasketFull`, `BasketFullStill` | Sprite món khu 1 |

Đổi ảnh thì build lại `.riv`. File hiện nặng khoảng 380 KB.

## Build lại và kiểm tra

```bash
cd design/motion/rive
python3 -I generate-scene.py scene.rml
rive . --verify                   # cú pháp
rive inspect . --summary          # danh sách problems phải rỗng
rive . --once && cp build/ghep_pho_motion.riv ../ghep-pho-motion.riv
```

Kiểm tra theo dữ liệu bằng ảnh chụp. Đặt `main:` trong `rive.yaml` thành artboard cần xem, rồi chạy:

```bash
rive . --screenshot=stars.png --advance=80 --data=stars=3
rive . --screenshot=stars-glow.png --advance=200 --data=stars=3   # đang thở: khác khung 80
rive . --screenshot=chest.png --advance=40 --data=opened=true
rive . --screenshot=gain.png --advance=22 --data=kind=0
```

Ảnh động WebP cho canvas thiết kế: chạy `render-preview.sh <artboard> <số khung> 2`, rồi `python3 matte-preview.py <thư mục khung> <artboard> <file.webp> 33`. Script render mỗi khung hai lần, trên nền đen và trên nền trắng, rồi tách nền để ra ảnh trong suốt.
