# Storage

Tập trung các điểm truy cập dữ liệu lưu và dữ liệu tài khoản.

## Nội dung

- `experiment-db.ts` — Truy cập IndexedDB cho thí nghiệm.
- `account-api.ts` — Gọi API hồ sơ và cung cấp guard cho route tài khoản.

Router và trang tài khoản dùng `@app/core`.

Nhóm này dùng mô hình thí nghiệm và AuthSession trong core.
