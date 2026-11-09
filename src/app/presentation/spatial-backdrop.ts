import { ThemeStore } from '../state/theme-store';
import { FrameBudget, recordRender } from './frame-budget';
import { Component, ElementRef, NgZone, OnDestroy, afterNextRender, effect, inject, input, viewChild } from '@angular/core';
import * as THREE from 'three';
import { rotatePair, unitRotation } from '../core/engine/complex-rotation';

/** One decorative star field. It never reads model data or changes training state. */
@Component({
  selector: 'app-spatial-backdrop',
  template: '<div #host class="spatial-host" aria-hidden="true"></div>',
  styles: [':host{position:fixed;inset:0;display:block;pointer-events:none;z-index:0}.spatial-host{width:100%;height:100%;overflow:hidden}.spatial-host canvas{display:block;width:100%;height:100%}'],
})
export class SpatialBackdrop implements OnDestroy {
  private readonly themeStore = inject(ThemeStore);
  readonly lowEffects = input(false);
  readonly screen = input('welcome');
  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private readonly zone = inject(NgZone);
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(48, 1, .1, 50);
  private readonly group = new THREE.Group();
  private renderer?: THREE.WebGLRenderer;
  private resize?: ResizeObserver;
  private reduced?: MediaQueryList;
  private frame = 0;
  private readonly budget = new FrameBudget();
  private destroyed = false;
  private lost = false;
  private pointer = { x: 0, y: 0 };
  private orbit: [number, number] = [1, 0];
  private readonly clock = new THREE.Vector2(1, 0);
  private twinkle: [number, number] = [1, 0];
  private meteor?:THREE.Line<THREE.BufferGeometry,THREE.LineBasicMaterial>;
  private meteorHead?:THREE.Mesh<THREE.SphereGeometry,THREE.MeshBasicMaterial>;
  private meteorTime=0;
  private stars?: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;

  constructor() {
    effect(() => { this.lowEffects(); this.screen(); this.themeStore.theme(); this.applyTheme(); this.restart(); });
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      this.zone.runOutsideAngular(() => {
        try {
          this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
          this.renderer.setPixelRatio(1); this.camera.position.z = 8;
          this.createStars();this.createMeteor();this.applyTheme(); this.scene.add(this.group);
          this.host().nativeElement.appendChild(this.renderer.domElement);
          this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)'); this.reduced.addEventListener('change', this.restart);
          this.resize = new ResizeObserver(this.fit); this.resize.observe(this.host().nativeElement); this.fit();
          document.addEventListener('visibilitychange', this.restart); window.addEventListener('pointermove', this.move, { passive: true });
          this.renderer.domElement.addEventListener('webglcontextlost', this.contextLost); this.restart();
        } catch { this.renderer?.dispose(); this.renderer?.domElement.remove(); this.renderer = undefined; }
      });
    });
  }

  private applyTheme() {
    if (!this.stars) return;
    const light = this.themeStore.theme() === 'light';
    this.stars.material.uniforms['pearl'].value = light ? 1 : 0;
    this.stars.material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    this.stars.material.needsUpdate = true;
    this.host().nativeElement.dataset['theme'] = light ? 'light' : 'dark';
  }
  private createStars() {
    const count = 1800, positions = new Float32Array(count * 3), colors = new Float32Array(count * 3), phases = new Float32Array(count * 2), sizes = new Float32Array(count);
    let seed = 814;
    const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < count; i++) {
      positions.set([(random() - .5) * 27, (random() - .5) * 18, random() * 16 - 14], i * 3);
      const blue = random(); colors.set([.68 + blue * .32, .79 + blue * .21, 1], i * 3);
      const phase = unitRotation(random() * Math.PI * 2); phases.set([phase.real, phase.imaginary], i * 2);
      sizes[i] = 1.2 + random() ** 2.5 * 4.8;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('starPhase', new THREE.BufferAttribute(phases, 2)); geometry.setAttribute('starSize', new THREE.BufferAttribute(sizes, 1));
    const material = new THREE.ShaderMaterial({
      uniforms: { clock: { value: this.clock }, pearl: { value: 0 } },
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute vec3 color;
        attribute vec2 starPhase;
        attribute float starSize;
        uniform vec2 clock;
        varying vec3 tint;
        varying float brightness;
        void main() {
          float wave = 0.5 + 0.5 * dot(starPhase, clock);
          brightness = 0.24 + 0.76 * wave * wave;
          tint = color;
          vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp(starSize * 11.0 / -viewPosition.z, 1.2, 6.0);
          gl_Position = projectionMatrix * viewPosition;
        }`,
      fragmentShader: `
        uniform float pearl;
        varying vec3 tint;
        varying float brightness;
        void main() {
          float distanceToCenter = length(gl_PointCoord - vec2(0.5)) * 2.0;
          if (distanceToCenter > 1.0) discard;
          float halo = pow(1.0 - distanceToCenter, 2.0);
          float core = 1.0 - smoothstep(0.0, 0.38, distanceToCenter);
          gl_FragColor = vec4(mix(tint * (0.8 + core * 0.3), vec3(.23,.36,.58), pearl), (halo * 0.65 + core * 0.35) * brightness);
        }`,
    });
    this.stars = new THREE.Points(geometry, material); this.group.add(this.stars);
    this.host().nativeElement.dataset['starCount'] = String(count);
  }

  private createMeteor(){
    const positions:number[]=[],colors:number[]=[];
    for(let i=0;i<24;i++){const t=i/23;positions.push(t*1.1,t*.35,0);const fade=(1-t)*(1-t);colors.push(fade*.8,fade*.9,fade);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    this.meteor=new THREE.Line(geometry,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.3,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false}));
    this.meteorHead=new THREE.Mesh(new THREE.SphereGeometry(.014,6,4),new THREE.MeshBasicMaterial({color:0xd7e0ee,transparent:true,opacity:.45,depthWrite:false,depthTest:false}));
    this.meteor.visible=this.meteorHead.visible=false;this.group.add(this.meteor,this.meteorHead);
  }
  private updateMeteor(delta:number){
    if(!this.meteor||!this.meteorHead)return;
    const paused=this.lowEffects()||this.reduced?.matches;
    if(!paused)this.meteorTime+=delta;
    const time=(this.meteorTime%10000-3000)/1800,active=!paused&&time>=0&&time<=1;
    this.meteor.visible=this.meteorHead.visible=active;
    if(active){
      const fade=Math.max(0,Math.min(1,time/.15,(1-time)/.2));
      this.meteor.position.set(3-time*6,3.2-time*1.9,0);this.meteorHead.position.copy(this.meteor.position);
      this.meteor.material.opacity=fade*.32;this.meteorHead.material.opacity=fade*.6;
    }
    this.host().nativeElement.dataset['meteorActive']=String(active);
    this.host().nativeElement.dataset['meteorCycle']=String(Math.floor(this.meteorTime/10000));
  }
  private fit = () => {
    if (!this.renderer) return;
    const host = this.host().nativeElement;
    this.renderer.setSize(Math.max(host.clientWidth, 1), Math.max(host.clientHeight, 1));
    this.camera.aspect = Math.max(host.clientWidth, 1) / Math.max(host.clientHeight, 1); this.camera.updateProjectionMatrix(); this.draw();
  };
  private move = (event: PointerEvent) => { if (this.lowEffects() || this.reduced?.matches) return; this.pointer.x = (event.clientX / innerWidth - .5) * .2; this.pointer.y = -(event.clientY / innerHeight - .5) * .15; };
  private draw() {
    if (!this.renderer || this.destroyed || document.hidden) return;
    const started = performance.now(), delta = this.budget.take(started); if (delta === null) return;
    if (!this.lowEffects() && !this.reduced?.matches) {
      this.orbit = rotatePair(...this.orbit, unitRotation(delta * .000004));
      this.twinkle = rotatePair(...this.twinkle, unitRotation(delta * .00055));
      this.group.quaternion.set(0, 0, this.orbit[1], this.orbit[0]).normalize();
      this.clock.set(...this.twinkle);
    }
    this.updateMeteor(delta);
    this.camera.position.x += (this.pointer.x - this.camera.position.x) * .04; this.camera.position.y += (this.pointer.y - this.camera.position.y) * .04;
    this.renderer.render(this.scene, this.camera); recordRender(this.renderer.domElement, started);
    this.host().nativeElement.dataset['twinklePhase'] = this.twinkle[1].toFixed(4);
  }
  private animate = () => { if (this.destroyed) return; this.draw(); this.frame = requestAnimationFrame(this.animate); };
  private restart = () => {
    if (typeof window === 'undefined' || !this.renderer || this.lost) return;
    cancelAnimationFrame(this.frame); this.budget.reset(); this.draw();
    if (document.hidden || this.lowEffects() || this.reduced?.matches || this.destroyed) return;
    this.zone.runOutsideAngular(() => { this.frame = requestAnimationFrame(this.animate); });
  };
  private contextLost = (event: Event) => { event.preventDefault(); this.lost = true; cancelAnimationFrame(this.frame); if (this.renderer) this.renderer.domElement.style.display = 'none'; };
  ngOnDestroy() {
    this.destroyed = true; if (typeof window === 'undefined') return;
    cancelAnimationFrame(this.frame); this.resize?.disconnect(); this.reduced?.removeEventListener('change', this.restart);
    document.removeEventListener('visibilitychange', this.restart); window.removeEventListener('pointermove', this.move);
    this.renderer?.domElement.removeEventListener('webglcontextlost', this.contextLost);
    this.meteor?.geometry.dispose();this.meteor?.material.dispose();this.meteorHead?.geometry.dispose();this.meteorHead?.material.dispose();
    this.stars?.geometry.dispose(); this.stars?.material.dispose(); this.renderer?.dispose(); this.renderer?.domElement.remove();
  }
}
