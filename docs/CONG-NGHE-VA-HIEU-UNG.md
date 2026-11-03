# Công nghệ, công cụ và hiệu ứng — Hồi quy 3D

Cập nhật: 03/11/2026. Đây là tài liệu chính về giao diện, hiệu ứng, luồng học và kiểm thử frontend. Nội dung đã được gộp và biên tập theo các quyết định mới nhất, thay cho năm file giao diện/học từng bước trước đây. [README](../README.md) chỉ giữ cách cài đặt và chạy nhanh.

Mã nguồn là căn cứ kiểm tra hành vi thực tế. Các con số kiểm thử bên dưới ghi theo lần chạy cụ thể, không tự động thay đổi khi code thay đổi.

## 1. Mục tiêu và phạm vi

Hệ thống giúp người học thử bốn mô hình hồi quy, quan sát dữ liệu và hiểu một lần cập nhật trọng số qua hình 3D cùng các phép tính thật. Dữ liệu được sinh theo seed hoặc nhập CSV. Phần tính toán chạy trong Web Worker của trình duyệt; API dùng cho việc lưu/đồng bộ theo phần đã nối.

Frontend hiện tại nằm ở `FE/FE-hoiquy3d`, là một Git repository riêng. Backend NestJS ở thư mục gốc dự án. Tài liệu này tổng hợp công nghệ liên quan để dễ học, không thay đặc tả API/schema của backend và không tuyên bố backend đã được kiểm thử trong đợt giao diện.

## 2. Phân biệt công nghệ, công cụ và hiệu ứng

- **Công nghệ/thư viện** chạy trong sản phẩm: Angular, TypeScript, Three.js, GSAP, IndexedDB…
- **Công cụ phát triển** giúp viết, kiểm tra hoặc đóng gói: Angular CLI, npm, Vitest, Playwright CLI, Docker…
- **Hiệu ứng** là kết quả người dùng nhìn thấy: kính trong, viền neon theo chuột, nền sao, chuyển cảnh… Một hiệu ứng có thể kết hợp nhiều công nghệ.
- **Skill của trợ lý** là hướng dẫn làm việc như GSAP/Three.js/Playwright; không phải thư viện tự động cài vào web. Chỉ các dependency/import và mã nguồn thực tế mới chứng minh một thư viện có trong ứng dụng.

Ví dụ: Three.js là thư viện; hành tinh bốn lục địa là thành phần 3D; kéo xoay cầu và phát sáng khi rê chuột là hành vi/hiệu ứng của thành phần đó.

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
| 1. Đăng nhập/đăng ký | Email, mật khẩu, đăng ký có tên hiển thị, nút Guest. Gửi yêu cầu đăng ký/đăng nhập thật đến API; chỉ chuyển cảnh khi máy chủ xác nhận. Cookie HttpOnly giữ phiên; không lưu mật khẩu hoặc token trong localStorage. Không còn nút Khám phá trùng Guest |
| 2. Chọn thuật toán | Hành tinh giả tưởng: đại dương xanh đen, bốn lục địa có hình dạng riêng và màu thuật toán. Nhấp nháy nhẹ chu kỳ 1 giây, chọn thì sáng ổn định; hover liên kết với thẻ, kéo xoay; chọn bằng thẻ (không bấm chọn trực tiếp trên cầu). Thẻ dùng được bằng bàn phím/fallback. Footer là Đăng xuất: thu hồi phiên, tạm dừng, xóa dữ liệu đang hiển thị và form, chuyển về trang đầu; bản ghi đã lưu vẫn ở vùng dữ liệu riêng |
| 3. Thực nghiệm | Dữ liệu, thí nghiệm, 3D, metric. Thanh điều khiển gồm chế độ, Reset/Chạy/Step/Stop, iteration và tham số. Ô thuật toán chỉ hiện lựa chọn; nút đổi chỉ ở header. Đổi thuật toán khi có tiến trình cần xác nhận |
| 4. Học từng bước | Mô hình trái, chặng học phải, ghi chú bên dưới. “Học từng bước” chạy một iteration A–F rồi dừng. “Tạm dừng” và “Tiếp tục học” giữ iteration đang dở. Không còn nút Pha tiếp theo |

Trên desktop, khung học cuộn riêng và có thanh điều khiển sticky (giữ tại đầu vùng đọc). Đến cuối khung có thể cuộn tiếp xuống trang, hoặc dùng “Đến ghi chú”. Không buộc đọc hết sáu chặng. Mobile xếp dọc và cuộn trang bình thường. Chọn mẫu/tốc độ và hướng dẫn 3D nằm trong các mục thu gọn.

Trang đầu dùng duy nhất tiêu đề **Hệ thống thực nghiệm và trực quan hóa quá trình học của mô hình hồi quy**, chữ bạc neon và tự chia dòng theo màn hình. Giữ ba mục minh họa 04 thuật toán / 3D trực quan / ∞ khám phá; bỏ dòng tiếng Anh và đoạn mô tả cũ bên trái. Ô tài khoản dùng tiêu đề ngắn Đăng nhập / Đăng ký theo chế độ, bỏ YOUR NEXT DISCOVERY.

### Trang 3 xuất hiện nối tiếp camera tiến vào

Khi chọn thuật toán ở trang 2, giữ nguyên đoạn sao bay vào lục địa và camera tiến sâu. Ở lúc bàn giao từ hành tinh sang phòng thực nghiệm, khung 3D xuất hiện trước; thanh điều khiển, thí nghiệm, dữ liệu và kết quả hiện lần lượt, cách nhau khoảng 90 ms. Tiêu đề, header và phần còn lại xuất hiện sau. Các khung đi từ 96% lên 101% rồi về 100%, kết hợp trượt lên 14 px và mờ dần thành rõ. Toàn bộ nhịp xuất hiện khoảng 1,2 giây, chồng vào đoạn lớp camera mờ đi; không có khoảng trống giữa hai cảnh.

Chỉ animate component host bằng transform/opacity trong GSAP, chạy ngoài Angular change detection. Không nảy từng dòng chữ hoặc từng điểm dữ liệu, không đổi bố cục, không gọi API hay tự chạy iteration. Giữ khóa thao tác tới khi khung ổn định. Khi quay lại chọn thuật toán, các khung thu nhẹ và mờ đi trước đoạn camera lùi ra. Giảm chuyển động/hiệu ứng thấp bỏ qua nảy; thay đổi tùy chọn giữa chừng kết thúc an toàn và xóa style tạm.

Mã thực hiện: `src/app/presentation/journey-motion.ts`. Kiểm thử trình duyệt: `e2e/ui-redesign/lab-arrival.e2e.js`, được thêm vào runner chung. Kiểm tra thứ tự xuất hiện, nảy nhẹ, giao nhau với camera, khóa thao tác, không thay đổi iteration, dọn style, chiều quay lại, ngắt chuyển động và bố cục mobile. Không coi ticker 60 FPS là cam kết FPS thực tế trên mọi máy.

Xác nhận sau thay đổi này (01/11/2026): production build đạt; 101 unit test/22 file đạt; ba nhóm E2E `lab-arrival`, `algorithm-flight`, `motion` đạt tổng 36 tiêu chí. Đây là kiểm tra chức năng và chuyển động; chưa đo benchmark FPS trên thiết bị người dùng.

### Cùng một hành tinh giữa trang 1 và trang 2

Thứ tự cột trái trang đăng nhập là **tên đề tài → hành tinh → ba mục minh họa**. Hành tinh xuất hiện trên trang đầu bằng lazy loading khi trình duyệt rảnh; không dựng thêm một bản sao cho trang chọn.

Đăng nhập/đăng ký được API xác nhận hoặc bấm Guest (offline dùng phiên cục bộ): hành tinh di chuyển từ cột trái sang vị trí bên phải trang chọn trong khoảng 4 giây; đăng xuất chạy ngược. Cùng component Angular và cùng canvas WebGL được giữ lại, nên bản đồ/góc xoay không bị đặt lại. Nội dung trang đích hiện dần sau khi hành tinh gần tới chỗ để tránh chồng lên đối tượng đang bay. Chuyển động dùng transform vị trí và scale đồng đều, không kéo méo hình cầu.

Hai vị trí nhận hành tinh là `welcome-planet-slot` và `algorithm-planet-slot`. JourneyMotion tạm đưa component ra một lớp fixed trong lúc di chuyển, rồi trả về vị trí đích; ResizeObserver cập nhật renderer. Khóa thao tác trong chuyển cảnh, dọn lớp tạm khi kết thúc/hủy. Mobile giữ thứ tự dọc; reduced motion/low effects hoặc khi tài nguyên chưa sẵn sàng dùng chuyển trang ngắn/dock trực tiếp. Bấm gửi form sai không di chuyển hành tinh.

Lục địa được mở rộng khoảng 14–19% theo các tỉ lệ tạo hình; mỗi khu vực có thêm tối đa 14 đảo nhỏ, giữ khoảng nước giữa đảo/bờ chính và tránh vùng lân cận. Bản đồ và seed giữ cố định. Các đảo dùng chung màu thuật toán với đất liền. Nhịp sáng, bốn màu thuật toán, camera 4,6 giây và train đỏ/test vàng giữ nguyên.

Code chính: `welcome-panel.html/css`, `algorithm-picker.ts/html`, `algorithm-sphere.ts`, `planet-geometry.ts`, `journey-motion.ts`. Test `shared-planet.e2e.js` kiểm tra đúng thứ tự bố cục, danh tính component/canvas, Guest/login/register, chuyển ngược, form sai, reduced motion, mobile và resize.

Kiểm tra ngày 01/11/2026: production build đạt; 101 unit test trong 22 file đạt; bộ E2E 16 nhóm/163 tiêu chí đạt. Sau khi chỉnh riêng lời hướng dẫn trên trang đăng nhập, đã chạy lại build, 101 unit test và 12 tiêu chí shared-planet, đều đạt. Chuyển cảnh Guest/login/register và chiều quay lại đo khoảng 4,04–4,08 giây; đây là thời lượng chuyển cảnh, không phải số đo FPS.

### Form trang 1: dẫn người dùng đến lỗi

Áp dụng ý tưởng Lucian UX/UI Prompt #244 vào form Angular hiện có. `entry-form.ts/html/css` là component con của `welcome-panel`; không thêm số điện thoại/điều khoản demo từ mẫu. Luồng Đăng nhập/Đăng ký/Guest và kiểm tra mật khẩu tối thiểu 8 ký tự được giữ lại. Đã nối AuthSession với API phiên thật; lỗi từ máy chủ hiện tại form và không chuyển cảnh.

- Bấm Đăng nhập/Đăng ký khi sai: hiện số mục cần kiểm tra và danh sách liên kết; ô lỗi có viền đỏ, gợi ý mở ra và rung 0,4 giây.
- Sau 0,2 giây, cuộn nhẹ 0,52 giây tới ô sai đầu tiên và đặt con trỏ vào đó. Bấm hoặc Enter trên một liên kết lỗi để đến đúng ô. Nếu người dùng bắt đầu gõ, hủy cuộn/focus đang chờ để không giành con trỏ.
- Sửa hợp lệ: bỏ mục khỏi danh sách, gấp gợi ý và hiện dấu tích; không chuyển trang cho đến khi bấm nút gửi form hợp lệ.
- Chữ form/nút dùng bạc neon; thông báo lỗi vẫn đỏ, dấu tích xanh để rõ trạng thái. Riêng thẻ đăng nhập và ô nhập giữ nền tối ở cả light/dark theme để bạc dễ đọc. Nhãn nút nằm chính giữa, mũi tên trang trí đặt riêng bên phải.
- Giữ label, autocomplete, `aria-invalid`, `aria-describedby`, danh sách lỗi có `role="alert"` và hỗ trợ bàn phím. Đây là thuộc tính giúp trình đọc màn hình hiểu ô nào sai và thông báo liên quan; chưa kiểm tra bằng trình đọc màn hình thực tế.
- Reduced motion: bỏ rung/chuyển động cuộn, vẫn hiện lỗi và focus đúng ô. Mật khẩu được lấy tạm khi gửi API rồi xóa khỏi ô nhập; không lưu mật khẩu/token vào Signals, localStorage hoặc log. Form được xóa sau khi xác thực thành công và khi vào Guest. Chỉ thông tin định danh công khai được cache để chọn vùng dữ liệu offline.

`entry-form.spec.ts` kiểm tra lỗi rỗng, email sai/mật khẩu ngắn, sửa lỗi, tên đăng ký, chuyển chế độ và xóa dữ liệu trước khi tiếp tục. `e2e/ui-redesign/entry-validation.e2e.js` kiểm tra trên browser, đã thêm vào runner chung. Styles được giới hạn trong hai component trang 1; không thay bảng màu/cảnh 3D ở trang khác.

Kiểm chứng 01/11/2026: 99/99 unit test (21 file), build production đạt và không tăng giới hạn CSS/bundle. Hai nhóm browser entry/entry-validation đạt 21 tiêu chí; đã xem ảnh dark/light và kiểm tra mobile, bàn phím, reduced motion. Luồng entry cũ từng timeout khi thiết lập motion sau tải trang; đã cấu hình viewport/motion trước navigation, đưa browser lên foreground và chạy lại đạt. Không chạy lại toàn bộ bộ E2E, không kiểm chứng xác thực backend/MongoDB hay trình đọc màn hình thực tế trong đợt này. Log: `entry-validation-unit.log`, `entry-validation-build.log`, `entry-validation-browser.log`, `entry-after-validation.log`; ảnh `entry-validation-dark.png`, `entry-validation-light.png`, `entry-validation-mobile.png` trong `output/playwright`.

## 6. Quy chuẩn hình thức

| Thành phần | Quy định hiện tại |
| --- | --- |
| Nền | Đen/xanh đậm, sao trôi chậm/nhấp nháy; sao băng bạc nhẹ, 1 lượt khoảng 1,8 giây mỗi 10 giây |
| Font toàn web | Times New Roman, có Times/serif dự phòng |
| Linear | Gold #FFD166 |
| Polynomial | Beige #E8D8B5 |
| Ridge | Xanh biển #397BFF |
| Lasso | Bạc #D7E0EE |
| Train | Đỏ neon #FF405C, thống nhất điểm/chú giải/biểu đồ/MSE |
| Test | Vàng neon #FFE45C, thống nhất như Train |
| Nút/khung | Kính trong vừa, viền phản chiếu, chữ rõ; Stop có màu cảnh báo |
| Con trỏ | Con trỏ hệ thống; đã bỏ vòng/chấm/đuôi/gợn bám theo chuột |

Không dùng màu làm dấu hiệu duy nhất. Giữ nhãn, biểu tượng, focus bàn phím, trạng thái disabled. Không làm toàn bộ chữ glow quá mạnh.

Tiêu đề và phụ đề chung trang 1–2 dùng bạc neon `#D7E0EE`, gồm cả chữ nhấn trong tiêu đề; tên từng thẻ giữ màu thuật toán. Khối cầu WebGL và cầu dự phòng lấy đúng bốn màu thuật toán từ palette. Vật liệu có emissive (tự phát sáng); hover tăng sáng, không thêm bộ hậu xử lý nặng.

Màu nhấn của thuật toán được dùng thống nhất ở trang chọn, thực nghiệm và học từng bước: tiêu đề, viền, nút và trạng thái chọn dùng cùng tông. Các thẻ vẫn giữ bốn màu riêng để dễ nhận biết. Train luôn đỏ neon `#FF405C`, Test luôn vàng neon `#FFE45C` trên cả trang 3 và 4; màu dữ liệu không đổi theo thuật toán. Ví dụ chọn Ridge thì nút/tiêu đề xanh biển, điểm train vẫn đỏ và điểm test vẫn vàng.

### Bộ màu dùng chung trong Angular

Bảng màu nằm ở [`src/styles/palette.css`](../src/styles/palette.css), được Angular nạp toàn cục sau `src/styles.css` qua danh sách `styles` trong `angular.json`. Không cần tải lên dịch vụ hay cài thêm thư viện. Đây là **design tokens**: các tên màu dùng chung; ví dụ `--color-train` luôn có nghĩa là màu tập train.

Khi thiết kế component, dùng tên màu thay vì tự nhập mã màu mới:

```css
.panel-title { color: var(--algorithm-accent); }
.panel { background: var(--color-surface-glass); }
.description { color: var(--color-muted); }
.train-dot { background: var(--color-train); }
.test-dot { background: var(--color-test); }
```

`var(...)` là cách lấy giá trị một biến CSS. Ví dụ chọn Polynomial thì `--algorithm-accent` nhận màu beige, nhưng `--color-train` vẫn đỏ. Các cảnh Three.js hiện đọc bảng màu bằng `getComputedStyle`, nên điểm dữ liệu và cầu tiếp tục dùng cùng nguồn màu với giao diện.

Quy tắc phối: nền và phần lớn khung dùng màu tối trung tính; nội dung dài dùng trắng/xám; neon dành cho tiêu đề, nút đang tương tác và điểm cần chú ý. Mỗi trang thực nghiệm/học dùng một màu thuật toán làm điểm nhấn. Màu trạng thái thành công/lỗi dùng đúng ý nghĩa, không dùng để trang trí. Các mức sáng/phản chiếu và màu của light theme vẫn do lớp giao diện hiện có điều khiển; đây không phải cam kết mọi tổ hợp màu đều tự động đạt độ tương phản.

Muốn đổi màu, sửa giá trị trong `palette.css`; Angular rebuild khi đang chạy dev. Sau đó kiểm tra cả giao diện lẫn cảnh 3D (tải lại trang để các cảnh khởi tạo lại màu). Giữ màu train/test nhất quán giữa trang 3 và 4.

Kiểm tra sau khi tách palette: production build đạt; kiểm tra browser cho đủ bốn thuật toán trên trang thực nghiệm và trang học đạt, train/test giữ nguyên. Log: `output/playwright/palette-build.log`, `palette-browser.log`. Không chạy lại toàn bộ unit/E2E cho lần tổ chức lại bảng màu này.

Kiểm tra bảng màu bạc/gold/beige/xanh biển mới (31/10/2026): 94 unit test đạt, production build đạt. Kiểm tra browser gồm 7 tiêu chí palette/tiêu đề và 2 nhóm E2E neon (14 tiêu chí), chuyến bay (15 tiêu chí) đạt; không chạy lại toàn bộ bộ E2E. Log: `silver-palette-unit.log`, `silver-palette-build.log`, `silver-palette-browser.log`, `silver-neon-e2e.log`, `silver-flight-e2e.log` trong `output/playwright`. Ảnh cầu: `silver-gold-sphere.png`. Lượt đo ngắn scene thực nghiệm khoảng 59,2 FPS, scene học khoảng 58,6 FPS trên máy thử; không phải cam kết mọi thiết bị luôn 60 FPS.

## 7. Danh mục hiệu ứng và file phụ trách

| Hiệu ứng | Cách làm và tác dụng | Mã nguồn chính |
| --- | --- | --- |
| Chuyển trang theo lớp | GSAP: trang cũ rời đi → đổi trang → trang mới xuất hiện; có tiến/lùi, scale/xoay nhẹ và stagger (hiện lần lượt) | [journey-motion.ts](../src/app/presentation/journey-motion.ts) |
| Nền vũ trụ | 1.000 sao trong một Three.Points; shader điều khiển sáng/tối, xoay/drift chậm; có nền tĩnh dự phòng | [spatial-backdrop.ts](../src/app/presentation/spatial-backdrop.ts) |
| Liquid Glass | CSS gradient, nền alpha, backdrop-filter và viền phản chiếu; mô phỏng phong cách kính, không nhúng SDK Apple | [styles.css](../src/styles.css) |
| Hành tinh bốn lục địa | Đại dương PBR, địa hình nổi tạo bằng BufferGeometry, bờ biển và pulse; hành tinh chỉ hover/kéo, thẻ dùng để chọn | [algorithm-sphere.ts](../src/app/features/algorithm-sphere/algorithm-sphere.ts) |
| Điểm dữ liệu neon | InstancedMesh + MeshStandardMaterial emissive; nhiều điểm dùng chung mesh/material để giảm draw call | [viewport3d.ts](../src/app/features/viewport3d/viewport3d.ts) |
| Lộ trình A–F | SVG path, stroke-dashoffset để vẽ/thu đường; chấm sáng theo vị trí đọc; đường đo lại theo kích thước thẻ | [learning-route.ts](../src/app/features/learning-route/learning-route.ts) |
| Chuyển chặng mượt | Giữ các thẻ ổn định, chỉ cuộn khi thẻ sắp ra ngoài vùng đọc; ease-out 140–320 ms, không dùng animation để quyết định commit | [learning-route.ts](../src/app/features/learning-route/learning-route.ts) |
| Viền khung theo chuột | Radial gradient + mask; ánh sáng lan sang cạnh thẻ lân cận, mờ dần khi rời chuột | [card-glow.ts](../src/app/presentation/card-glow.ts), [card-glow.css](../src/app/presentation/card-glow.css) |
| Giới hạn render | FrameBudget tối đa 60 FPS, kể cả màn hình 144 Hz | [frame-budget.ts](../src/app/presentation/frame-budget.ts) |


### Hành tinh và chuyến bay tới lục địa — bản đồ hologram cố định 01/11/2026

- Bốn lục địa giả tưởng có đường bờ riêng, vịnh/bán đảo/đảo nhỏ và phân bố quanh toàn cầu. Vị trí chính cố định theo bản đồ thiết kế; đường bờ và đảo dùng seed cố định 81427 (giá trị giúp sinh lại cùng một hình dạng sau mỗi lần tải trang). Có lục địa ở mặt sau, nên không yêu cầu nhìn thấy đủ bốn màu cùng lúc. Địa hình dùng lưới tam giác đều, thay bố cục bốn đĩa dạng cánh hoa ở mặt trước. Linear gold, Polynomial beige, Ridge xanh biển, Lasso bạc, cùng bảng màu với thẻ. Tạo hình bằng code cục bộ trong `planet-geometry.ts`, không tải bản đồ hay ảnh từ mạng.
- Độ tự phát sáng của lục địa dao động nhẹ theo chu kỳ 1 giây, không tắt sáng đột ngột. Lục địa đang được chọn sáng ổn định; hover làm sáng và liên kết với thẻ tương ứng. Khi giảm chuyển động/hiệu ứng, dùng ánh sáng tĩnh. Có SVG hành tinh dự phòng khi không có WebGL.
- Đại dương xanh đen ít phản chiếu, viền bờ phát sáng theo màu thuật toán, lưới kinh/vĩ tuyến mảnh, viền khí quyển xanh nhẹ; ba quỹ đạo và sáu điểm kết nối. Không thêm đế hologram hay biểu tượng bay. Màu dùng chung giữ nguyên với thẻ; phong cách lấy cảm hứng từ ảnh tham khảo, không phải bản đồ Trái Đất thật.
- Chiều đi: thẻ thu thành sao → hành tinh xoay đưa lục địa ra trước → sao đáp vào đúng địa hình → canvas Three.js được chuyển ra lớp toàn viewport → camera thực sự di chuyển đến gần địa hình → trang thực nghiệm hiện dần. Không dùng đĩa màu phóng ra che toàn màn hình.
- Chiều về: hiện lại góc nhìn sát địa hình toàn màn hình → camera lùi → cảnh thu về vị trí hành tinh → sao bay về thẻ → khôi phục hướng xoay trước chuyến đi. Cùng một renderer/canvas được dùng và trả về component, tránh tạo thêm WebGL context cho mỗi lần chọn.
- Riêng camera tiến vào địa hình chạy 4,6 giây, điểm cuối cách tâm bề mặt khoảng 0,10 đơn vị cảnh (trước là 0,24). Đoạn cuối tăng exposure (độ sáng khi render) và một lớp sáng bạc mỏng, tối đa 20% opacity, để nối sang trang thực nghiệm trong khi vẫn thấy địa hình. Chiều ngược đảo nhịp sáng trước khi lùi ra.
- Timeline chiều đi khoảng 6,8 giây cộng 0,49 giây nối trang; chiều về 6,35 giây cộng khoảng 0,5 giây nối trang. Thời gian nhìn thấy có thể dài hơn khi tải lần đầu hoặc máy bận. Khóa chọn/điều hướng trong chuyến bay để tránh chồng animation.
- Framebuffer (ảnh nội bộ GPU vẽ trước khi hiển thị) trong chuyến bay được giới hạn pixel ratio 1, tối đa 1600×1000 và giữ đúng tỉ lệ. Canvas vẫn phủ viewport; giảm tải màn hình lớn thay vì yêu cầu GPU vẽ framebuffer 4K. Khi trả canvas về trang chọn, khôi phục chất lượng theo thiết bị/chế độ.
- Camera thay đổi vị trí 3D và phép chiếu theo kích thước màn hình; không scale DOM của hành tinh để giả chuyển động đến bề mặt. Điểm đáp lấy từ tâm địa hình thật và kiểm tra raycasting, gồm cả mặt đại dương để tránh chọn vùng đất bị che ở phía sau.
- Nếu đổi thuật toán cần reset tiến trình, xác nhận trước rồi mới bay; hủy giữ model và không tạo sao. Quay về chỉ tạm dừng, không xóa dataset/iteration. Train đỏ và test vàng trên trang 3–4 giữ nguyên.
- Reduced motion/low effects/WebGL fallback dùng chuyển trang đơn giản, không có chuyến bay. Cleanup xử lý resize, tab ẩn, đổi chế độ chuyển động, mất context và component bị hủy. Bản sao thẻ/canvas chuyển cảnh chỉ trang trí, không nhận input hoặc được đọc bởi screen reader.
- Giữ lazy loading Three.js bằng template reference cho component hành tinh. Phần lab được tải trước trong khi sao bay nhưng chưa hiển thị/chạy huấn luyện.

Sao băng dùng một đường nhỏ và một điểm sáng trong cảnh nền hiện có: trôi chéo nhẹ, hiện/mờ dần, không chiếm input và không ảnh hưởng dữ liệu mô hình. Dừng khi tab ẩn, giảm hiệu ứng hoặc reduced motion. Nền sao vẫn có 1.000 điểm.

Mã nguồn chính: `planet-geometry.ts`, `algorithm-sphere.ts`, `algorithm-flight.ts`, `algorithm-picker.ts`, App/JourneyMotion và `spatial-backdrop.ts`. Engine/worker/schema/API không thay đổi trong đợt này.

Kiểm chứng bản atlas hologram cố định: **101/101 unit test (22 file), 15 nhóm E2E headless/151 tiêu chí và build production đạt**. Unit kiểm tra bản đồ sinh lại giống hệt, có lục địa ở cả hai bán cầu, hình học hữu hạn và raycast đáp đúng từng lục địa trước mặt đại dương. Browser kiểm tra vùng đất nhìn thấy, xoay đưa vùng ở mặt sau ra trước, giữ màu thuật toán, camera tiến sâu/tăng sáng, quay lại và resize/mobile. Bài kiểm tra cũ yêu cầu cả bốn vùng nằm phía trước đã được thay bằng yêu cầu đúng của atlas: chỉ phần bán cầu đang nhìn thấy được hover; bốn thuật toán đều được kiểm tra qua chuyến bay riêng.

Log mới: `atlas-unit.log`, `atlas-build.log`, `atlas-browser.log`, `atlas-full-e2e.log` trong `output/playwright`; ảnh cập nhật `planet-selection.png`, `planet-flight-closeup.png`, `planet-landing.png`. Bộ browser chạy trên dev-server, production đã build nhưng chưa chạy lại bộ E2E trên production. Không coi kết quả này là kiểm chứng MongoDB/SSL hoặc đảm bảo FPS trên mọi thiết bị. Sau lượt chạy chỉ sửa nhãn mô tả kết quả của testcase slides cho đúng ý nghĩa bán cầu, không thay assertion hay logic.

Kiểm chứng bản hành tinh ban đầu 01/11/2026 (trước khi sửa atlas và kéo dài camera): **100/100 unit test (22 file), 15 nhóm E2E/149 tiêu chí và build production đạt**, bundle đầu khoảng 367,37 kB. Các kiểm tra gồm raycast tâm bốn lục địa trước mặt đại dương, camera tới gần địa hình, không còn đĩa màu phủ màn hình, canvas trả về đúng component, chuỗi đi/về bốn thuật toán, viewport 1920/mobile/resize, form, học A–F và offline với API giả lập. Không xác nhận tích hợp MongoDB/HTTPS hay FPS mọi thiết bị trong đợt này.

Lượt E2E headed ban đầu có timeout ở màn hình lớn; đã giới hạn framebuffer, kiểm tra riêng điều hướng 1920 px đạt. Một lượt headed chung còn timeout ở nhóm cuối; chạy riêng nhóm chuyến bay đạt, sau đó chạy lại toàn bộ headless đạt. Chưa kết luận nguyên nhân chính xác của timeout headed. Runner hiện mặc định headless (browser không hiện cửa sổ) để giảm ảnh hưởng focus/tab nền; thêm `-Headed` khi muốn quan sát: `powershell -ExecutionPolicy Bypass -File e2e/run-ui-redesign.ps1 -Headed`. Không tăng timeout hay bỏ các điều kiện kiểm tra camera để báo đạt.

Log cuối: `planet-unit.log`, `planet-build.log`, `planet-e2e-headless.log` và các `*-result.log` trong `output/playwright`. Ảnh: `planet-meteor-welcome.png`, `planet-selection.png`, `planet-flight-closeup.png`, `planet-landing.png`. E2E browser chạy trên dev-server; build production đã kiểm tra nhưng chưa chạy lại browser suite trên bản production. Lượt đo ngắn ở browser thử nghiệm đạt khoảng 59–60 FPS; không phải cam kết tốc độ trên mọi phần cứng.

Các kết quả dưới đây là **lịch sử của phiên bản cầu bốn mảng/lớp phủ màu**, đã được thay bằng hành tinh và camera thật; không dùng làm bằng chứng kiểm thử phiên bản hiện tại.

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

## 12. Offline, API, xác thực và dữ liệu

### Lưu đủ kết quả và khôi phục

Frontend gửi snapshot gồm cấu hình thuật toán/dataset, `w`, `b`, iteration, metric train/test và cấu hình bộ sinh. Schema Experiment khai báo rõ các trường tương ứng; không còn dựa vào việc spread dữ liệu FE vào một schema thiếu trường. Khi đọc lại, client chuyển cấu trúc algorithm phía server sang kiểu FE, dùng clientCreatedAt cho thời điểm lưu, chuyển R² null thành trạng thái không xác định trong ứng dụng. Snapshot bị sai kích thước trọng số, giá trị không hữu hạn hoặc cấu trúc CSV không hợp lệ bị từ chối.

CSV mới lưu cả trainX/trainY/testX/testY/trainIndices và provenance đã tiền xử lý. Khôi phục dùng đúng split, thống kê, trọng số và iteration, không cần chọn lại tệp. Engine đánh giá lại metric từ trọng số và dữ liệu được khôi phục. Đây không phải bản sao byte-for-byte của tệp CSV gốc. Bản lưu CSV cũ không có csvData vẫn giữ thông báo chỉ áp dụng cấu hình lên dữ liệu đang có. Snapshot tối đa 8 MiB (tính theo UTF-8); quá giới hạn thì báo lỗi trước khi lưu, không thay đổi mô hình đang chạy. JSON API tối đa 10 MiB; upload tệp là luồng riêng, không tự giải quyết snapshot lớn.

### Đồng bộ hai chiều và xóa offline

IndexedDB là nơi lưu cục bộ; không dùng được IndexedDB thì fallback bộ nhớ không bền qua reload. Bản ghi có scopeId riêng của tài khoản/Guest, mutationId cho mỗi thay đổi, serverVersion đã được xác nhận. Chỉ đánh dấu synced sau khi API trả items khớp ID, mutation và phiên bản cho từng bản ghi. HTTP 200 đơn thuần hoặc count tổng không đủ xác nhận.

`POST /api/v1/experiments/bulk` gửi các lô nhỏ theo số lượng và dung lượng; retry cùng mutation không làm tăng phiên bản hay tạo bản sao. Backend dùng cập nhật có điều kiện phiên bản và chủ sở hữu. `GET /api/v1/experiments?includeDeleted=true&page=...&limit=100` kéo đủ trang, kể cả khi client không có thay đổi mới. Dữ liệu server không ghi đè hàng đợi cục bộ chưa xác nhận. Xóa tạo tombstone bền trong IndexedDB, ẩn khỏi danh sách và gửi lên khi có mạng; bản cũ không được làm bản ghi đã xóa sống lại.

409 hiển thị lựa chọn Dùng bản máy chủ hoặc Giữ bản cục bộ thành bản sao có ID mới. Không tự chọn mất dữ liệu. Header X-Expected-User chỉ đối chiếu với phiên server để tránh đổi tài khoản ở tab khác làm gửi nhầm hàng đợi; nó không dùng để xác thực. Khi đổi scope phải chờ lần đọc IndexedDB mới nhất, không chờ promise cũ. Yêu cầu lưu/sync đến trong lúc đang kéo dữ liệu được xếp để chạy lại, không bị bỏ qua.

### Đăng nhập thật và ranh giới phiên

NestJS có AuthModule với register/login/guest/session/logout. Mật khẩu dùng scrypt và salt ngẫu nhiên; token phiên ngẫu nhiên chỉ lưu hash trên server, cookie HttpOnly/SameSite=Lax ở trình duyệt. Khi NODE_ENV=production, cookie có Secure và cần HTTPS. Không chấp nhận x-user-id hoặc Bearer chứa ID tự khai. Có giới hạn thử đăng nhập và giới hạn tạo Guest theo IP. API lọc chủ sở hữu ở danh sách, chi tiết, thay đổi, tải tệp và sync; metadata không được gán storage key của tệp server.

Guest có ID riêng. Guest offline lưu vào scope cục bộ; khi có mạng, tạo phiên Guest thật rồi chuyển chính hàng đợi cục bộ đó sang phiên mới trước khi đẩy lên. Không tự chuyển dữ liệu tài khoản này sang tài khoản khác. Đăng xuất hoặc chuyển danh tính xóa dữ liệu/mô hình đang xem, hủy component nhập CSV; dữ liệu đã lưu của từng scope còn nguyên. Đăng xuất offline báo không thể thu hồi phiên, không giả báo thành công. Guest là phiên tạm gắn với cookie; nên dùng tài khoản cho dữ liệu cần truy cập lâu dài. Chưa có xác minh email, quên mật khẩu hoặc 2FA.

### Chạy và kiểm thử

Angular dev proxy chuyển /api tới NestJS 127.0.0.1:3000. FE SSR production có cùng proxy qua BACKEND_ORIGIN; lỗi API trả JSON, không rơi vào HTML của Angular. Backend .env dùng CORS_ORIGINS đúng origin triển khai và NODE_ENV=production khi chạy HTTPS. Cache app shell/JS qua Service Worker chỉ bật production; cần cache trước khi offline, không coi npm start là kiểm chứng PWA production.

Bộ UI/chuyển cảnh dùng api-fixture.e2e.js để giả lập auth và ack, tách khỏi persistence-live.e2e.js chạy không mock trên Backend/MongoDB thật. Test API ở repo Backend tạo database regression_test ngẫu nhiên, kiểm tra trực tiếp document rồi chỉ dọn database đó. Helper run-browser-backend.mjs dùng database regression_browser riêng, dọn bằng cleanup-browser-backend.mjs sau khi dừng. Tuyệt đối không dùng database ứng dụng làm nơi reset/seed cho test.

## 13. Tiền xử lý CSV và giới hạn diễn giải

Đã sửa thứ tự tiền xử lý: đọc cột và loại dòng thiếu y; với chế độ drop thì loại dòng thiếu X; chia train/test một lần bằng tỉ lệ và seed; fit giá trị điền thiếu và thống kê z-score chỉ trên train; transform cả hai tập bằng cùng thống kê. `buildDataset` trả về chỉ số phân chia, `LabStore.loadDataset` nhận lại các chỉ số đó, không trộn/chia lần thứ hai. Nếu một cột train không có giá trị hợp lệ khi điền mean, dùng 0; cột hằng dùng sd = 1. Thống kê và nguồn dòng vẫn đi cùng dữ liệu để bảng A–F đối chiếu được giá trị gốc, sau điền thiếu và sau chuẩn hóa.

Nếu bật chuẩn hóa, cả X và y được chuẩn hóa bằng thống kê train. MSE/RMSE/MAE hiện trên thang y đã chuẩn hóa, không phải đơn vị gốc của CSV; giao diện kết quả ghi rõ điều này. Chưa bổ sung inverse-transform metric. Snapshot CSV mới giữ dữ liệu đã xử lý để khôi phục đúng mô hình; không lưu nguyên byte tệp gốc. Bản ghi cũ thiếu csvData vẫn có giới hạn áp dụng lên dữ liệu đang có.

Test chống rò rỉ thay đổi riêng giá trị X/y ở test rồi kiểm tra thống kê fit, giá trị điền thiếu và dữ liệu train không đổi. Số dòng nguồn CSV vẫn là bản ghi logic tính cả header, không phải dòng vật lý nếu ô chứa xuống dòng. [learning-demo.csv](examples/learning-demo.csv) là dữ liệu mẫu kiểm tra nhập CSV.

### Dữ liệu minh họa và cấu hình tái lập

Trong panel Dữ liệu có lựa chọn độc lập với thuật toán: tuyến tính có nhiễu, bề mặt cong, các biến tương quan mạnh và biến không liên quan. Bấm REGENERATE mới áp dụng; chỉ đổi thuật toán không đổi dataset. Dữ liệu tương quan nên dùng ít nhất hai đặc trưng, dữ liệu sparse nên dùng ít nhất ba. Tất cả bộ sinh version 1 tái lập theo seed. Linear giữ nguyên bộ sinh cũ để các bản ghi cũ tiếp tục tái tạo đúng.

Lưu thí nghiệm lấy `appliedSynthetic` (cấu hình thật đã sinh dữ liệu), không lấy lựa chọn còn đang chờ REGENERATE. Trường `synthetic` gồm kind/version/sampleCount/featureCount/noise/seed/trainRatio, đi qua IndexedDB, JSON/CSV export và bulk API. Backend đăng ký schema con tương ứng và kiểm tra cấu hình ở create/update/bulk. Bản ghi FE cũ không có trường này dùng mặc định linear; phiên bản chưa hỗ trợ không tự đoán sang bộ sinh khác. Chỉ so sánh các thuật toán khi cùng dataset, split và thang đo; không kết luận mô hình tốt hơn từ hai kịch bản dữ liệu khác nhau.

### Quy tắc biểu diễn và hệ số

Một chính sách `modelVisibility` quyết định đường/mặt phẳng/dải: một đặc trưng chỉ hiện đường, từ hai đặc trưng hiện mặt, pha A ở trang học ẩn mọi hình dự đoán, ε = 0 ẩn dải, mô hình vượt giới hạn hình học ẩn cả đường và mặt. Effect đánh dấu mẫu không được tự ghi lại `.visible`. Độ co hình lấy x1/x2/y đang được vẽ, không bị biến x3+ có giá trị lớn làm toàn cảnh thu nhỏ; đây vẫn chỉ là co hiển thị, không đổi dữ liệu học.

Polynomial dùng cùng thứ tự tên đặc trưng với engine, gồm cả tích chéo; phần ghi chú rút gọn sau tám hạng tử khi quá dài, bảng hệ số và pha E vẫn có đủ. Panel kết quả thêm thanh |w| và giá trị có dấu cho từng đặc trưng; hệ số bằng 0 được xác định bằng giá trị thật, không dùng số đã làm tròn. So sánh độ lớn hệ số cần xét thang đo đầu vào. Ridge/Lasso vẫn vẽ mặt phẳng; khác biệt thể hiện ở trọng số và tác động của λ, không đổi hình dạng một cách giả tạo.

### Lịch sử xác minh đợt sửa hiển thị/CSV ngày 03/11/2026

Production build FE và build NestJS đều đạt. Unit test FE: 114/114 trong 23 file; Backend: 12/12 trong 3 file. Bộ E2E đầy đủ dev-server: 18 nhóm/185 tiêu chí đạt, gồm nhóm model-integrity mới. Sau khi hoàn thiện nhãn dataset đã lưu và chặn phiên bản bộ sinh chưa hỗ trợ trước khi thay đổi trạng thái, đã chạy lại unit/build cả hai repo và nhóm model-integrity (11 tiêu chí); nhóm này còn kiểm tra không tràn ngang trên mobile cho từng thuật toán.

Bằng chứng nằm trong `output/playwright/model-fixes-full-e2e.log`, `model-fixes-unit-final.log`, `model-fixes-build-final.log`, `model-integrity-final.log` và `*-result.log`; ảnh `model-integrity-learning.png`. Kiểm tra lỗi 1D/ε=0/đổi mẫu dùng scene WebGL thật trong trình duyệt; mock API chỉ xác nhận payload đồng bộ. Backend test kiểm tra mapping bulk và schema Mongoose giữ cấu hình, chưa phải lần ghi trên MongoDB đang chạy. Chưa benchmark FPS hoặc xác minh HTTPS trong đợt này. Đợt đó không thay đổi engine gradient/ISTA hoặc logic commit một iteration ở F. Đợt lưu dữ liệu/xác thực sau đó bổ sung điều kiện dừng theo J và khôi phục initial model; xem mục 12.

### Điều kiện dừng và tiếp tục mô hình

Linear/Polynomial xét thay đổi MSE; Ridge/Lasso xét J = MSE + phần phạt tương ứng. Chuỗi prepare/commit A–F và chế độ chạy thường dùng cùng điều kiện dừng. Khi khôi phục, TrainingSession nhận initial weights/bias/iteration và tính lại metric trên split đã lưu; pha E vẫn chỉ xem trước, F mới commit một cập nhật.

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

Bản SSR sau build: dùng SSR_ALLOWED_HOSTS (mặc định localhost,127.0.0.1) theo môi trường thử rồi chạy `node dist/Hoiquy3d/server/server.mjs`, thường mở cổng 4000. Khi triển khai, cấu hình hostname thực tế, không dùng wildcard tùy tiện.

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
- Lucian UX/UI Prompt #244: tóm tắt lỗi form, chuyển focus và thông báo theo từng ô; giữ ghi công MIT trong entry-form.ts.
- Lucian UX/UI Prompt #228: viền thẻ sáng theo con trỏ.
- Giữ comment ghi công MIT hiện có ở source áp dụng; không đưa dữ liệu thành phố/thẻ demo vào sản phẩm.
- robinpayot.com là định hướng cảm giác chuyển cảnh đã trao đổi, không phải mã nguồn được xác nhận đã sao chép.

Năm file giao diện/học cũ được thay bằng tài liệu này. ZIP chứa nguyên bản và README trước khi gộp được lưu ngoài repository tại `C:/Users/admin/OneDrive/Documents/ChatGPT/JS/outputs/documentation-backups/ui-docs-before-merge-20261031-163209.zip`; README/API/schema của backend giữ riêng vì phục vụ mục đích khác.

## 19. Hoàn thiện lưu mô hình và PWA — 03/11/2026

- `ngsw-config.json` cache thêm `index.csr.html`: Angular SSR đặt tệp này làm trang mở offline. Cache đủ JS/CSS mà thiếu tệp này vẫn có thể lỗi khi reload mất mạng.
- Guest offline giữ lại cùng danh tính khi vào lại; chỉ chuyển dữ liệu giữa scope khi ID thay đổi. Unit test và E2E production kiểm tra không nhân đôi danh sách sau reload.
- Kết quả kiểm thử của đợt này được ghi trong [báo cáo cập nhật từng file](https://github.com/ManhCuong150206/TS-JS/blob/main/BAO-CAO-CAP-NHAT-2026-11-03.md), gồm phạm vi thật/mô phỏng và giới hạn.

### Kết quả đã hoàn tất

| Kiểm tra | Kết quả | Giới hạn của kết luận |
| --- | --- | --- |
| Frontend unit | 126/126, 25 file | Có 2 ca mới về Guest; môi trường jsdom không render WebGL thật |
| Backend unit | 12/12, 3 file | Kiểm tra logic/module với mock phù hợp |
| Backend API + MongoDB thật | 12/12 | Database test riêng, tự dọn; không dùng database ứng dụng |
| Build FE và BE | Đạt | Biên dịch thành công; không đồng nghĩa đã triển khai HTTPS |
| UI E2E | 18 nhóm / 185 tiêu chí đạt | 9 nhóm đầu, sửa kỳ vọng logout cho auth thật rồi chạy 9 nhóm còn lại; API fixture mô phỏng |
| Hồi quy sau chỉnh cuối | 5 nhóm / 43 tiêu chí đạt | entry, entry-validation, navigation-layout, learning-offline, mobile-fallback |
| Browser FE → API → MongoDB thật | 13 tiêu chí đạt | Có CSV, trọng số, khôi phục sau mất cache, conflict, xóa offline và tài khoản riêng |
| PWA production | 8/8 tiêu chí đạt | Service Worker/Worker cache đủ → reload offline → học/lưu → reload/khôi phục → online đồng bộ MongoDB qua SSR proxy |

Log/ảnh nằm trong `FE/FE-hoiquy3d/output/playwright` (bị Git ignore): `persistence-unit-final.log`, `persistence-build-final.log`, `backend-build-final.log`, `backend-unit-final.log`, `backend-e2e-final.log`, `persistence-ui-final.log`, `persistence-ui-remaining.log`, `final-*.log`, `persistence-live-final.log`, `pwa-persistence.log`, `pwa-persistence-complete.png`. Test UI đầu có lỗi kỳ vọng logout cũ; không ghi nhận lần đó là toàn bộ pass. Các nhóm còn lại và các nhóm ảnh hưởng đã chạy lại như bảng trên.

## 20. Nút học ở trang 4 sau khi mô hình kết thúc - 04/11/2026

- Nguyên nhân đã tái hiện: mô hình trang 3 có `status = done`; nút trang 4 vẫn ghi “Học từng bước” nhưng bị disabled. Khi rê chuột, CSS hiện dấu cấm; người dùng không có thao tác khởi động lại ngay ở trang 4.
- Đã sửa: khi phiên hoàn tất hoặc gặp lỗi, đổi nút thành **Học lại từ đầu** và cho bấm. Đây là thao tác đặt lại tiến trình/model chưa lưu rồi chạy đúng một iteration A–F, giữ nguyên tập dữ liệu, thuật toán và cấu hình; các bản thí nghiệm đã lưu không bị xóa. Phiên đang chạy bình thường không bị reset khi bấm tiếp tục.
- Khi Worker bận/chuyển chế độ hoặc learning rate không hợp lệ, nút vẫn được khóa để tránh gửi thao tác chồng nhau, kèm thông báo lý do liên kết bằng `aria-describedby`.
- File sửa: `learning-walkthrough.ts`, `learning-walkthrough.html`; thêm `learning-walkthrough.spec.ts` và `e2e/ui-redesign/lesson-restart.e2e.js`; runner E2E có thêm nhóm `lesson-restart`.
- Kiểm thử: **131/131 unit test (26 file), build production đạt**. Browser: `lesson-restart` **8 tiêu chí**, `learning-route` **14 tiêu chí**, `smooth-learning` **9 tiêu chí** đều đạt. Browser dùng Worker thật và API fixture, không phải đợt kiểm chứng MongoDB mới; không chạy lại toàn bộ nhóm E2E.
- Log/ảnh: `lesson-disabled-before.log`, `lesson-disabled-before.png`, `lesson-restart-unit.log`, `lesson-restart-build.log`, `lesson-restart-e2e.log`, `lesson-restart-fixed.png`, `lesson-fix-learning-route.log`, `lesson-fix-smooth-learning.log` trong `output/playwright` (Git ignore).
