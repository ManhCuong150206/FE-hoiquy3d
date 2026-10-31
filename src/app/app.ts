import { FrameBudget } from './presentation/frame-budget';
import { Component, DestroyRef, ElementRef, Injector, NgZone, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { Header } from './layout/header/header';
import { TrainingControls } from './features/training-controls/training-controls';
import { ExperimentsPanel } from './features/experiments-panel/experiments-panel';
import { DataPanel } from './features/data-panel/data-panel';
import { Viewport3d } from './features/viewport3d/viewport3d';
import { ResultsPanel } from './features/results-panel/results-panel';
import { AlgorithmNotes } from './features/algorithm-notes/algorithm-notes';
import { LearningWalkthrough } from './features/learning-walkthrough/learning-walkthrough';
import { WelcomePanel } from './features/welcome-panel/welcome-panel';
import { AlgorithmPicker } from './features/algorithm-picker/algorithm-picker';
import { Algorithm, ALGORITHM_LABELS } from './core/models/experiment';
import { JourneyMotion } from './presentation/journey-motion';
import { SpatialBackdrop } from './presentation/spatial-backdrop';
import { LabStore } from './state/lab-store';

@Component({
  selector: 'app-root',
  host: { '[class.low-effects]': 'lowEffects()' },
  imports: [Header, TrainingControls, ExperimentsPanel, DataPanel, Viewport3d, ResultsPanel, AlgorithmNotes, LearningWalkthrough, WelcomePanel, AlgorithmPicker, JourneyMotion, SpatialBackdrop],
  templateUrl: './app.html', styleUrl: './app.css',
})
export class App {
  readonly lab = inject(LabStore);
  private readonly injector = inject(Injector);
  private readonly zone = inject(NgZone);
  readonly opened = signal(false);
  readonly activeScreen = signal('welcome');
  readonly preview = signal<Algorithm>('linear');
  readonly pending = signal<Algorithm | null>(null);
  readonly labels = ALGORITHM_LABELS;
  readonly transitioning = signal(false);
  readonly lowEffects = signal(false);
  private readonly cursorBudget = new FrameBudget();
  private readonly motion = viewChild(JourneyMotion);
  private readonly glow = viewChild<ElementRef<HTMLDivElement>>('cursorGlow');
  private readonly welcome = viewChild(WelcomePanel);
  private readonly confirmDialog = viewChild<ElementRef<HTMLDialogElement>>('confirmDialog');
  readonly pageBusy = signal(false);
  private pointerFrame = 0;
  private cleanupPointer?: () => void;

  constructor() {
    afterNextRender(() => {
      this.zone.runOutsideAngular(() => {
        if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        let x = 0, y = 0, previousX = 0, previousY = 0;
        const paint = (now: number) => { this.pointerFrame = 0; if (this.cursorBudget.take(now) === null) { this.pointerFrame = requestAnimationFrame(paint); return; } const glow = this.glow()?.nativeElement; if (glow) { glow.style.transform = `translate3d(${x - 50}px,${y - 50}px,0)`; glow.style.opacity = '1';
          const tail = glow.querySelector<HTMLElement>('.cursor-tail'); const dx = x - previousX, dy = y - previousY, length = Math.hypot(dx, dy);
          if (tail && length > .5) tail.style.transform = `matrix(${dx/length},${dy/length},${-dy/length},${dx/length},0,0)`;
          previousX = x; previousY = y; } };
        const move = (event: PointerEvent) => { if (this.lowEffects() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; x = event.clientX; y = event.clientY; if (!this.pointerFrame) this.pointerFrame = requestAnimationFrame(paint); };
        const leave = () => { const glow = this.glow()?.nativeElement; if (glow) glow.style.opacity = '0'; };
        const down = (event: PointerEvent) => {
          if (event.pointerType === 'touch' || this.lowEffects() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
          x = event.clientX; y = event.clientY; const glow = this.glow()?.nativeElement;
          if (glow) { glow.style.transform = `translate3d(${x - 50}px,${y - 50}px,0)`; glow.style.opacity = '1'; glow.classList.add('pressed', 'rippling'); glow.querySelector('.cursor-ripple')?.getAnimations?.().forEach(animation => animation.currentTime = 0); }
        };
        const up = () => this.glow()?.nativeElement.classList.remove('pressed');
        const rippleEnd = () => this.glow()?.nativeElement.classList.remove('rippling');
        window.addEventListener('pointerdown', down, { passive: true }); window.addEventListener('pointerup', up, { passive: true });
        this.glow()?.nativeElement.addEventListener('animationend', rippleEnd);
        window.addEventListener('pointermove', move, { passive: true });
        document.addEventListener('pointerleave', leave);
        this.cleanupPointer = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); this.glow()?.nativeElement.removeEventListener('animationend', rippleEnd); document.removeEventListener('pointerleave', leave); };
      });
    });
    inject(DestroyRef).onDestroy(() => { this.cleanupPointer?.(); if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.pointerFrame); });
  }

  navigate(screen: string, _cinematic = false) {
    if (!['welcome', 'algorithms', 'lab', 'learning'].includes(screen) || ((screen === 'lab' || screen === 'learning') && !this.opened())) return;
    this.motion()?.settle();
    const target = document.getElementById(screen); if (!target) { this.activeScreen.set(screen); return; }
    const from = document.getElementById(this.activeScreen());
    if (screen === this.activeScreen() && !this.pageBusy()) { this.transitioning.set(false); return; }
    this.pageBusy.set(true);
    const swap = () => this.activeScreen.set(screen);
    const done = () => { this.pageBusy.set(false); this.transitioning.set(false); };
    const motion = this.motion();
    if (motion) motion.switchPage(from, target, this.preview(), swap, done);
    else { swap(); done(); }
  }

  logout() {
    this.lab.pause(); this.cancelChange(); this.welcome()?.resetEntry();
    this.navigate('welcome', true);
  }

  chooseAlgorithm(algorithm: Algorithm) {
    if (algorithm !== this.lab.algorithm() && this.lab.iteration() > 0) {
      this.pending.set(algorithm);
      this.confirmDialog()?.nativeElement.showModal();
      return;
    }
    this.openAlgorithm(algorithm);
  }

  confirmChange() {
    const algorithm = this.pending();
    this.cancelChange();
    if (algorithm) this.openAlgorithm(algorithm);
  }

  cancelChange() { this.pending.set(null); this.confirmDialog()?.nativeElement.close(); }

  private openAlgorithm(algorithm: Algorithm) {
    if (this.lab.algorithm() !== algorithm) this.lab.setAlgorithm(algorithm);
    this.preview.set(algorithm);
    this.opened.set(true);
    this.transitioning.set(true);
    afterNextRender(() => {
      this.navigate('lab', true);
      document.getElementById('lab-title')?.focus({ preventScroll: true });
    }, { injector: this.injector });
  }
}
