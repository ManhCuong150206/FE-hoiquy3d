# Đặc tả làm mới giao diện — Hồi quy 3D

- **Phiên bản:** 1.3
- **Triển khai:** Đã có phiên bản giao diện cục bộ; xem [kết quả kiểm thử](UI-REDESIGN-VERIFICATION.md).
- **Ngày:** 30/10/2026
- **Phạm vi:** Đặc tả giao diện và bản triển khai cục bộ; chưa kết nối xác thực thật
- **Frontend hiện tại:** Angular + TypeScript + Three.js
- **Tài liệu tham khảo trải nghiệm:** https://robinpayot.com/

## 1. Mục đích

Làm mới trải nghiệm và phong cách hình ảnh của website Hồi quy 3D dựa trên frontend Angular hiện có. Công việc tập trung vào màu sắc, bố cục, animation, màn hình vào ứng dụng và cách chuyển giữa các màn hình.

Không viết lại hoặc thay đổi logic tính hồi quy, xử lý CSV, trạng thái huấn luyện, kết quả, Web Worker, IndexedDB hay hợp đồng API hiện tại. Giao diện mới phải dùng lại các thành phần và trạng thái hiện có của phòng thực nghiệm.

## 2. Mục tiêu thiết kế

1. Tạo phong cách công nghệ hiện đại, nền đen, nội dung dễ đọc và vùng 3D nổi bật.
2. Dùng màu thuật toán nhất quán để nhận diện Linear, Polynomial, Ridge và Lasso.
3. Tạo luồng các trang độc lập, mỗi lần chỉ hiện một trang: Đăng nhập/Guest → chọn thuật toán bằng cầu 3D → phòng thực nghiệm → trang học từng bước, ghi chú và mô hình 3D.
4. Dùng hiệu ứng Liquid Glass cho nút và bề mặt tương tác theo cách phù hợp với web.
5. Thêm hiệu ứng con trỏ nhẹ trên thiết bị có chuột; không ảnh hưởng nhập liệu hay điều khiển cảnh 3D.
6. Cố định trần render 3D và GSAP ở 60 FPS, kể cả màn hình 120/144/240 Hz; tối ưu công việc mỗi khung hình trong ngân sách khoảng 16,67 ms.
7. Có chế độ giảm hiệu ứng khi thiết bị yếu hoặc người dùng bật Reduce Motion.

## 3. Phạm vi thay đổi

### Được phép thay đổi trong đợt giao diện

- CSS toàn cục, theme tokens, màu sắc, typography, khoảng cách, đường viền, bóng và responsive layout.
- Template trình bày của các panel, thứ tự bố cục, navigation và trạng thái trực quan.
- Bổ sung các component trình bày cho màn hình đăng nhập/guest và màn hình chọn thuật toán.
- Bổ sung bộ điều phối giao diện để điều khiển màn hình hiện tại và thuật toán được chọn, rồi gọi API trạng thái hiện có của `LabStore` để mở đúng thuật toán.
- Thay cách bố trí/ánh sáng/chất liệu của cảnh 3D khi không đổi ý nghĩa dữ liệu và logic huấn luyện.

### Không thay đổi

- Công thức, thuật toán, dữ liệu đầu vào/đầu ra và quy tắc cập nhật model.
- Hành vi CSV, chia train/test, seed, metric, history, lưu offline và IndexedDB.
- API, schema MongoDB, xác thực thật, đăng ký tài khoản hoặc lưu mật khẩu.
- Ý nghĩa màu phân biệt train/test, điểm dự đoán, residual hoặc chú giải dữ liệu; được đổi mã màu nhưng phải giữ rõ nhãn/ý nghĩa.

Màn hình đăng nhập/đăng ký trong giai đoạn này là **giao diện prototype**. Không gửi, lưu hoặc log email/mật khẩu. Nút submit chỉ hiển thị trạng thái demo hoặc chuyển tiếp theo prototype; Submit hợp lệ hoặc Guest kích hoạt chuyển cảnh phát sáng/phóng nhẹ; không xem đây là đăng nhập tài khoản thật.

## 4. Luồng màn hình và tương tác

### Màn hình 1 — Chào mừng và vào ứng dụng

- Toàn màn hình, nền đen, nhận diện “Hồi quy 3D”, tiêu đề ngắn và lời giới thiệu.
- Form email và mật khẩu; nút “Đăng nhập”.
- Liên kết/nút “Đăng ký” để chuyển trạng thái form giao diện.
- Nút nổi bật “Tham gia với tư cách Guest”.
- Nút “Khám phá”, Login/Register demo hợp lệ hoặc Guest chuyển sang trang chọn thuật toán; cuộn không chuyển trang.
- Do chưa có auth backend, không xác thực tài khoản và không lưu thông tin form.

### Màn hình 2 — Cầu 3D chọn thuật toán

- Một khối cầu đặc ở trung tâm, chia thành bốn vùng màu có nhãn rõ ràng tương ứng bốn thuật toán.
- Vùng màu có thể là bốn dải/vùng cong liền trên bề mặt, vẫn giữ cảm giác một quả cầu thống nhất; tránh chia thành bốn khối rời gây khó hiểu.
- Khi hover/focus một vùng: tăng sáng nhẹ, hiện tên, mô tả ngắn và dấu hiệu chọn.
- Khi chọn: dùng chuyển động camera/khối cầu để tạo chuyển cảnh sang phòng thực nghiệm; gọi lựa chọn thuật toán tương ứng trong `LabStore` hiện tại.
- Có chỉ dẫn thao tác bằng chuột, bàn phím và nút “Quay lại”. Trong phòng thực nghiệm, người dùng có thể quay lại đây để chọn thuật toán khác.

### Màn hình 3 — Phòng thực nghiệm

Dùng lại header, training controls, experiments panel, data panel, viewport3d và results panel. Learning walkthrough và algorithm notes chuyển sang màn hình 4.

- Khi vào, thuật toán được chọn trên cầu phải hiển thị đồng nhất ở điều khiển, ghi chú, metric và vùng 3D.
- Không tạo bản sao logic của các panel/engine hiện tại chỉ để phục vụ màn hình mới.
- Điều khiển chạy, pause, step, stop, reset, chọn dữ liệu và xem kết quả giữ nguyên hành vi.
- Có nút điều hướng “Đổi thuật toán” để quay lại màn hình cầu mà không mất dataset/thí nghiệm đang có; nếu đổi thuật toán làm mất snapshot huấn luyện theo logic hiện tại thì giao diện báo rõ trước khi áp dụng.

### Màn hình 4 — Học từng bước cùng mô hình 3D

- Trang riêng sau phòng thực nghiệm; dùng nút đi tới/quay lại. Chỉ trang hiện tại được hiển thị.
- Desktop: mô hình 3D bên trái, giải thích sáu pha bên phải, ghi chú thuật toán phía dưới. Mobile xếp dọc.
- Tái sử dụng `Viewport3d`, `LearningWalkthrough`, `AlgorithmNotes` với cùng `LabStore`; giữ nguyên dataset, thuật toán, iteration, snapshot và mẫu đang chọn.
- Hai viewport có ID điều khiển riêng để tránh trùng label/ID. Scene ngoài màn hình ngừng render theo cơ chế hiện có.
- Lộ trình sáu pha xuất hiện trước khi bắt đầu; không có phép tính nào chạy chỉ để hiển thị danh sách này.
- Cuộn chỉ đọc nội dung trong trang hiện tại, không chuyển trang. Bật học từng bước, bắt đầu pha, chuyển pha hoặc phát trình diễn đều do nút điều khiển hiện có; cuộn không gọi cập nhật mô hình.
- Nếu mô hình đang chạy tự động từ trước, vòng chạy hiện có vẫn giữ hành vi; điều hướng không tự bật một vòng chạy mới.

### Chuyển trang và chuyển cảnh

- Bốn trang giữ component/state khi đã tải nhưng chỉ một trang được hiển thị. Trang ẩn dùng `hidden`/`display:none`, không tham gia bố cục, tương tác hoặc tab order.
- Chỉ nút bấm hoặc bấm vùng màu trên cầu đổi trang; wheel/Page Down chỉ đọc nội dung dài trong trang hiện tại. Wheel trên canvas mô hình vẫn zoom camera như trước.
- Mỗi lần chuyển: trang cũ mờ/lùi nhẹ 0,3 giây → đổi trang dưới lớp màu → trang mới hiện lên 0,6 giây và nội dung xuất hiện so le. Tổng khoảng 1–1,3 giây tùy số panel.
- Trang chọn: cầu phóng từ xa và xoay nhẹ vào vị trí; copy/card hiện theo lớp. Trang thực nghiệm: heading, controls và các panel hiện lần lượt. Trang học: mô hình và giải thích vào từ hai phía.
- Lựa chọn điều hướng mới hoàn tất trạng thái của chuyển cảnh trước rồi bắt đầu chuyển mới, tránh hai trang cùng hiện. Focus được đặt ở tiêu đề sau khi kết thúc.
- Hiệu ứng Nhẹ/reduced motion đổi trang trực tiếp, vẫn giữ trạng thái học. Không dùng ScrollTrigger/ScrollTo hoặc cuộn ép để đổi trang.
- Đây là điều hướng bằng state của Angular trong cùng ứng dụng; chưa tạo các URL route riêng.

## 5. Design tokens và bảng màu

Định nghĩa màu thành CSS custom properties ở theme/global stylesheet Angular để toàn bộ app dùng cùng một nguồn. Không rải mã màu tùy ý trong từng component. Tên token thể hiện vai trò; component truy cập token thay vì hard-code màu.

| Token/vai trò | Màu đề xuất | Dùng cho |
|---|---|---|
| `--color-bg` | `#07090E` | Nền chính đen sâu |
| `--color-surface` | `#10141D` | Panel và card |
| `--color-surface-glass` | `rgba(24, 29, 42, 0.62)` | Bề mặt kính trong mờ |
| `--color-border` | `rgba(205, 220, 255, 0.16)` | Viền panel/nút |
| `--color-text` | `#F4F7FF` | Chữ chính |
| `--color-muted` | `#A3AEC2` | Chữ phụ |
| `--color-primary` | `#8B7CFF` | CTA, focus và điều hướng chính |
| `--color-linear` | `#35E6FF` | Linear Regression — neon cyan |
| `--color-polynomial` | `#FF63B6` | Polynomial Regression — neon hồng |
| `--color-ridge` | `#A78BFA` | Ridge Regression — neon tím |
| `--color-lasso` | `#D7E0EE` | Lasso Regression — bạc lạnh |
| `--color-train` | `#43F5B0` | Điểm/tập Train |
| `--color-test` | `#FF5478` | Điểm/tập Test |
| `--color-warning` | `#FFC857` | Cảnh báo và giá trị cần chú ý |

Màu algorithm accent dùng cho cầu chọn, nhãn thuật toán và viền nhấn trong phòng thực nghiệm. Màu Train/Test tiếp tục mang nghĩa tập dữ liệu; không đổi chúng theo thuật toán. Luôn đi kèm label, ký hiệu hoặc hình dạng để người mù màu không phải dựa riêng vào màu.

## 6. Liquid Glass trên web

“Liquid” trong tài liệu này là phong cách giao diện kính lỏng lấy cảm hứng từ iOS 26, không phải API/framework Apple được nhúng vào Angular.

- Nền bán trong suốt, backdrop blur vừa phải, viền sáng mảnh, highlight phản chiếu và gradient rất nhẹ.
- Nút có trạng thái rõ: mặc định, hover, focus-visible, pressed, disabled và loading.
- Hover có thể tăng highlight/độ sáng; khi nhấn có scale rất nhỏ và phản hồi nhanh.
- Giữ độ tương phản chữ cao; không đặt text nhỏ trên vùng kính nhiều chi tiết.
- Dùng CSS trước; tránh shader/WebGL riêng cho từng nút. Nếu `backdrop-filter` không được hỗ trợ, fallback sang màu surface đặc.
- Không áp hiệu ứng blur nặng lên toàn bộ viewport hoặc số lượng lớn card cùng lúc.

## 7. Con trỏ và animation

- Hiệu ứng con trỏ là quầng sáng nhỏ/đốm glow có độ trễ ngắn, độ mờ thấp và không che nội dung.
- Chỉ bật khi `hover: hover` và có con trỏ chính xác; tắt trên cảm ứng.
- Không thay con trỏ hệ thống trên control cần độ chính xác; không chặn pointer events (`pointer-events: none`).
- Tránh theo dõi/lưu tọa độ con trỏ; đây chỉ là hiệu ứng trang trí cục bộ.
- Ưu tiên transform/opacity; tránh animation liên tục gây layout/repaint lớn.
- Tắt hoặc giảm hiệu ứng khi `prefers-reduced-motion: reduce`.

## 8. Cầu 3D, ánh sáng và vật liệu

- Dùng Three.js hiện có trong `Viewport3d`; cầu thuật toán là một scene/component trình bày riêng, không thay engine học.
- Bề mặt cầu có thể dùng `MeshPhysicalMaterial`/PBR với metallic, roughness và clearcoat vừa phải. Neon phát sáng dùng emissive tiết chế để vẫn thấy nhãn và ranh giới màu.
- Ánh sáng cơ sở: HemisphereLight cho ánh sáng môi trường dịu; một DirectionalLight chính cho vùng sáng/bóng khối; điểm nhấn bổ sung chỉ khi cần.
- Dùng tone mapping và màu nền đồng nhất để giữ màu token gần với giao diện. Reflection/environment map chỉ dùng khi có ngân sách hiệu năng; không yêu cầu tải texture HDR lớn cho prototype.
- Bóng đổ thời gian thực, transmission/refraction và nhiều đèn động là tùy chọn nâng cao, mặc định tắt nếu làm giảm FPS.
- Mỗi vùng thuật toán có nhãn DOM accessible tương ứng; chọn được bằng click, Enter/Space và bàn phím.

## 9. Yêu cầu hiệu năng

Render 3D và ticker GSAP giới hạn tối đa 60 FPS. Một khung hình mục tiêu có ngân sách 16,67 ms. Máy yếu hoặc tác vụ nặng vẫn có thể đạt ít hơn 60 FPS; không thể ép phần cứng luôn giữ đúng 60. Đo số lần render WebGL thực, không dùng tần số requestAnimationFrame của màn hình làm FPS của cảnh.

- Giữ tính toán hồi quy trong Web Worker như hiện tại; không chuyển computation vào vòng render.
- Render scene chỉ khi cần hoặc khi animation/camera đang chuyển động; dừng requestAnimationFrame khi component bị ẩn/hủy.
- Tận dụng InstancedMesh cho điểm dữ liệu; giới hạn số mẫu hiển thị và dùng sampling khi dataset lớn, nhưng không đổi dữ liệu gốc hoặc kết quả mô hình.
- Giới hạn device pixel ratio theo cấu hình thích ứng (mốc khởi đầu 1.5–2); giảm resolution/particle/shadow trước khi giảm tính năng học.
- Lazy-load scene cầu nếu phù hợp; giải phóng geometry, material, texture và listener khi rời màn hình.
- Dùng IntersectionObserver/Page Visibility để tạm ngừng animation khi trang/tab không hiển thị.
- Có chế độ chất lượng thấp: bỏ bloom, blur mạnh, bóng động và particle; giảm pixel ratio và mật độ mesh.
- Đo FPS/frame time trên desktop 60 Hz và 144 Hz; kiểm tra thêm thiết bị phổ thông. Mục tiêu nghiệm thu: render không vượt trần 60 FPS, gần 60 FPS trên cấu hình demo đã đo và không có freeze kéo dài; ghi rõ giới hạn của máy thử.

## 10. Responsive, khả năng tiếp cận và fallback

- Thiết kế desktop-first nhưng hoạt động từ mobile/tablet; panel hiện tại có thể xếp thành cột/accordion trên màn hình hẹp.
- Form đăng nhập có label, thông báo lỗi gắn với trường, focus-visible và thứ tự Tab hợp lý.
- Không dùng màu làm tín hiệu duy nhất; giữ tên thuật toán và Train/Test trong legend.
- Tôn trọng `prefers-reduced-motion`, contrast, zoom trình duyệt và thao tác bàn phím.
- Nếu WebGL không khởi động được, vẫn cho dùng màn hình đăng nhập demo, chọn thuật toán qua card DOM và phòng thực nghiệm ở chế độ fallback phù hợp.

## 11. Ánh xạ vào cấu trúc Angular hiện có

Frontend nằm tại `FE/FE-hoiquy3d`.

- `src/styles.css`: nguồn design tokens, màu nền, typography và reset/theme toàn cục.
- `src/app/app.html` / `app.css`: shell điều phối từng trang và responsive layout; giữ các component phòng lab sẵn có.
- `src/app/app.ts`: chỉ kết nối component/điều phối màn hình; tránh nhét engine hoặc logic nghiệp vụ vào root component.
- `src/app/state/theme-store.ts`: xem xét dùng làm điểm áp theme thay vì tạo hệ thống màu rời; lưu ý theme hiện hỗ trợ light/dark, thiết kế mới lấy dark làm mặc định.
- `src/app/features/viewport3d`: tiếp tục dùng scene hiện tại cho visualization mô hình; cầu chọn thuật toán nên là scene/component riêng để không làm lẫn trạng thái camera và dữ liệu lab.
- `src/app/state/lab-store.ts`: dùng API state hiện có để đổi thuật toán; không thay quy tắc huấn luyện để phục vụ animation.
- Các panel `training-controls`, `data-panel`, `experiments-panel`, `results-panel`, `learning-walkthrough`, `algorithm-notes`: ưu tiên đổi template/CSS/bố cục, giữ hành vi.
- `src/app/app.routes.ts` hiện chưa khai báo route; bản hiện tại dùng một shell stateful chỉ hiển thị trang đang chọn, không bắt buộc xây router nhiều trang. Nếu sau này dùng URL route, đó là quyết định triển khai cần giữ trạng thái và back navigation nhất quán.

## 12. Tiêu chí nghiệm thu giao diện

1. Bốn trang chào mừng, chọn thuật toán, thực nghiệm và học xuất hiện đúng thứ tự, mỗi lần chỉ hiện một trang; có thể quay lại chọn thuật toán khác.
2. Nút Login/Register/Guest hiển thị đúng; không gửi hay lưu credential trong giai đoạn prototype.
3. Chọn mỗi thuật toán cập nhật đúng nhãn/màu và mở phòng thực nghiệm bằng thuật toán đó qua store hiện có.
4. Các chức năng chạy/pause/step/reset, nhập dữ liệu, xem metric và hướng dẫn học vẫn hoạt động như trước.
5. Màu sắc lấy từ design tokens; các điểm Train/Test vẫn có chú giải rõ.
6. Liquid Glass có fallback khi blur không hỗ trợ và vẫn đọc được trên nền tối.
7. Con trỏ trang trí không chặn click, nhập form hay điều khiển OrbitControls; bị tắt trên touch/reduced motion.
8. Nút chuyển trang, chuyển cảnh, bàn phím và mobile đều dùng được; WebGL lỗi vẫn có lối chọn thuật toán không 3D.
9. Trần render 60 FPS được kiểm tra trên các tần số màn hình; cảnh trên máy thử đạt gần 60 FPS. Ghi riêng thời gian CPU gửi lệnh vẽ, không nhầm với thời gian GPU.
10. Test hiện có cho engine/store/viewport tiếp tục đạt; bổ sung test cho flow điều hướng và lựa chọn thuật toán trước khi merge giao diện.

## 13. Kế hoạch triển khai giao diện

1. Chụp baseline giao diện và ghi lại các hành vi hiện tại cần giữ.
2. Tạo design tokens tối và cập nhật kiểu dáng chung, panel, control, trạng thái focus.
3. Làm shell với các trang ẩn/hiện độc lập và responsive navigation.
4. Thêm màn hình login/register/guest dạng prototype không kết nối auth.
5. Thêm sphere selector, ánh sáng/chất liệu và ánh xạ lựa chọn vào `LabStore`.
6. Đưa các panel thực nghiệm hiện có vào trang thực nghiệm, giữ logic.
7. Thêm cursor glow, Liquid Glass và chuyển cảnh với reduced-motion/fallback.
8. Đo trần render 60 FPS trên màn hình 60/144 Hz, tinh chỉnh adaptive quality, chạy build/test FE và rà lại thao tác hiện có.

## 14. Thuật ngữ

- **Design token:** biến màu/khoảng cách dùng chung, ví dụ `--color-bg`, giúp mọi component theo cùng bảng màu.
- **Liquid Glass:** phong cách bề mặt kính mờ có viền và highlight; trên web được mô phỏng bằng CSS, không phải thư viện Apple.
- **PBR:** mô hình shading dựa trên cách vật liệu phản ứng với ánh sáng; trong Three.js thường cấu hình qua roughness/metalness/clearcoat.
- **Frame time/FPS:** thời gian dựng một khung hình và số khung hình mỗi giây. 60 FPS tương ứng khoảng 16.7 ms/frame; 144 FPS khoảng 6.9 ms/frame.
- **Adaptive quality:** tự giảm hiệu ứng/độ phân giải khi máy không đạt độ mượt mục tiêu.
- **Page transition:** chuỗi hiệu ứng rời trang và vào trang. Chỉ nút/chọn cầu kích hoạt; cuộn không điều hướng.

## 15. Điều phối trang và hiệu năng (phiên bản 1.3)

- `JourneyMotion.switchPage`: GSAP timeline cho exit → swap → enter; có cleanup, hoàn tất chuyển cảnh cũ khi điều hướng mới và fallback không chuyển động.
- `FrameBudget`: bộ giới hạn theo deadline 60 FPS; bỏ callback dư của màn hình tần số cao và không chạy bù hàng loạt sau tác vụ chậm. Pointer và animation dùng chung ngân sách của mỗi scene.
- GSAP ticker đặt 60 FPS; cursor glow cũng có bộ giới hạn riêng. CSS hover vẫn do compositor của trình duyệt quản lý, không thay đổi tần số vật lý của màn hình.
- Cầu giữ bốn vùng màu ban đầu; hover phát sáng, kéo quá 6 pixel không chọn khi nhả. Phép xoay vẫn qua số phức/quaternion.
- `Viewport3d.active`: chỉ khởi tạo khi vào trang lần đầu, ngừng RAF và bỏ các phép tính dự đoán/geometry không cần thiết khi trang ẩn; khi hiện lại lấy trạng thái mới nhất từ LabStore.
- `controls.update` và gửi lệnh render chạy trong cùng slot khung hình, ngoài Angular. Resize bỏ qua kích thước 0 của trang ẩn. Giữ instancing, DPR cap và tắt render khi tab ẩn.
- CPU render metric là thời gian JavaScript chuẩn bị/gửi lệnh cho GPU, không phải thời gian GPU hoàn tất khung hình.
- Không thay công thức học, Web Worker, dữ liệu CSV, IndexedDB, API hoặc MongoDB để phục vụ chuyển cảnh.

## 16. Các chức năng giữ lại từ phiên bản 1.2

- Login/Register/Guest là prototype; xóa nội dung form, không gửi hay lưu credential.
- Bốn thuật toán Linear cyan, Polynomial hồng, Ridge tím, Lasso bạc. Chọn khác thuật toán đã có tiến trình vẫn cần xác nhận đặt lại model.
- Trang thứ ba chỉ hiển thị tên thuật toán đã chọn; muốn đổi phải quay lại cầu.
- Trang thứ tư có mô hình 3D, lộ trình sáu pha, điều khiển từng pha và ghi chú; dùng chung dataset, iteration, snapshot với trang thực nghiệm.
- Cuộn và hiệu ứng giao diện không gọi cập nhật mô hình. Vòng chạy tự động do người dùng đã bật giữ hành vi hiện có.

Phiên bản 1.3 thay thế cơ chế cuộn/ScrollTrigger/ScrollTo và mục tiêu render trên 60 FPS của các phiên bản trước.

## 17. Tinh chỉnh thanh giao diện

- Bỏ toàn bộ thanh điều hướng trên cùng: nhãn thương hiệu, các mục 01–04 và nút Hiệu ứng.
- Giữ các nút trong từng trang: tiếp tục/Guest, chọn cầu/card, quay lại chọn thuật toán và mở/quay lại trang học.
- Các trang chiếm đủ chiều cao màn hình, không chừa khoảng trống 82 px cho thanh cũ. Trần 60 FPS và tôn trọng giảm chuyển động của hệ điều hành giữ nguyên.
