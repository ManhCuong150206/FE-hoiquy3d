# Kết quả giao diện v1.6 — Điều hướng và toolbar

Cập nhật 31/10/2026. Frontend Angular tại `FE/FE-hoiquy3d`.

## Đã triển khai

- Bỏ sử dụng ảnh toán học và công thức nổi. Nền đen/xanh đậm có 1.000 sao 3D, trôi rất chậm, mỗi sao có pha sáng tối riêng. Không nháy đồng loạt.
- Toàn bộ giao diện dùng Times New Roman: tiêu đề, nút, form, số liệu, công thức và bảng. Fallback Times/serif; không tải font ngoài.
- Trang 3/4 dùng kính tối trong vừa cho header lab, thanh điều khiển, card và các ô nhỏ: khung ngoài alpha khoảng 0,48/blur 4 px, khung trong alpha 0,30–0,32. Chữ sáng và tiêu đề nhấn nhẹ; theme sáng có quy tắc tương phản riêng.
- Canvas mô hình chuyển sang alpha/clear alpha 0 để nhìn xuyên lớp nền; không đổi tọa độ, thuật toán, mặt phẳng, camera, raycast hoặc quy tắc điểm dính.
- Giữ màu Train cam `#FF922E`, Test xanh lam `#42A5FF` ở cả hai scene, legend, biểu đồ và MSE.
- Giữ nút giọt nước và con trỏ neon/ripple; giữ một trang hiển thị mỗi lần, chỉ nút/chọn cầu đổi trang.

## Hiệu năng và fallback

- Trường sao dùng một Points/draw call, geometry tĩnh, shader tính độ sáng bằng pha phức. Không cập nhật 1.000 vị trí sao trên CPU mỗi frame, không còn texture công thức.
- Trôi/quaternion/twinkle qua số phức; render vẫn có FrameBudget 60 FPS. Nền ngừng chạy khi tab ẩn hoặc reduced motion/hiệu ứng nhẹ.
- Kính chỉ dùng backdrop-filter ở khung ngoài; các ô trong không chồng thêm blur. Có fallback kính đậm hơn nếu không hỗ trợ backdrop-filter.
- Khi WebGL không khởi tạo được vẫn có sao CSS tĩnh và các nút chọn thuật toán; con trỏ trang trí tắt khi touch/reduced motion.
- Có cleanup geometry/material/renderer/listener khi hủy component.
- Bản sao ảnh toán học cũ có thể còn trong assets nhưng giao diện không tham chiếu/tải nó làm nền. File gốc của người dùng không bị chỉnh sửa.

## Kiểm tra đã thực hiện

- Unit cuối: **79/79**, **17 file** đạt. jsdom không có WebGL nên có thông báo getContext; scene thật được kiểm tra bằng Chromium.
- Build/prerender production cuối: thành công, không có cảnh báo budget.
- E2E dev đầy đủ: **9 nhóm, 73 tiêu chí**, exit 0, không có `### Error`.
- Production smoke nền sao ở v1.5: nhóm liquid/neon, **14 tiêu chí** đạt; console không có error, có một warning WebGL trong lần chạy này.
- Đã xem ảnh desktop 1440 px và mobile 390 px, kiểm tra không tràn ngang.
- `git diff --check` đạt; không có thay đổi trong engine hoặc LabStore so với đầu đợt chỉnh giao diện.

| Nhóm | Nội dung |
| --- | --- |
| Entry | Theme/form demo, xóa credential, nút chuyển trang, scene cầu và render cap |
| Lab | Bốn thuật toán, metric, Step/Reset, Play/Pause, đổi thuật toán và xác nhận reset |
| Learning/offline | CSV, sáu pha A–F, chỉ commit tại F, lưu IndexedDB offline, sync UI qua API giả lập |
| Mobile/fallback | 390 px, Guest, bàn phím, reduced motion và fallback WebGL |
| Sphere | Click raycast chọn trực tiếp trên cầu |
| Page motion | Một trang visible, wheel không điều hướng, exit/enter thực, readonly algorithm, back và scene ẩn ngừng render |
| Slides | Ba cách vào ứng dụng, bốn vùng màu, kéo không chọn nhầm, trang học có 3D/ghi chú/sáu pha, giữ iteration |
| Liquid/stars | Bỏ ảnh cũ, nền vũ trụ, Times body/title/number, sao đổi pha sáng, kính alpha, canvas alpha, màu hai scene/biểu đồ, con trỏ, FPS và reduced motion |

## Số đo hiện tại và giới hạn

- Production, mẫu render thực 1,5 giây: trang 3 **59,92 FPS**, trang 4 **59,99 FPS**. Đo bằng bộ đếm WebGL render, không lấy số callback requestAnimationFrame làm FPS của scene.
- Đây là mẫu ngắn trên Chromium/máy hiện tại, có sai số ở ranh giới một frame. Không bảo đảm mọi phần cứng đều luôn giữ 60 FPS và không phải phép đo GPU execution time.
- Chưa kiểm tra Safari/Firefox, cấu hình laptop phổ thông hoặc triển khai HTTPS.
- Test sync dùng API giả lập `/api/v1/experiments/bulk`, không chứng minh MongoDB nhận dữ liệu. Auth vẫn là demo; không gửi/lưu credential.
- Hạn chế tiền xử lý CSV trong learning-walkthrough.md giữ nguyên. Không sửa backend/API/schema cho phần giao diện.

## Chạy lại

Trong frontend, terminal thứ nhất:

```powershell
npm.cmd start -- --host 127.0.0.1 --port 4300
```

Terminal thứ hai:

```powershell
npm.cmd test -- --watch=false
npm.cmd run build
powershell -NoProfile -ExecutionPolicy Bypass -File e2e/run-ui-redesign.ps1
```

Playwright CLI dùng profile kiểm thử riêng; nhóm entry xóa localStorage/IndexedDB trong profile đó. Ảnh/log nằm trong `output/playwright` (bỏ qua khi commit).

Ảnh mới: `prod-stars-neon-welcome-desktop.png`, `prod-stars-neon-lab-desktop.png`, `prod-stars-neon-learning-desktop.png`, `prod-stars-neon-learning-mobile.png`.

Các số đo và yêu cầu ảnh toán học/font kỹ thuật trong phiên bản 1.4 đã được thay bởi bản 1.5 này.

## Tinh chỉnh v1.6 — Các nút và cấu trúc toolbar

- Footer chọn thuật toán đổi thành Đăng xuất; tạm dừng model/trình diễn và trả về màn hình đăng nhập demo, xóa nội dung form, giữ dataset/model/thí nghiệm.
- Bỏ nút Khám phá thuật toán trùng Guest ở trang đăng nhập. Guest cũng xóa nội dung form trước khi tiếp tục.
- Trang 3 chỉ còn nút Đổi thuật toán tại header; bỏ nút trong trường thuật toán và tại footer. Footer trang 4 giữ nguyên phạm vi cũ.
- Toolbar dùng bốn nhóm grid ngang ở 1920/1440/1366 px; nhãn dài wrap trong ô. Tablet chuyển tham số xuống hàng full-width, mobile chia hai cột.
- Unit hiện tại 79/79: thêm kiểm tra logout chỉ pause/navigate, không reset model; cập nhật test toolbar không còn nút trùng.
- E2E hiện tại 9 nhóm/73 tiêu chí đều đạt, gồm nhóm navigation-layout mới kiểm tra đăng xuất, xóa form, nút duy nhất, layout desktop/tablet/mobile và giữ model khi vào lại demo.
- Production build cuối thành công. Chưa chạy lại browser production riêng cho v1.6; phần smoke và FPS v1.5 phía trên là kết quả lịch sử.
- Ảnh kiểm tra: `output/playwright/controls-1920.png`. Không đổi engine, API, database hoặc cách huấn luyện.
