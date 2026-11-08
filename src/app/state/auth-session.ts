import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface Identity { userId: string; displayName: string; email?: string; isAnonymous: boolean }
interface ApiUser { _id: string; displayName: string; email: string; role: 'user' | 'admin'; status: 'active' | 'disabled' }
const IDENTITY_KEY = 'regression.lastIdentity';

export function apiMessage(value: unknown, fallback: string): string {
    const message = (value as { message?: unknown } | null)?.message;
    return Array.isArray(message) ? message.filter(item => typeof item === 'string').join('\n') || fallback
        : typeof message === 'string' ? message : fallback;
}

@Injectable({ providedIn: 'root' })
export class AuthSession {
    private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
    private generation = 0;
    private requests = new AbortController();
    readonly scope = signal('guest');
    readonly user = signal<Identity | null>(null);
    readonly authenticated = computed(() => !!this.user() && !this.user()!.isAnonymous);
    readonly error = signal<string | null>(null);

    private remember(user: Identity | null) {
        if (!this.browser) return;
        try {
            if (user && !user.isAnonymous) {
                const { userId, displayName, email } = user;
                localStorage.setItem(IDENTITY_KEY, JSON.stringify({ userId, displayName, email }));
            } else localStorage.removeItem(IDENTITY_KEY);
        } catch { /* Local storage can be disabled; the current session still works. */ }
    }

    private restoreLocal() {
        try {
            const value = JSON.parse(localStorage.getItem(IDENTITY_KEY) ?? 'null');
            if (value && typeof value.userId === 'string' && value.userId && value.userId !== 'guest'
                && typeof value.displayName === 'string' && typeof value.email === 'string') {
                this.set({ userId: value.userId, displayName: value.displayName, email: value.email, isAnonymous: false });
            }
        } catch { /* Invalid or unavailable storage does not establish an identity. */ }
    }

    private set(user: Identity | null) {
        this.generation++;
        this.requests.abort();
        this.requests = new AbortController();
        this.user.set(user);
        this.scope.set(user?.userId ?? 'guest');
        if (!user) this.remember(null);
        return user;
    }

    // The dev proxy forwards /api to localhost:3000. Production uses the same
    // origin route. Cookies remain browser-managed; cached identity grants local access only.
    // TODO(BE-confirm): verify the deployed Origin allowlist and cookie flow with the real BE.
    async api(path: string, options: RequestInit = {}, protectedRequest = true): Promise<Response> {
        if (!path.startsWith('/api/v1/')) throw new Error('Đường dẫn API không hợp lệ.');
        if (protectedRequest && !this.authenticated()) throw new Error('Đăng nhập để lưu và đồng bộ thí nghiệm.');
        const generation = this.generation;
        const headers = new Headers(options.headers);
        if (['POST', 'PATCH', 'PUT', 'DELETE'].includes((options.method ?? 'GET').toUpperCase())) {
            headers.set('X-Requested-With', 'XMLHttpRequest');
        }
        const response = await fetch(path, { ...options, headers, credentials: 'include', cache: 'no-store', signal: this.requests.signal });
        if (generation !== this.generation) throw new Error('Phiên làm việc đã thay đổi.');
        if (response.status === 401 && protectedRequest) {
            this.set(null);
            this.error.set('Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục lưu và đồng bộ, hoặc dùng Guest.');
        }
        return response;
    }

    private async request(path: string, body?: object, protectedRequest = false): Promise<ApiUser> {
        const response = await this.api('/api/v1/auth/' + path, {
            method: body ? 'POST' : 'GET',
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined,
        }, protectedRequest);
        const data: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiMessage(data, `Không xác thực được với máy chủ (HTTP ${response.status}).`));
        return data as ApiUser;
    }

    private identity(user: ApiUser): Identity {
        if (!user || typeof user._id !== 'string' || typeof user.displayName !== 'string' || user.status !== 'active') {
            throw new Error('Máy chủ chưa xác nhận tài khoản.');
        }
        return { userId: user._id, displayName: user.displayName, email: user.email, isAnonymous: false };
    }

    async restore() {
        if (!this.browser) return;
        // TODO(BE-confirm): verify offline reload with the production service worker after its first online install.
        if (!navigator.onLine) { this.restoreLocal(); return; }
        const generation = this.generation;
        let response: Response;
        try { response = await this.api('/api/v1/auth/me', {}, false); }
        catch (error) {
            if (generation === this.generation) {
                this.restoreLocal();
                this.error.set(error instanceof Error ? error.message : 'Không kết nối được máy chủ.');
            }
            return;
        }
        if (generation !== this.generation) return;
        if (response.status === 401) { this.set(null); return; }
        try {
            if (!response.ok) throw new Error('Không khôi phục được phiên. Bạn vẫn có thể dùng Guest.');
            const user = this.identity(await response.json());
            if (generation === this.generation) { this.set(user); this.remember(user); }
        } catch (error) {
            if (generation === this.generation) this.error.set(error instanceof Error ? error.message : 'Không kết nối được máy chủ.');
        }
    }

    async enter(body: { email: string; password: string; displayName?: string }, registering: boolean) {
        if (!navigator.onLine) throw new Error('Cần kết nối mạng để đăng nhập hoặc đăng ký.');
        this.set(this.user()); // Explicit login takes precedence over startup restore.
        const generation = this.generation;
        const credentials = { email: body.email.trim().toLowerCase(), password: body.password };
        const data = await this.request(registering ? 'register' : 'login', registering
            ? { ...credentials, displayName: body.displayName?.trim() } : credentials);
        if (generation !== this.generation) throw new Error('Phiên làm việc đã thay đổi.');
        const user = this.identity(data);
        this.error.set(null);
        // Register creates an account only. The form returns to login afterwards.
        if (!registering) { this.set(user); this.remember(user); }
        return user;
    }

    guest() {
        this.error.set(null);
        return this.set({ userId: 'guest', displayName: 'Guest', isAnonymous: true });
    }

    async ensure() {
        if (!this.authenticated() || !navigator.onLine) return null;
        const scope = this.scope(), generation = this.generation;
        const current = this.identity(await this.request('me', undefined, true));
        if (generation !== this.generation) throw new Error('Phiên làm việc đã thay đổi.');
        if (current.userId !== scope) {
            this.set(null);
            this.error.set('Phiên máy chủ đã đổi tài khoản. Đăng nhập lại để đồng bộ đúng người dùng.');
            throw new Error(this.error()!);
        }
        this.remember(current);
        return current;
    }

    async logout() {
        if (this.authenticated()) {
            if (!navigator.onLine) throw new Error('Cần có mạng để thu hồi phiên đăng nhập an toàn.');
            const response = await this.api('/api/v1/auth/logout', { method: 'POST' });
            if (!response.ok && response.status !== 401) {
                throw new Error(apiMessage(await response.json().catch(() => null), 'Không đăng xuất được.'));
            }
        }
        this.error.set(null);
        this.set(null);
    }
}
