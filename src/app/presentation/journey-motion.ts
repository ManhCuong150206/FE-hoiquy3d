import { prepareFlightCover, removeFlightCover } from './algorithm-flight';
import { DestroyRef, Directive, ElementRef, NgZone, afterNextRender, effect, inject, input, signal, untracked } from '@angular/core';
import type { gsap } from 'gsap';

/** Page presentation only. Never calls training or data APIs. */
@Directive({ selector: '[appJourneyMotion]' })
export class JourneyMotion {
  readonly motionEnabled = input(true);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly zone = inject(NgZone);
  private readonly loaded = signal(false);
  private engine?: typeof gsap;
  private timeline?: gsap.core.Timeline;
  private finish?: () => void;
  private media?: MediaQueryList;
  private destroyed = false;

  constructor() {
    effect(() => { this.motionEnabled(); if (this.loaded()) untracked(() => this.preferenceChanged()); });
    afterNextRender(async () => {
      if (typeof ResizeObserver === 'undefined') return;
      const { gsap: engine } = await import('gsap'); if (this.destroyed) return;
      this.engine = engine; engine.ticker.fps(60);
      this.media = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.media.addEventListener('change', this.preferenceChanged); this.loaded.set(true);
    });
    inject(DestroyRef).onDestroy(() => { this.destroyed = true; this.timeline?.kill(); this.media?.removeEventListener('change', this.preferenceChanged);removeFlightCover(); });
  }

  private preferenceChanged = () => {
    this.host.dataset['motion'] = this.motionEnabled() && !this.media?.matches ? 'active' : 'reduced';
    if (this.host.dataset['motion'] === 'reduced') this.finish?.();
  };

  settle() { this.finish?.(); }

  switchPage(from: HTMLElement | null, target: HTMLElement, algorithm: string, swap: () => void, done: () => void, handoff=false): void {
    this.finish?.();
    const engine = this.engine;
    const veil = this.host.querySelector<HTMLElement>('.scene-wipe');
    const panels = () => Array.from(target.querySelectorAll<HTMLElement>('.welcome-grid > *, .algorithm-copy, .sphere-container, .algorithm-cards, .lab-heading, app-training-controls, .workspace > *, .learning-workspace > *, app-algorithm-notes'));
    let swapped = false;
    const change = () => {
      if (swapped) return; swapped = true;
      if (from && from !== target) from.hidden = true;
      target.hidden = false;
      this.zone.run(swap); window.scrollTo({ top: 0, behavior: 'instant' });
      this.host.dataset['transition'] = 'enter'; target.dataset['entered'] = 'animating';
    };
    const finish = () => {
      this.timeline?.kill(); this.timeline = undefined; change();
      if (engine) {
        engine.set([...(from ? [from] : []), target, ...panels()], { clearProps: 'transform,opacity,visibility' });
        if (veil) engine.set(veil, { autoAlpha: 0 });
      }
      delete this.host.dataset['transition']; target.dataset['entered'] = 'complete'; this.finish = undefined;
      const heading = target.querySelector<HTMLElement>('h1,h2'); heading?.setAttribute('tabindex', '-1'); heading?.focus({ preventScroll: true });
      this.zone.run(done);
    };
    this.finish = finish;
    if (!engine || !veil || !this.motionEnabled() || this.media?.matches || from === target) { removeFlightCover();finish(); return; }
    if(handoff){
      this.zone.runOutsideAngular(()=>{
        this.host.dataset['transition']='exit';
        const reverse=target.id==='algorithms';
        const cover=prepareFlightCover(algorithm);
        const t=engine.timeline({onComplete:()=>{if(!reverse)removeFlightCover();finish();}});this.timeline=t;
        // Swap behind an opaque, viewport-sized region. The reverse flight then shrinks it.
        t.call(change,[],.02).fromTo(target,{opacity:0},{opacity:1,duration:.3},.04);
        if(!reverse)t.to(cover,{opacity:0,duration:.32,ease:'power2.out'},.02);
      });return;
    }
    this.zone.runOutsideAngular(() => {
      this.host.dataset['transition'] = 'exit';
      veil.style.setProperty('--wipe-color', getComputedStyle(document.documentElement).getPropertyValue(`--color-${algorithm}`).trim() || '#35e6ff');
      const timeline = engine.timeline({ onComplete: finish }); this.timeline = timeline;
      if (from) timeline.to(from, { opacity: 0, y: -24, scale: .975, duration: .3, ease: 'power2.in' }, 0);
      timeline.fromTo(veil, { autoAlpha: 0 }, { autoAlpha: .85, duration: .28 }, 0)
        .call(change, [], .3)
        .fromTo(target, { opacity: 0, y: 32, scale: .985 }, { opacity: 1, y: 0, scale: 1, duration: .6, ease: 'power3.out' }, .32)
        .to(veil, { autoAlpha: 0, duration: .42 }, .36)
        .add(() => {
          // Deferred components can arrive after the page swap; animate the stable component hosts.
          const items = panels();
          if (items.length) timeline.fromTo(items, { y: target.id === 'learning' ? 26 : 18, opacity: 0 }, { y: 0, opacity: 1, stagger: .055, duration: .52, ease: 'power3.out' }, .38);
          const sphere = target.querySelector('.sphere-container');
          if (sphere) timeline.fromTo(sphere, { scale: .82, rotationY: -12 }, { scale: 1, rotationY: 0, duration: .85, ease: 'power3.out' }, .36);
          const lesson = target.querySelectorAll('.learning-workspace > *');
          lesson.forEach((item, index) => timeline.fromTo(item, { x: index ? 36 : -36 }, { x: 0, duration: .65, ease: 'power3.out' }, .4));
        }, .33);
    });
  }
}
