# Yêu cầu giao diện đã chốt — Hồi quy 3D

Cập nhật ngày 31/10/2026. Tài liệu này tổng hợp các yêu cầu cuối cùng của đợt chỉnh giao diện, thay cho những mô tả cũ còn rải rác ở các phiên bản trước.

- Phạm vi: frontend Angular tại `FE/FE-hoiquy3d`.
- Mốc giao diện được mô tả: 1.6. Lần cập nhật này chỉ biên tập tài liệu.
- Xem [kết quả kiểm thử](UI-REDESIGN-VERIFICATION.md) để phân biệt yêu cầu với kết quả đã xác minh.
- Xem [prompt và cách trình bày trong báo cáo](UI-PROMPT-REPORT.md) để trích phần yêu cầu theo văn phong tự nhiên.

## 1. Mục tiêu và cách làm

Hãy làm mới giao diện của hệ thống thực nghiệm và trực quan hóa quá trình học mô hình hồi quy trên frontend có sẵn. Giữ phong cách nền đen, bầu trời sao, kính trong và chữ nổi bật; ưu tiên thao tác dễ hiểu và chuyển động mượt.

Trước khi chỉnh sửa, hãy đọc lại cấu trúc dự án và các thành phần liên quan. Tận dụng Angular, TypeScript, Three.js và trạng thái hiện có; không dựng một ứng dụng khác để thay thế. Nếu yêu cầu chưa rõ, hãy đặt câu hỏi ngắn gọn trước khi làm.

Chỉ chỉnh phần trình bày và điều phối giao diện. Giữ nguyên công thức hồi quy, Web Worker, cách xử lý CSV, chia train/test, seed, metric, dữ liệu, lưu offline, IndexedDB và hợp đồng API. Không sửa schema MongoDB hoặc thêm xác thực thật trong đợt này.

## 2. Luồng bốn trang

Hãy tổ chức ứng dụng theo trình tự:

**Đăng nhập/Guest → Chọn thuật toán → Thực nghiệm → Học từng bước và ghi chú.**

Mỗi lần chỉ hiển thị một trang. Chuyển trang bằng nút bấm hoặc chọn trực tiếp trên cầu; không dùng cuộn chuột để đi sang trang khác. Cuộn chỉ đọc nội dung dài trong trang hiện tại; trong vùng 3D, cuộn vẫn dùng để zoom camera theo chức năng sẵn có.

Bỏ thanh điều hướng chung phía trên gồm các mục 01–04 và nút Hiệu ứng. Giữ các nút điều hướng cần thiết bên trong từng trang, không chừa khoảng trống cho thanh đã bỏ.

### Trang 1 — Đăng nhập, đăng ký và Guest

Hãy giữ phần giới thiệu dự án, form email/mật khẩu, lựa chọn đăng ký và nút tham gia với tư cách Guest. Khi chuyển sang đăng ký, hãy hiển thị trường tên theo giao diện hiện có.

Bỏ nút Khám phá thuật toán trong phần giới thiệu vì trùng chức năng với Guest. Người dùng đi tiếp bằng form demo hợp lệ hoặc nút Guest.

Đây mới là giao diện mô phỏng: kiểm tra định dạng và trường bắt buộc, không xác thực tài khoản thật, không gửi/lưu/log email và mật khẩu. Hãy xóa nội dung form trước khi tiếp tục bằng Guest hoặc khi đăng xuất demo.

### Trang 2 — Chọn thuật toán trên cầu 3D

Hãy dùng một khối cầu đặc, liền khối, chia thành bốn vùng màu tương ứng:

| Thuật toán | Màu nhận diện |
| --- | --- |
| Linear | Cyan neon `#35E6FF` |
| Polynomial | Hồng neon `#FF63B6` |
| Ridge | Tím neon `#A78BFA` |
| Lasso | Bạc lạnh `#D7E0EE` |

Ở góc nhìn ban đầu, hãy cho người dùng thấy đồng thời cả bốn vùng màu. Khi rê chuột vào vùng nào, làm vùng đó sáng neon và hiện tên thuật toán. Cho phép kéo xoay cầu; phân biệt kéo với bấm để tránh chọn nhầm. Khi bấm chọn, hãy mở trang thực nghiệm với đúng thuật toán đó.

Giữ các thẻ lựa chọn tương ứng để có thể dùng bàn phím và tiếp tục khi WebGL không hoạt động.

Đổi nút ở footer thành **Đăng xuất**. Trong bản demo, hãy tạm dừng việc chạy/trình diễn, đóng yêu cầu đổi thuật toán đang chờ, xóa nội dung form và đưa người dùng về trang đăng nhập. Không xóa dataset, mô hình hiện tại hoặc thí nghiệm đã lưu. Khi triển khai xác thực thật, hành động này cần được nối với cơ chế đăng xuất phía server.

### Trang 3 — Thực nghiệm mô hình

Hãy dùng lại các phần hiện có: header, điều khiển chạy, thí nghiệm, dữ liệu, không gian 3D và kết quả.

Khôi phục cấu trúc thanh điều khiển trên màn hình rộng theo thứ tự:

**Chế độ → Reset/Chạy/Step/Stop → Iteration → Thuật toán và tham số.**

Giữ các nhóm trên cùng một hàng khi đủ chiều rộng; không để cả nhóm tham số rơi xuống làm xuất hiện vùng trống lớn. Trên tablet, cho nhóm tham số xuống một hàng riêng dùng hết chiều rộng. Trên điện thoại, sắp xếp gọn và không tràn ngang. Nhãn dài được xuống dòng trong ô thay vì đẩy tràn khung.

Ô thuật toán chỉ hiển thị thuật toán đã chọn, không có danh sách để đổi trực tiếp. **Chỉ giữ nút Đổi thuật toán ở header trang 3**; bỏ nút đổi bên dưới ô thuật toán và ở footer trang 3.

Giữ nguyên các nút chạy, tạm dừng, từng bước, stop, reset, tham số riêng từng thuật toán và chức năng nhập/lưu dữ liệu. Nếu người dùng chọn thuật toán khác khi đã có tiến trình học, hãy giữ hộp xác nhận trước khi đặt lại model theo logic hiện có.

Giữ nút mở trang học từng bước và ghi chú. Việc chuyển trang không tự chạy thêm một bước học.

### Trang 4 — Học từng bước, ghi chú và mô hình 3D

Hãy tách phần học thành trang riêng, gồm mô hình 3D, giải thích các bước và ghi chú thuật toán. Dùng chung dữ liệu, thuật toán, iteration, snapshot và mẫu đang chọn với trang thực nghiệm; không tạo một model độc lập chỉ để trình bày.

Trên desktop, đặt mô hình bên trái, phần giải thích bên phải và ghi chú phía dưới. Trên mobile, xếp dọc để dễ đọc. Hiển thị trước lộ trình sáu pha: đầu vào, dự đoán, sai số, loss, hệ số và đánh giá.

Cuộn chỉ đọc nội dung. Hãy để người dùng bấm các nút học/phát để thực hiện các pha theo hành vi hiện có. Giữ quy tắc các pha A–E chưa áp dụng model mới và pha F áp dụng một lần cập nhật. Có nút trở về trang thực nghiệm mà không mất trạng thái.

## 3. Phong cách chung

Hãy dùng **Times New Roman** cho toàn bộ web, gồm tiêu đề, nội dung, nút, form, bảng, số liệu và công thức. Có thể dùng Times/serif làm font dự phòng. Không giữ font monospace hoặc font kỹ thuật ở riêng các ô số liệu.

Giữ màu chủ đạo đen/xanh đậm. Làm chữ nổi bật bằng tương phản, độ đậm và glow vừa phải; không làm tất cả nội dung phát sáng quá mạnh gây khó đọc. Giữ nhãn, biểu tượng và trạng thái disabled/focus rõ ràng.

### Nền vũ trụ

Thay bằng bầu trời sao có chiều sâu, trôi chậm và sáng tối nhẹ ở từng ngôi sao. Không cho cả nền nháy đồng loạt.

Nền chỉ dùng để trang trí, không mang dữ liệu của mô hình và không chặn thao tác chuột. Khi bật giảm chuyển động hoặc tab bị ẩn, hãy ngừng chuyển động. Có nền sao tĩnh dự phòng khi không tạo được WebGL.

### Nút và khung Liquid Glass

Hãy làm nút chức năng trong như giọt nước: viền phản chiếu, highlight cong, nền kính nhẹ và chữ neon. Giữ nút Stop có màu cảnh báo dễ nhận biết.

Ở trang 3 và 4, áp dụng kính **trong vừa** cho thanh điều khiển, các bảng, khung 3D, phần học và ghi chú. Người dùng phải thấy được lớp sao phía sau nhưng vẫn đọc rõ nội dung. Các ô nhỏ bên trong cũng dùng nền bán trong suốt, không để sót mảng nền đặc ngoài ý muốn.

Đây là mô phỏng phong cách Liquid Glass bằng CSS/WebGL, không phải nhúng SDK Apple. Hãy ưu tiên blur ở khung ngoài, tránh chồng nhiều lớp làm giảm hiệu năng. Nếu trình duyệt không hỗ trợ blur, dùng nền đậm hơn để giữ khả năng đọc.

### Màu dữ liệu

| Tập dữ liệu | Màu đã chốt | Phạm vi đồng bộ |
| --- | --- | --- |
| Train | Cam neon `#FF922E` | Điểm ở trang 3/4, chú giải, biểu đồ và số MSE |
| Test | Xanh lam neon `#42A5FF` | Điểm ở trang 3/4, chú giải, biểu đồ và số MSE |

Không đổi màu Train/Test theo thuật toán và không dùng màu làm dấu hiệu duy nhất. Giữ tên tập dữ liệu, hình dạng/chú giải cần thiết. Điểm dự đoán, residual và mẫu đang chọn vẫn giữ ý nghĩa trực quan của chúng.

### Con trỏ

Giữ con trỏ hệ thống. Thêm vòng sáng neon, đuôi ngắn và gợn khi bấm để thao tác rõ hơn, nhưng không che nội dung hoặc chặn click. Tắt lớp trang trí trên cảm ứng và khi người dùng yêu cầu giảm chuyển động. Không lưu hoặc gửi tọa độ con trỏ.

## 4. Chuyển cảnh và hiệu năng

Hãy làm chuyển cảnh theo chuỗi liền mạch: **trang cũ rời đi → đổi trang → nội dung trang mới xuất hiện**. Không chỉ phóng to/phát sáng rồi biến mất.

- Trang chọn: cầu đi vào từ xa với scale/xoay nhẹ, nội dung hiện theo lớp.
- Trang thực nghiệm: tiêu đề, điều khiển và các bảng xuất hiện lần lượt.
- Trang học: mô hình và giải thích xuất hiện từ hai phía.

Nếu có yêu cầu điều hướng mới khi hiệu ứng cũ chưa xong, hãy xử lý trạng thái nhất quán để chỉ một trang hiển thị. Giảm hoặc bỏ animation khi bật reduced motion.

Giới hạn render 3D và animation GSAP ở **tối đa 60 FPS**, kể cả màn hình 144 Hz. Tối ưu để gần 60 FPS trên máy thử; không diễn đạt giới hạn này thành bảo đảm mọi thiết bị luôn đạt đúng 60.

Giữ phép tính học trong Web Worker, tận dụng instancing, dừng render ở trang/tab ẩn và dọn tài nguyên khi không dùng. Với các phép xoay/chuyển động, hãy tiếp tục dùng số phức/quaternion qua các hàm hiện có. Không đưa tính toán hồi quy vào vòng vẽ.

## 5. Quyết định triển khai và kiểm thử

Những chi tiết sau là cách triển khai đã được chọn, không phải nguyên văn prompt của người dùng: nền hiện dùng 1.000 sao trong một Points; khung ngoài có alpha khoảng 0,48 và blur 4 px; ngưỡng kéo cầu được tách khỏi click; toolbar đã được kiểm tra ở 1920/1440/1366 px cùng tablet/mobile. Xem mã nguồn và tài liệu kiểm thử để đối chiếu.

Hãy kiểm tra ít nhất: vào ứng dụng bằng form/Guest, đăng xuất demo, chọn đủ bốn thuật toán, kéo cầu không chọn nhầm, chỉ một trang hiện, giữ trạng thái giữa trang 3/4, học từng pha, lưu offline và bố cục ở các kích thước màn hình.

Phân biệt rõ unit test (kiểm tra phần logic nhỏ), E2E (thao tác xuyên suốt trên trình duyệt), build (biên dịch bản triển khai) và đo FPS. Khi báo cáo, hãy nêu đúng số đã chạy và môi trường thử; không coi API sync giả lập là bằng chứng MongoDB đã nhận dữ liệu, hoặc giao diện đăng nhập demo là xác thực thật.

Yêu cầu đã bỏ: cuộn để chuyển trang; ảnh/công thức làm nền; font kỹ thuật thay cho Times New Roman; thanh điều hướng 01–04; nút Khám phá trùng Guest; các nút đổi thuật toán trùng ở trang 3.
