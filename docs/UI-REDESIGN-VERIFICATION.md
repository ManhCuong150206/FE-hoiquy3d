# Kết quả triển khai và kiểm thử giao diện v1.3

Ngày: 30/10/2026. Frontend: `FE/FE-hoiquy3d`.

## Hành vi hiện tại

- Bốn trang: Chào mừng → Chọn thuật toán → Thực nghiệm → Học từng bước + mô hình 3D + ghi chú.
- Mỗi lần chỉ một trang hiển thị. Các trang đã mở được giữ component/state nhưng dùng hidden/display:none; không thể cuộn sang trang khác hoặc Tab vào trang ẩn.
- Nút hoặc bấm vùng màu trên cầu điều hướng. Wheel chỉ đọc nội dung dài hoặc zoom trong viewport mô hình.
- Login/Register hợp lệ về định dạng và Guest dùng cùng chuyển cảnh; vẫn là demo, không gửi/lưu credential.
- Chuỗi chuyển cảnh: trang cũ mờ và lùi nhẹ → đổi trang dưới lớp màu → trang mới hiện ra; cầu scale/rotation, các panel stagger, trang học vào từ hai phía. Không dùng ScrollTrigger/ScrollTo.
- Khi có lựa chọn điều hướng mới, hoàn tất trạng thái chuyển cảnh cũ trước khi chuyển tiếp; chỉ một trang giữ trạng thái visible. Reduced motion/hiệu ứng Nhẹ bỏ chuyển động.
- Cầu có bốn màu cùng lúc, hover neon, kéo xoay không bị chọn nhầm. Thuật toán trang 3 chỉ đọc; đổi thuật toán đã học vẫn cần xác nhận reset.
- Trang học dùng chung LabStore với thực nghiệm; lộ trình sáu pha hiển thị sẵn, chỉ nút học/phát mới chạy pha. Điều hướng không tự huấn luyện.

## Tối ưu 60 FPS

- `FrameBudget` cấp slot render theo deadline 60 FPS, dùng cho cầu, mô hình, nền 3D và cursor. GSAP ticker cũng đặt 60 FPS.
- Callback dư từ màn hình 120/144/240 Hz bị bỏ; không chạy bù nhiều frame sau tác vụ chậm. Pointer và vòng animate của cầu chia sẻ cùng bộ giới hạn.
- `Viewport3d.active`: chỉ khởi tạo WebGL lần đầu khi mở đúng trang; ngừng RAF và các phép tính prediction/geometry không cần thiết ở trang ẩn. Khi quay lại lấy model mới nhất.
- Damping camera và render chỉ thực hiện trong slot được cấp, ngoài Angular. Resize bỏ qua trang ẩn/kích thước 0, giữ DPR cap và instancing hiện có.
- Bỏ CSS transition transform trên cầu vì xung đột với GSAP; giữ scrollbar gutter ổn định khi đổi trang.
- Không thay công thức, Web Worker, xử lý CSV, IndexedDB, API hoặc schema MongoDB để tạo hiệu ứng.

## Kiểm tra đã đạt

- Unit: **78/78 test**, **17 file**. Có sáu kiểm thử mới cho bộ giới hạn: màn hình 60/120/144/240 Hz, gom yêu cầu pointer/animate và không chạy bù sau tác vụ chậm.
- E2E Chromium đầy đủ trước khi bỏ thanh điều hướng: **7 nhóm, 53 tiêu chí** tại `e2e/ui-redesign`; runner kết thúc exit 0, không có `### Error`.
- Production build/prerender thành công, không có cảnh báo budget. Initial bundle 329,05 kB raw / 89,89 kB transfer ước tính của Angular.
- Production smoke riêng: hai nhóm motion/slides, **23 tiêu chí** đạt; console **0 error, 0 warning** trong lần chạy này.
- Đã xem ảnh desktop/mobile; mobile 390 px không tràn ngang.

| Nhóm | Phạm vi |
| --- | --- |
| Entry | Theme, form demo, xóa credential/không gửi auth request, nút đổi trang, scene cầu, đo FPS WebGL thực |
| Lab | Bốn thuật toán, Step/Reset, metric, Play/Pause, quay lại, hủy/xác nhận đổi thuật toán |
| Learning/offline | CSV/mean imputation, pha A–F, A–E giữ model cũ/F commit một lần, trở về trang lab, IndexedDB offline và API sync giả lập |
| Mobile/fallback | Guest, giảm chuyển động, bàn phím, không tràn ngang, fallback khi WebGL tắt |
| Sphere/quality | Hiệu ứng Nhẹ/Tự động và click raycast trực tiếp trên cầu |
| Page motion | Một trang visible, wheel không điều hướng, exit/enter thực có transform 3D, trần render mô hình, tên thuật toán chỉ đọc, back, scene ẩn dừng render |
| Cinematic slides | Login/Register/Guest chuyển trang, bốn vùng màu, drag không chọn nhầm, trang học có 3D/ghi chú, sáu pha, giữ iteration, cuộn không học, mobile |

## Số đo và giới hạn

- Đo render WebGL thực bằng bộ đếm render trên canvas; **không** dùng số callback requestAnimationFrame làm FPS của scene.
- Dev, mẫu 1,5 giây ở cầu: khoảng **60,6 render/giây**, p95 CPU gửi lệnh vẽ **0,6 ms**. Mẫu ngắn có sai số một frame ở ranh giới thời gian, nên xấp xỉ 60 là cách đọc phù hợp.
- Production, mẫu 1,2 giây ở mô hình: khoảng **59,95 render/giây**; mẫu CPU cuối **0,5 ms**. Đây không phải GPU execution time hoặc p95 toàn bộ trang.
- Kết quả chỉ đại diện Chromium/máy hiện tại. Máy yếu, tải lớn hoặc biên dịch shader lần đầu có thể dưới 60 FPS; chưa đo Safari/Firefox hay laptop phổ thông. CSS hover do compositor trình duyệt quản lý, không thay tần số vật lý của màn hình.
- E2E sync dùng API giả lập `/api/v1/experiments/bulk`, không chứng minh MongoDB thực nhận dữ liệu.
- Login/Register chưa có xác thực thật. Chưa kiểm thử triển khai HTTPS.
- jsdom không có WebGL; thông báo getContext của unit test là giới hạn môi trường. Scene thật/fallback được kiểm tra bằng Chromium.
- Hạn chế tiền xử lý CSV đã ghi trong learning-walkthrough.md giữ nguyên.

## Chạy lại

Terminal thứ nhất, trong frontend:

```powershell
npm.cmd start -- --host 127.0.0.1 --port 4300
```

Terminal thứ hai:

```powershell
npm.cmd test -- --watch=false
npm.cmd run build
powershell -NoProfile -ExecutionPolicy Bypass -File e2e/run-ui-redesign.ps1
```

Runner dùng Playwright CLI qua npx và profile riêng; nhóm entry xóa localStorage/IndexedDB của profile test. Ảnh/log ở `output/playwright` và được bỏ qua trong Git. Ảnh production mới: `prod-page-sphere-four-colors.png`, `prod-page-learning-desktop.png`, `prod-page-learning-mobile.png`.

Phiên bản này thay thế kết quả/thiết kế dựa trên scroll sections và phép đo cadence RAF ở các phiên bản trước.

## Tinh chỉnh bỏ thanh điều hướng

- Bỏ thanh đầu trang gồm thương hiệu, các mục 01–04 và nút Hiệu ứng. Giữ nút điều hướng trong từng trang và giảm chuyển động theo hệ điều hành.
- Bỏ phần chiều cao dự phòng 82 px. Cập nhật hai kịch bản E2E trước đây dùng các nút trên thanh; không còn kiểm thử nút Hiệu ứng đã bị bỏ.
- Kiểm tra lại trên production: build thành công; hai nhóm sphere/page-motion với 11 tiêu chí đạt. Bộ đầy đủ 7 nhóm chưa chạy lại sau thay đổi nhỏ này.
