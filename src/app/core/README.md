# Core

Chứa nền tảng dùng chung cho toàn ứng dụng.

## Nội dung

- `engine/` — Thuật toán hồi quy, xử lý dữ liệu và Web Worker.
- `models/` — Kiểu dữ liệu, nhãn và chuyển đổi bản lưu.
- `storage/` — IndexedDB và API tài khoản.
- `state/` — Phiên, giao diện, phòng thí nghiệm và bản lưu.
- `values/` — Hằng số màu cho cảnh hồi quy 3D.
- `index.ts` — Các kiểu, hàm và service dùng từ bên ngoài.

Ví dụ `import { LabStore } from '@app/core'`.

Core chỉ dùng các nhóm nội bộ và thư viện bên ngoài.
