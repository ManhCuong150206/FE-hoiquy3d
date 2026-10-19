# Hồi quy 3D

Ứng dụng web trực quan hóa quá trình huấn luyện các mô hình hồi quy trong không gian 3D. Người dùng sinh dữ liệu (hoặc nhập CSV), chọn thuật toán, rồi xem mặt phẳng mô hình nghiêng dần vào đám điểm qua từng bước gradient descent.

## Tính năng

- Thuật toán: Linear Regression, Polynomial, Ridge (L2), Lasso (L1)
- Hiển thị 3D bằng Three.js: điểm train/test và mặt mô hình hiện tại (kéo để xoay, cuộn để zoom, chuột phải để pan)
- Điều khiển huấn luyện: Play, Step, Stop, Reset, learning rate, max iterations, tốc độ phát
- Dữ liệu tổng hợp theo seed (số mẫu, số đặc trưng, noise, tỉ lệ train/test) hoặc nhập từ file CSV
- Kết quả: train/test loss, biểu đồ loss theo iteration, các metric MSE, RMSE, MAE, R², tham số `w`, `b`
- Lưu thí nghiệm, so sánh tối đa 4 lần chạy, áp dụng lại cấu hình, xuất JSON/CSV
- Làm việc ngoại tuyến: thí nghiệm lưu trong IndexedDB và tự đồng bộ khi có mạng
- Ghi chú thuật toán (công thức, lưu ý) thay đổi theo thuật toán đang chọn

## Công nghệ

- Angular (standalone components, signals)
- Three.js (OrbitControls)
- Web Worker cho vòng lặp huấn luyện
- IndexedDB cho lưu trữ ngoại tuyến

## Yêu cầu

- Node.js bản LTS và npm
- Angular CLI (nếu chưa có):

```bash
npm install -g @angular/cli
```

## Cài đặt và chạy

```bash
# 1. Lấy mã nguồn
git clone <đường-dẫn-repo>
cd Hoiquy3d

# 2. Cài thư viện
npm install

# 3. Chạy chế độ phát triển
ng serve
```

Mở trình duyệt tại http://localhost:4200. Ứng dụng tự tải lại khi bạn sửa code.

## Các lệnh khác

| Lệnh | Tác dụng |
|---|---|
| `ng serve` | Chạy dev tại `localhost:4200` |
| `ng build` | Build bản production, kết quả trong `dist/` |
| `ng test` | Chạy unit test |

## Cách dùng nhanh

1. Chọn **số đặc trưng**, số mẫu, noise, seed ở cột *Dữ liệu*, rồi bấm **REGENERATE** để sinh dữ liệu mới.
2. Chọn **thuật toán** ở thanh trên. Polynomial có thêm ô *Degree*, Ridge/Lasso có thêm ô *Lambda (λ)*.
3. Chọn learning rate và max iterations, bấm **Play** (hoặc **Step** để chạy từng bước).
4. Xem mặt phẳng, đường loss và bảng metric ở cột *Kết quả*.
5. Đặt tên rồi bấm **Lưu** để lưu thí nghiệm. Tick 2 đến 4 bản để so sánh.

Lưu ý: với từ 3 đặc trưng trở lên, khung 3D chỉ hiển thị lát cắt theo 2 đặc trưng đầu. Nếu loss tăng hoặc thành NaN thì learning rate đang quá lớn.

## Cấu trúc thư mục

```
src/app/
├── core/
│   ├── engine/        # worker huấn luyện, metric, sinh dữ liệu
│   ├── models/        # kiểu dữ liệu (Algorithm, SavedExperiment, ...)
│   └── storage/       # IndexedDB lưu thí nghiệm
├── features/
│   ├── algorithm-notes/    # ghi chú và công thức thuật toán
│   ├── csv-import/         # nhập CSV
│   ├── data-panel/         # cấu hình dữ liệu
│   ├── experiments-panel/  # lưu, so sánh, xuất thí nghiệm
│   ├── results-panel/      # loss, metric, tham số mô hình
│   ├── training-controls/  # Play/Step/Stop, thuật toán, tham số huấn luyện
│   └── viewport3d/         # khung nhìn Three.js
├── layout/header/     # thanh tiêu đề, trạng thái mạng và đồng bộ
└── state/             # LabStore, ExperimentsStore (signals)
```

## Trạng thái hiện tại và backend

- Phần giao diện đã hoàn thiện cho cả 4 thuật toán.
- Phần tính toán hiện chạy ngay trong trình duyệt (Web Worker), **chưa kết nối backend**. Worker hiện mới xử lý hồi quy tuyến tính; Polynomial, Ridge và Lasso chờ logic bổ sung (xem mục dưới).
- Đồng bộ thí nghiệm gọi `POST /api/experiments/bulk` (khai báo ở `state/experiments-store.ts`, hằng `SYNC_URL`). Khi chưa có backend, ứng dụng báo "chưa đồng bộ được" và vẫn giữ dữ liệu trong trình duyệt.

### Dành cho người làm logic / backend

`LabStore.initWorker()` gửi cho worker message `init` gồm:

```ts
{
  type: 'init',
  Xtr, ytr, Xte, yte,        // dữ liệu train / test
  lr, maxIter, tol, speed,   // learning rate, số vòng tối đa, ngưỡng dừng, tốc độ phát
  algorithm,                 // 'linear' | 'polynomial' | 'ridge' | 'lasso'
  degree,                    // dùng cho polynomial
  lambda,                    // dùng cho ridge / lasso
}
```

Việc còn lại:

- **Polynomial**: mở rộng đặc trưng thành lũy thừa theo `degree` (khi đó `w` dài hơn), đồng thời đổi cách tính mặt trong `viewport3d.ts` (`updatePlane`) cho khớp.
- **Ridge / Lasso**: thêm phạt `λ·Σw²` / `λ·Σ|w|` vào gradient.

## Lỗi thường gặp

- **Không vào được `localhost:4200`**: kiểm tra `ng serve` đã chạy xong chưa, hoặc cổng 4200 đang bị chiếm (dùng `ng serve --port 4300`).
- **Báo thiếu thư viện**: chạy lại `npm install`.
- **Dòng đỏ "Chưa đồng bộ được với máy chủ"**: bình thường khi chưa có backend, dữ liệu vẫn được giữ trong trình duyệt.