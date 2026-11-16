# State

Chứa các service và store có phạm vi toàn ứng dụng.

## Nội dung

- `auth-session.ts`, `auth-session.spec.ts` — Danh tính, phiên và khôi phục đăng nhập.
- `theme-store.ts`, `theme-store.spec.ts` — Trạng thái giao diện sáng/tối.
- `lab-store.ts`, `lab-store.spec.ts` — Dữ liệu, huấn luyện, Web Worker và trạng thái học.
- `learning-flow.spec.ts`, `experiment-workflow.spec.ts` — Kiểm tra luồng học và so sánh dựa trên LabStore.
- `experiments-store.ts`, `experiments-store.spec.ts` — Lưu và đồng bộ thí nghiệm.

Ví dụ `import { AuthSession } from '@app/core'`.

Store dùng engine, models và storage trong core.
