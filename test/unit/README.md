# Unit tests

Tài liệu này hướng dẫn viết và chạy unit test cho frontend Hoiquy3d. Unit test kiểm tra hành vi của hàm, service, component hoặc state ở phạm vi nhỏ, không cần chạy toàn bộ ứng dụng trên trình duyệt.

## Công nghệ và vị trí hiện tại

- Dự án dùng Vitest thông qua Angular CLI (`ng test`).
- Cấu hình test nằm trong `angular.json`; `tsconfig.spec.json` nhận các file `src/**/*.spec.ts`.
- Các test hiện có đặt cạnh mã nguồn trong `src/` (ví dụ `src/app/app.spec.ts`). `test/unit/` hiện chỉ chứa tài liệu này; test đặt tại thư mục này chưa được cấu hình tự động phát hiện.
- Khi tạo test mới, đặt file `<ten>.spec.ts` cạnh mã nguồn tương ứng trong `src/`, trừ khi cấu hình test được thay đổi có chủ đích.

## Chạy kiểm thử

Từ thư mục gốc dự án:

```powershell
# Chạy test một lần, không bật chế độ theo dõi
npm.cmd run test -- --watch=false

# Chạy Vitest ở chế độ watch để chạy lại khi file thay đổi
npm.cmd run test
```

Muốn chạy một file hoặc một nhóm test, truyền bộ lọc Vitest qua Angular CLI:

```powershell
npm.cmd run test -- --watch=false src/app/core/state/auth-session.spec.ts
```

Nếu phiên bản Angular CLI hiện tại không nhận bộ lọc theo đường dẫn này, chạy lệnh test đầy đủ và kiểm tra cú pháp lọc được hỗ trợ bởi `ng test --help`.

## Viết unit test

- Đặt tên file theo quy ước `<ten-nguon>.spec.ts` và đặt cạnh file nguồn để dễ tìm.
- Kiểm tra một hành vi cụ thể qua đầu vào và kết quả quan sát được.
- Dùng mock hoặc stub cho phụ thuộc bên ngoài khi cần; không gọi backend thật trong unit test.
- Với component, kiểm tra hành vi hoặc nội dung hiển thị liên quan đến yêu cầu, tránh phụ thuộc quá nhiều vào chi tiết triển khai nội bộ.
- Đảm bảo test độc lập, có thể chạy riêng hoặc cùng toàn bộ suite mà không phụ thuộc thứ tự.

## Đọc kết quả

Vitest in kết quả từng file và số test thành công/thất bại trong terminal. Khi thất bại, đọc tên test và lỗi assertion, sửa nguyên nhân rồi chạy lại test liên quan và toàn bộ lệnh kiểm thử một lần. Báo cáo phải phản ánh đúng kết quả chạy thực tế; không bỏ qua test thất bại để làm kết quả thành công.

## Phạm vi

Unit test phù hợp để kiểm tra logic nghiệp vụ, chuyển trạng thái, validation và hành vi component/service trong phạm vi hẹp. Dùng E2E khi cần xác nhận một luồng người dùng hoàn chỉnh trên ứng dụng đang chạy; xem hướng dẫn tại [`test/e2e/README.md`](../e2e/README.md).
