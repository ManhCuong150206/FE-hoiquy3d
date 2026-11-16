# WelcomePanel

Hiển thị màn hình chào và cho người dùng bắt đầu bằng tài khoản hoặc phiên khách.

## Nội dung

- `welcome-panel.ts`, `welcome-panel.html`, `welcome-panel.css`, `welcome-panel.spec.ts` — Component chính, template, CSS và spec.
- `components/entry-form/` — Component form đăng nhập/đăng ký với template, CSS và spec tương ứng.
- `index.ts` — Xuất component chính.

Ví dụ `import { WelcomePanel } from '@app/features/welcome-panel'`.

Phụ thuộc vào AuthSession và component EntryForm.
