import { Component, PLATFORM_ID, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ThemeStore } from './theme-store';

@Component({ template: '' })
class ThemeHost {
    store = inject(ThemeStore);
}

describe('ThemeStore', () => {
    const key = 'hoiquy3d-theme';
    let stored: Map<string, string>;
    let storage: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        stored = new Map();
        storage = {
            getItem: vi.fn((key: string) => stored.get(key) ?? null),
            setItem: vi.fn((key: string, value: string) => stored.set(key, value)),
        };
        vi.stubGlobal('localStorage', storage);
        vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
        document.documentElement.removeAttribute('data-theme');
    });

    afterEach(() => {
        TestBed.resetTestingModule();
        vi.unstubAllGlobals();
        document.documentElement.removeAttribute('data-theme');
    });

    async function create(platform = 'browser') {
        TestBed.configureTestingModule({
            imports: [ThemeHost],
            providers: [{ provide: PLATFORM_ID, useValue: platform }],
        });
        const fixture = TestBed.createComponent(ThemeHost);
        await fixture.whenStable();
        return fixture.componentInstance.store;
    }

    it('uses dark by default regardless of OS preference', async () => {
        const store = await create();
        expect(store.theme()).toBe('dark');
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it.each(['light', 'dark'])('prefers saved %s over the OS setting', async (saved) => {
        stored.set(key, saved);
        vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: saved === 'light' })));
        expect((await create()).theme()).toBe(saved);
    });

    it('ignores an invalid saved value', async () => {
        stored.set(key, 'invalid');
        expect((await create()).theme()).toBe('dark');
    });

    it('toggles the DOM, persists, and restores on a new instance', async () => {
        stored.set(key, 'light');
        const store = await create();
        store.toggle();
        expect(store.theme()).toBe('dark');
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(storage.setItem).toHaveBeenCalledWith(key, 'dark');
        TestBed.resetTestingModule();
        const restored = await create();
        expect(restored.theme()).toBe('dark');
        restored.toggle();
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        expect(stored.get(key)).toBe('light');
    });

    it('works when storage reads and writes throw', async () => {
        storage.getItem.mockImplementation(() => { throw new Error('blocked'); });
        storage.setItem.mockImplementation(() => { throw new Error('blocked'); });
        vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
        const store = await create();
        expect(store.theme()).toBe('dark');
        expect(() => store.toggle()).not.toThrow();
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('works when accessing the localStorage property itself throws', async () => {
        const getter = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('blocked'); });
        try {
            const store = await create();
            expect(() => store.toggle()).not.toThrow();
            expect(store.theme()).toBe('light');
        } finally { getter.mockRestore(); }
    });

    it('does not access browser APIs or mutate the document on the server', async () => {
        const store = await create('server');
        store.toggle();
        expect(store.theme()).toBe('dark');
        expect(storage.getItem).not.toHaveBeenCalled();
        expect(storage.setItem).not.toHaveBeenCalled();
        expect(window.matchMedia).not.toHaveBeenCalled();
        expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    });
});
