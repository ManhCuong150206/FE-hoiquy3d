import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthSession } from './auth-session';

const user = { _id: 'person-a', displayName: 'Linh', email: 'linh@example.com', role: 'user', status: 'active' };
const credentials = { email: ' Linh@Example.com ', password: 'password123' };
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });

describe('cookie session authentication', () => {
    let auth: AuthSession;
    const fetchMock = vi.fn<typeof fetch>();
    beforeEach(() => {
        localStorage.clear();
        vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
        auth = TestBed.inject(AuthSession);
    });
    afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

    it('sends cookies plus CSRF header and stores only userId, displayName and email', async () => {
        const write = vi.spyOn(Storage.prototype, 'setItem');
        fetchMock.mockResolvedValue(reply(user));
        await auth.enter({ ...credentials, displayName: 'ignored' }, false);
        expect(auth.scope()).toBe(user._id);
        expect(auth.authenticated()).toBe(true);
        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe('/api/v1/auth/login');
        expect(options?.credentials).toBe('include');
        expect(new Headers(options?.headers).get('X-Requested-With')).toBe('XMLHttpRequest');
        expect(JSON.parse(String(options?.body))).toEqual({ email: user.email, password: credentials.password });
        expect(write).toHaveBeenCalledWith('regression.lastIdentity', JSON.stringify({ userId: user._id, displayName: user.displayName, email: user.email }));
        expect(JSON.parse(localStorage.getItem('regression.lastIdentity')!)).toEqual({ userId: user._id, displayName: user.displayName, email: user.email });
    });
    it('registers without creating a logged-in frontend session', async () => {
        fetchMock.mockResolvedValue(reply(user, 201));
        await auth.enter({ ...credentials, displayName: ' Linh ' }, true);
        expect(auth.authenticated()).toBe(false);
        expect(auth.user()).toBeNull();
        expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).displayName).toBe('Linh');
    });
    it('restores using auth/me and treats 401 as an ordinary unauthenticated visit', async () => {
        fetchMock.mockResolvedValueOnce(reply({ message: 'Vui lòng đăng nhập' }, 401));
        await auth.restore();
        expect(auth.error()).toBeNull();
        expect(auth.authenticated()).toBe(false);
        fetchMock.mockResolvedValueOnce(reply(user));
        await auth.restore();
        expect(auth.scope()).toBe('person-a');
        expect(fetchMock.mock.calls.every(([url]) => url === '/api/v1/auth/me')).toBe(true);
    });
    it('guest enters and exits offline without API calls or storage writes', async () => {
        vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
        const write = vi.spyOn(Storage.prototype, 'setItem');
        auth.guest();
        expect(auth.user()?.isAnonymous).toBe(true);
        expect(await auth.ensure()).toBeNull();
        await expect(auth.api('/api/v1/experiments/bulk', { method: 'POST' })).rejects.toThrow('Đăng nhập');
        await auth.logout();
        expect(fetchMock).not.toHaveBeenCalled();
        expect(write).not.toHaveBeenCalled();
    });
    it('does not allow a delayed restore to replace the chosen Guest mode', async () => {
        let finish!: (response: Response) => void;
        fetchMock.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
        const restoring = auth.restore();
        auth.guest();
        finish(reply(user));
        await restoring;
        expect(auth.user()?.isAnonymous).toBe(true);
        expect(auth.error()).toBeNull();
    });
    it('clears the session on a protected 401 and prevents another write', async () => {
        fetchMock.mockResolvedValueOnce(reply(user));
        await auth.enter(credentials, false);
        fetchMock.mockResolvedValueOnce(reply({ message: 'Vui lòng đăng nhập' }, 401));
        await auth.api('/api/v1/experiments/bulk', { method: 'POST' });
        expect(auth.authenticated()).toBe(false);
        expect(auth.error()).toContain('hết hạn');
        expect(localStorage.getItem('regression.lastIdentity')).toBeNull();
        await expect(auth.api('/api/v1/experiments/bulk', { method: 'POST' })).rejects.toThrow();
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    it('stops sync if the shared cookie belongs to another account', async () => {
        fetchMock.mockResolvedValueOnce(reply(user));
        await auth.enter(credentials, false);
        fetchMock.mockResolvedValueOnce(reply({ ...user, _id: 'person-b' }));
        await expect(auth.ensure()).rejects.toThrow('đổi tài khoản');
        expect(auth.authenticated()).toBe(false);
    });
    it('posts logout with the CSRF header and clears the session', async () => {
        fetchMock.mockResolvedValueOnce(reply(user));
        await auth.enter(credentials, false);
        fetchMock.mockResolvedValueOnce(reply({ success: true }));
        await auth.logout();
        const [url, options] = fetchMock.mock.calls[1];
        expect(url).toBe('/api/v1/auth/logout');
        expect(options?.method).toBe('POST');
        expect(new Headers(options?.headers).get('X-Requested-With')).toBe('XMLHttpRequest');
        expect(auth.user()).toBeNull();
        expect(localStorage.getItem('regression.lastIdentity')).toBeNull();
    });
    it.each([400, 401, 403, 409, 429])('shows API validation/errors for HTTP %s', async status => {
        fetchMock.mockResolvedValue(reply({ message: ['Lỗi thứ nhất', 'Lỗi thứ hai'] }, status));
        await expect(auth.enter(credentials, false)).rejects.toThrow('Lỗi thứ nhất\nLỗi thứ hai');
        expect(auth.authenticated()).toBe(false);
    });
    const cache = () => localStorage.setItem('regression.lastIdentity', JSON.stringify({ userId: user._id, displayName: user.displayName, email: user.email }));
    it('restores offline identity without contacting the API and ensure waits for connectivity', async () => {
        cache(); vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
        await auth.restore();
        expect(auth.scope()).toBe(user._id); expect(auth.authenticated()).toBe(true);
        expect(await auth.ensure()).toBeNull(); expect(fetchMock).not.toHaveBeenCalled();
    });
    it('restores cached identity on a network failure even if navigator reports online', async () => {
        cache(); fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
        await auth.restore(); expect(auth.scope()).toBe(user._id);
    });
    it.each([403, 500])('does not fall back to cached identity on HTTP %s', async status => {
        cache(); fetchMock.mockResolvedValue(reply({ message: 'Failure' }, status));
        await auth.restore(); expect(auth.user()).toBeNull();
    });
    it('clears cached identity and an offline-restored user when restore receives 401', async () => {
        cache(); vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false); await auth.restore();
        vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
        fetchMock.mockResolvedValue(reply({ message: 'Expired' }, 401));
        await auth.restore(); expect(auth.user()).toBeNull(); expect(localStorage.getItem('regression.lastIdentity')).toBeNull();
    });
    it('refreshes the cached identity from auth/me and replaces it on another login', async () => {
        fetchMock.mockResolvedValueOnce(reply(user)); await auth.restore();
        expect(JSON.parse(localStorage.getItem('regression.lastIdentity')!).userId).toBe(user._id);
        fetchMock.mockResolvedValueOnce(reply({ ...user, _id: 'person-b' })); await auth.enter(credentials, false);
        expect(JSON.parse(localStorage.getItem('regression.lastIdentity')!).userId).toBe('person-b');
    });
    it.each(['invalid json', '{}', '{"userId":"guest","displayName":"Guest","email":""}'])('ignores invalid cached identity %s', async value => {
        localStorage.setItem('regression.lastIdentity', value); vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
        await auth.restore(); expect(auth.user()).toBeNull();
    });
    it('continues when localStorage is unavailable', async () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Denied'); });
        fetchMock.mockResolvedValue(reply(user)); await auth.enter(credentials, false); expect(auth.authenticated()).toBe(true);
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Denied'); });
        vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false); await expect(auth.restore()).resolves.toBeUndefined();
    });
    it('does not restore cached identity after Guest was chosen during a failed fetch', async () => {
        cache(); let fail!: (error: Error) => void;
        fetchMock.mockImplementation(() => new Promise((_, reject) => { fail = reject; }));
        const restoring = auth.restore(); auth.guest(); fail(new TypeError('Failed to fetch')); await restoring;
        expect(auth.scope()).toBe('guest');
    });
});
