# Hồi quy 3D

Web app Angular/TypeScript giúp thực nghiệm Linear, Polynomial, Ridge và Lasso, quan sát mô hình 3D và giải thích một iteration qua sáu pha A–F.

**Tài liệu chính:** [Công nghệ, công cụ, hiệu ứng và kiểm thử](docs/CONG-NGHE-VA-HIEU-UNG.md). Các tài liệu giao diện/học từng bước trước đây đã được gộp vào file này.

## Chạy nhanh

Trong thư mục frontend, dùng Node.js/npm phù hợp với dependency và lockfile của dự án:

```powershell
npm.cmd ci
npm.cmd start -- --host 127.0.0.1 --port 4300
```

Mở http://127.0.0.1:4300. Trên môi trường khác có thể dùng npm thay npm.cmd.

## Cách sử dụng

1. Vào bằng form demo hoặc Guest, chọn thuật toán bằng thẻ; khối cầu hỗ trợ rê chuột và kéo xoay.
2. Sinh dữ liệu hoặc nhập CSV; cấu hình tham số và chạy ở trang thực nghiệm.
3. Mở trang học, bấm **Học từng bước** để chạy đúng một iteration A–F rồi dừng.
4. Chọn chặng để xem lại số liệu/minh họa; dùng **Đến ghi chú** để đọc công thức.
5. Lưu thí nghiệm trong trình duyệt; đồng bộ gọi POST /api/v1/experiments/bulk theo cấu hình hiện tại.

Đăng nhập vẫn là demo. Huấn luyện chạy trong Web Worker của browser, không lấy kết quả từ backend. Xem tài liệu chính để biết offline, giới hạn CSV và phạm vi kiểm thử.

## Kiểm tra

```powershell
npm.cmd test -- --watch=false
npm.cmd run build
```

Để chạy E2E, giữ dev server cổng 4300 và mở terminal khác:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File e2e/run-ui-redesign.ps1
```

Production build ở dist/Hoiquy3d. Dockerfile phục vụ SSR cổng 4000; HTTPS/443 cần cấu hình triển khai riêng. Chi tiết thư viện, thư mục code, hiệu ứng, lệnh SSR, kết quả và giới hạn xem [tài liệu chính](docs/CONG-NGHE-VA-HIEU-UNG.md).
