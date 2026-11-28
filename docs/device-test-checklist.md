# Checklist kiểm thử thiết bị thật (micro, loa, trình duyệt)

Mục đích: xác nhận bộ luyện thanh điệu (nút **Nói thử thanh điệu**) và âm phát mẫu hoạt động trên thiết bị thật. Trình giả lập và Chrome desktop không đủ, vì lỗi hay gặp nhất nằm ở iOS Safari, Bluetooth và quyền micro.

Cách dùng: làm lần lượt từng dòng, ghi **Đạt / Lỗi / Bỏ qua** và ghi chú. Mọi trường hợp lỗi lạ: mở **Kiểm tra thiết bị** rồi bấm **Sao chép thông tin** (xem cuối tài liệu).

## 0. Chuẩn bị

- Mở app qua **HTTPS** (bản deploy) hoặc `localhost`. Điện thoại không vào được `localhost` của máy tính, nên dùng bản deploy hoặc tunnel HTTPS.
- Xoá quyền micro đã cấp của trang trước mỗi vòng thử "lần đầu".
- Chrome iOS, Firefox iOS, Edge iOS đều dùng WebKit, hành vi giống Safari iOS. Chỉ cần thử một trình duyệt iOS, thêm một trình duyệt khác nếu nghi ngờ.
- Ba thiết bị tối thiểu: 1 iPhone, 1 Android, 1 laptop. Nếu có thêm: iPad, tai nghe Bluetooth, tai nghe có dây.

## 1. Bảng kiểm thử

Kết quả mong đợi viết ngắn. Cột iOS = iPhone/iPad (Safari hoặc Chrome iOS), AND = Android (Chrome, Samsung Internet), PC = laptop (Chrome / Edge / Firefox / Safari macOS).

| # | Tình huống | Các bước | Kết quả mong đợi | iOS | AND | PC |
|---|---|---|---|---|---|---|
| 1 | Hỏi quyền lần đầu | Mở bộ luyện thanh điệu → **Bật micro** | Trình duyệt hiện hộp hỏi micro ngay sau khi bấm (không hỏi trước). Chọn Cho phép: trạng thái chuyển "Đọc …", vạch âm lượng nhúc nhích khi nói | | | |
| 2 | Từ chối rồi cho phép lại | Chọn **Không cho phép** → xem thông báo → vào cài đặt trang/trình duyệt bật micro → tải lại trang → **Bật micro** | Sau khi từ chối: hiện "Micro đang bị chặn" kèm hướng dẫn đúng nền tảng và nút **Thử lại**. Sau khi bật lại: dùng được, không cần xoá dữ liệu trang | | | |
| 3 | Luyện: bắt đầu, thu, chấm | Đo quãng giọng (4 âm) → chọn chữ có thanh 1/2/3/4 → đọc | Đường cao độ vẽ theo giọng khi nói; hết câu hiện điểm, "Đúng thanh X" hoặc gợi ý lên/xuống; **Thử lại** đọc được lần nữa | | | |
| 4 | Giọng nhỏ / chỗ ồn | Nói rất khẽ, rồi thử với quạt hoặc nhạc nền | Sau vài giây hiện gợi ý "Chưa nghe rõ" hoặc "Xung quanh hơi ồn"; không treo, không báo sai điểm cao | | | |
| 5 | Công tắc im lặng (iPhone) | Gạt công tắc im lặng sang chế độ im → bấm **Nghe mẫu** và **Phát âm thử** (Kiểm tra thiết bị) | Biết trước hành vi: thường **không có tiếng** khi công tắc im lặng. Kiểm tra app có gợi ý (Kiểm tra thiết bị → "Không nghe thấy" → hiện hướng dẫn công tắc im lặng). Gạt lại: có tiếng | | – | – |
| 6 | Tai nghe Bluetooth | Nối tai nghe BT, dùng micro của tai nghe, bật micro trong app | iOS/Android thường chuyển sang chế độ đàm thoại (HFP): tần số lấy mẫu rớt xuống 8–16 kHz, âm thanh kém. Kiểm tra thiết bị phải báo **Lưu ý** ở "Tần số lấy mẫu" và gợi ý dùng micro máy/tai nghe dây. Độ trễ cao (> 150 ms) chỉ báo lưu ý, điểm chấm không đổi | | | |
| 7 | Tai nghe có dây | Cắm tai nghe có micro, bật micro | Nhận đúng micro (xem tên trong Kiểm tra thiết bị), tần số 44,1/48 kHz, chấm điểm như bình thường. Âm mẫu ra tai nghe | | | |
| 8 | Cuộc gọi / Siri chen ngang | Đang thu thì có cuộc gọi đến (hoặc gọi Siri, báo thức) → kết thúc cuộc gọi → quay lại app | Không treo, không crash. Micro dừng hoặc báo lỗi; **Thử lại** hoặc bật lại micro là dùng được. Nếu báo "Micro đang bận", đóng ứng dụng khác rồi thử lại | | | – |
| 9 | Chuyển ứng dụng / tab nền | Đang nghe thì chuyển sang app khác hoặc tab khác 10–30 s → quay lại | Quay lại không bị đơ; nếu micro bị hệ thống tắt thì bấm nút micro bật lại được. Đèn micro của trình duyệt không còn sáng khi đã tắt trong app | | | |
| 10 | Xoay màn hình | Xoay dọc → ngang → dọc khi đang ở màn luyện và khi đang ở Kiểm tra thiết bị | Bố cục không vỡ, không tràn ngang, nút bấm được; micro không tự tắt | | | – |
| 11 | Chế độ tiết kiệm pin | Bật Low Power Mode (iPhone) / Battery Saver (Android) → luyện 1–2 lần | Vẫn nghe và chấm được; có thể hơi giật hình. Ghi chú nếu mất tiếng hoặc micro tự tắt | | | – |
| 12 | HTTP qua IP mạng LAN | Mở `http://192.168.x.x:5174` (không phải localhost) → mở bộ luyện thanh điệu | Hiện "Cần kết nối bảo mật (HTTPS)", **không** hiện hộp xin quyền; Kiểm tra thiết bị báo **Lỗi** ở "Bảo mật & trình duyệt" kèm hướng dẫn mở qua `https://` hoặc localhost | | | |
| 13 | Micro đang dùng bởi ứng dụng khác | Mở Zoom/Meet/ghi âm (hoặc cuộc gọi) đang chiếm micro → bật micro trong app | Hiện "Micro đang bận" (hoặc lỗi tương đương) kèm hướng dẫn đóng ứng dụng khác. Đóng xong bấm **Thử lại** là dùng được (Android hay chặn hoàn toàn, iOS thường ghi đè) | | | |
| 14 | Phát âm mẫu pinyin | Bấm 🔊 ở chữ/pinyin và **Nghe mẫu** trong bộ luyện; thử các thanh 1–4 | Có tiếng ở lần bấm đầu tiên (không cần bấm 2 lần); đúng âm; không bị chồng khi bấm liên tiếp; không tự phát khi chưa bấm | | | |
| 15 | Kiểm tra thiết bị | Bấm **Kiểm tra thiết bị** (ở thông báo lỗi, ở chân hộp, hoặc ở màn giới thiệu) → **Bắt đầu kiểm tra** → nói "a…" → **Phát âm thử** → **Nghe thấy** | Các dòng hiện **Tốt**: Bảo mật, Quyền micro, Micro (có tên thiết bị), Mức âm vào (vạch chạy khi nói), Tần số lấy mẫu, Loa, Độ trễ. Bấm **Quay lại**: đèn micro tắt, bộ luyện dùng lại bình thường | | | |
| 16 | Kiểm tra thiết bị khi lỗi | Chặn micro (hoặc rút/tắt micro) → **Bắt đầu kiểm tra** | Dòng "Quyền micro" báo **Lỗi** đúng nguyên nhân (bị chặn / không có micro / đang bận) kèm hướng dẫn riêng cho thiết bị của bạn ở dòng đầu | | | |

## 2. Lưu ý theo nền tảng (đọc trước khi thử)

- **iPhone/iPad**: bật tiếng bằng công tắc im lặng + âm lượng; quyền micro đặt ở Cài đặt → Safari → Micro (hoặc aA trên thanh địa chỉ → Cài đặt trang web). iPadOS có thể giả làm Mac, app vẫn nhận ra nhờ màn hình cảm ứng. Safari có thể bỏ qua yêu cầu tắt khử ồn/tự chỉnh âm: dòng "Micro" sẽ báo **Lưu ý**, đó là hành vi bình thường.
- **Android**: Chrome và Samsung Internet khác nhau ở bảng quyền; nếu vẫn bị chặn sau khi bật ở trang, kiểm tra Cài đặt Android → Ứng dụng → trình duyệt → Quyền → Micro.
- **Laptop**: macOS và Windows có thêm quyền cấp ở **mức hệ điều hành** cho trình duyệt (Quyền riêng tư & Bảo mật). Firefox hiện biểu tượng micro gạch chéo trên thanh địa chỉ khi bị chặn.
- Độ trễ (baseLatency/outputLatency): Firefox và Safari có thể không đo được (hiện "không đo được"), không phải lỗi.

## 3. Ghi lại kết quả

1. Với mỗi thiết bị, mở **Kiểm tra thiết bị** → **Bắt đầu kiểm tra** → **Phát âm thử** → bấm **Sao chép thông tin**.
2. Dán nguyên văn nội dung đã sao chép vào báo cáo (issue, tin nhắn, bảng tính). Nội dung gồm User-Agent, kích thước màn hình, trạng thái quyền, kết quả từng dòng, cài đặt track micro, tần số lấy mẫu và độ trễ. Không chứa âm thanh hay dữ liệu cá nhân.
3. Nếu nút báo "Không sao chép được", chọn toàn bộ trong ô văn bản hiện ra và sao chép thủ công.
4. Ghi kèm: tên máy + phiên bản hệ điều hành, trình duyệt + phiên bản, loại tai nghe (nếu có), số thứ tự dòng trong bảng bị lỗi, và ảnh chụp màn hình nếu có.

Mẫu báo cáo:

```
Thiết bị: iPhone 13, iOS 17.5, Safari
Dòng lỗi: #6 (Bluetooth AirPods)
Mô tả: điểm luôn thấp, cao độ giật
--- dán "Sao chép thông tin" ở đây ---
```
