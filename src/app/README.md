# Bản đồ ứng dụng

- `core/` chứa thuật toán, mô hình, lưu trữ, state toàn ứng dụng và hằng số.
- `shared/` chứa thành phần và tiện ích UI dùng chung.
- `features/` chứa các tính năng của trải nghiệm hồi quy.
- `layout/` chứa header, lớp nền và chuyển cảnh.
- `pages/` chứa component gắn trực tiếp với một route.
- `app.ts`, `app.html` và `app.css` tạo khung trải nghiệm. `app.routes.ts` và `app.config.ts` cấu hình router và ứng dụng.

Hướng phụ thuộc `layout/pages → features → shared → core`. Các tầng bên ngoài có thể dùng trực tiếp tầng thấp hơn.
Dùng `@app/core`, `@app/shared` hoặc `@app/features/<tên>` từ bên ngoài. Trong mỗi nhóm dùng đường dẫn tương đối tới tệp đích.
