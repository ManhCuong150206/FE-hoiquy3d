# Công nghệ, công cụ và hiệu ứng — Hồi quy 3D

Cập nhật: 31/10/2026. Đây là tài liệu chính về giao diện, hiệu ứng, luồng học và kiểm thử frontend. Nội dung đã được gộp và biên tập theo các quyết định mới nhất, thay cho năm file giao diện/học từng bước trước đây. [README](../README.md) chỉ giữ cách cài đặt và chạy nhanh.

Mã nguồn là căn cứ kiểm tra hành vi thực tế. Các con số kiểm thử bên dưới ghi theo lần chạy cụ thể, không tự động thay đổi khi code thay đổi.

## 1. Mục tiêu và phạm vi

Hệ thống giúp người học thử bốn mô hình hồi quy, quan sát dữ liệu và hiểu một lần cập nhật trọng số qua hình 3D cùng các phép tính thật. Dữ liệu được sinh theo seed hoặc nhập CSV. Phần tính toán chạy trong Web Worker của trình duyệt; API dùng cho việc lưu/đồng bộ theo phần đã nối.

Frontend hiện tại nằm ở `FE/FE-hoiquy3d`, là một Git repository riêng. Backend NestJS ở thư mục gốc dự án. Tài liệu này tổng hợp công nghệ liên quan để dễ học, không thay đặc tả API/schema của backend và không tuyên bố backend đã được kiểm thử trong đợt giao diện.

## 2. Phân biệt công nghệ, công cụ và hiệu ứng

- **Công nghệ/thư viện** chạy trong sản phẩm: Angular, TypeScript, Three.js, GSAP, IndexedDB…
- **Công cụ phát triển** giúp viết, kiểm tra hoặc đóng gói: Angular CLI, npm, Vitest, Playwright CLI, Docker…
- **Hiệu ứng** là kết quả người dùng nhìn thấy: kính trong, viền neon theo chuột, nền sao, chuyển cảnh… Một hiệu ứng có thể kết hợp nhiều công nghệ.
- **Skill của trợ lý** là hướng dẫn làm việc như GSAP/Three.js/Playwright; không phải thư viện tự động cài vào web. Chỉ các dependency/import và mã nguồn thực tế mới chứng minh một thư viện có trong ứng dụng.

Ví dụ: Three.js là thư viện; khối cầu bốn vùng màu là thành phần 3D; kéo xoay cầu và phát sáng khi rê chuột là hành vi/hiệu ứng của thành phần đó.

## 3. Công nghệ đang có và công dụng

Phiên bản tham khảo lấy từ các khai báo dependency, không phải cam kết phiên bản cài chính xác; phiên bản khóa nằm trong package-lock.json.

| Công nghệ | Dùng để làm gì? | Ví dụ trong dự án |
| --- | --- | --- |
| TypeScript | Viết JavaScript có kiểm tra kiểu dữ liệu khi phát triển | Kiểu thuật toán, snapshot, dữ liệu thí nghiệm |
| Angular 22 | Tổ chức giao diện thành các component, liên kết dữ liệu và trạng thái | Form, bảng kết quả, trang học |
| Angular Signals | Giữ giá trị phản ứng: khi giá trị đổi, phần phụ thuộc được cập nhật | Iteration, thuật toán, pha đang học trong LabStore |
| Three.js | Vẽ các cảnh 3D bằng WebGL | Cầu chọn thuật toán, điểm train/test, mặt hồi quy |
| GSAP | Điều phối chuỗi chuyển cảnh có thời lượng và đường chuyển động | Trang cũ rời đi, trang mới xuất hiện theo lớp |
| CSS và Web Animations API | Kính, neon, bố cục; hiệu ứng opacity/translate ngắn | Nút Liquid Glass, kết quả mới hiện nhẹ |
| SVG | Vẽ đường vector rõ nét ở nhiều kích thước | Đường neon nối sáu chặng A–F |
| Web Worker | Tính toán ở luồng riêng để bớt chặn giao diện | Vòng huấn luyện và prepare/commit |
| IndexedDB + idb | Lưu dữ liệu trong trình duyệt, idb giúp gọi API thuận tiện | Thí nghiệm lưu offline |
| Angular Service Worker/PWA | Cache app shell của bản production | Mở lại phần giao diện đã cache khi offline |
| Angular SSR + Express | Render/phục vụ bản frontend production qua Node.js | src/server.ts, thư mục dist/Hoiquy3d |
| RxJS | Dependency của hệ sinh thái Angular cho luồng bất đồng bộ | Không nhầm với Signals đang dùng để quản lý phần lớn trạng thái giao diện |
| NestJS | Tổ chức backend thành module, controller, service | API tại thư mục gốc dự án |
| MongoDB + Mongoose | Lưu document và định nghĩa model/schema phía server | Dataset, experiment, training run, sync theo mã backend |

EngineNet là yêu cầu từng được nêu của đề tài; tài liệu này không coi EngineNet là Three.js/NestJS và không xác nhận đã tích hợp khi chưa có dependency/module được xác minh tương ứng.

## 4. Công cụ phát triển và kiểm thử

| Công cụ | Công dụng, giải thích ngắn |
| --- | --- |
| Node.js và npm | Chạy công cụ JavaScript/TypeScript; npm cài dependency và chạy script |
| Angular CLI | Các lệnh build, serve và test của frontend; cấu hình ở angular.json |
| TypeScript compiler | Kiểm tra kiểu và hỗ trợ chuyển TypeScript thành mã chạy được |
| Vitest + Angular TestBed | Unit test: kiểm tra logic nhỏ và component trong môi trường thử |
| jsdom | Mô phỏng DOM trong Node.js; không thay thế browser thật cho WebGL |
| Playwright CLI | E2E: mở browser thật, bấm nút, kiểm tra luồng và chụp ảnh |
| Prettier | Định dạng code cho thống nhất |
| Oxlint | Kiểm tra quy tắc code ở backend, cấu hình .oxlintrc.json |
| Git | Quản lý thay đổi và lịch sử; frontend/backend có repository riêng |
| Docker | Đóng gói môi trường; frontend có Dockerfile chạy SSR cổng 4000 |

Có file Dockerfile không đồng nghĩa đã triển khai thành công. HTTPS cổng 443 vẫn cần được cấu hình/kiểm chứng riêng khi triển khai; production build không chứng minh SSL hoạt động.

## 5. Luồng bốn trang đang sử dụng

**Đăng nhập/Guest → Chọn thuật toán → Thực nghiệm → Học từng bước và ghi chú.**

Mỗi lúc chỉ hiện một trang; chuyển bằng nút hoặc chọn thẻ thuật toán, không cuộn để đổi trang. Cuộn trong vùng 3D giữ chức năng zoom; cuộn ngoài vùng 3D đọc nội dung.

| Trang | Nội dung và hành vi chính |
| --- | --- |
| 1. Đăng nhập/đăng ký | Email, mật khẩu, đăng ký có tên hiển thị, nút Guest. Đây là demo kiểm tra form, chưa phải xác thực thật; không gửi/lưu/log credential. Không còn nút Khám phá trùng Guest |
| 2. Chọn thuật toán | Cầu đặc bốn vùng màu, hover liên kết với thẻ, kéo xoay; chọn bằng thẻ (không bấm chọn trực tiếp trên cầu). Thẻ dùng được bằng bàn phím/fallback. Footer là Đăng xuất demo: tạm dừng, xóa form, về trang đầu; không xóa dataset hay thí nghiệm |
| 3. Thực nghiệm | Dữ liệu, thí nghiệm, 3D, metric. Thanh điều khiển gồm chế độ, Reset/Chạy/Step/Stop, iteration và tham số. Ô thuật toán chỉ hiện lựa chọn; nút đổi chỉ ở header. Đổi thuật toán khi có tiến trình cần xác nhận |
| 4. Học từng bước | Mô hình trái, chặng học phải, ghi chú bên dưới. “Học từng bước” chạy một iteration A–F rồi dừng. “Tạm dừng” và “Tiếp tục học” giữ iteration đang dở. Không còn nút Pha tiếp theo |

Trên desktop, khung học cuộn riêng và có thanh điều khiển sticky (giữ tại đầu vùng đọc). Đến cuối khung có thể cuộn tiếp xuống trang, hoặc dùng “Đến ghi chú”. Không buộc đọc hết sáu chặng. Mobile xếp dọc và cuộn trang bình thường. Chọn mẫu/tốc độ và hướng dẫn 3D nằm trong các mục thu gọn.

## 6. Quy chuẩn hình thức

| Thành phần | Quy định hiện tại |
| --- | --- |
| Nền | Đen/xanh đậm, bầu trời sao trôi chậm và nhấp nháy nhẹ từng sao |
| Font toàn web | Times New Roman, có Times/serif dự phòng |
| Linear | Cyan #35E6FF |
| Polynomial | Hồng #FF63B6 |
| Ridge | Tím #A78BFA |
| Lasso | Bạc #D7E0EE |
| Train | Cam neon #FF922E, thống nhất điểm/chú giải/biểu đồ/MSE |
| Test | Xanh lam neon #42A5FF, thống nhất như Train |
| Nút/khung | Kính trong vừa, viền phản chiếu, chữ rõ; Stop có màu cảnh báo |
| Con trỏ | Con trỏ hệ thống; đã bỏ vòng/chấm/đuôi/gợn bám theo chuột |

Không dùng màu làm dấu hiệu duy nhất. Giữ nhãn, biểu tượng, focus bàn phím, trạng thái disabled. Không làm toàn bộ chữ glow quá mạnh.

Màu nhấn của thuật toán được dùng thống nhất ở trang chọn, thực nghiệm và học từng bước: tiêu đề, viền, nút và trạng thái chọn dùng cùng tông. Các thẻ vẫn giữ bốn màu riêng để dễ nhận biết. Train luôn cam neon `#FF922E`, Test luôn xanh lam neon `#42A5FF` trên cả trang 3 và 4; màu dữ liệu không đổi theo thuật toán. Ví dụ chọn Ridge thì nút/tiêu đề tím, điểm train vẫn cam và điểm test vẫn xanh.

## 7. Danh mục hiệu ứng và file phụ trách

| Hiệu ứng | Cách làm và tác dụng | Mã nguồn chính |
| --- | --- | --- |
| Chuyển trang theo lớp | GSAP: trang cũ rời đi → đổi trang → trang mới xuất hiện; có tiến/lùi, scale/xoay nhẹ và stagger (hiện lần lượt) | [journey-motion.ts](../src/app/presentation/journey-motion.ts) |
| Nền vũ trụ | 1.000 sao trong một Three.Points; shader điều khiển sáng/tối, xoay/drift chậm; có nền tĩnh dự phòng | [spatial-backdrop.ts](../src/app/presentation/spatial-backdrop.ts) |
| Liquid Glass | CSS gradient, nền alpha, backdrop-filter và viền phản chiếu; mô phỏng phong cách kính, không nhúng SDK Apple | [styles.css](../src/styles.css) |
| Cầu bốn vùng màu | MeshPhysicalMaterial, đèn và glow khi hover hai chiều; cầu chỉ hover/kéo, thẻ dùng để chọn | [algorithm-sphere.ts](../src/app/features/algorithm-sphere/algorithm-sphere.ts) |
| Điểm dữ liệu neon | InstancedMesh + MeshStandardMaterial emissive; nhiều điểm dùng chung mesh/material để giảm draw call | [viewport3d.ts](../src/app/features/viewport3d/viewport3d.ts) |
| Lộ trình A–F | SVG path, stroke-dashoffset để vẽ/thu đường; chấm sáng theo vị trí đọc; đường đo lại theo kích thước thẻ | [learning-route.ts](../src/app/features/learning-route/learning-route.ts) |
| Chuyển chặng mượt | Giữ các thẻ ổn định, chỉ cuộn khi thẻ sắp ra ngoài vùng đọc; ease-out 140–320 ms, không dùng animation để quyết định commit | [learning-route.ts](../src/app/features/learning-route/learning-route.ts) |
| Viền khung theo chuột | Radial gradient + mask; ánh sáng lan sang cạnh thẻ lân cận, mờ dần khi rời chuột | [card-glow.ts](../src/app/presentation/card-glow.ts), [card-glow.css](../src/app/presentation/card-glow.css) |
| Giới hạn render | FrameBudget tối đa 60 FPS, kể cả màn hình 144 Hz | [frame-budget.ts](../src/app/presentation/frame-budget.ts) |


### Chọn thuật toán bằng ngôi sao — hai chiều

- Chiều đi: thẻ thu thành sao đúng màu → sao bay theo đường cong vào vùng tương ứng → camera tiến vào bề mặt, vùng màu lan ra phủ kín toàn màn hình → trang thực nghiệm xuất hiện dần. GSAP nối các đoạn có chồng thời gian, mục tiêu khoảng hai giây; không đổi kích thước thẻ gốc làm xô bố cục.
- Chiều về từ thực nghiệm/trang học: bắt đầu bằng màu thuật toán phủ toàn màn hình → vùng màu thu về cầu khi camera lùi → sao tách ra và bay về vị trí thẻ → thẻ hiện đầy đủ; hướng cầu trước chuyến đi được khôi phục. Vị trí thẻ và điểm đáp được tính lại theo kích thước màn hình.
- Lớp màu phủ màn hình nằm ngoài canvas của cầu, không bị giới hạn bởi khung 3D. Bán kính tính đủ tới bốn góc màn hình và cập nhật khi resize; giữ lớp phủ trong lúc đổi trang để không lóe nền hoặc hở cạnh. Các frame chuyển động chỉ thay transform/opacity, kích thước lớp phủ tính khi bắt đầu/resize.
- Hover thẻ làm sáng vùng cầu; hover cầu làm sáng thẻ tương ứng. Vẫn kéo xoay nhưng không click chọn trên cầu. Cầu xoay bằng quaternion theo đường ngắn để đưa vùng đích ra trước; điểm bay tới lấy từ hình học thật, kiểm tra bằng raycasting sau phép chiếu ra màn hình.
- Khóa chọn/điều hướng trong chuyến bay để tránh chồng animation. Nếu đổi thuật toán cần reset tiến trình, xác nhận trước rồi mới bay; hủy giữ model và không tạo sao. Quay về chỉ tạm dừng, không xóa dữ liệu hoặc iteration.
- Reduced motion/low effects/WebGL fallback dùng chuyển trang đơn giản. Overlay và bản sao thẻ chỉ trang trí, không nhận input và không được screen reader đọc. Có cleanup khi hủy, đổi chế độ chuyển động, tab ẩn hoặc mất context trong chuyến bay.
- Giữ lazy loading Three.js: query sphere bằng template reference, không tham chiếu class component ở runtime ngoài defer. Gói đầu build sau mở rộng chuyển cảnh khoảng 356,59 kB; phần lab được tải trước khi sao đang bay nhưng chưa hiển thị/chạy huấn luyện.

Mã nguồn điều phối chuyến bay: [algorithm-flight.ts](../src/app/presentation/algorithm-flight.ts), [algorithm-picker.ts](../src/app/features/algorithm-picker/algorithm-picker.ts), [algorithm-sphere.ts](../src/app/features/algorithm-sphere/algorithm-sphere.ts) và App/JourneyMotion. Không thay API, MongoDB hoặc phép tính hồi quy.

Kiểm chứng bản sao bay trước khi mở rộng toàn màn hình (31/10/2026): 92 unit test, 13 nhóm E2E/120 tiêu chí và production build đạt. Timeline thiết kế 1,65 giây cho sao/cầu và khoảng 0,35 giây nối trang. Lượt browser cuối đo chiều đi khoảng 2,32–2,42 giây, chiều về 2,03–2,04 giây (bao gồm việc công cụ chờ click/khung đích). Không cam kết thời lượng thực tế bằng nhau trên mọi máy; lần tải đầu có thể lâu hơn. Bundle đầu khoảng 354 kB, không nâng budget để che cảnh báo.

Kiểm tra mở rộng toàn màn hình: 94/94 unit test (20 file), 13 nhóm E2E/123 tiêu chí và production build đạt. Toàn bộ bộ E2E được chạy lại sau thay đổi giao diện; log chung fullscreen-e2e.log, chi tiết tại các *-result.log. Bài E2E chuyến bay đạt 15 tiêu chí: phủ toàn viewport hai chiều, bốn thuật toán, cùng màu nhấn trang 2–4, train/test nhất quán trang 3–4, fallback, mobile và resize. Lượt đo riêng chiều đi 2,33–2,44 giây; chiều về 2,07–2,09 giây (gồm thao tác/chờ của công cụ). Log unit/build: fullscreen-unit-final.log, fullscreen-build.log; ảnh fullscreen-region.png. Sau lượt E2E phát hiện lỗi cleanup gọi document lúc SSR: đã thêm guard và test, chạy lại toàn bộ unit/build đạt, ba yêu cầu HTTP dev-server đều 200, không còn ReferenceError. E2E trình duyệt đạt trước bản vá guard SSR cuối, không chạy lại toàn bộ browser suite cho thay đổi guard này. Smoke HTTP production riêng ở cổng 4301 bị cấu hình allowed-host của Angular chặn (400); chưa thay cấu hình triển khai trong đợt giao diện.

Ảnh local: algorithm-star-in.png, algorithm-star-out.png trong output/playwright. Log: flight-unit.log, flight-build.log, algorithm-flight-final.log và các *-result.log. Browser E2E chạy dev; chưa kiểm chứng browser production, HTTPS hoặc tích hợp MongoDB trong đợt này. Đợt build trung gian từng bị eager-load Three.js do query component bằng class; đã chuyển sang template reference để khôi phục defer. Engine/worker/schema/API không thay đổi.


## 8. Giải thích phần 3D và ánh sáng

- **PBR:** mô hình vật liệu phản ứng với ánh sáng theo các thuộc tính như độ nhám, kim loại và lớp phủ; ví dụ cầu có phản chiếu khi đổi góc nhìn.
- **HemisphereLight:** ánh sáng môi trường từ phía trên/dưới, giúp vùng tối vẫn có sắc độ.
- **DirectionalLight:** ánh sáng theo hướng, giúp thấy độ cong và chiều sâu của vật thể.
- **Shader:** chương trình chạy trên GPU để tính cách vẽ; nền sao dùng shader để điều chỉnh độ sáng từng sao.
- **Emissive:** làm vật liệu có cảm giác tự phát sáng. Không đồng nghĩa đã thêm bloom cho toàn cảnh.
- **Instancing:** vẽ nhiều điểm bằng một cấu trúc dùng chung, thay vì tạo hàng trăm đối tượng độc lập.
- **Raycasting:** dò vật thể tại vị trí con trỏ, dùng nhận biết vùng màu khi rê trên cầu hoặc chọn mẫu dữ liệu trong mô hình hồi quy.

Xoay camera tiếp tục dùng phép nhân số phức trên các cặp tọa độ và các phép xoay/quaternion hiện có. Quaternion là cách biểu diễn hướng quay 3D. Không coi mọi thao tác nội bộ của Three.js là đã loại bỏ hoàn toàn lượng giác; yêu cầu số phức áp dụng vào phần điều khiển/chuyển động được xây dựng cho đề tài.

## 9. Viền sáng theo chuột hoạt động thế nào?

Áp dụng lên form trang 1, thẻ thuật toán trang 2, các bảng/thanh điều khiển trang 3, mô hình/chặng/ghi chú trang 4. Màu lấy từ theme và thuật toán. Viền sáng rõ, phần phủ bên trong nhẹ để không che chữ.

CardGlow là directive Angular: thành phần gắn hành vi vào vùng giao diện có sẵn. Nó tạo portal (lớp trang trí đặt riêng trong body), dùng pointer-events:none để click đi xuyên qua. Cách này không ghi đè phần phản chiếu kính của các khung gốc. Lớp sáng được clip trong vùng cuộn; không phủ lên thanh điều khiển sticky của phần học. Lớp viền dùng translate3d thay cho cập nhật top/left khi cuộn, tránh tạo layout shift; chỉ cập nhật kích thước khi thực sự đổi.

Chỉ cập nhật khung thuộc trang đang hiện, dùng listener chung và FrameBudget. Cache màu/bo góc/tổ tiên cắt nội dung, không dựng lại overlay theo từng lần cuộn. Tắt chuyển động khi touch, reduced motion hoặc giảm hiệu ứng; giữ viền/focus gốc. Không lưu hay truyền tọa độ chuột.

Đây là hiệu ứng ở **viền khung**, khác với vòng trang trí tại **con trỏ** đã được bỏ.

## 10. Sáu chặng học và minh họa xem lại

**Iteration** là một lần cập nhật mô hình. Trong chế độ học, một iteration được giải thích qua sáu pha, không phải sáu lần cập nhật.

| Chặng | Kết quả trong thẻ | Minh họa 3D khi xem lại |
| --- | --- | --- |
| A. Đầu vào | Giá trị gốc, xử lý thiếu, dữ liệu đưa vào mô hình | Đánh dấu mẫu thật, tập trung vào điểm dữ liệu |
| B. Dự đoán | Tích đặc trưng × trọng số, bias và ŷ | Khối vuông dự đoán theo model trước cập nhật |
| C. Sai số | y thật, ŷ, residual = ŷ − y | Đoạn nối giá trị thật với dự đoán |
| D. Loss | Bình phương sai số, MSE toàn train, penalty và mục tiêu J | Sai số mẫu minh họa; loss thật vẫn tính từ toàn bộ train |
| E. Hệ số | Gradient, trọng số cũ/mới; Lasso có u và ngưỡng co | Bề mặt đề xuất từ hệ số mới, ghi rõ chưa áp dụng |
| F. Đánh giá | So sánh trước/sau và train/test | Bề mặt đã áp dụng của snapshot đang xem |

Trước khi chạy, các chặng mặc định thu gọn. Trong lúc tự chạy, mỗi thẻ giữ vị trí và ô tóm tắt có chiều cao cố định; chặng đang thực hiện sáng lên và nhận số liệu ngắn, không đóng/mở bảng lớn qua mỗi pha. Khi tạm dừng hoặc hoàn tất, mở một chặng đầy đủ để xem lại. Bảng/công thức chỉ được tạo khi bấm “Xem chi tiết”, không dựng DOM cho bảng đang đóng. Khi đang chạy, tạm khóa chọn chặng thủ công. Tạm dừng hoặc hoàn tất rồi mới chọn chặng để xem lại. Chặng chưa thực hiện không hiện số liệu như đã hoàn thành.

Snapshot là bản chụp dữ liệu trước/sau của một iteration, không phải ảnh chụp màn hình. TrainingSession.prepare() tạo ứng viên và snapshot, chưa sửa mô hình thật; commit(iteration) xác nhận đúng ứng viên một lần ở F. LabStore.latest() là mô hình đã áp dụng; phần minh họa có thể dùng before/after của snapshot để xem lại, nhưng không ghi ngược vào trọng số/history/iteration.

Trang 3 và 4 dùng chung dataset và trạng thái. Chọn mẫu chỉ giúp giải thích một phép tính; học vẫn dùng toàn bộ train, không biến thành SGD. Dữ liệu thật không di chuyển theo quá trình học.

Với hơn hai đặc trưng, bề mặt là lát cắt theo hai đặc trưng đầu: các đặc trưng còn lại cố định theo mẫu chọn khi học, hoặc bằng 0 trong chế độ thường. Các điểm khác là hình chiếu, không nhất thiết nằm trên lát cắt. Co hình cho vừa viewport không phải chuẩn hóa dữ liệu.

## 11. Bốn thuật toán và số liệu

| Thuật toán | Điểm cần giải thích |
| --- | --- |
| Linear | Gradient của MSE, mặt phẳng/đường hồi quy |
| Polynomial | Mở rộng đặc trưng thành lũy thừa/tích chéo; bảng theo đúng thứ tự engine |
| Ridge | Cộng phần phạt L2, gradient trọng số thêm 2λw |
| Lasso | ISTA: gradient MSE rồi soft-threshold với ngưỡng αλ |

Không phạt intercept/bias b. MSE là trung bình bình phương sai số; RMSE là căn MSE; MAE là trung bình trị tuyệt đối sai số; R² mô tả mức giải thích biến thiên. Test dùng để đánh giá, không tham gia gradient. Loss không được bảo đảm luôn giảm; learning rate quá lớn có thể làm phân kỳ.

Worker nhận init gồm Xtr/ytr/Xte/yte, lr, maxIter, tol, speed, algorithm, degree và lambda. Các message prepare/commit phục vụ chế độ học; runId loại phản hồi cũ sau Reset/Stop. Đổi thuật toán/tham số/dataset hủy snapshot không còn phù hợp.

## 12. Offline, API và dữ liệu

- Lưu cục bộ: IndexedDB qua idb; nếu không dùng được IndexedDB, fallback bộ nhớ không bảo đảm tồn tại sau reload.
- Cache giao diện: Service Worker chỉ bật ở production theo app.config.ts; mở offline cần app shell đã được cache. Không coi npm start là bằng chứng PWA offline hoàn chỉnh.
- Đồng bộ FE hiện gọi **POST /api/v1/experiments/bulk**, xem [experiments-store.ts](../src/app/state/experiments-store.ts). Khi lỗi, giữ dữ liệu/chưa đồng bộ theo logic hiện có.
- Luồng tổng quát: giao diện → API backend → MongoDB. Không đưa model TypeScript hoặc file source trực tiếp vào MongoDB.
- E2E có mock API để kiểm tra giao diện đồng bộ; mock không chứng minh MongoDB đã ghi thật.
- Đăng nhập/đăng xuất vẫn là demo; xác thực và bảo mật thật cần công việc riêng.

## 13. Hạn chế CSV cần giữ lại trong báo cáo

Mã buildDataset hiện xử lý thiếu và tính thống kê z-score trên toàn dữ liệu **trước khi chia train/test**. Nếu bật chuẩn hóa, cả X và y đều được chuẩn hóa. Đây là nguy cơ rò rỉ thông tin test vào tiền xử lý, làm đánh giá lạc quan; không được coi là đã sửa trong đợt giao diện/gộp tài liệu.

Hướng sửa riêng: chia trước, fit imputer/scaler bằng train, rồi transform train/test cùng thống kê. Cần quyết định metric theo đơn vị gốc hay chuẩn hóa và thêm kiểm thử chống rò rỉ.

Số dòng nguồn CSV đang theo bản ghi logic tính cả header, không phải dòng vật lý nếu có ô chứa xuống dòng. [learning-demo.csv](examples/learning-demo.csv) là dữ liệu mẫu để kiểm tra nhập CSV.

## 14. Hiệu năng và khả năng tiếp cận

Giới hạn tối đa 60 FPS là cơ chế render, không phải lời hứa mọi máy đều luôn đạt 60. Khi báo cáo, phân biệt số lần thực sự render canvas với số callback requestAnimationFrame và thời gian CPU với thời gian GPU.

Giữ tính toán học trong worker, dùng instancing và cache hình học SVG. Dừng render scene ẩn/tab ẩn; hủy listener, observer, material/geometry và vòng vẽ khi không dùng. Ưu tiên transform/opacity; tránh nhiều lớp blur hoặc animation kích thước gây layout liên tục.

Có focus bàn phím, nhãn, disabled rõ và thẻ chọn thuật toán thay thế khi WebGL lỗi. Reduced motion bỏ tween/fade và chuyển động trang trí. Không ép cuộn hoặc chỉ dùng màu để phân biệt dữ liệu. Safari/Firefox, touch thật và máy yếu cần kiểm chứng riêng; test mô phỏng mobile không thay thế thiết bị thật.

## 15. Cách chạy và kiểm tra

Chạy từ thư mục frontend. Trên Windows dùng npm.cmd nếu PowerShell chặn npm.ps1.

```powershell
npm.cmd ci
npm.cmd start -- --host 127.0.0.1 --port 4300
```

Mở http://127.0.0.1:4300. Terminal thứ hai:

```powershell
npm.cmd test -- --watch=false
npm.cmd run build
powershell -NoProfile -ExecutionPolicy Bypass -File e2e/run-ui-redesign.ps1
```

- Unit test kiểm tra engine, dữ liệu, prepare/commit, state/timer và các logic component. Một số test dùng worker giả lập nhưng gọi engine thật.
- E2E dùng browser thật kiểm tra form, cầu, các trang, học/offline, bố cục, reduced motion, chuyển động và viền sáng.
- Build biên dịch/prerender; không tự chứng minh toàn bộ chức năng chạy đúng.
- jsdom thiếu Canvas/WebGL có thể sinh cảnh báo; cần browser thật để kiểm tra hình 3D.

Bản SSR sau build: đặt NG_ALLOWED_HOSTS cho localhost/127.0.0.1 theo môi trường thử rồi chạy `node dist/Hoiquy3d/server/server.mjs`, thường mở cổng 4000. Khi triển khai, cấu hình hostname thực tế, không dùng wildcard tùy tiện.

## 16. Kết quả đã xác minh và giới hạn

| Mốc | Kết quả thực tế | Phạm vi cần hiểu đúng |
| --- | --- | --- |
| Viền sáng #228, trước khi bỏ vòng con trỏ | 87/87 unit test, 19 file; 12 nhóm E2E/106 tiêu chí; production build đạt | Browser suite chạy dev; sync mock API; không xác minh MongoDB hoặc HTTPS |
| Sau khi bỏ trang trí con trỏ | Production build đạt | Đã cập nhật assertion neon/mobile; chưa chạy lại toàn bộ E2E sau thay đổi này |
| Gộp tài liệu lần này | Kiểm tra liên kết, nguồn tham chiếu và git diff --check | Không sửa logic ứng dụng và không chạy lại unit/E2E/build |
| Tối ưu A–F ổn định sau khi gộp tài liệu | 89/89 unit test, 19 file; 12 nhóm E2E/108 tiêu chí; production build đạt | Bao gồm bỏ vòng con trỏ, viền sáng, luồng học và bảng tạo khi mở; E2E dev, API sync vẫn mock |
| Chuyển cảnh toàn màn hình và đồng bộ màu | 94/94 unit test, 20 file; 13 nhóm E2E/123 tiêu chí; production build 356,59 kB đạt | Phủ viewport hai chiều, màu thuật toán trang 2–4, train/test trang 3–4, mobile, resize và các luồng học/lưu offline hiện có |
| Sao bay chọn thuật toán hai chiều | 92/92 unit test, 20 file; 13 nhóm E2E/120 tiêu chí; production build đạt | Bốn thuật toán, hover hai chiều, chặn click cầu, xác nhận trước animation, mobile và resize; kiểm tra lại chuyến bay sau chỉnh viền ma |

Ảnh/log nằm trong output/playwright và bị Git ignore: glow-unit.log, glow-build.log, remove-cursor-build.log, các file *-result.log, card-glow-*.png, single-iteration-*.png, smooth-learning-desktop.png. Kết quả cũ là lịch sử, không gọi là kết quả vừa chạy của source mới.

Các báo cáo/ảnh Taste và số đo production từ đợt 26–30/10 chỉ là bằng chứng của phiên bản trước; bản gốc nằm trong ZIP sao lưu tài liệu ngoài repository. Không coi chúng là công cụ runtime hoặc kết quả hiện tại. Bản mới vẫn cần kiểm tra riêng trên nhiều browser/phần cứng, dataset lớn và triển khai thật.

### Đo tối ưu A–F trên máy thử — 31/10/2026

Cùng kịch bản Linear, viewport 1440×1000, thời lượng 0,5 giây/pha, chạy đủ A–F và chỉ một iteration. Đo bằng `e2e/ui-redesign/profile-learning.e2e.js`; số liệu thô ở `output/playwright/learning-before.log` và `learning-after.log`.

| Chỉ số | Trước | Sau |
| --- | --- | --- |
| Dịch chuyển lớn nhất của tiêu đề chặng giữa A–E, tương đối với bản đồ | 274,1 px | 0 px |
| Tổng điểm layout-shift gắn với A–E trong phép đo | 0,362 | 0,00008 |
| P95 khoảng cách callback requestAnimationFrame | 13,9 ms | 9,4 ms |
| Khoảng cách callback trên 34 ms | 3 | 1 |
| Iteration sau khi kết thúc | 1 | 1 |

Layout shift là thay đổi vị trí/kích thước khi trình duyệt bố trí lại nội dung; các mục trên không phải điểm CLS chuẩn của cả website. Callback rAF không phải số frame WebGL thực sự render hoặc thời gian GPU. Đây là mẫu ngắn trên một máy, có dao động; không hứa mọi phần cứng luôn đạt 60 FPS. Một lượt đo sau ban đầu bị tab nền/throttling và không đủ A–F đã được loại khỏi so sánh cuối.

Tối ưu gồm ô trạng thái/tóm tắt cố định, mặc định thu gọn trước chạy, hoãn bảng chi tiết, chỉ cuộn khi cần, cache SVG theo thay đổi kích thước từng thẻ và di chuyển overlay viền bằng transform. Công thức, timer học, prepare/commit và dữ liệu không thay đổi.

Kết quả kiểm tra bản tối ưu: 89 unit test đạt; tổng 12 nhóm E2E/108 tiêu chí đạt (7 nhóm đầu trong lượt chung, 5 nhóm còn lại được chạy lại sau khi sửa kiểm tra reduced motion). Bài kiểm tra nền sao xác nhận pha sáng đứng yên, cho phép redraw tĩnh khi resize thay vì yêu cầu bộ đếm render tuyệt đối không tăng. Unit/build log: stable-learning-unit.log, stable-learning-build.log. Không chạy browser suite trên production; không dùng kết quả này để khẳng định MongoDB/HTTPS hoặc mọi phần cứng đã đạt hiệu năng mục tiêu.

## 17. Thư mục để tìm code

| Nhu cầu | Đường dẫn |
| --- | --- |
| Điều phối bốn trang | src/app/app.ts, app.html |
| Chuyển cảnh, sao, viền sáng, giới hạn khung hình | src/app/presentation/ |
| Cầu/chọn thuật toán, mô hình 3D, chặng học | src/app/features/ |
| Công thức, CSV, sinh dữ liệu, worker | src/app/core/engine/ |
| Kiểu dữ liệu và snapshot | src/app/core/models/ |
| Lưu IndexedDB | src/app/core/storage/ |
| Trạng thái model/thí nghiệm/theme | src/app/state/ |
| Kiểm tra xuyên suốt browser | e2e/ui-redesign/, e2e/run-ui-redesign.ps1 |
| Nội dung tổng hợp đang đọc | docs/CONG-NGHE-VA-HIEU-UNG.md |

Khi thêm hiệu ứng hoặc đổi yêu cầu, sửa ngay mục tương ứng trong tài liệu này, không tạo thêm một file SPEC/VERIFICATION giao diện cho mỗi lần sửa. Ghi kết quả kiểm thử đúng mốc và giữ hướng dẫn trong README ngắn gọn.

## 18. Nguồn tham khảo và ghi công

- Lucian UX/UI Prompt #318: ý tưởng đường vẽ theo cuộn, chuyển thành lộ trình học A–F.
- Lucian UX/UI Prompt #228: viền thẻ sáng theo con trỏ.
- Giữ comment ghi công MIT hiện có ở source áp dụng; không đưa dữ liệu thành phố/thẻ demo vào sản phẩm.
- robinpayot.com là định hướng cảm giác chuyển cảnh đã trao đổi, không phải mã nguồn được xác nhận đã sao chép.

Năm file giao diện/học cũ được thay bằng tài liệu này. ZIP chứa nguyên bản và README trước khi gộp được lưu ngoài repository tại `C:/Users/admin/OneDrive/Documents/ChatGPT/JS/outputs/documentation-backups/ui-docs-before-merge-20261031-163209.zip`; README/API/schema của backend giữ riêng vì phục vụ mục đích khác.
