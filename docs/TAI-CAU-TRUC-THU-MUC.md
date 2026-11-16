# Tái cấu trúc thư mục

## 1. Trước khi sửa

Khảo sát trên nhánh `main` tại commit `4256246`. Git báo cây làm việc sạch trước khi ghi mục này.
Thư mục `presentation/` gộp tiện ích UI dùng chung, hiệu ứng chọn thuật toán và lớp khung. `state/` chứa các store cấp ứng dụng và spec. Trong `features/`, trang tài khoản gắn với router nằm cạnh lớp gọi API, còn quả cầu 3D, đường dẫn học A–F và form chào thuộc các màn hình cha tương ứng.
Angular Router có `/` và `/account`. Màn chính do App render. Chưa có component 404 hoặc route wildcard.

```text
src/app/
├── core/
│   ├── engine/
│   │   ├── complex-rotation.ts
│   │   ├── csv.ts
│   │   ├── experiment-workflow.spec.ts
│   │   ├── experiment-workflow.ts
│   │   ├── lasso.ts
│   │   ├── learning-data.spec.ts
│   │   ├── linear.ts
│   │   ├── metrics.ts
│   │   ├── model-integrity.spec.ts
│   │   ├── model-view.spec.ts
│   │   ├── model-view.ts
│   │   ├── polynomial.ts
│   │   ├── prng.ts
│   │   ├── regression.worker.ts
│   │   ├── synthetic.ts
│   │   ├── training-session.spec.ts
│   │   └── training-session.ts
│   ├── models/
│   │   ├── experiment-payload.spec.ts
│   │   ├── experiment-payload.ts
│   │   ├── experiment.ts
│   │   └── training-step.ts
│   └── storage/
│       └── experiment-db.ts
├── features/
│   ├── account/
│   │   ├── account-api.ts
│   │   ├── account.css
│   │   ├── account.html
│   │   ├── account.spec.ts
│   │   └── account.ts
│   ├── algorithm-notes/
│   │   ├── algorithm-notes.css
│   │   ├── algorithm-notes.html
│   │   ├── algorithm-notes.spec.ts
│   │   └── algorithm-notes.ts
│   ├── algorithm-picker/
│   │   ├── algorithm-picker.css
│   │   ├── algorithm-picker.html
│   │   ├── algorithm-picker.spec.ts
│   │   └── algorithm-picker.ts
│   ├── algorithm-sphere/
│   │   ├── algorithm-sphere.ts
│   │   ├── planet-geometry.spec.ts
│   │   └── planet-geometry.ts
│   ├── csv-import/
│   │   ├── csv-import.css
│   │   ├── csv-import.html
│   │   ├── csv-import.spec.ts
│   │   └── csv-import.ts
│   ├── data-panel/
│   │   ├── data-panel.css
│   │   ├── data-panel.html
│   │   ├── data-panel.spec.ts
│   │   └── data-panel.ts
│   ├── experiment-workflow/
│   │   ├── experiment-workflow.css
│   │   ├── experiment-workflow.html
│   │   ├── experiment-workflow.spec.ts
│   │   └── experiment-workflow.ts
│   ├── experiments-panel/
│   │   ├── experiments-panel.css
│   │   ├── experiments-panel.html
│   │   ├── experiments-panel.spec.ts
│   │   └── experiments-panel.ts
│   ├── learning-route/
│   │   ├── learning-route.css
│   │   ├── learning-route.html
│   │   ├── learning-route.spec.ts
│   │   └── learning-route.ts
│   ├── learning-walkthrough/
│   │   ├── learning-walkthrough.css
│   │   ├── learning-walkthrough.html
│   │   ├── learning-walkthrough.spec.ts
│   │   └── learning-walkthrough.ts
│   ├── results-panel/
│   │   ├── results-panel.css
│   │   ├── results-panel.html
│   │   ├── results-panel.spec.ts
│   │   └── results-panel.ts
│   ├── training-controls/
│   │   ├── training-controls.css
│   │   ├── training-controls.html
│   │   ├── training-controls.spec.ts
│   │   └── training-controls.ts
│   ├── viewport3d/
│   │   ├── viewport3d.css
│   │   ├── viewport3d.html
│   │   ├── viewport3d.spec.ts
│   │   └── viewport3d.ts
│   └── welcome-panel/
│       ├── entry-form.css
│       ├── entry-form.html
│       ├── entry-form.spec.ts
│       ├── entry-form.ts
│       ├── welcome-panel.css
│       ├── welcome-panel.html
│       ├── welcome-panel.spec.ts
│       └── welcome-panel.ts
├── layout/
│   └── header/
│       ├── header.css
│       ├── header.html
│       ├── header.spec.ts
│       └── header.ts
├── presentation/
│   ├── algorithm-flight.spec.ts
│   ├── algorithm-flight.ts
│   ├── card-glow.css
│   ├── card-glow.spec.ts
│   ├── card-glow.ts
│   ├── frame-budget.spec.ts
│   ├── frame-budget.ts
│   ├── journey-motion.ts
│   └── spatial-backdrop.ts
├── state/
│   ├── auth-session.spec.ts
│   ├── auth-session.ts
│   ├── experiment-workflow.spec.ts
│   ├── experiments-store.spec.ts
│   ├── experiments-store.ts
│   ├── lab-store.spec.ts
│   ├── lab-store.ts
│   ├── learning-flow.spec.ts
│   ├── theme-store.spec.ts
│   └── theme-store.ts
├── app.config.server.ts
├── app.config.ts
├── app.css
├── app.html
├── app.routes.server.ts
├── app.routes.spec.ts
├── app.routes.ts
├── app.spec.ts
└── app.ts
```

Kiểm kê từng tệp trong các nhóm khảo sát. Đường dẫn tính từ `src/app/`.

| Hiện tại | Vai trò | Vị trí dự kiến |
| --- | --- | --- |
| `features/account/account-api.ts` | Service gọi API hồ sơ, kiểu phản hồi và guard. | `core/storage/account-api.ts` |
| `features/account/account.css` | CSS của trang hồ sơ tài khoản. | `pages/account-page/account.css` |
| `features/account/account.html` | Template của trang hồ sơ tài khoản. | `pages/account-page/account.html` |
| `features/account/account.spec.ts` | Spec của trang hồ sơ tài khoản. | `pages/account-page/account.spec.ts` |
| `features/account/account.ts` | Component standalone cho trang hồ sơ tài khoản. | `pages/account-page/account.ts` |
| `features/algorithm-notes/algorithm-notes.css` | CSS của ghi chú thuật toán. | `features/algorithm-notes/algorithm-notes.css` |
| `features/algorithm-notes/algorithm-notes.html` | Template của ghi chú thuật toán. | `features/algorithm-notes/algorithm-notes.html` |
| `features/algorithm-notes/algorithm-notes.spec.ts` | Spec của ghi chú thuật toán. | `features/algorithm-notes/algorithm-notes.spec.ts` |
| `features/algorithm-notes/algorithm-notes.ts` | Component standalone cho ghi chú thuật toán. | `features/algorithm-notes/algorithm-notes.ts` |
| `features/algorithm-picker/algorithm-picker.css` | CSS của bộ chọn thuật toán. | `features/algorithm-picker/algorithm-picker.css` |
| `features/algorithm-picker/algorithm-picker.html` | Template của bộ chọn thuật toán. | `features/algorithm-picker/algorithm-picker.html` |
| `features/algorithm-picker/algorithm-picker.spec.ts` | Spec của bộ chọn thuật toán. | `features/algorithm-picker/algorithm-picker.spec.ts` |
| `features/algorithm-picker/algorithm-picker.ts` | Component standalone cho bộ chọn thuật toán. | `features/algorithm-picker/algorithm-picker.ts` |
| `features/algorithm-sphere/algorithm-sphere.ts` | Component standalone cho cầu 3D chọn thuật toán. | `features/algorithm-picker/components/algorithm-sphere/algorithm-sphere.ts` |
| `features/algorithm-sphere/planet-geometry.spec.ts` | Spec kiểm tra hình học lục địa. | `features/algorithm-picker/components/algorithm-sphere/planet-geometry.spec.ts` |
| `features/algorithm-sphere/planet-geometry.ts` | Hàm tạo hình học lục địa Three.js. | `features/algorithm-picker/components/algorithm-sphere/planet-geometry.ts` |
| `features/csv-import/csv-import.css` | CSS của luồng xem trước và nhập CSV. | `features/csv-import/csv-import.css` |
| `features/csv-import/csv-import.html` | Template của luồng xem trước và nhập CSV. | `features/csv-import/csv-import.html` |
| `features/csv-import/csv-import.spec.ts` | Spec của luồng xem trước và nhập CSV. | `features/csv-import/csv-import.spec.ts` |
| `features/csv-import/csv-import.ts` | Component standalone cho luồng xem trước và nhập CSV. | `features/csv-import/csv-import.ts` |
| `features/data-panel/data-panel.css` | CSS của bảng thiết lập dữ liệu. | `features/data-panel/data-panel.css` |
| `features/data-panel/data-panel.html` | Template của bảng thiết lập dữ liệu. | `features/data-panel/data-panel.html` |
| `features/data-panel/data-panel.spec.ts` | Spec của bảng thiết lập dữ liệu. | `features/data-panel/data-panel.spec.ts` |
| `features/data-panel/data-panel.ts` | Component standalone cho bảng thiết lập dữ liệu. | `features/data-panel/data-panel.ts` |
| `features/experiment-workflow/experiment-workflow.css` | CSS của quy trình thử nghiệm và so sánh. | `features/experiment-workflow/experiment-workflow.css` |
| `features/experiment-workflow/experiment-workflow.html` | Template của quy trình thử nghiệm và so sánh. | `features/experiment-workflow/experiment-workflow.html` |
| `features/experiment-workflow/experiment-workflow.spec.ts` | Spec của quy trình thử nghiệm và so sánh. | `features/experiment-workflow/experiment-workflow.spec.ts` |
| `features/experiment-workflow/experiment-workflow.ts` | Component standalone cho quy trình thử nghiệm và so sánh. | `features/experiment-workflow/experiment-workflow.ts` |
| `features/experiments-panel/experiments-panel.css` | CSS của bảng quản lý thí nghiệm đã lưu. | `features/experiments-panel/experiments-panel.css` |
| `features/experiments-panel/experiments-panel.html` | Template của bảng quản lý thí nghiệm đã lưu. | `features/experiments-panel/experiments-panel.html` |
| `features/experiments-panel/experiments-panel.spec.ts` | Spec của bảng quản lý thí nghiệm đã lưu. | `features/experiments-panel/experiments-panel.spec.ts` |
| `features/experiments-panel/experiments-panel.ts` | Component standalone cho bảng quản lý thí nghiệm đã lưu. | `features/experiments-panel/experiments-panel.ts` |
| `features/learning-route/learning-route.css` | CSS của đường dẫn học A–F. | `features/learning-walkthrough/components/learning-route/learning-route.css` |
| `features/learning-route/learning-route.html` | Template của đường dẫn học A–F. | `features/learning-walkthrough/components/learning-route/learning-route.html` |
| `features/learning-route/learning-route.spec.ts` | Spec của đường dẫn học A–F. | `features/learning-walkthrough/components/learning-route/learning-route.spec.ts` |
| `features/learning-route/learning-route.ts` | Component standalone cho đường dẫn học A–F. | `features/learning-walkthrough/components/learning-route/learning-route.ts` |
| `features/learning-walkthrough/learning-walkthrough.css` | CSS của phần hướng dẫn học từng bước. | `features/learning-walkthrough/learning-walkthrough.css` |
| `features/learning-walkthrough/learning-walkthrough.html` | Template của phần hướng dẫn học từng bước. | `features/learning-walkthrough/learning-walkthrough.html` |
| `features/learning-walkthrough/learning-walkthrough.spec.ts` | Spec của phần hướng dẫn học từng bước. | `features/learning-walkthrough/learning-walkthrough.spec.ts` |
| `features/learning-walkthrough/learning-walkthrough.ts` | Component standalone cho phần hướng dẫn học từng bước. | `features/learning-walkthrough/learning-walkthrough.ts` |
| `features/results-panel/results-panel.css` | CSS của bảng kết quả. | `features/results-panel/results-panel.css` |
| `features/results-panel/results-panel.html` | Template của bảng kết quả. | `features/results-panel/results-panel.html` |
| `features/results-panel/results-panel.spec.ts` | Spec của bảng kết quả. | `features/results-panel/results-panel.spec.ts` |
| `features/results-panel/results-panel.ts` | Component standalone cho bảng kết quả. | `features/results-panel/results-panel.ts` |
| `features/training-controls/training-controls.css` | CSS của bộ điều khiển huấn luyện. | `features/training-controls/training-controls.css` |
| `features/training-controls/training-controls.html` | Template của bộ điều khiển huấn luyện. | `features/training-controls/training-controls.html` |
| `features/training-controls/training-controls.spec.ts` | Spec của bộ điều khiển huấn luyện. | `features/training-controls/training-controls.spec.ts` |
| `features/training-controls/training-controls.ts` | Component standalone cho bộ điều khiển huấn luyện. | `features/training-controls/training-controls.ts` |
| `features/viewport3d/viewport3d.css` | CSS của khung nhìn hồi quy 3D. | `features/viewport3d/viewport3d.css` |
| `features/viewport3d/viewport3d.html` | Template của khung nhìn hồi quy 3D. | `features/viewport3d/viewport3d.html` |
| `features/viewport3d/viewport3d.spec.ts` | Spec của khung nhìn hồi quy 3D. | `features/viewport3d/viewport3d.spec.ts` |
| `features/viewport3d/viewport3d.ts` | Component standalone cho khung nhìn hồi quy 3D. | `features/viewport3d/viewport3d.ts` |
| `features/welcome-panel/entry-form.css` | CSS của form đăng nhập/đăng ký của màn hình chào. | `features/welcome-panel/components/entry-form/entry-form.css` |
| `features/welcome-panel/entry-form.html` | Template của form đăng nhập/đăng ký của màn hình chào. | `features/welcome-panel/components/entry-form/entry-form.html` |
| `features/welcome-panel/entry-form.spec.ts` | Spec của form đăng nhập/đăng ký của màn hình chào. | `features/welcome-panel/components/entry-form/entry-form.spec.ts` |
| `features/welcome-panel/entry-form.ts` | Component standalone cho form đăng nhập/đăng ký của màn hình chào. | `features/welcome-panel/components/entry-form/entry-form.ts` |
| `features/welcome-panel/welcome-panel.css` | CSS của màn hình chào. | `features/welcome-panel/welcome-panel.css` |
| `features/welcome-panel/welcome-panel.html` | Template của màn hình chào. | `features/welcome-panel/welcome-panel.html` |
| `features/welcome-panel/welcome-panel.spec.ts` | Spec của màn hình chào. | `features/welcome-panel/welcome-panel.spec.ts` |
| `features/welcome-panel/welcome-panel.ts` | Component standalone cho màn hình chào. | `features/welcome-panel/welcome-panel.ts` |
| `presentation/algorithm-flight.spec.ts` | Spec đường bay và đóng cảnh. | `features/algorithm-picker/services/algorithm-flight.spec.ts` |
| `presentation/algorithm-flight.ts` | Lớp điều phối chuyển động từ quả cầu sang cảnh tiếp theo. | `features/algorithm-picker/services/algorithm-flight.ts` |
| `presentation/card-glow.css` | CSS toàn cục cho lớp phát sáng của thẻ. | `shared/ui/card-glow/card-glow.css` |
| `presentation/card-glow.spec.ts` | Spec hàm nội suy độ sáng. | `shared/ui/card-glow/card-glow.spec.ts` |
| `presentation/card-glow.ts` | Directive phát sáng theo con trỏ qua nhiều màn hình. | `shared/ui/card-glow/card-glow.ts` |
| `presentation/frame-budget.spec.ts` | Spec nhịp cập nhật. | `shared/ui/frame-budget/frame-budget.spec.ts` |
| `presentation/frame-budget.ts` | Tiện ích giới hạn nhịp cập nhật và đo lần render canvas. | `shared/ui/frame-budget/frame-budget.ts` |
| `presentation/journey-motion.ts` | Directive chuyển cảnh giữa các màn hình. | `layout/journey-motion/journey-motion.ts` |
| `presentation/spatial-backdrop.ts` | Component nền Three.js và hiệu ứng môi trường. | `layout/spatial-backdrop/spatial-backdrop.ts` |
| `state/auth-session.spec.ts` | Spec phiên xác thực. | `core/state/auth-session.spec.ts` |
| `state/auth-session.ts` | Service giữ danh tính, phiên và khôi phục đăng nhập. | `core/state/auth-session.ts` |
| `state/experiment-workflow.spec.ts` | Spec LabStore về mốc so sánh và đánh giá tập test. | `core/state/experiment-workflow.spec.ts` |
| `state/experiments-store.spec.ts` | Spec lưu và đồng bộ thí nghiệm. | `core/state/experiments-store.spec.ts` |
| `state/experiments-store.ts` | Store quản lý thí nghiệm đã lưu và đồng bộ. | `core/state/experiments-store.ts` |
| `state/lab-store.spec.ts` | Spec LabStore. | `core/state/lab-store.spec.ts` |
| `state/lab-store.ts` | Store dữ liệu, huấn luyện, Web Worker và luồng học. | `core/state/lab-store.ts` |
| `state/learning-flow.spec.ts` | Spec tích hợp LabStore với phiên huấn luyện qua Worker mô phỏng. | `core/state/learning-flow.spec.ts` |
| `state/theme-store.spec.ts` | Spec trạng thái giao diện sáng/tối. | `core/state/theme-store.spec.ts` |
| `state/theme-store.ts` | Store giao diện sáng/tối. | `core/state/theme-store.ts` |

Build production gốc thành công. Angular tạo bundle trình duyệt, bundle SSR, Web Worker và prerender 1 route. Bundle trình duyệt ban đầu có dung lượng 454,01 kB. Có 4 cảnh báo budget CSS sẵn có.

## 2. Sau khi sửa

Cây bên dưới gồm `src/app/` và các tệp mới ở `src/styles/`, `test/`.

```text
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── engine/
│   │   │   │   ├── complex-rotation.ts
│   │   │   │   ├── csv.ts
│   │   │   │   ├── experiment-workflow.spec.ts
│   │   │   │   ├── experiment-workflow.ts
│   │   │   │   ├── lasso.ts
│   │   │   │   ├── learning-data.spec.ts
│   │   │   │   ├── linear.ts
│   │   │   │   ├── metrics.ts
│   │   │   │   ├── model-integrity.spec.ts
│   │   │   │   ├── model-view.spec.ts
│   │   │   │   ├── model-view.ts
│   │   │   │   ├── polynomial.ts
│   │   │   │   ├── prng.ts
│   │   │   │   ├── README.md
│   │   │   │   ├── regression.worker.ts
│   │   │   │   ├── synthetic.ts
│   │   │   │   ├── training-session.spec.ts
│   │   │   │   └── training-session.ts
│   │   │   ├── models/
│   │   │   │   ├── experiment-payload.spec.ts
│   │   │   │   ├── experiment-payload.ts
│   │   │   │   ├── experiment.ts
│   │   │   │   ├── README.md
│   │   │   │   └── training-step.ts
│   │   │   ├── state/
│   │   │   │   ├── auth-session.spec.ts
│   │   │   │   ├── auth-session.ts
│   │   │   │   ├── experiment-workflow.spec.ts
│   │   │   │   ├── experiments-store.spec.ts
│   │   │   │   ├── experiments-store.ts
│   │   │   │   ├── lab-store.spec.ts
│   │   │   │   ├── lab-store.ts
│   │   │   │   ├── learning-flow.spec.ts
│   │   │   │   ├── README.md
│   │   │   │   ├── theme-store.spec.ts
│   │   │   │   └── theme-store.ts
│   │   │   ├── storage/
│   │   │   │   ├── account-api.ts
│   │   │   │   ├── experiment-db.ts
│   │   │   │   └── README.md
│   │   │   ├── values/
│   │   │   │   ├── colors.ts
│   │   │   │   └── README.md
│   │   │   ├── index.ts
│   │   │   └── README.md
│   │   ├── features/
│   │   │   ├── algorithm-notes/
│   │   │   │   ├── algorithm-notes.css
│   │   │   │   ├── algorithm-notes.html
│   │   │   │   ├── algorithm-notes.spec.ts
│   │   │   │   ├── algorithm-notes.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── README.md
│   │   │   ├── algorithm-picker/
│   │   │   │   ├── components/
│   │   │   │   │   └── algorithm-sphere/
│   │   │   │   │       ├── algorithm-sphere.ts
│   │   │   │   │       ├── planet-geometry.spec.ts
│   │   │   │   │       └── planet-geometry.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── algorithm-flight.spec.ts
│   │   │   │   │   └── algorithm-flight.ts
│   │   │   │   ├── algorithm-picker.css
│   │   │   │   ├── algorithm-picker.html
│   │   │   │   ├── algorithm-picker.spec.ts
│   │   │   │   ├── algorithm-picker.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── README.md
│   │   │   ├── csv-import/
│   │   │   │   ├── csv-import.css
│   │   │   │   ├── csv-import.html
│   │   │   │   ├── csv-import.spec.ts
│   │   │   │   ├── csv-import.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── README.md
│   │   │   ├── data-panel/
│   │   │   │   ├── data-panel.css
│   │   │   │   ├── data-panel.html
│   │   │   │   ├── data-panel.spec.ts
│   │   │   │   ├── data-panel.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── README.md
│   │   │   ├── experiment-workflow/
│   │   │   │   ├── experiment-workflow.css
│   │   │   │   ├── experiment-workflow.html
│   │   │   │   ├── experiment-workflow.spec.ts
│   │   │   │   ├── experiment-workflow.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── README.md
│   │   │   ├── experiments-panel/
│   │   │   │   ├── experiments-panel.css
│   │   │   │   ├── experiments-panel.html
│   │   │   │   ├── experiments-panel.spec.ts
│   │   │   │   ├── experiments-panel.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── README.md
│   │   │   ├── learning-walkthrough/
│   │   │   │   ├── components/
│   │   │   │   │   └── learning-route/
│   │   │   │   │       ├── learning-route.css
│   │   │   │   │       ├── learning-route.html
│   │   │   │   │       ├── learning-route.spec.ts
│   │   │   │   │       └── learning-route.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── learning-walkthrough.css
│   │   │   │   ├── learning-walkthrough.html
│   │   │   │   ├── learning-walkthrough.spec.ts
│   │   │   │   ├── learning-walkthrough.ts
│   │   │   │   └── README.md
│   │   │   ├── results-panel/
│   │   │   │   ├── index.ts
│   │   │   │   ├── README.md
│   │   │   │   ├── results-panel.css
│   │   │   │   ├── results-panel.html
│   │   │   │   ├── results-panel.spec.ts
│   │   │   │   └── results-panel.ts
│   │   │   ├── training-controls/
│   │   │   │   ├── index.ts
│   │   │   │   ├── README.md
│   │   │   │   ├── training-controls.css
│   │   │   │   ├── training-controls.html
│   │   │   │   ├── training-controls.spec.ts
│   │   │   │   └── training-controls.ts
│   │   │   ├── viewport3d/
│   │   │   │   ├── index.ts
│   │   │   │   ├── README.md
│   │   │   │   ├── viewport3d.css
│   │   │   │   ├── viewport3d.html
│   │   │   │   ├── viewport3d.spec.ts
│   │   │   │   └── viewport3d.ts
│   │   │   ├── welcome-panel/
│   │   │   │   ├── components/
│   │   │   │   │   └── entry-form/
│   │   │   │   │       ├── entry-form.css
│   │   │   │   │       ├── entry-form.html
│   │   │   │   │       ├── entry-form.spec.ts
│   │   │   │   │       └── entry-form.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── README.md
│   │   │   │   ├── welcome-panel.css
│   │   │   │   ├── welcome-panel.html
│   │   │   │   ├── welcome-panel.spec.ts
│   │   │   │   └── welcome-panel.ts
│   │   │   └── README.md
│   │   ├── layout/
│   │   │   ├── header/
│   │   │   │   ├── header.css
│   │   │   │   ├── header.html
│   │   │   │   ├── header.spec.ts
│   │   │   │   ├── header.ts
│   │   │   │   └── README.md
│   │   │   ├── journey-motion/
│   │   │   │   ├── journey-motion.ts
│   │   │   │   └── README.md
│   │   │   ├── spatial-backdrop/
│   │   │   │   ├── README.md
│   │   │   │   └── spatial-backdrop.ts
│   │   │   └── README.md
│   │   ├── pages/
│   │   │   ├── account-page/
│   │   │   │   ├── account.css
│   │   │   │   ├── account.html
│   │   │   │   ├── account.spec.ts
│   │   │   │   ├── account.ts
│   │   │   │   └── README.md
│   │   │   └── README.md
│   │   ├── shared/
│   │   │   ├── ui/
│   │   │   │   ├── button/
│   │   │   │   │   ├── button.css
│   │   │   │   │   ├── button.html
│   │   │   │   │   ├── button.ts
│   │   │   │   │   └── README.md
│   │   │   │   ├── card-glow/
│   │   │   │   │   ├── card-glow.css
│   │   │   │   │   ├── card-glow.spec.ts
│   │   │   │   │   ├── card-glow.ts
│   │   │   │   │   └── README.md
│   │   │   │   ├── frame-budget/
│   │   │   │   │   ├── frame-budget.spec.ts
│   │   │   │   │   ├── frame-budget.ts
│   │   │   │   │   └── README.md
│   │   │   │   └── README.md
│   │   │   ├── index.ts
│   │   │   └── README.md
│   │   ├── app.config.server.ts
│   │   ├── app.config.ts
│   │   ├── app.css
│   │   ├── app.html
│   │   ├── app.routes.server.ts
│   │   ├── app.routes.spec.ts
│   │   ├── app.routes.ts
│   │   ├── app.spec.ts
│   │   ├── app.ts
│   │   └── README.md
│   └── styles/
│       └── tokens.css
└── test/
    ├── e2e/
    │   └── README.md
    └── unit/
        └── README.md
```

## 3. Bảng di chuyển

Dùng `git mv` cho cả 35 tệp bên dưới. Đường dẫn tính từ `src/app/`.

| Đường dẫn cũ | Đường dẫn mới | Lý do |
| --- | --- | --- |
| `features/account/account-api.ts` | `core/storage/account-api.ts` | Lớp truy cập API tài khoản đi cùng guard hiện có. |
| `features/account/account.css` | `pages/account-page/account.css` | Component gắn với route /account và các tệp đi kèm. |
| `features/account/account.html` | `pages/account-page/account.html` | Component gắn với route /account và các tệp đi kèm. |
| `features/account/account.spec.ts` | `pages/account-page/account.spec.ts` | Component gắn với route /account và các tệp đi kèm. |
| `features/account/account.ts` | `pages/account-page/account.ts` | Component gắn với route /account và các tệp đi kèm. |
| `features/algorithm-sphere/algorithm-sphere.ts` | `features/algorithm-picker/components/algorithm-sphere/algorithm-sphere.ts` | Cầu 3D của bộ chọn thuật toán và hình học đi kèm. |
| `features/algorithm-sphere/planet-geometry.spec.ts` | `features/algorithm-picker/components/algorithm-sphere/planet-geometry.spec.ts` | Cầu 3D của bộ chọn thuật toán và hình học đi kèm. |
| `features/algorithm-sphere/planet-geometry.ts` | `features/algorithm-picker/components/algorithm-sphere/planet-geometry.ts` | Cầu 3D của bộ chọn thuật toán và hình học đi kèm. |
| `features/learning-route/learning-route.css` | `features/learning-walkthrough/components/learning-route/learning-route.css` | Component đường dẫn A–F thuộc phần hướng dẫn học. |
| `features/learning-route/learning-route.html` | `features/learning-walkthrough/components/learning-route/learning-route.html` | Component đường dẫn A–F thuộc phần hướng dẫn học. |
| `features/learning-route/learning-route.spec.ts` | `features/learning-walkthrough/components/learning-route/learning-route.spec.ts` | Component đường dẫn A–F thuộc phần hướng dẫn học. |
| `features/learning-route/learning-route.ts` | `features/learning-walkthrough/components/learning-route/learning-route.ts` | Component đường dẫn A–F thuộc phần hướng dẫn học. |
| `features/welcome-panel/entry-form.css` | `features/welcome-panel/components/entry-form/entry-form.css` | Form con của màn hình chào. |
| `features/welcome-panel/entry-form.html` | `features/welcome-panel/components/entry-form/entry-form.html` | Form con của màn hình chào. |
| `features/welcome-panel/entry-form.spec.ts` | `features/welcome-panel/components/entry-form/entry-form.spec.ts` | Form con của màn hình chào. |
| `features/welcome-panel/entry-form.ts` | `features/welcome-panel/components/entry-form/entry-form.ts` | Form con của màn hình chào. |
| `presentation/algorithm-flight.spec.ts` | `features/algorithm-picker/services/algorithm-flight.spec.ts` | Hiệu ứng chuyến bay của bộ chọn thuật toán. |
| `presentation/algorithm-flight.ts` | `features/algorithm-picker/services/algorithm-flight.ts` | Hiệu ứng chuyến bay của bộ chọn thuật toán. |
| `presentation/card-glow.css` | `shared/ui/card-glow/card-glow.css` | Tiện ích hiển thị dùng chung giữa các màn hình. |
| `presentation/card-glow.spec.ts` | `shared/ui/card-glow/card-glow.spec.ts` | Tiện ích hiển thị dùng chung giữa các màn hình. |
| `presentation/card-glow.ts` | `shared/ui/card-glow/card-glow.ts` | Tiện ích hiển thị dùng chung giữa các màn hình. |
| `presentation/frame-budget.spec.ts` | `shared/ui/frame-budget/frame-budget.spec.ts` | Tiện ích hiển thị dùng chung giữa các màn hình. |
| `presentation/frame-budget.ts` | `shared/ui/frame-budget/frame-budget.ts` | Tiện ích hiển thị dùng chung giữa các màn hình. |
| `presentation/journey-motion.ts` | `layout/journey-motion/journey-motion.ts` | Hiệu ứng chuyển cảnh hoặc lớp nền của khung ứng dụng. |
| `presentation/spatial-backdrop.ts` | `layout/spatial-backdrop/spatial-backdrop.ts` | Hiệu ứng chuyển cảnh hoặc lớp nền của khung ứng dụng. |
| `state/auth-session.spec.ts` | `core/state/auth-session.spec.ts` | State toàn ứng dụng và spec đi kèm. |
| `state/auth-session.ts` | `core/state/auth-session.ts` | State toàn ứng dụng và spec đi kèm. |
| `state/experiment-workflow.spec.ts` | `core/state/experiment-workflow.spec.ts` | State toàn ứng dụng và spec đi kèm. |
| `state/experiments-store.spec.ts` | `core/state/experiments-store.spec.ts` | State toàn ứng dụng và spec đi kèm. |
| `state/experiments-store.ts` | `core/state/experiments-store.ts` | State toàn ứng dụng và spec đi kèm. |
| `state/lab-store.spec.ts` | `core/state/lab-store.spec.ts` | State toàn ứng dụng và spec đi kèm. |
| `state/lab-store.ts` | `core/state/lab-store.ts` | State toàn ứng dụng và spec đi kèm. |
| `state/learning-flow.spec.ts` | `core/state/learning-flow.spec.ts` | State toàn ứng dụng và spec đi kèm. |
| `state/theme-store.spec.ts` | `core/state/theme-store.spec.ts` | State toàn ứng dụng và spec đi kèm. |
| `state/theme-store.ts` | `core/state/theme-store.ts` | State toàn ứng dụng và spec đi kèm. |

## 4. Tệp thêm mới

- 13 tệp `index.ts` xuất API từ core, shared và 11 feature.
- `shared/ui/button/button.ts`, `button.html` và `button.css` tạo nút standalone `app-button` với `variant`, `disabled`, `type` và `ng-content`.
- `src/styles/tokens.css` chứa 17 giá trị màu gốc. `core/values/colors.ts` xuất 11 hằng số màu đã có trong canvas hồi quy.
- 32 README tiếng Việt cho các thư mục theo yêu cầu. `test/unit/` và `test/e2e/` mỗi thư mục có một README dành cho nhóm viết kiểm thử sau.

## 5. Import và cấu hình

- `tsconfig.json` ánh xạ `@app/*` đến `./src/app/*`. Import xuyên nhóm core, shared và feature qua barrel. Import nội bộ và URL của Web Worker dùng đường dẫn tương đối.
- `app.routes.ts` lấy guard từ `@app/core` và tải lười `Account` từ `@app/pages/account-page/account`. Router có hai URL `/` và `/account`.
- `src/styles.css` nạp tokens và stylesheet CardGlow theo đường dẫn mới. `palette.css` giữ alias và ánh xạ màu thuật toán. `pearl-theme.css` tiếp tục áp dụng màu theo chủ đề.

## 6. Kết quả ng build

| Giai đoạn | Production build | Bundle trình duyệt ban đầu |
| --- | --- | --- |
| Gốc tại `4256246` | Thành công, có SSR, Web Worker và 1 route prerender | 454,01 kB |
| Sau mỗi nhóm di chuyển | 7/7 thành công, có SSR và 1 route prerender | 454,01 kB |
| Sau khi thêm barrel, màu và button | Thành công, có SSR, Web Worker và 1 route prerender | 473,75 kB |

Trang tài khoản và các khối Three.js vẫn có bundle tải lười. Bốn cảnh báo budget CSS có từ build gốc và lặp lại ở build cuối, gồm `app.css`, `algorithm-picker.css`, `csv-import.css` và `welcome-panel.css`. Đầu ra build nằm trong thư mục tạm của hệ thống.

Đối chiếu `git diff -M --stat` ghi nhận 35 rename. Các tệp di chuyển chỉ khác đường dẫn nạp khi cần. Kiểm tra tĩnh xác nhận selector, tên lớp và URL route, các import nội bộ hợp lệ, đủ README, không thư mục rỗng và không NgModule mới. Cả 33 spec giữ nguyên phần thân và nằm cạnh mã liên quan. Chưa chạy unit test hay E2E.

## 7. Việc chưa làm và nên làm tiếp

- Các nút hiện có tiếp tục dùng markup gốc để giữ CSS theo DOM, hành vi submit, focus và ARIA của từng trường hợp. `app-button` đã sẵn sàng cho nơi có thể đối chiếu đầy đủ các điều kiện này.
- Màu theo ngữ cảnh và màu canvas trong quả cầu 3D hoặc lớp nền giữ tại nguồn. Việc thay literal ở hai tệp đã di chuyển sẽ vượt phạm vi chỉnh đường dẫn import của đợt này.
- Không có tệp cần giữ lại do chưa rõ vị trí. `csv-import` tiếp tục là một feature riêng vì có luồng nhập và xem trước hoàn chỉnh. Kiểm tra import chưa thấy core phụ thuộc shared/features hoặc shared phụ thuộc features.
- Dự án chưa có component 404. Có thể bổ sung trang lỗi và route fallback trong một thay đổi riêng.
- Lần này dùng nhánh `refactor/folder-structure-v2` tạo từ main tại `4256246`. Nhánh `refactor/folder-structure` đã chứa commit của lần tái cấu trúc trước.
