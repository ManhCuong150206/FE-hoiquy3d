# Báo cáo kiểm thử và đánh giá Hồi quy 3D

Thực hiện đêm **09–10/11/2026, giờ Việt Nam**. FE: commit `ce4e667`; BE: commit `5e0d727`.

**Chỉ kiểm tra và đánh giá. Không sửa mã nguồn FE/BE, không sửa test, không thay đổi dependency của dự án.** Các file mới là báo cáo, ảnh và dữ liệu xuất của tài khoản test. Build chỉ sinh lại đầu ra build/cache. Git không có thay đổi ở các file được theo dõi sau kiểm tra.

## 1. Kết luận

Các luồng chính hoạt động: bốn thuật toán, sinh dữ liệu, nhập CSV, chạy/dừng/reset, không gian 3D, học A–F, đăng ký/đăng nhập, lưu/khôi phục, so sánh, xuất dữ liệu và đồng bộ offline.

**Chưa nên coi phiên bản này là đạt để phát hành:** build production FE thất bại; có lỗi hiển thị R², nội dung bài học mâu thuẫn, tràn ngang mobile, vấn đề tiếp cận và một hành vi đồng bộ cần quyết định rõ khi xóa offline gặp bản sửa mới trên server. Bộ E2E giao diện cũng chưa đồng bộ với luồng hiện tại.

**FE gọi 6 endpoint BE khác nhau.** Trong một kịch bản tích hợp hoàn chỉnh đã ghi nhận 21 request từ FE tới 6 endpoint đó. Đây là hai cách đếm khác nhau, không phải ứng dụng chỉ gửi tổng cộng 6 request.

## 2. Môi trường và phạm vi

- FE chạy bằng Angular dev server tại `http://127.0.0.1:4300`.
- BE NestJS hiện tại được build và chạy tại cổng 3000, dùng `configureApp` của ứng dụng.
- MongoDB dùng `MongoMemoryServer` riêng, database `hoi-quy-3d-test`; không dùng dữ liệu tài khoản/database ứng dụng của người dùng. Session test dùng MemoryStore theo cấu hình BE.
- Trình duyệt Chrome thật qua Playwright; kiểm tra desktop 1440 px, tablet 768 px, mobile 390 px, giao diện sáng/tối và reduced motion.
- Có kiểm tra API giả lập của bộ UI cũ, đồng thời có kiểm tra FE–BE thật riêng. Hai loại kết quả được tách biệt bên dưới.
- Đọc mã nguồn FE, các controller/module BE đang được nạp và các bộ test có sẵn.

Không có cơ sở để tuyên bố mọi tổ hợp thiết bị/dữ liệu đều đạt: chưa kiểm tra Safari/Firefox, thiết bị cảm ứng thật, tải lớn nhiều người dùng hoặc môi trường HTTPS production. PWA offline reload/SSR production chưa được xác nhận do production build FE đang lỗi.

## 3. Kết quả thực thi

| Hạng mục | Kết quả | Ghi chú |
|---|---|---|
| FE `npm.cmd test -- --watch=false` | **209/209 đạt, 26 file** | JSDOM báo thiếu triển khai canvas; do đó kiểm tra thêm WebGL trong Chrome |
| FE `npm.cmd run build` | **Không đạt** | Hai CSS component vượt budget lỗi 8 kB |
| FE dev server | Đạt | Phục vụ được ứng dụng để kiểm tra |
| BE `vitest run` | **33/33 đạt, 6 file** | Unit test hiện có |
| BE E2E `vitest run --config ./vitest.config.e2e.ts` | **20/20 đạt** | MongoDB test tách biệt |
| BE `npm.cmd run build` | Đạt | Dùng đầu ra mới cho kiểm tra tích hợp |
| Luồng FE–BE thật | **15 kiểm tra đạt** | Không có `pageerror`; 21 response API từ FE |
| Kiểm tra chức năng trực tiếp | **33 kiểm tra đạt + 1 kiểm tra tái hiện lỗi nội dung thành công** | File kết quả có 34 assertion; không tính assertion xác nhận lỗi thành chức năng đạt |
| Kiểm tra UI có sẵn | **7 đạt, 17 không đạt, 1 bị chặn do cổng** sau đối chiếu | Không tương đương 17 lỗi ứng dụng; xem mục 7 |
| Inspector giao diện | 9 nhóm FAIL, 5 nhóm WARN | Bao gồm quy tắc phong cách; không phải 9 lỗi chức năng độc lập |

### Các chức năng đã kiểm tra

| Nhóm | Đã xác minh | Kết quả/giới hạn |
|---|---|---|
| Tài khoản | Đăng nhập sai, đăng ký rồi đăng nhập riêng, xóa mật khẩu khỏi form, khôi phục phiên, đăng xuất thu hồi session | Đạt với BE thật |
| Form | Email/mật khẩu sai, form rỗng, focus lỗi đầu tiên, đăng ký thiếu 3 trường, hiện mật khẩu | Đạt sau khi chờ hoàn tất chuyển form |
| Guest | Vào lab, huấn luyện offline khi ứng dụng đã tải, không lưu/đồng bộ, không ghi IndexedDB/localStorage trong suite Guest | Đạt; không đồng nghĩa reload PWA offline đã đạt |
| Thuật toán | Linear, Polynomial, Ridge, Lasso: Step, metric, Reset | Đạt |
| Điều khiển | Chạy, tạm dừng, Stop, quay lại chọn thuật toán, hủy/xác nhận đổi thuật toán | Đạt |
| Dữ liệu sinh | linear, curved, correlated, sparse, tái sinh và chạy bước học | Đạt; tính tái lập theo seed có unit test |
| CSV | File hợp lệ, file sai cấu trúc, điền thiếu bằng mean, chuẩn hóa, đưa vào huấn luyện | Đạt; có điểm UX khi chọn file lỗi sau file hợp lệ |
| 3D | Canvas WebGL, các góc camera, reset camera | Đạt trong Chrome |
| Fallback | Tắt WebGL, chọn thuật toán bằng bàn phím, vẫn chạy Step và báo lỗi đồ họa rõ ràng | Đạt |
| Học | Một vòng A–F chỉ commit một iteration; xem lại cả 6 pha không commit thêm; mở ghi chú | Đạt |
| Lưu/khôi phục | Lưu CSV + hệ số + metric; xóa cache bản ghi local rồi kéo lại từ BE | Đạt, dữ liệu khôi phục khớp |
| So sánh/xuất | So sánh hai lần chạy; tải JSON và CSV | Đạt; bố cục bảng còn chật |
| Đồng bộ | Pull bản sửa remote, xóa offline rồi gửi tombstone khi online, cách ly dữ liệu hai tài khoản | Đạt |
| Giới hạn tên | Tên 121 ký tự | Được từ chối với thông báo tối đa 120 ký tự |
| Xung đột xóa/sửa | Server v2 mới hơn bản local v1, local gửi delete v1 | Server vẫn áp dụng delete; xem phát hiện 2 |
| Responsive | Lab và học ở 1440/768/390 px | Không tràn ngang trong các trạng thái đã đo; màn đăng nhập có lỗi riêng |
| Theme/chuyển cảnh | Bộ pearl-theme, pearl-transition và kiểm tra sáng/tối trực tiếp | Đạt các assertion của hai suite; chưa bao phủ mọi animation cũ |

## 4. FE đang gọi bao nhiêu API BE?

Đếm theo **HTTP method + path**, không tính query `?since=...` thành API mới, không tính API chỉ xuất hiện trong test/comment, không tính file JS/CSS/service worker.

| # | API FE gọi | Mục đích | Số response trong kịch bản tích hợp mẫu |
|---|---|---|---:|
| 1 | `POST /api/v1/auth/register` | Tạo tài khoản | 1 |
| 2 | `POST /api/v1/auth/login` | Đăng nhập | 2: một lần sai, một lần đúng |
| 3 | `GET /api/v1/auth/me` | Khôi phục/xác nhận phiên trước đồng bộ | 8 |
| 4 | `POST /api/v1/auth/logout` | Thu hồi phiên | 1 |
| 5 | `POST /api/v1/sync/batch` | Gửi thao tác lưu/xóa theo lô | 3 |
| 6 | `GET /api/v1/sync/changes` | Kéo thay đổi, gồm tombstone | 6 |
| | **Tổng** | **6 endpoint** | **21 response** |

Nguồn gọi trong FE: `src/app/state/auth-session.ts` (wrapper fetch dòng 65; auth request dòng 75, restore dòng 98, ensure dòng 140, logout dòng 154); `src/app/state/experiments-store.ts` (sync URL dòng 7, pull dòng 115, batch dòng 183).

Request dùng cookie với `credentials: include`; request ghi thêm `X-Requested-With: XMLHttpRequest`. HTTP 401 đầu phiên chưa đăng nhập và lần đăng nhập sai là kết quả mong đợi trong kịch bản test, không phải lỗi kết nối.

**Đối chiếu BE đang được nạp: 31 endpoint, FE gọi trực tiếp 6/31 (~19,4%).** Phần chưa gọi không tự động là thiếu chức năng: cần đối chiếu phạm vi sản phẩm.

| Nhóm BE đang hoạt động | Số endpoint | FE dùng trực tiếp |
|---|---:|---:|
| Root và health | 2 | 0 |
| Auth trong LoginModule | 4 | 4 |
| Users | 8 | 0 |
| Datasets | 6 | 0 |
| Experiments | 6 | 0 |
| Training runs | 3 | 0 |
| Sync | 2 | 2 |
| **Tổng** | **31** | **6** |

`src/auth/auth.controller.ts` có code auth cũ nhưng không thuộc module auth đang được import trong `AppModule`; không cộng các route đó vào số endpoint hoạt động.

Các thao tác sau **không gọi API riêng**:

- Huấn luyện, tính metric, học A–F: engine/Web Worker tại FE.
- Nhập CSV: xử lý trong trình duyệt, không gọi `/datasets/upload`.
- Lưu/xóa thí nghiệm: IndexedDB + `/sync/batch`, không gọi trực tiếp CRUD `/experiments`.
- So sánh, xuất JSON/CSV, điều khiển 3D, đổi theme: xử lý tại FE.
- Guest không gọi `/auth/guest`; lần mở ứng dụng online vẫn có thể gọi `/auth/me` để kiểm tra session trước khi vào Guest.

Trong phép kiểm chứng, công cụ test có gọi `/experiments/:id` để đọc/sửa dữ liệu mô phỏng thiết bị khác. Đây là request của công cụ kiểm thử, **không tính là API do ứng dụng FE sử dụng**. Log 21 response chỉ thu từ page FE của kịch bản chính, không gồm các kịch bản test bổ sung.

## 5. Những chỗ chưa ổn

Mức P1: chặn phát hành. P2: ảnh hưởng chức năng, thông tin, tiếp cận hoặc trải nghiệm rõ rệt. P3: cải thiện chất lượng/độ rõ ràng. Tất cả đề xuất dưới đây **chưa được triển khai**.

### 1. P1 — Build production FE thất bại

- Lệnh tái hiện: `npm.cmd run build`.
- `welcome-panel.css`: **9,58 kB**, vượt giới hạn lỗi 8 kB khoảng **1,58 kB**.
- `algorithm-picker.css`: **8,76 kB**, vượt khoảng **763 byte**.
- `training-controls.css`: **4,80 kB**, vượt mức cảnh báo 4 kB nhưng chưa vượt mức lỗi.
- Initial bundle là 410,61 kB; lỗi hiện tại nằm ở budget CSS component, không phải initial bundle.
- Ảnh hưởng: quy trình build hiện tại không tạo được bản production hợp lệ để xác nhận triển khai/PWA. Dev server chạy được không thay thế kết quả này.
- Đề xuất: rà soát CSS trùng/ghi đè và thống nhất budget theo quyết định dự án; không chỉ coi build dev là đủ.

### 2. P2 — Xóa offline dùng phiên bản cũ vẫn xóa bản server mới hơn

- Tái hiện với BE thật: tạo thí nghiệm v1; thiết bị khác sửa thành v2; gửi thao tác `delete` với `clientVersion: 1`.
- Kết quả: `/sync/batch` trả **`applied`, serverVersion 3**, bản ghi có `deletedAt`. Không trả conflict, UI không hiện hai lựa chọn xử lý xung đột trong tình huống này.
- Đối chiếu: `BE/src/sync/sync.service.ts:280` xử lý delete mà không kiểm tra phiên bản như nhánh update.
- Ảnh hưởng: chỉnh sửa mới trên thiết bị khác có thể bị ẩn/xóa mềm bởi thao tác offline cũ mà người dùng không được cảnh báo. Chưa phải bằng chứng dữ liệu bị xóa vật lý vĩnh viễn.
- Đây là **hành vi đã xác nhận, chính sách sản phẩm cần quyết định**: nếu cố ý để xóa luôn thắng thì cần mô tả rõ; nếu mong muốn bảo vệ cập nhật mới thì cần cơ chế phát hiện xung đột tương ứng.
- Bằng chứng: `stale-delete-results.json`, `conflict-results.json`. Hai nút giải quyết conflict chưa được kiểm chứng thành công với BE thật trong đợt này; unit test có bao phủ các nhánh xử lý conflict.

### 3. P2 — R² hiển thị `NaN` cho dữ liệu Y hằng

- Tái hiện: nhập CSV 20 dòng `x = 0..19`, mọi `y = 5`; dùng chuẩn hóa mặc định; bấm Step.
- MSE/RMSE/MAE bằng 0; bảng hiển thị **R² = NaN** cho cả train và test.
- R² không xác định khi Y không có phương sai là hợp lý về tính toán. Vấn đề là trình bày `NaN` không có giải thích cho người học.
- Vị trí: `src/app/features/results-panel/results-panel.html:34`; engine chủ động trả NaN ở `src/app/core/engine/metrics.ts`.
- Đề xuất: hiển thị “Không xác định”/“—” kèm lý do Y hằng, thống nhất với cách định dạng ở phần so sánh.
- Bằng chứng: `constant-target.png`, `constant-and-overflow.json`.

### 4. P2 — Giải thích tiền xử lý CSV tự mâu thuẫn

- Tái hiện: nhập `learning-demo.csv`, chọn mean và chuẩn hóa; chạy bài học; mở pha A → “Xem chi tiết”.
- Cùng nội dung xuất hiện cả “chỉ được tính từ train” và “Tiền xử lý hiện được tính trước khi chia train/test”.
- Vị trí: `learning-walkthrough.html:89` và `:95`.
- Engine thực tế chia tập trước rồi tính giá trị điền thiếu/thống kê chuẩn hóa từ train; unit test cũng xác minh điều này. Vì vậy câu mô tả hạn chế cũ không còn khớp cách tính.
- Ảnh hưởng: người học có thể hiểu sai về data leakage dù engine hiện xử lý đúng.
- Đề xuất: thống nhất nội dung theo thuật toán thực tế. `functional-results.json` ghi lại việc cả hai câu cùng có trong DOM hiển thị.

### 5. P2 — Đăng nhập sáng trên mobile bị tràn ngang

- Tái hiện: viewport **390 × 844**, chuyển sáng, mở đăng nhập, chờ chuyển cảnh kết thúc.
- Đo được `scrollWidth = 399`, lớn hơn chiều rộng viewport 390; có thể cuộn ngang. Nhóm nền gồm `starfield-base`, `spatial-host`, canvas và `scene-wipe` vươn đến x = 399.
- Chỉ kết luận cho trạng thái đã tái hiện; lab và học không tràn ngang trong các phép đo ở 1440/768/390.
- Đề xuất: kiểm tra kích thước/overflow lớp nền và các lớp chuyển cảnh ở mobile.
- Bằng chứng: `login-light-mobile-settled.png`, `constant-and-overflow.json`.

### 6. P2 — Nhiều điều khiển chưa có accessible name

- Đã đo **7 điều khiển nhìn thấy trong lab Linear** không có label liên kết, `aria-label` hay `aria-labelledby`: learning rate, max iterations, nhịp iteration, số mẫu, noise, train/test ratio và seed.
- Chữ label đang đặt cạnh control nhưng không dùng `for/id` hoặc bao control trong label. Với Polynomial/Ridge/Lasso, nhãn Degree/Lambda trong source có cùng kiểu thiếu liên kết.
- Ảnh hưởng: trình đọc màn hình khó nhận biết ô chỉnh gì; click nhãn cũng không bảo đảm focus vào control tương ứng.
- Vị trí: `training-controls.html:48,57,66`; `data-panel.html:18,22,25,29`. Bằng chứng DOM ở `functional-results.json`.
- Đề xuất: liên kết nhãn và control đúng ngữ nghĩa; kiểm tra thêm với screen reader thật.

### 7. P2 — Thanh thao tác bài học che/chồng nội dung khi cuộn

- Ở desktop, cuộn panel bài học đến các pha cuối; thanh “Học từng bước / Iteration / Đến ghi chú” dính trên đầu nhưng có thể thấy chữ/nút pha D phía dưới chồng vào thanh.
- `learning-walkthrough.css:244` dùng sticky với nền `var(--surface)`; ảnh cho thấy lớp nền chưa tách nội dung cuộn đủ rõ.
- Đề xuất: bảo đảm nền của thanh sticky đủ kín, khoảng đệm và thứ tự lớp không làm lẫn chữ.
- Bằng chứng: `learning-1440.png`.

### 8. P2 — Bộ kiểm thử UI chưa phản ánh đúng giao diện hiện tại

- Nhiều bài vẫn cho rằng trang đầu là welcome/login; thực tế `App.activeScreen` mặc định là `algorithms`. Các bài tìm `.guest-button`/email trong welcome bị ẩn sẽ timeout.
- Một số bài khóa vào màu/font/title cũ; không đạt assertion chưa đủ để kết luận chức năng tương ứng hỏng.
- `model-integrity.e2e.js` còn dùng `/experiments/bulk`, trong khi FE hiện gửi `/sync/batch`, và có thao tác lưu sau khi vào Guest.
- `run-ui-redesign.ps1` dừng ở bài lỗi đầu tiên; vì vậy một lượt runner đỏ có thể khiến phần lớn chức năng chưa được chạy.
- Đề xuất: cập nhật tiền điều kiện, selector và contract của bộ test trong một đợt sửa riêng. Đợt đánh giá này giữ nguyên test và kiểm tra bổ sung theo luồng hiện tại.

### 9. P3 — Chữ phụ nhỏ và phong cách chữ chưa thống nhất

- Nhãn trên thẻ, chip công thức, hướng dẫn quả cầu có vùng khoảng **7–9 px**; nhỏ trên desktop và khó đọc trên mobile.
- Tiêu đề/thẻ dùng Geist, nhiều nút/form/lab dùng Times New Roman; `styles.css:287` áp font serif toàn cục bằng `!important`, rồi component lại ghi đè.
- Glow, viền và chữ hoa xuất hiện dày; tạo nhận diện nhưng làm chữ nhỏ kém rõ và giảm phân cấp thị giác.
- Đề xuất: tăng chữ phụ, bớt hiệu ứng trên thông tin cần đọc lâu và thống nhất vai trò của hai kiểu chữ.
- Bằng chứng: ảnh `inspection/*-fold.jpg`, `login-desktop.png`, `lab-member-desktop.png`.

### 10. P3 — Tablet chồng chú thích; mobile phải cuộn nhiều trước thao tác chính

- Ở 768 px, hướng dẫn dưới quả cầu và “EXPLORE THE SURFACE / CHỌN ĐỂ BẮT ĐẦU” chồng nhau; tiêu đề xuống ba dòng và bị ép cạnh quả cầu.
- Ở mobile, form đăng nhập nằm sau phần giới thiệu/quả cầu; phần nhập dữ liệu trong lab nằm dưới 3D và kết quả, nên thao tác đổi CSV/thiết lập dữ liệu cần cuộn khá xa.
- Đề xuất: tách lại vùng chú thích tablet và ưu tiên thứ tự nội dung theo việc người dùng cần làm trên điện thoại.
- Bằng chứng: `inspection/tablet-fold.jpg`, `login-light-mobile-settled.png`, `lab-390.png`.

### 11. P3 — Biểu đồ và bảng so sánh chưa thuận tiện để đọc số

- Biểu đồ MSE có đường train/test nhưng không có số trục Y hoặc mốc iteration bên trong biểu đồ; chỉ có nhãn khoảng iteration bên ngoài. Khó đọc mức độ thay đổi tại từng vị trí.
- Bảng so sánh nằm trong cột thí nghiệm rất hẹp ở desktop; có cuộn ngang nội bộ, chỉ thấy một phần cột. Đây là bố cục bất tiện, không phải dữ liệu bị mất.
- Chú thích nói “ô ... màu xanh” nhưng ô tốt nhất thực tế dùng accent vàng ở theme đã chụp.
- Đề xuất: cho bảng so sánh vùng rộng hơn; thêm thang đo/tương tác đọc số cho biểu đồ; đồng bộ chú thích màu.
- Bằng chứng: `lab-member-desktop.png`; `results-panel.html`, `experiments-panel.html`.

### 12. P3 — Trạng thái disabled và dữ liệu cũ cần rõ hơn

- Guest không bấm Lưu/Đồng bộ được đúng theo thiết kế, nhưng các nút vẫn có hiệu ứng gần giống nút đang hoạt động; CSS disabled giữ opacity 1.
- Sau khi đã chọn CSV hợp lệ rồi chọn một CSV lỗi, ứng dụng báo lỗi nhưng vẫn giữ tên/bảng xem trước và nút áp dụng của file cũ. Đây không phải mất dữ liệu, nhưng dễ làm người dùng tưởng file mới vẫn dùng được.
- Đề xuất: thể hiện rõ nút bị khóa và nói rõ “đang giữ file trước” khi file mới bị từ chối.
- Bằng chứng: `lab-1440.png`, `constant-and-overflow.json`.

### 13. P3 — Màn đầu và tài liệu có chi tiết chưa thống nhất

- Màn chọn thuật toán có phong cách riêng nhưng tiêu đề “Mỗi dữ liệu, một khả năng” chưa nói rõ tên sản phẩm hoặc mục đích học hồi quy; màn này không có H1 nhìn thấy, dùng H2.
- README nói không tin danh tính cũ trong localStorage, trong khi `AuthSession` hiện lưu `regression.lastIdentity` và có nhánh khôi phục danh tính local khi offline/lỗi mạng. Đây là khác biệt tài liệu; không phải bằng chứng vượt xác thực BE.
- Helper BE `test/run-browser-backend.mjs` đọc `.env`, chọn tên DB `regression_browser_*` và không gọi `configureApp`; trong khi code hiện tại khi `NODE_ENV=test` chỉ chấp nhận DB `hoi-quy-3d-test`. Cần rà lại hướng dẫn/helper trước khi sử dụng. Nhận xét này từ đọc mã, không chạy helper đó lên database ứng dụng.
- Đề xuất: đồng bộ tài liệu và quy trình test với phiên bản đang chạy.

## 6. Đánh giá giao diện

Điểm mạnh: chủ đề hành tinh tạo nhận diện; các thuật toán có thẻ chọn rõ; không gian 3D và lộ trình A–F trực quan; có theme sáng/tối, reduced motion và fallback WebGL. Lab/học đã tự sắp xếp cột khi giảm chiều rộng.

Đánh giá chủ quan theo ảnh: thiết kế 6,5/10; dễ dùng 5,5/10; tính riêng 7,5/10; nội dung 6/10. Điểm trọng số khoảng 6,4, giới hạn **6/10** vì còn lỗi giao diện thực tế. Đây là đánh giá thiết kế, không phải tỷ lệ chức năng đúng.

Ba việc cải thiện giao diện có tác động rõ nhất: sửa overflow/chồng chữ; tăng độ dễ đọc và liên kết nhãn control; dành nhiều chỗ hơn cho nhập dữ liệu/so sánh và làm rõ thứ tự thao tác trên mobile.

Inspector dùng bộ quy tắc `design-taste-frontend`: 9 nhóm FAIL/5 WARN; lint source báo nhiều gradient/glow/emoji và cả dữ liệu giả trong test. **Không xem các cảnh báo phong cách hoặc fixture trong test là lỗi sản phẩm một cách máy móc.** Các phát hiện đưa vào mục 5 đã được đối chiếu với ảnh/DOM/source thực tế.

## 7. Chi tiết bộ E2E UI cũ

Đã chạy 25 file (24 file trong danh sách runner và thêm `login-motion`) bằng Playwright, mỗi bài có context riêng để tránh ảnh hưởng lẫn nhau. Bài `lab` được chuẩn bị bằng luồng `entry`. Lần đầu: **6 PASS/19 không đạt**. `learning-offline` phụ thuộc trạng thái lab từ bài trước; chạy lại với tài khoản đã đăng nhập và lab đang mở thì PASS. Kết quả diễn giải cuối:

| Trạng thái | Suite |
|---|---|
| Đạt (7) | pearl-transition, pearl-theme, auth-session, guest-memory, entry, lab, learning-offline (sau chuẩn bị đúng) |
| Không đạt assertion màu/font/title (3) | entry-validation: màu input; neon: font heading; planet: tiêu đề cũ |
| Không đạt do kỳ vọng màn welcome hoặc selector thuộc luồng cũ (14) | lesson-restart, page-modes, mobile-fallback, sphere, motion, slides, navigation-layout, learning-route, smooth-learning, card-glow, shared-planet, lab-arrival, algorithm-flight, model-integrity |
| Bị chặn môi trường (1) | login-motion hard-code cổng 4301; server test chạy cổng 4300 |

`motion` báo “Wheel must not change pages” nhưng assertion của nó yêu cầu algorithms đang ẩn ngay từ đầu, trái với trạng thái hiện tại; không dùng lỗi này để kết luận cuộn chuột đã tự chuyển trang.

Không sửa các bài test để làm kết quả xanh. Luồng trực tiếp ở mục 3 được thực hiện bổ sung; vì vậy không thể suy diễn “17 suite không đạt” thành “17 chức năng ứng dụng hỏng”. Chưa chạy `pwa-persistence` vì production build lỗi; `profile-learning` là script profiling riêng, chưa chạy trong đợt này. `persistence-live` nguyên bản có giả định màn welcome cũ, nên kiểm chứng tích hợp dùng thao tác theo màn hiện tại và lưu log riêng.

## 8. Thứ tự xử lý đề xuất và giới hạn còn lại

1. Khôi phục build production thành công, sau đó mới xác nhận SSR/PWA offline reload.
2. Quyết định rõ chính sách xóa offline gặp bản server mới hơn.
3. Sửa nội dung CSV và cách trình bày R² không xác định.
4. Sửa overflow mobile, thanh bài học chồng chữ và accessible name.
5. Đồng bộ E2E/tài liệu, rồi cải thiện chữ, biểu đồ và bảng so sánh.

Các mục chưa chứng minh trong đợt này: production HTTPS/cookie/SW, hai nhánh giải quyết conflict bằng UI với BE thật, stress test dữ liệu sát 20 MB/8 MiB, toàn bộ tổ hợp thông số, Safari/Firefox và cảm ứng thật. Unit test có kiểm tra nhiều nhánh lỗi/đồng bộ nhưng không thay thế các kiểm tra triển khai và thiết bị này.

## 9. Bằng chứng lưu kèm

Tất cả nằm trong thư mục cùng báo cáo:

- `live-results.json`: 15 kiểm tra FE–BE, 21 response API, không có pageerror.
- `functional-results.json`: thuật toán, dữ liệu, camera, A–F, responsive và kiểm tra nhãn.
- `e2e-results.json`: kết quả nguyên bản 25 bài UI; `learning-offline-with-setup.json`: kết quả chạy lại đúng tiền điều kiện.
- `constant-and-overflow.json`: R² NaN, CSV lỗi giữ file cũ, đo overflow.
- `stale-delete-results.json`: bản v1 → sửa v2 → delete v1 được áp dụng thành v3.
- `conflict-results.json`: giới hạn tên đạt; không hiện hộp conflict ở tình huống delete.
- `inspection/report.json` và ảnh desktop/tablet/mobile: kết quả inspector.
- `login-*.png`, `lab-*.png`, `learning-*.png`, `constant-target.png`, `webgl-fallback.png`: bằng chứng giao diện.
- `hoiquy3d-experiments.json/.csv`: kết quả tải từ chức năng export bằng dữ liệu test.

Các file `edge-results.json` và `edge-verified-results.json` là log thăm dò trung gian: có thao tác thiếu tiền điều kiện hoặc đợi sai điều kiện. Không dùng các timeout đó làm kết luận lỗi sản phẩm; kết luận cuối đã đối chiếu bằng những log chuyên biệt nêu trên và mã nguồn.
