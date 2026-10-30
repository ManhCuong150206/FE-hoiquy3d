import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, afterNextRender, inject, signal } from '@angular/core';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'hoiquy3d-theme';

@Injectable({ providedIn: 'root' })
export class ThemeStore {
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    private readonly document = inject(DOCUMENT);
    private readonly current = signal<Theme>('dark');
    readonly theme = this.current.asReadonly();

    constructor() {
        // Match the server's initial bindings until hydration finishes. The head script
        // already paints the correct CSS theme before this first Angular render.
        afterNextRender(() => {
            if (!this.isBrowser) return;
            let saved: string | null = null;
            try { saved = window.localStorage.getItem(STORAGE_KEY); } catch { /* Storage blocked. */ }
            const theme = saved === 'light' || saved === 'dark'
                ? saved
                : 'dark';
            this.apply(theme);
        });
    }

    toggle() {
        if (!this.isBrowser) return;
        const theme = this.theme() === 'dark' ? 'light' : 'dark';
        this.apply(theme);
        try { window.localStorage.setItem(STORAGE_KEY, theme); } catch { /* Keep working in memory. */ }
    }

    private apply(theme: Theme) {
        this.current.set(theme);
        this.document.documentElement.setAttribute('data-theme', theme);
    }
}
