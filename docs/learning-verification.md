# Kết quả kiểm tra Học từng bước — 26/10/2026

## Tự động

- Production build thành công, prerender 1 route. Initial bundle 912.94 kB, cảnh báo vượt budget 500 kB; không tăng budget để che cảnh báo.
- Angular/Vitest: **12 test files, 31 tests passed**. jsdom báo không hỗ trợ Canvas/WebGL; phần 3D được kiểm tra riêng trong trình duyệt thật.
- `git diff --check`: đạt (chỉ nhắc chuẩn hóa CRLF của Git).
- Taste lint cho component mới: 0 FAIL, 0 WARN.
- Taste inspector trên production cuối: 0 FAIL, 5 WARN sau khi cho phép kiểu tiêu đề cũ `micro-label`; các cảnh báo còn lại được ghi dưới đây.

## Trình duyệt thật

Đã thao tác với worker và WebGL trong trình duyệt Chromium tích hợp:

- A–E vẫn iteration 0, F mới sang 1; bước kế tiếp A giữ iteration 1. Kết quả, mô hình và dự đoán khớp iteration đang áp dụng.
- Linear mặc định: MSE train từ 0.747186 xuống 0.718362 ở bước 1, rồi 0.690697 ở bước 2; khớp kiểm thử engine.
- Polynomial bậc 2, hai biến: đúng thứ tự x1, x2, x1², x1×x2, x2²; chạy đến F.
- Ridge/Lasso chạy đến F; Lasso pha E hiển thị u, ngưỡng 0.001 với α=0.01, λ=0.1, và intercept không bị co.
- Mặc định 1 giây/pha; đổi 0.5 giây; pause giữ pha C, resume đi tiếp tới F; chuyển thủ công, thu gọn, mở lại.
- Đổi chế độ ở pha E bỏ ứng viên chưa áp dụng; Step ở chế độ thường tiếp tục đúng iteration. Chạy/tạm dừng chế độ thường, Reset khi tự phát, Stop rồi bắt đầu lại.
- Chọn mẫu bằng ô số, bảng train và bấm điểm 3D; dữ liệu panel và marker đổi cùng mẫu.
- Ba đặc trưng: lát cắt ghi rõ x3 của mẫu chọn; dự đoán panel/viewport cùng giá trị (-0.024790 trong ca Lasso đã thử).
- CSV [learning-demo.csv](examples/learning-demo.csv): chọn điền trung bình + z-score, nhận 19/20 mẫu, bỏ 1 dòng thiếu y, điền 1 ô X, chia 15 train/4 test. Pha A hiện đúng dữ liệu gốc, thống kê và phép chuẩn hóa.
- Giao diện ở 1440/768/390 px; panel có cuộn riêng cho bảng rộng, không tràn ngang toàn trang. Trên điện thoại cả sáu pha hiện thành hai hàng. Công thức Lasso ở ghi chú xuống dòng đầy đủ.
- Không ghi nhận console error/warn trong phiên thao tác dev được kiểm tra. Bản production đã mở và kiểm tra riêng sau build.

## Kiểm tra hình thức và giới hạn

Ảnh và báo cáo cục bộ trong `.taste-skill/` (được gitignore để không đưa ảnh QA vào source): `before/`, `after/`, `final/`. Ảnh panel: `after/learning-desktop.png`, `after/learning-tablet.png`, `after/learning-mobile.png`, `after/lasso-formula-mobile.png`.

Trước sửa, inspector ghi nhận thiếu h1, tràn ngang **285 px tại 768 px** và chữ sát mép; các lỗi này đã hết. Kiểu tiêu đề viết hoa nhỏ có sẵn được giữ theo phạm vi bảo toàn giao diện (`micro-label` được cho phép trong lần kiểm tra cuối). Các cảnh báo hình thức còn lại về độ tương phản nhãn cũ, font, số trong panel cũ, chiều cao các cột và diện tích màu của 3D chưa phải một đợt thiết kế lại toàn ứng dụng. Component mới dùng số tabular.

Nhận xét từ ảnh theo checklist app screen của Taste Skill:

1. Khung 3D vẫn là phần nhìn chính; panel trả lời “dữ liệu tạo ra lần cập nhật này như thế nào?”, pha hiện tại được nhấn rõ.
2. Panel thẳng hàng với viewport/kết quả; khoảng trống bên trái khi cuộn sâu là hệ quả giữ bố cục cột đã duyệt. Không kéo cao thẻ thí nghiệm trống để lấp khoảng này.
3. Giữ Roboto và bảng màu sẵn có, không bốc phong cách mới cho một component bổ sung. Màu dùng cho train/test, bề mặt và pha hiện tại; diện tích màu lớn trên điện thoại đến từ chính mô hình 3D.
4. Dự đoán, iteration và loss trùng nhau giữa panel/viewport/kết quả, với độ làm tròn khác nhau được giải thích. Bảng mới căn phải và dùng tabular; font/số của phần giao diện cũ được giữ.
5. Số 0 hiện là 0.000000; dữ liệu không có hiện dấu gạch, ô CSV trống ghi rõ “(trống)”. Không thêm badge giả.
6. Chú giải xanh/cam khớp điểm train/test; cầu viền, khối vuông và đoạn nối phân biệt đúng các đại lượng. Chưa thấy chữ đè biểu đồ ở các kích thước đã thử.
7. Điện thoại xếp viewport và panel trước; sáu pha thành hai hàng, công thức xuống dòng. Bảng hệ số rộng cuộn trong panel. Nhãn phụ của giao diện cũ còn nhỏ/nhạt, được ghi nhận thay vì tuyên bố đạt toàn bộ tiêu chí thị giác.

Chưa kiểm chứng Firefox/Safari, thiết bị cảm ứng thật, hiệu năng mọi tổ hợp CSV lớn/Polynomial bậc cao, đồng bộ backend và toàn bộ luồng lưu/xuất/so sánh thí nghiệm. Không có thay đổi commit/push hay cơ chế tính tiền xử lý CSV trước split. Xem [ghi nhận CSV và thiết kế](learning-walkthrough.md).
