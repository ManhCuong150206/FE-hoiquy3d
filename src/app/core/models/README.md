# Models

Mô tả dữ liệu dùng chung giữa engine, state và UI.

## Nội dung

- `experiment.ts` — Kiểu thuật toán, mẫu dữ liệu, thí nghiệm lưu và các nhãn.
- `training-step.ts` — Kiểu bước huấn luyện, dấu vết gradient và nguồn dữ liệu.
- `experiment-payload.ts`, `experiment-payload.spec.ts` — Chuyển đổi và đọc dữ liệu thí nghiệm.

Ví dụ `import type { SavedExperiment } from '@app/core'`.
