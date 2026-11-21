# Minh họa mặt hồi quy và sai số trong không gian 3D

## Trước thay đổi

Bản trên Git tại `d923b22` chưa có đường lát cắt và các đoạn sai số cho mọi điểm đang hiển thị. Trong quá trình phát triển, phần minh họa ở chặng C–E chỉ lấy một vòng cập nhật nên mặt hồi quy thường biến đổi rất nhẹ.

## Sau thay đổi

| Tệp | Nội dung |
| --- | --- |
| `viewport3d.ts`, `viewport3d.html` | Vẽ đường lát cắt và đoạn sai số, đồng bộ chuyển động giữa đường, mặt và dự đoán. Chặng C–D minh họa nhiều vòng, chặng E trở về kết quả đề xuất của đúng một vòng. |
| `training-controls.ts`, `lab-store.ts` | Hiện sai số trước khi chạy mô hình khoảng 1,5 giây. Quản lý dữ liệu xem thử của bài học và chỉ ghi nhận một vòng tại F. |
| `training-session.ts`, `training-step.ts`, `regression.worker.ts` | Tính các trạng thái minh họa trong Web Worker, luồng xử lý nền của trình duyệt. Các trạng thái này không được ghi vào lịch sử huấn luyện. |
| `training-session.spec.ts`, `viewport3d.spec.ts`, `lesson-trace.e2e.js` | Kiểm tra dữ liệu xem thử, sai số, chuyển động và việc ghi nhận đúng một vòng ở F. |

## Kiểm tra

- Build production FE thành công và có cảnh báo ngân sách CSS.
- Unit test FE đạt 214/214.
- Playwright đạt kịch bản trên Linear và Ridge trong phiên Guest giả lập.

## Hoàn tác

Dùng `git revert` với commit mã nguồn đi cùng báo cáo này. Báo cáo được ghi nhận sau khi hoàn tất chỉnh sửa.
