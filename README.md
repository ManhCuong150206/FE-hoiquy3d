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

1. Vào bằng form demo hoặc Guest, chọn thuật toán bằng thẻ; hành tinh bốn lục địa hỗ trợ rê chuột và kéo xoay.
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


### Backend và phiên người dùng

Chạy NestJS tại `D:/JS,TS` bằng `npm run start:dev` trước khi dùng đăng ký/đăng nhập hoặc đồng bộ. Dev proxy `/api` đã cấu hình tới `127.0.0.1:3000`. Bản SSR dùng `BACKEND_ORIGIN` nếu địa chỉ Backend khác. Guest có vùng dữ liệu riêng; chỉ Guest offline được làm cục bộ rồi chuyển hàng đợi lên phiên Guest khi có mạng. Đăng nhập tài khoản cần mạng.

Bản lưu CSV giữ split đã xử lý và mô hình, tối đa 8 MiB; bản ghi cũ chưa có snapshot CSV vẫn giữ giới hạn cũ. Đồng bộ có tombstone và xử lý xung đột; xem tài liệu công nghệ mục 12. Auth thật thay thế demo, không dùng header user ID tự khai.

Kiểm thử trình duyệt thật (không mock): mở API riêng bằng `node test/run-browser-backend.mjs` từ repo Backend (cổng 3000 phải trống), chạy FE cổng 4300, rồi dùng Playwright CLI với `e2e/ui-redesign/persistence-live.e2e.js`. Dừng API test và chạy helper cleanup tương ứng sau khi xong. Bộ `e2e/run-ui-redesign.ps1` vẫn dùng fixture cho auth/API để kiểm tra UI/chuyển cảnh độc lập; không coi fixture là kiểm chứng MongoDB.

SSR cho phép localhost/127.0.0.1 khi chạy cục bộ. Khi triển khai, đặt `SSR_ALLOWED_HOSTS` thành danh sách hostname thực tế (phân tách bằng dấu phẩy), không dùng wildcard mở toàn bộ host.

Bảng thay đổi từng file FE/BE: [Báo cáo cập nhật 03/11/2026](https://github.com/ManhCuong150206/TS-JS/blob/main/BAO-CAO-CAP-NHAT-2026-11-03.md).
