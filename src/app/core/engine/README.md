# Engine

Chứa logic tính toán và điểm vào Web Worker.

## Nội dung

- `linear.ts`, `lasso.ts` — Các bước cập nhật hệ số hồi quy.
- `polynomial.ts`, `metrics.ts` — Đặc trưng đa thức, dự đoán và chỉ số sai số.
- `csv.ts`, `synthetic.ts`, `prng.ts` — Đọc CSV, sinh và chia dữ liệu theo seed.
- `experiment-workflow.ts`, `experiment-workflow.spec.ts` — Chia tập học và so sánh lượt thử.
- `model-view.ts`, `model-view.spec.ts` — Dự đoán và dữ liệu lát cắt cho mô hình 3D.
- `complex-rotation.ts` — Phép quay cặp tọa độ.
- `training-session.ts`, `training-session.spec.ts` — Phiên huấn luyện và ảnh chụp từng bước.
- `regression.worker.ts` — Điểm vào worker thực thi phiên huấn luyện.
- `learning-data.spec.ts`, `model-integrity.spec.ts` — Kiểm tra tích hợp cấp thuật toán và dữ liệu.

Feature dùng các hàm được xuất từ `@app/core`.

Engine dùng kiểu trong `core/models/`.
