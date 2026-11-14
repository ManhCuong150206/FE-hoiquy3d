import { Injectable, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSession } from '../../state/auth-session';

export interface AccountUser {
  _id: string; email: string; displayName: string; role: 'user' | 'admin';
  status: 'active' | 'disabled'; createdAt: string; updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class AccountApi {
  private readonly auth = inject(AuthSession);
  private readonly router = inject(Router);
  readonly user = signal<AccountUser | null>(null);

  async request<T>(path = '', method = 'GET', body?: object): Promise<T> {
    let response: Response;
    try {
      // AuthSession supplies credentials: include (the fetch equivalent of
      // withCredentials: true) and X-Requested-With once for mutations.
      // Handle 401 here: a wrong password must not clear a valid session.
      response = await this.auth.api('/api/v1/users/me' + path, {
        method, ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      }, false);
    } catch { throw new Error('Không kết nối được máy chủ. Vui lòng thử lại.'); }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const messages = Array.isArray(data?.message) ? data.message : [data?.message];
      if (response.status === 401 && method !== 'GET' && messages.includes('Mật khẩu không đúng')) {
        throw new Error('Mật khẩu không đúng. Vui lòng kiểm tra lại.');
      }
      if (response.status === 401) {
        this.user.set(null);
        this.auth.clearAccount();
        this.auth.error.set('Vui lòng đăng nhập để tiếp tục.');
        // Initial GET is owned by accountGuard, which returns a redirect.
        if (method !== 'GET') void this.router.navigateByUrl('/');
        throw new Error('Vui lòng đăng nhập để tiếp tục.');
      }
      throw new Error(response.status === 400
        ? 'Thông tin chưa hợp lệ. Vui lòng kiểm tra độ dài và nội dung đã nhập.'
        : 'Không thể cập nhật tài khoản lúc này. Vui lòng thử lại.');
    }
    return data as T;
  }

  async load() {
    const user = await this.request<AccountUser>();
    this.accept(user);
  }

  accept(user: AccountUser) {
    this.auth.updateAccount(user);
    this.user.set(user);
  }

  clear() { this.user.set(null); this.auth.clearAccount(); }
}

export const accountGuard: CanActivateFn = async () => {
  const api = inject(AccountApi), router = inject(Router), auth = inject(AuthSession);
  try { await api.load(); return true; }
  catch (error) {
    auth.error.set(error instanceof Error ? error.message : 'Vui lòng đăng nhập để tiếp tục.');
    return router.parseUrl('/');
  }
};
