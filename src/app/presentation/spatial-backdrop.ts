import { FrameBudget, recordRender } from './frame-budget';
import { Component, ElementRef, NgZone, OnDestroy, afterNextRender, effect, inject, input, viewChild } from '@angular/core';
import * as THREE from 'three';
import { rotatePair, unitRotation } from '../core/engine/complex-rotation';

/** Decorative depth only. Its geometry never represents experiment samples. */
@Component({
  selector: 'app-spatial-backdrop',
  template: '<div #host class="spatial-host" aria-hidden="true"></div>',
  styles: [':host{position:fixed;inset:0;display:block;pointer-events:none;z-index:0;opacity:.32}.spatial-host{width:100%;height:100%;overflow:hidden}.spatial-host canvas{display:block;width:100%;height:100%}@media(prefers-reduced-motion:reduce){:host{opacity:.15}}'],
})
export class SpatialBackdrop implements OnDestroy {
  readonly lowEffects = input(false);
  readonly screen = input('welcome');
  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private readonly zone = inject(NgZone);
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(48, 1, .1, 40);
  private readonly group = new THREE.Group();
  private renderer?: THREE.WebGLRenderer;
  private resize?: ResizeObserver;
  private reduced?: MediaQueryList;
  private frame = 0;
  private last = 0;
  private readonly budget = new FrameBudget();
  private destroyed = false;
  private lost = false;
  private pointer = { x: 0, y: 0 };
  private orbit: [number, number] = [1, 0];
  private readonly rotation = unitRotation(.0007);

  constructor() {
    effect(() => { this.lowEffects(); this.screen(); this.restart(); });
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      this.zone.runOutsideAngular(() => {
        try {
          this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
          this.renderer.setPixelRatio(1); this.camera.position.z = 8;
          const positions = new Float32Array(210 * 3); let seed = 814;
          const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
          for (let i = 0; i < positions.length; i += 3) { positions[i] = (random() - .5) * 24; positions[i+1] = (random() - .5) * 15; positions[i+2] = (random() - .5) * 9; }
          const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          const palette = getComputedStyle(document.documentElement);
          const color = new THREE.Color(palette.getPropertyValue('--color-ridge').trim());
          this.group.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color, size: .025, transparent: true, opacity: .65, depthWrite: false })));
          const step = unitRotation(Math.PI * 2 / 128);
          ['linear','polynomial','ridge'].forEach((name, index) => {
            const points: THREE.Vector3[] = []; let pair: [number, number] = [3.2 + index * .4, 0];
            for (let j=0; j<128; j++) { points.push(new THREE.Vector3(pair[0], pair[1], 0)); pair = rotatePair(...pair, step); }
            const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: palette.getPropertyValue(`--color-${name}`).trim(), transparent: true, opacity: .16, depthWrite: false }));
            line.rotation.set(.7 + index*.3, .5, index*.5); line.position.set(2.8, 1, -3); this.group.add(line);
          });
          this.scene.add(this.group); this.host().nativeElement.appendChild(this.renderer.domElement);
          this.resize = new ResizeObserver(this.fit); this.resize.observe(this.host().nativeElement); this.fit();
          this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)'); this.reduced.addEventListener('change', this.restart);
          document.addEventListener('visibilitychange', this.restart); window.addEventListener('pointermove', this.move, {passive:true});
          this.renderer.domElement.addEventListener('webglcontextlost', this.contextLost);
          this.restart();
        } catch { this.renderer?.dispose(); this.renderer?.domElement.remove(); this.renderer = undefined; }
      });
    });
  }
  private fit = () => {
    if (!this.renderer) return;
    const host = this.host().nativeElement;
    this.renderer.setSize(Math.max(host.clientWidth,1), Math.max(host.clientHeight,1));
    this.camera.aspect = Math.max(host.clientWidth,1)/Math.max(host.clientHeight,1); this.camera.updateProjectionMatrix(); this.draw();
  };
  private move = (event: PointerEvent) => { if (this.lowEffects() || this.reduced?.matches) return; this.pointer.x = (event.clientX / innerWidth - .5) * .35; this.pointer.y = -(event.clientY / innerHeight - .5) * .2; };
  private draw() {
    if (!this.renderer || this.destroyed || document.hidden) return;
    const started = performance.now(); const delta = this.budget.take(started); if (delta === null) return;
    this.orbit = rotatePair(...this.orbit, unitRotation(.0007 * delta / (1000 / 60)));
    const offset = this.screen() === 'lab' ? -.7 : this.screen() === 'algorithms' ? .5 : 0;
    this.camera.position.x += (this.pointer.x + offset - this.camera.position.x) * .04;
    this.camera.position.y += (this.pointer.y - this.camera.position.y) * .04;
    this.group.quaternion.set(0, this.orbit[1], 0, this.orbit[0]).normalize();
    this.renderer.render(this.scene, this.camera); recordRender(this.renderer.domElement, started);
  }
  private animate = (now: number) => {
    if (this.destroyed) return;
    this.draw();
    this.frame = requestAnimationFrame(this.animate);
  };
  private restart = () => {
    if (typeof window === 'undefined' || !this.renderer || this.lost) return;
    cancelAnimationFrame(this.frame); this.last = 0; this.draw();
    if (document.hidden || this.lowEffects() || this.reduced?.matches || this.destroyed) return;
    this.zone.runOutsideAngular(() => { this.frame = requestAnimationFrame(this.animate); });
  };
  private contextLost = (event: Event) => { event.preventDefault(); this.lost = true; cancelAnimationFrame(this.frame); if (this.renderer) this.renderer.domElement.style.display = 'none'; };
  ngOnDestroy() {
    this.destroyed = true;
    if (typeof window === 'undefined') return;
    cancelAnimationFrame(this.frame); this.resize?.disconnect(); this.reduced?.removeEventListener('change', this.restart);
    document.removeEventListener('visibilitychange', this.restart); window.removeEventListener('pointermove', this.move);
    this.renderer?.domElement.removeEventListener('webglcontextlost', this.contextLost);
    this.scene.traverse(object => { if (object instanceof THREE.Points || object instanceof THREE.Line) { object.geometry.dispose(); (object.material as THREE.Material).dispose(); } });
    this.renderer?.dispose(); this.renderer?.domElement.remove();
  }
}
