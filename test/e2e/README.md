# E2E tests

Tài liệu này hướng dẫn chạy và bổ sung kiểm thử end-to-end (E2E) cho frontend Hoiquy3d. E2E kiểm tra luồng người dùng trên ứng dụng đang chạy, bằng trình duyệt.

## Vị trí hiện tại

- Các kịch bản E2E hiện có nằm trong `e2e/ui-redesign/` và được điều phối bởi `e2e/run-ui-redesign.ps1`.
- Thư mục `test/e2e/` hiện chỉ chứa tài liệu này; chưa có cấu hình để tự động chạy test đặt tại đây.
- Nếu thêm test vào `test/e2e/`, cần cập nhật script chạy tương ứng hoặc ghi rõ cách chạy riêng.

## Chuẩn bị

- Cài dependencies của dự án bằng `npm install` nếu máy chưa có `node_modules`.
- Chạy ứng dụng tại `http://127.0.0.1:4300/` trước khi chạy script. Mở một terminal riêng:

```powershell
npm.cmd start -- --host 127.0.0.1 --port 4300
```

- Script E2E dùng `npx` để lấy `@playwright/cli`. Lần chạy đầu cần truy cập được npm registry.

## Chạy kiểm thử

Chạy toàn bộ 26 suite hiện được khai báo trong script:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\e2e\run-ui-redesign.ps1
```

Chạy suite cụ thể hoặc chạy có giao diện trình duyệt:

```powershell
# Chỉ chạy một suite
powershell -NoProfile -ExecutionPolicy Bypass -File .\e2e\run-ui-redesign.ps1 -Suites learning-route

# Chạy từ suite được chọn đến hết danh sách
powershell -NoProfile -ExecutionPolicy Bypass -File .\e2e\run-ui-redesign.ps1 -FromSuite learning-route

# Hiện cửa sổ trình duyệt
powershell -NoProfile -ExecutionPolicy Bypass -File .\e2e\run-ui-redesign.ps1 -Suites learning-route -Headed
```

Tên suite phải khớp tên file trong `e2e/ui-redesign/`, bỏ phần `.e2e.js`. Script chạy fixture `api-fixture.e2e.js` trước mỗi suite.

## Thêm hoặc sửa suite

1. Tạo hoặc sửa file `e2e/ui-redesign/<ten-suite>.e2e.js` theo cách viết test của Playwright CLI đang dùng trong dự án.
2. Nếu tạo suite mới, thêm tên suite vào mảng `$all` trong `e2e/run-ui-redesign.ps1` để suite được chạy mặc định.
3. Chạy riêng suite, xem log, rồi chạy lại toàn bộ suite trước khi cập nhật kết quả.
4. Dùng tên kịch bản thể hiện hành vi người dùng; kiểm tra kết quả nhìn thấy được trên giao diện và tránh phụ thuộc vào thứ tự chạy suite.

## Kết quả và xử lý lỗi

- Mỗi suite ghi log tại `output/playwright/<suite>-result.log`.
- Bảng trạng thái các suite đã chạy được ghi tại `output/playwright/suite-summary.json`.
- Khi có suite thất bại, đọc log để xác định assertion, timeout, lỗi JavaScript hoặc phần tử không tìm thấy. Chạy lại riêng suite để kiểm tra khả năng tái hiện.
- Không đổi trạng thái FAIL thành PASS hoặc bỏ suite khỏi danh sách chỉ để làm báo cáo xanh. Chỉ cập nhật báo cáo sau khi đã chạy lại test và ghi đúng kết quả thực tế.

## Phạm vi

E2E kiểm tra tương tác giữa giao diện, điều hướng và các luồng người dùng trên ứng dụng đang chạy. Kiểm tra hàm hoặc component độc lập nên đặt trong unit test; E2E không thay thế unit test.
