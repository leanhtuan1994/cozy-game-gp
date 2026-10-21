# Ghép Phố: luật chơi và các quyết định đã chốt

## Vòng chơi

- Mỗi màn là một sa bàn 2.5D nhìn nghiêng isometric, vẽ một góc phố Sài Gòn. Món ăn và đồ vật nằm chồng lên nhau trên sa bàn.
- Người chơi chạm vào một món **không bị che**. Món nhấc lên, bay vào **giỏ 7 ô** và xếp ngay cạnh món cùng loại đã có trong giỏ.
- Đủ **3 món giống nhau** liền nhau thì bộ ba được xoá khỏi giỏ.
- Dọn sạch sa bàn thì thắng màn. Giỏ đầy 7 ô mà không xoá được bộ nào thì thua màn.
- Thua thì **chơi lại miễn phí**. Không có mạng, không có thời gian chờ.

Luật giỏ nằm ở `src/engine/puzzle/tray.ts` (`insertIntoTray`):
- Món mới vào ngay sau món cùng loại cuối cùng trong giỏ; nếu chưa có thì vào cuối giỏ.
- Bộ ba được xoá ngay trong luật. Phần hiển thị giữ ba món lại cho tới khi chúng bay tới nơi và co biến mất.
- Ô thứ 7 được lấp mà không xoá được thì thua. Nếu món thứ 7 hoàn thành một bộ ba thì không thua.

## Sa bàn, che khuất và chạm chọn

- **Toạ độ sa bàn:** khung 1000×1000 đặt lên ảnh nền. Engine chỉ lưu toạ độ sa bàn; `src/scene/viewport.ts` đổi sang điểm màn hình.
- **Thứ tự vẽ:** theo lớp (`layer`), rồi theo `order` trong cùng lớp (món nằm thấp hơn trên sa bàn thì ở trước), rồi theo id. Xem `compareDrawOrder` trong `src/engine/puzzle/types.ts`.
- **Che khuất (đè lớp):** món A đè món B khi A được vẽ sau B và ít nhất 4% số ô đặc trong mặt nạ của B nằm dưới phần đặc của A (`COVER_MIN_SHARE` trong `constants.ts`). Chồng nhau ít hơn thì không tính là đè. Món bị đè hiện tối đi, vẫn lộ một phần, và chưa chạm được. Khi mọi món đè lên nó đã rời sa bàn, món đó thành tự do.
  - Quan hệ đè được tính từ hình học (`computeCovers` trong `src/engine/puzzle/covers.ts`). Bộ sinh màn lưu nó vào dữ liệu màn (`covers`), nên lúc chơi engine không cần ảnh. Riêng Xáo thì tính lại (xem dưới).
  - Quan hệ đè luôn đi từ món vẽ sau sang món vẽ trước, nên không có chu trình. Schema của màn chặn món tự đè chính nó và chặn chu trình.
- **Dữ liệu màn:** mỗi món có `x, y` là tâm hộp của món trên sa bàn, `z` là lớp, và `scale`. Hộp có cạnh `ITEM_SIZE × scale`, sprite được đặt vừa trong hộp và giữ tỉ lệ. Thứ tự vẽ trong cùng lớp dựa vào đáy hộp chứ không dựa vào sprite, nên không đổi khi Xáo đổi loại món.
- **Chạm chọn:** lấy món trên cùng mà mặt nạ alpha chứa điểm chạm (`hitTest` trong `src/engine/puzzle/hitTest.ts`). Chạm vào phần trong suốt của món trước thì xuyên xuống món phía sau.
  - Nếu món trúng chạm đang bị đè, nó rung nhẹ và giỏ giữ nguyên.
- **Mặt nạ alpha:** lưới 32×32 phủ khung bao phần không trong suốt của sprite. Một ô được tính là đặc khi ít nhất 25% số điểm ảnh trong ô có alpha từ 128 trở lên. Mặt nạ sinh lúc build bằng `scripts/make-hit-masks.ts` và ghi vào `masks.json` cạnh sprite.

## Cảm giác 2.5D

- Nền sa bàn không có món; mỗi món là một sprite nền trong suốt đặt lên trên.
- Chiều sâu đến từ:
  - thứ tự lớp;
  - bóng đổ mềm dưới mỗi món;
  - món nhấc lên khi được chạm (phóng to, bóng lớn dần) rồi bay theo đường cong vào giỏ;
  - parallax nhẹ theo con quay hồi chuyển: lớp món lệch tối đa 5 pt, nền lệch ngược chiều và ít hơn.
- Bật giảm chuyển động thì tắt parallax.
- Không có xoay sa bàn 3D.

## Trợ giúp và sao

- Có ba loại trợ giúp:
  - **Hoàn tác:** mỗi lần lùi lại một lần chạm, tối đa tới lần Xáo gần nhất. Món quay về chỗ cũ và quan hệ đè được khôi phục. Nếu lần chạm đó đã xoá một bộ ba, bộ ba cũng quay lại giỏ. Dùng được sau khi thua (đây là nút "Dùng trợ giúp" trên màn thua), không dùng được sau khi thắng.
  - **Xáo:** chia lại loại cho các món còn trên sa bàn. Vị trí giữ nguyên, số món mỗi loại giữ nguyên nên vẫn chia hết cho 3, và quan hệ đè được tính lại theo hình của sprite mới. Xáo xoá lịch sử Hoàn tác và dùng RNG lưu trong trạng thái màn. Không dùng được sau khi màn đã kết thúc.
  - **Gợi ý:** chỉ ra một lần chạm nằm trên đường thắng. Solver chạy với ngân sách nhỏ (`HINT_NODE_BUDGET`) để không làm đứng máy. Nếu hết ngân sách, gợi ý là lần chạm được xếp hạng cao nhất mà không làm thua ngay. Nếu không còn đường nào, gợi ý không tính là đã dùng.
  - Engine không kiểm số trợ giúp còn lại; phần `GameCommands` kiểm việc này.
- Trợ giúp nhận được từ phần thưởng màn, nhiệm vụ, quà đăng nhập và thành tích. Không có tiền xu, không có cửa hàng.
- Sao của màn:
  - 3 sao nếu không dùng trợ giúp;
  - 2 sao nếu dùng 1 lần;
  - 1 sao nếu dùng từ 2 lần.
- Các ngưỡng sao là số tinh chỉnh được, đặt trong `src/engine/puzzle/constants.ts`.

## Nội dung

- Có 60 màn, chia thành 6 khu phố, mỗi khu 10 màn.
- Màn sinh từ seed và có solver xác nhận giải được, sau đó chỉnh tay.
- Độ khó đo chủ yếu bằng tỉ lệ thua của 80 lượt chơi ngẫu nhiên có lý (ưu tiên hoàn thành cặp, ghép với món đã có trong giỏ). Solver còn báo độ đầy giỏ tối đa, số bước giỏ gần đầy và số lần quay lui, nhưng trên các màn hiện tại solver hầu như không phải quay lui.
- Đường cong độ khó (`curveDifficulty`): màn 1–3 của khu đầu dùng để dạy chơi, độ khó tăng dần trong mỗi khu, và mỗi khu bắt đầu khó hơn khu trước. `generateChapter` giữ màn 10 là màn khó nhất của khu. Đường cong được báo cáo bằng `bun run level-report`.
- Lưu game chỉ giữ tiến trình (sao từng màn, số trợ giúp, cài đặt, bài dạy đã xong), không giữ ván đang chơi dở. Màn đã mở được suy ra từ số màn đã có sao, vì màn mở theo thứ tự.

## Quà đăng nhập và thời gian

- Lịch quà 7 ngày chỉ tiến khi người chơi nhận quà, mỗi ngày nhận một lần. Bỏ ngày thì lịch không bị reset. Ngày 1–6 là một trợ giúp; ngày 7 là gói lớn (2 mỗi loại), rồi lịch quay lại ngày 1.
- Chuỗi ngày đếm số ngày liên tiếp có mở app, và reset về 1 khi bỏ ngày. Chuỗi dài nhất được giữ cho thành tích.
- Engine nhận `now` và độ lệch múi giờ từ ngoài vào. Ngày mới bắt đầu lúc 00:00 giờ máy. Khi đồng hồ máy bị lùi quá 5 phút so với lần mở app gần nhất, các phần theo ngày tạm dừng: không sang ngày mới và không nhận được quà hay thưởng cho tới khi đồng hồ chạy qua mốc đó. Màn Quà và Nhiệm vụ báo cho người chơi biết.
- Lùi quá 2 ngày thì coi là đồng hồ vừa được chỉnh lại cho đúng (trước đó chạy nhanh), không tạm dừng. Các mốc ngày nằm sau hôm nay được kéo về hôm nay; quà hôm nay coi như đã nhận, nên không ai nhận được hai lần.
- Ngày mới bắt đầu cả khi app đang mở: lúc 00:00, khi app quay lại từ nền, và khi nhận quà hay thắng màn.

## Nhiệm vụ hằng ngày và thành tích

- Mỗi ngày có 3 nhiệm vụ. Nhiệm vụ đầu luôn là "Thắng 1 màn"; hai nhiệm vụ còn lại chọn từ một kho theo seed của ngày. Mỗi nhiệm vụ có thưởng riêng; xong cả 3 thì mở được rương.
- Tiến độ nhiệm vụ, thành tích và bộ đếm tổng chỉ tính từ các màn **thắng**, lấy từ sự kiện của engine giải đố (bộ ba đã xoá, món từng bị đè đã gom, 3 sao).
- Có 20 thành tích chia bậc (số màn đã xong, bộ ba, màn 3 sao, chuỗi ngày, xong từng khu). Thưởng là trợ giúp và phải bấm nhận.
- Mọi phần thưởng đều là trợ giúp (Hoàn tác, Xáo, Gợi ý). Không có tiền xu.

## Thông báo

- Chỉ xin quyền khi người chơi rời màn thắng đầu tiên, không xin lúc mở app.
- Mỗi lần app vào nền và sau mỗi lần nhận thưởng: huỷ hết rồi lên lịch đúng 2 nhắc nhở cục bộ: "Quà hôm nay đã sẵn sàng" lúc 19:00 và "Nhiệm vụ còn dang dở" lúc 20:30. Nếu hôm nay đã nhận quà hoặc đã xong nhiệm vụ thì nhắc nhở tương ứng dời sang ngày mai.
- Tắt "Nhắc quà và nhiệm vụ" trong cài đặt thì huỷ hết và không lên lịch nữa. Bật lại khi iOS đã tắt quyền thì game mời mở Cài đặt của iPhone.

## Lần đầu chơi và hướng dẫn

- Người chơi mới được cô Tư chào bằng 3 câu, được hỏi tên (bỏ qua được), rồi vào thẳng màn 1. Không có form hay tài khoản.
- Màn 1–3 mỗi màn dạy một cơ chế: chạm món, giỏ và bộ ba (màn 1); món bị đè (màn 2); dùng Gợi ý (màn 3). Mỗi bước chỉ nhận đúng hành động đang dạy; các chạm khác không có tác dụng.
- Mọi bài dạy đều bỏ qua được. Bài đã xong hoặc đã bỏ qua không hiện lại, trừ khi chọn "Xem lại hướng dẫn" trong cài đặt.
- Lần dùng Gợi ý trong bài dạy là miễn phí: không trừ kho, không làm mất sao.
- Bài dạy được lập từ thế cờ đầu màn, không ghi cứng id món, nên sinh lại màn thì bài dạy đi theo (có test kiểm).

## Cài đặt, âm thanh và rung

- Nhạc và hiệu ứng có 4 nấc: Tắt, Nhỏ, Vừa, To. Rung bật hoặc tắt. Giảm chuyển động có 3 lựa chọn: theo máy, bật, tắt.
- Game im khi iPhone gạt sang chế độ im lặng, chơi chung với âm thanh của app khác, và tắt nhạc khi vào nền.
- Âm thanh dùng bộ CC0: hiệu ứng của Kenney, nhạc "Slow Stride" của isaiah658. Nguồn ghi trong `assets/audio/CREDITS.txt`.
- "Xoá tiến trình" hỏi xác nhận 2 lần, và giữ lại cài đặt cùng tên người chơi.

## Lưu game

- Save có version (hiện là v3) và migration từ bản cũ.
  - v2 thêm `meta`: quà đăng nhập, nhiệm vụ trong ngày, thành tích đã nhận, bộ đếm tổng và thời điểm mở app gần nhất.
  - v3 thêm tên và trạng thái đã chào, bài dạy đã xong, âm lượng dạng số, giảm chuyển động và công tắc nhắc nhở. Save cũ đã thắng màn nào thì bỏ qua lời chào và bài dạy.

## Giao diện

Chốt và áp vào code ngày 17/10/2026.

- Phong cách casual puzzle nổi khối: mọi nút, thẻ và bảng có viền mực 3px, mặt màu và một gờ đậm hơn ở đáy; bấm xuống thì nút lún.
- Màu theo vai trò: xanh rêu (`#4E9A6F`, gờ `#2F6B4B`) là đi tiếp, vàng lồng đèn (`#F5B841`, gờ `#C98A1C`) là nhận quà, đỏ ghế nhựa (`#E0533B`, gờ `#A8301F`) là chú ý, giấy (`#FFF4E0`, gờ `#D9BC8E`) là nút phụ, tím đêm (`#2E2A4F`) cho thanh đầu bản đồ, dock và bộ đếm.
- Tiêu đề khoảnh khắc ("Dọn xong!", tên khu) chữ kem viền mực dày và bóng đổ cứng, đặt trên dải ruy băng. Font tiêu đề, nút và số là Baloo 2 (duyệt ngày 17/10/2026); chữ thường giữ Be Vietnam Pro.
- Nút nhấn thì mặt lún xuống gờ và co còn 0,95, thả thì nảy lại bằng lò xo. Khi giảm chuyển động thì chỉ lún, không co và không nảy.
- Thông báo nhận thưởng là viên thuốc vàng có icon trợ giúp; thành tích mới là thẻ tím đêm có nút "Nhận".
- Icon trợ giúp, sao, rương, quà, lửa chuỗi ngày và ổ khoá vẽ cùng phong cách với sprite, nằm ở `assets/ui/icons/`. Gợi ý dùng hình lồng đèn.
- Công tắc bật/tắt trong Cài đặt không dùng công tắc iOS: rãnh kem (tắt) chuyển sang xanh rêu (bật), núm kem trượt bằng lò xo, cùng viền mực và gờ như nút. Ảnh nằm ở `assets/ui/switch/`.
- Nút chọn nấc trong Cài đặt và tab ở Thành tích dùng chính nút nổi khối: mục đang chọn mặt xanh rêu (cùng màu công tắc bật), mục khác mặt giấy.
- Bản đồ: mỗi khu cao một màn hình (ít nhất 860 pt) và có nền riêng (`assets/map/<khu>.jpg`), cùng góc nhìn và đường đi chữ S để các nút màn đặt chung vị trí. Chạm màn đang khoá thì nút lắc và rung "không được". Nút màn hiện tại (vàng, nhãn "Chơi") phồng xẹp như đang thở, có quầng sáng vàng thở cùng nhịp và nhãn "Chơi" nhún lệch nhịp; vừa thắng màn trước mà quay về bản đồ thì nút màn mới bật vào bằng lò xo. Giảm chuyển động thì nút đứng yên, chỉ còn quầng và vòng tĩnh. Thời điểm trong ngày khác nhau theo khu: Khu 1 tối, Khu 2 sáng Tết, Khu 3 chạng vạng, Khu 4 ban ngày, Khu 5 chiều, Khu 6 khuya.

## Rung

Dùng Pulsar. Mỗi khoảnh khắc chỉ rung một lần, kiểu mạnh hơn thắng. Tắt "Rung" trong game là tắt hết. Giảm chuyển động không tắt rung, chỉ đổi lịch rung sao. Mẫu rung tự soạn vẫn rung khi người chơi tắt rung hệ thống trong cài đặt iOS ([Pulsar #129](https://github.com/software-mansion/pulsar/issues/129)), nên công tắc "Rung" trong game là cách để tắt.

| Khoảnh khắc | Rung |
| --- | --- |
| Nhặt món | va chạm nhẹ của hệ thống |
| Chạm món bị đè, chạm sai món trong bài dạy, chạm màn khoá | "không được": hai nhịp mềm |
| Giỏ vừa còn đúng 1 ô sau một lần nhặt | "tim đập": hai nhịp trầm |
| Xoá bộ ba | va chạm vừa |
| Hoàn tác / Xáo / Gợi ý | tua lại / rung xáo trộn / "ting" hai nhịp sáng |
| Thắng màn | một nhịp mỗi sao, mạnh dần theo hoạt ảnh sao, rồi rung báo thành công |
| Thua màn | rung cảnh báo |
| Nhận quà, nhiệm vụ, thành tích | rung báo thành công |
| Mở rương nhiệm vụ, quà ngày 7 | preset `coinDrop` |
| Bấm bất kỳ nút nào không có rung kết quả riêng (Màn tiếp, Chơi lại, Bản đồ, Tạm dừng, Cài đặt, Bỏ qua, dock, nút màn đang mở…) | "tích": một nhịp nhẹ và sắc lúc thả tay |
| Đổi nấc cài đặt, đổi tab, gạt công tắc | rung chọn của hệ thống |

Mỗi lần rung "tích" hoặc rung chọn đều kèm một tiếng "cách" nhỏ (`button.wav`), theo nấc "Hiệu ứng". Đổi nấc "Hiệu ứng" thì tiếng cách phát ở nấc mới.

Không rung: cuộn bản đồ, thông báo tự hiện. Nút đã có rung kết quả (nhận quà, trợ giúp, màn khoá) không rung "tích" thêm.

## Hoạt ảnh

- Các khoảnh khắc trong game (sao thắng màn, xoá bộ ba, rương, nhận trợ giúp, thành tích) dùng Rive. Xem `docs/motion-contract.md`.
- Chuyển động của sprite (nhấc lên, bay vào giỏ, trượt trong giỏ, rung) dùng Reanimated và Skia.

## Không làm trong v1

Xoay sa bàn 3D, IAP, quảng cáo, tài khoản, online, bảng xếp hạng, lưu đám mây, Android, tiếng Anh, hệ thống mạng, tiền xu và cửa hàng.
