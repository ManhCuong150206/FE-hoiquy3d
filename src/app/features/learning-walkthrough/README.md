# LearningWalkthrough

Trình bày từng pha A–F của một vòng cập nhật hệ số.

## Nội dung

- `learning-walkthrough.ts`, `learning-walkthrough.html`, `learning-walkthrough.css`, `learning-walkthrough.spec.ts` — Component chính, template, CSS và spec.
- `components/learning-route/` — Component đường dẫn A–F với template, CSS và spec tương ứng.
- `index.ts` — Xuất component chính.

Ví dụ `import { LearningWalkthrough } from '@app/features/learning-walkthrough'`.

Phụ thuộc vào LabStore, các hàm dự đoán và FrameBudget qua component con.
