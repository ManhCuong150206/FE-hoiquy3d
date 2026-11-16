# Các tính năng

Mỗi thư mục chứa mã, giao diện và spec của một tính năng.

- `algorithm-notes/` — Hiển thị công thức và giải thích cho thuật toán đang chọn.
- `algorithm-picker/` — Chọn thuật toán và điều phối chuyển cảnh từ quả cầu 3D.
- `csv-import/` — Đọc CSV, xem trước, ánh xạ cột và xử lý dữ liệu thiếu trước khi áp dụng.
- `data-panel/` — Thiết lập dữ liệu mô phỏng, tạo lại dữ liệu và mở luồng nhập CSV.
- `experiment-workflow/` — Hướng dẫn chạy cấu hình, ghi lần thử và so sánh với mốc.
- `experiments-panel/` — Lưu, xem và đồng bộ các thí nghiệm.
- `learning-walkthrough/` — Trình bày từng pha A–F của một vòng cập nhật hệ số.
- `results-panel/` — Hiển thị chỉ số, biểu đồ sai số và kết quả mô hình.
- `training-controls/` — Điều khiển huấn luyện và chỉnh siêu tham số.
- `viewport3d/` — Vẽ các điểm dữ liệu, bề mặt hồi quy và phần minh họa sai số trong Three.js.
- `welcome-panel/` — Hiển thị màn hình chào và cho người dùng bắt đầu bằng tài khoản hoặc phiên khách.

Dùng `@app/features/<tên>` từ bên ngoài. Import nội bộ trỏ thẳng tới tệp.
