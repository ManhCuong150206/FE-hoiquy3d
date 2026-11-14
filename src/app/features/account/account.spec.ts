import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountApi, AccountUser } from './account-api';
import { AuthSession } from '../../state/auth-session';
import { Account } from './account';

const user: AccountUser = { _id: 'account-test', email: 'test@example.com', displayName: 'Linh', role: 'user', status: 'active', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
describe('account updates', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const navigateByUrl = vi.fn().mockResolvedValue(true);
  let api: AccountApi;
  let auth: AuthSession;
  let page: Account;
  beforeEach(() => {
    localStorage.clear(); fetchMock.mockReset(); navigateByUrl.mockClear();
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: { navigateByUrl } }] });
    api = TestBed.inject(AccountApi); auth = TestBed.inject(AuthSession);
    api.accept(user);
    page = TestBed.runInInjectionContext(() => new Account());
  });
  afterEach(() => vi.unstubAllGlobals());
  it('sends the exact name body, credentials and CSRF header, and updates shared identity', async () => {
    fetchMock.mockResolvedValue(response({ ...user, displayName: 'An' }));
    page.displayName = ' An '; await page.saveName();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/users/me');
    expect(options?.credentials).toBe('include');
    expect(new Headers(options?.headers).get('X-Requested-With')).toBe('XMLHttpRequest');
    expect(JSON.parse(String(options?.body))).toEqual({ displayName: 'An' });
    expect(auth.user()?.displayName).toBe('An');
    expect(JSON.parse(localStorage.getItem('regression.lastIdentity')!).displayName).toBe('An');
  });
  it('rejects mismatched passwords before sending a request', async () => {
    page.currentPassword = 'password1'; page.newPassword = 'password2'; page.repeatedPassword = 'password3';
    await page.changePassword(); expect(fetchMock).not.toHaveBeenCalled();
    expect(page.errors().password).toContain('chưa khớp');
  });
  it('uses the same UTF-8 password limit as registration', async () => {
    expect(page.validPassword('a'.repeat(72))).toBe(true);
    expect(page.validPassword('é'.repeat(36))).toBe(true);
    expect(page.validPassword('é'.repeat(37))).toBe(false);
    page.currentPassword = 'password1';
    page.newPassword = page.repeatedPassword = 'é'.repeat(37);
    await page.changePassword();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(page.errors().password).toContain('72 byte UTF-8');
  });
  it('preserves the session after a wrong current password', async () => {
    fetchMock.mockResolvedValue(response({ message: 'Mật khẩu không đúng' }, 401));
    page.currentPassword = 'password1'; page.newPassword = page.repeatedPassword = 'password2';
    await page.changePassword();
    expect(auth.authenticated()).toBe(true);
    expect(page.errors().password).toContain('Mật khẩu không đúng');
    expect(navigateByUrl).not.toHaveBeenCalled();
  });
  it('clears expired sessions and redirects home', async () => {
    fetchMock.mockResolvedValue(response({ message: 'Vui lòng đăng nhập' }, 401));
    await expect(api.request('/password', 'POST', { currentPassword: 'password1', newPassword: 'password2' })).rejects.toThrow('Vui lòng đăng nhập');
    expect(auth.user()).toBeNull(); expect(navigateByUrl).toHaveBeenCalledWith('/');
  });
  it('sends a DELETE body and removes all account identity on success', async () => {
    fetchMock.mockResolvedValue(response({ success: true })); page.deletePassword = 'password1';
    await page.deleteAccount();
    const [, options] = fetchMock.mock.calls[0];
    expect(options?.method).toBe('DELETE');
    expect(options?.credentials).toBe('include');
    expect(new Headers(options?.headers).get('X-Requested-With')).toBe('XMLHttpRequest');
    expect(JSON.parse(String(options?.body))).toEqual({ password: 'password1' });
    expect(auth.user()).toBeNull(); expect(auth.scope()).toBe('guest'); expect(api.user()).toBeNull();
    expect(localStorage.getItem('regression.lastIdentity')).toBeNull();
    expect(navigateByUrl).toHaveBeenCalledWith('/');
  });
});
