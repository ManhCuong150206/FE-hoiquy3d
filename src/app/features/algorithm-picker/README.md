# AlgorithmPicker

Chọn thuật toán và điều phối chuyển cảnh từ quả cầu 3D.

## Nội dung

- `algorithm-picker.ts`, `algorithm-picker.html`, `algorithm-picker.css`, `algorithm-picker.spec.ts` — Component chính, template, CSS và spec.
- `components/algorithm-sphere/algorithm-sphere.ts` — Component quả cầu Three.js với template và style nội tuyến.
- `components/algorithm-sphere/planet-geometry.ts`, `components/algorithm-sphere/planet-geometry.spec.ts` — Hình học lục địa và spec.
- `services/algorithm-flight.ts`, `services/algorithm-flight.spec.ts` — Hiệu ứng chuyến bay và spec.
- `index.ts` — Xuất component và hàm đóng cảnh bay.

Ví dụ `import { AlgorithmPicker } from '@app/features/algorithm-picker'`.

Phụ thuộc vào AuthSession, ThemeStore, kiểu thuật toán và FrameBudget.
