import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, afterNextRender, effect, inject, signal, untracked } from '@angular/core';
import { AuthSession } from './auth-session';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'hoiquy3d-theme';
@Injectable({ providedIn: 'root' })
export class ThemeStore {
    private readonly auth = inject(AuthSession);
    private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
    private readonly document = inject(DOCUMENT);
    private readonly current = signal<Theme>('dark');
    private readonly mounted = signal(false);
    private touched = false;
    private authenticated = false;
    private wave?: HTMLElement;
    private animation?: Animation;
    readonly theme = this.current.asReadonly();
    readonly transitioning = signal(false);
    constructor() {
        afterNextRender(() => { if (this.browser) { this.apply('dark'); this.mounted.set(true); } });
        effect(() => {
            const ready = this.mounted(), signedIn = this.auth.authenticated();
            if (!ready) return;
            untracked(() => {
                if (signedIn && !this.authenticated) {
                    if (this.touched) this.persist();
                    else {
                        let saved: string | null = null;
                        try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* Optional storage. */ }
                        this.apply(saved === 'light' ? 'light' : 'dark');
                    }
                } else if (!signedIn && this.authenticated) {
                    this.finish(); this.touched = false; this.apply('dark');
                }
                this.authenticated = signedIn;
            });
        });
        inject(DestroyRef).onDestroy(() => this.finish());
    }
    toggle() {
        if (!this.browser || this.transitioning() || this.document.querySelector('.experience[aria-busy="true"]')) return;
        const next = this.theme() === 'dark' ? 'light' : 'dark';
        this.touched = true;
        const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!reduce && typeof this.document.documentElement.animate === 'function') {
            const canvas = this.document.querySelector('#algorithm-planet-slot canvas');
            const rect = canvas?.getBoundingClientRect();
            const x = rect && rect.width ? rect.left + rect.width / 2 : innerWidth / 2;
            const y = rect && rect.height ? rect.top + rect.height / 2 : innerHeight / 3;
            const wave = this.document.createElement('div');
            wave.className = 'theme-wave'; wave.setAttribute('aria-hidden', 'true');
            wave.style.left = x + 'px'; wave.style.top = y + 'px';
            wave.dataset['direction'] = next;
            this.document.body.append(wave); this.wave = wave; this.transitioning.set(true);
            this.document.documentElement.dataset['themeTransition'] = next;
            this.animation = wave.animate([
                { transform: 'translate(-50%,-50%) scale(.03)', opacity: 0 },
                { transform: 'translate(-50%,-50%) scale(.16)', opacity: .45, offset: .2 },
                { transform: 'translate(-50%,-50%) scale(1)', opacity: .3, offset: .7 },
                { transform: 'translate(-50%,-50%) scale(1.5)', opacity: 0 }
            ], { duration: 1400, easing: 'cubic-bezier(.22,.61,.36,1)' });
            this.animation.onfinish = () => this.finish();
        }
        this.apply(next);
        if (this.auth.authenticated()) this.persist();
    }
    private persist() { try { localStorage.setItem(STORAGE_KEY, this.theme()); } catch { /* Memory remains usable. */ } }
    private apply(theme: Theme) { this.current.set(theme); this.document.documentElement.setAttribute('data-theme', theme); }
    private finish() {
        if (!this.browser) return;
        this.animation?.cancel(); this.animation = undefined; this.wave?.remove(); this.wave = undefined;
        delete this.document.documentElement.dataset['themeTransition']; this.transitioning.set(false);
    }
}
