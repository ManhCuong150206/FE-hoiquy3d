import { FrameBudget, recordRender } from '../../presentation/frame-budget';
import { Component, ElementRef, NgZone, OnDestroy, afterNextRender, effect, inject, input, output, signal, viewChild } from '@angular/core';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Algorithm } from '../../core/models/experiment';
import { rotatePair, unitRotation } from '../../core/engine/complex-rotation';

const SECTORS: Algorithm[] = ['linear', 'polynomial', 'ridge', 'lasso'];

@Component({
  selector: 'app-algorithm-sphere',
  template: `<div class="sphere-host" #host role="img" aria-label="Khối cầu bốn vùng màu: Linear cyan, Polynomial hồng, Ridge tím, Lasso bạc. Kéo để xoay, rê để phát sáng. Chọn thuật toán bằng các thẻ bên dưới. Các nút bên dưới hỗ trợ bàn phím.">
    @if (!ready()) { <div class="fallback-orb" aria-hidden="true"></div> }
    @if (failed()) { <p class="fallback-note">Chọn một thuật toán bên dưới để tiếp tục.</p> }
    <span class="orb-caption" aria-hidden="true">{{ hovered() ? hovered() + ' · Chọn thẻ bên dưới' : 'Kéo xoay · Rê để phát sáng · Chọn bằng thẻ' }}</span>
    </div>`,
  styles: [`:host{display:block;height:100%}.sphere-host{position:relative;height:100%;width:100%;display:grid;place-items:center}.sphere-host canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none}.fallback-orb{width:65%;max-width:300px;aspect-ratio:1;border-radius:50%;background:conic-gradient(from 30deg,#35e6ff,#ff63b6,#a78bfa,#d7e0ee,#35e6ff);box-shadow:inset -35px -40px 60px #000b,inset 18px 20px 40px #fff4,0 0 70px #a78bfa15}.orb-caption{position:absolute;bottom:22px;font-size:8px;letter-spacing:.22em;color:var(--muted);pointer-events:none}.fallback-note{position:absolute;bottom:40px;font-size:10px;color:var(--muted);text-align:center}`],
})
export class AlgorithmSphere implements OnDestroy {
  readonly active = input<Algorithm>('linear');
  readonly hoveredChange = output<Algorithm | null>();
  readonly attention = input(false);
  private journey?: {algorithm:Algorithm;from:THREE.Quaternion;to:THREE.Quaternion;local:THREE.Vector3;camera:THREE.Vector3;focus:THREE.Vector3;normal:THREE.Vector3;alignment:number;zoom:number};
  readonly departing = input(false);
  readonly lowEffects = input(false);
  readonly ready = signal(false);
  readonly failed = signal(false);
  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private readonly zone = inject(NgZone);
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
  private readonly meshes: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhysicalMaterial>[] = [];
  readonly hovered = signal<Algorithm | null>(null);
  private readonly globe = new THREE.Group();
  private drag?: { id: number; x: number; y: number; startX: number; startY: number; moved: boolean };
  private readonly ornaments = new THREE.Group();
  private scrollProgress = .5;
  private pointerOffset = { x: 0, y: 0 };
  private ornamentSpin: [number, number] = [1, 0];
  private readonly raycaster = new THREE.Raycaster();
  private renderer?: THREE.WebGLRenderer;
  private environment?: THREE.WebGLRenderTarget;
  private resize?: ResizeObserver;
  private intersection?: IntersectionObserver;
  private frame = 0;
  private visible = false;
  private destroyed = false;
  private previous = 0;
  private readonly budget = new FrameBudget();
  private paintFrame = 0;
  private accumulated = 0;
  private slowFrames = 0;
  private orbit: [number, number] = [0.5, 5.9];
  private readonly rotation = unitRotation(0.002);
  private reducedMotion?: MediaQueryList;

  constructor() {
    effect(() => {
      const active = this.active(), attention=this.attention();
      this.departing();
      this.meshes.forEach(mesh => mesh.material.emissiveIntensity = mesh.userData['algorithm'] === active ? (attention ? .45 : .2) : .035);
      if(this.renderer)this.renderer.domElement.dataset['previewAlgorithm']=attention?active:'';
      this.draw();
    });
    effect(() => {
      const low = this.lowEffects();
      if (this.renderer) {
        this.renderer.setPixelRatio(low ? 1 : Math.min(window.devicePixelRatio, 1.75));
        this.resizeScene(); this.updateLoop();
      }
    });
    afterNextRender(() => {
      // jsdom/SSR use the CSS fallback; WebGL is initialized only when visible.
      if (typeof IntersectionObserver === 'undefined' || typeof ResizeObserver === 'undefined') return;
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion.addEventListener('change', this.motionChanged);
      document.addEventListener('visibilitychange', this.updateLoop);
      document.addEventListener('hoiquy:scene-progress', this.onSceneScroll);
      this.intersection = new IntersectionObserver(entries => {
        this.visible = entries.some(entry => entry.isIntersecting);
        if (this.visible && !this.renderer && !this.failed()) this.init();
        this.updateLoop();
      });
      this.intersection.observe(this.host().nativeElement);
    });
  }

  private init() {
    const host = this.host().nativeElement;
    this.zone.runOutsideAngular(() => {
      try {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        this.renderer.setPixelRatio(this.lowEffects() ? 1 : Math.min(window.devicePixelRatio, 1.75));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.25;
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        const room = new RoomEnvironment();
        this.environment = pmrem.fromScene(room, 0.05);
        this.scene.environment = this.environment.texture;
        room.dispose(); pmrem.dispose();
        const hemisphere = new THREE.HemisphereLight(0xd7efff, 0x211132, 2.2);
        const key = new THREE.DirectionalLight(0xffffff, 4); key.position.set(-3, 4, 5);
        const rim = new THREE.DirectionalLight(0xb0b4ff, 2); rim.position.set(4, 0, -3);
        this.scene.add(hemisphere, key, rim);
        const group = this.globe; group.rotation.x = Math.PI / 2;
        const palette = getComputedStyle(document.documentElement);
        SECTORS.forEach((sector, index) => {
          const color = new THREE.Color(palette.getPropertyValue(`--color-${sector}`).trim());
          const geometry = new THREE.SphereGeometry(1.58, 36, 48, index * Math.PI / 2, Math.PI / 2);
          const material = new THREE.MeshPhysicalMaterial({ color, metalness: 0.65, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.12, emissive: color, emissiveIntensity: sector === this.active() ? 0.2 : 0.035 });
          const mesh = new THREE.Mesh(geometry, material); mesh.userData['algorithm'] = sector;
          this.meshes.push(mesh); group.add(mesh);
        });
        this.scene.add(group);
        const ringStep = unitRotation(Math.PI * 2 / 160);
        ['linear', 'polynomial'].forEach((name, index) => {
          let pair: [number, number] = [1.9 + index * .14, 0];
          const vertices: THREE.Vector3[] = [];
          for (let i=0; i<160; i++) { vertices.push(new THREE.Vector3(pair[0], pair[1], 0)); pair = rotatePair(...pair, ringStep); }
          const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(vertices), new THREE.LineBasicMaterial({ color: palette.getPropertyValue(`--color-${name}`).trim(), transparent: true, opacity: .26, depthWrite: false }));
          ring.rotation.set(.5 + index*.6, .45, index*.7); this.ornaments.add(ring);
        });
        this.scene.add(this.ornaments);
        host.appendChild(this.renderer.domElement);
        this.renderer.domElement.addEventListener('pointerdown', this.pointerDown);
        this.renderer.domElement.addEventListener('pointerup', this.pointerUp);
        this.renderer.domElement.addEventListener('pointercancel', this.pointerCancel);
        this.renderer.domElement.addEventListener('pointerleave', this.pointerLeave);
        this.renderer.domElement.addEventListener('pointermove', this.hover);
        this.renderer.domElement.addEventListener('webglcontextlost', this.contextLost);
        this.resize = new ResizeObserver(() => this.resizeScene()); this.resize.observe(host);
        this.resizeScene();
        this.zone.run(() => this.ready.set(true));
      } catch {
        this.renderer?.dispose(); this.renderer?.domElement.remove(); this.renderer = undefined;
        this.zone.run(() => { this.ready.set(false); this.failed.set(true); });
      }
    });
  }

  beginJourney(algorithm:Algorithm,returning=false):boolean {
    if(!this.renderer || !this.ready() || this.failed())return false;
    if(returning && this.journey?.algorithm===algorithm){this.journey.alignment=1;this.journey.zoom=1;this.draw();return true;}
    this.restoreJourney();this.scene.updateMatrixWorld(true);this.camera.updateMatrixWorld(true);
    const from=this.globe.quaternion.clone(),local=sectorCenter(algorithm);
    const center=this.globe.getWorldPosition(new THREE.Vector3());
    const facing=this.camera.position.clone().sub(center).normalize();
    const world=local.clone().normalize().applyQuaternion(from);
    const delta=new THREE.Quaternion().setFromUnitVectors(world,facing);
    const to=delta.multiply(from).normalize();
    const focus=local.clone().applyQuaternion(to).add(center);
    this.journey={algorithm,from,to,local,camera:this.camera.position.clone(),focus,normal:facing,alignment:returning?1:0,zoom:returning?1:0};
    this.drag=undefined;this.renderer.domElement.dataset['flightAlgorithm']=algorithm;this.draw();return true;
  }
  setJourney(alignment:number,zoom:number){if(this.journey){this.journey.alignment=alignment;this.journey.zoom=zoom;this.draw();}}
  journeyAnchor():{x:number;y:number}|null {
    if(!this.journey||!this.renderer)return null;
    this.scene.updateMatrixWorld(true);this.camera.updateMatrixWorld(true);
    const point=this.globe.localToWorld(this.journey.local.clone()).project(this.camera);
    const rect=this.renderer.domElement.getBoundingClientRect();
    const x=rect.left+(point.x+1)*rect.width/2,y=rect.top+(1-point.y)*rect.height/2;
    this.raycaster.setFromCamera(new THREE.Vector2(point.x,point.y),this.camera);
    this.renderer.domElement.dataset['anchorAlgorithm']=this.raycaster.intersectObjects(this.meshes)[0]?.object.userData['algorithm']??'';
    this.renderer.domElement.dataset['anchorX']=String(x);this.renderer.domElement.dataset['anchorY']=String(y);
    return {x,y};
  }
  restoreJourney(){
    if(!this.journey)return;
    this.globe.quaternion.copy(this.journey.from);this.camera.position.copy(this.journey.camera);this.camera.zoom=1;this.camera.updateProjectionMatrix();this.journey=undefined;this.draw();
  }

  private resizeScene() {
    if (!this.renderer) return;
    const { clientWidth: width, clientHeight: height } = this.host().nativeElement;
    this.renderer.setSize(Math.max(1, width), Math.max(1, height));
    this.camera.aspect = Math.max(1, width) / Math.max(1, height); this.camera.updateProjectionMatrix(); this.draw();
  }

  private draw() {
    if (!this.renderer || this.destroyed || !this.visible || document.hidden) return;
    const started = performance.now(); const delta = this.budget.take(started);
    if (delta === null) {
      if (!this.frame && !this.paintFrame) this.paintFrame = requestAnimationFrame(() => { this.paintFrame = 0; this.draw(); });
      return;
    }
    this.ornamentSpin = rotatePair(...this.ornamentSpin, unitRotation(.002 * delta / (1000 / 60)));
    const targetZoom = 1;
    if (!this.journey && Math.abs(targetZoom - this.camera.zoom) > .0001) { this.camera.zoom += (targetZoom - this.camera.zoom) * 0.15; this.camera.updateProjectionMatrix(); }
    if(!this.journey)this.scene.position.y = (this.scrollProgress - .5) * .45;
    this.ornaments.quaternion.set(0, this.ornamentSpin[1], 0, this.ornamentSpin[0]).normalize();
    if(this.journey){
      const j=this.journey;
      this.globe.quaternion.slerpQuaternions(j.from,j.to,j.alignment);
      this.camera.zoom=1;this.camera.updateProjectionMatrix();
      this.camera.position.copy(j.camera).lerp(j.focus.clone().addScaledVector(j.normal,.35),j.zoom);
      this.camera.lookAt(j.focus.clone().multiplyScalar(j.zoom));
    }else{this.camera.position.set(this.orbit[0] + this.pointerOffset.x, 0.5 + this.pointerOffset.y, this.orbit[1]); this.camera.lookAt(0,0,0);}
    this.renderer.render(this.scene, this.camera); recordRender(this.renderer.domElement, started);
  }

  private motionChanged = () => { this.updateLoop(); this.draw(); };
  private updateLoop = () => {
    cancelAnimationFrame(this.frame); this.frame = 0; this.previous = 0; this.budget.reset();
    if (!this.renderer || this.failed() || !this.visible || document.hidden || this.destroyed || this.reducedMotion?.matches || this.lowEffects()) return;
    this.zone.runOutsideAngular(() => { this.frame = requestAnimationFrame(this.animate); });
  };
  private animate = (now: number) => {
    if (this.destroyed || !this.visible || document.hidden) return;
    const delta = this.previous ? Math.min(now - this.previous, 80) : 16.7; this.previous = now;
    this.accumulated += delta;

    if (delta > 25) this.slowFrames++; else this.slowFrames = Math.max(0, this.slowFrames - 1);
    if (this.slowFrames > 90 && this.renderer && this.renderer.getPixelRatio() > 1) { this.renderer.setPixelRatio(1); this.resizeScene(); this.slowFrames = 0; }
    this.draw(); this.frame = requestAnimationFrame(this.animate);
  };
  private hit(event: MouseEvent) {
    if (!this.renderer) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), this.camera);
    return this.raycaster.intersectObjects(this.meshes)[0]?.object.userData['algorithm'] as Algorithm | undefined;
  }
  private pointerDown = (event: PointerEvent) => {
    if (this.journey || event.button !== 0 || !this.hit(event) || !this.renderer) return;
    this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
    this.renderer.domElement.setPointerCapture(event.pointerId);
  };
  private pointerUp = (event: PointerEvent) => {
    const drag = this.drag; if (!drag || drag.id !== event.pointerId) return;
    this.drag = undefined;
    if (this.renderer?.domElement.hasPointerCapture(event.pointerId)) this.renderer.domElement.releasePointerCapture(event.pointerId);
    this.hover(event);
  };
  private pointerCancel = () => { this.drag = undefined; this.pointerLeave(); };
  private pointerLeave = () => {
    if (this.drag) return;
    this.zone.run(() => {this.hovered.set(null);this.hoveredChange.emit(null);}); this.applyGlow();
  };
  private applyGlow() {
    const hovered = this.hovered();
    this.meshes.forEach(mesh => { const id = mesh.userData['algorithm']; mesh.material.emissiveIntensity = id === hovered ? .6 : id === this.active() ? .2 : .035; });
    const canvas = this.renderer?.domElement;
    if (canvas) { canvas.dataset['hoveredAlgorithm'] = hovered ?? ''; canvas.dataset['dragging'] = String(Boolean(this.drag?.moved)); }
    this.draw();
  }
  private hover = (event: PointerEvent) => {
    if (!this.renderer || this.journey) return;
    const drag = this.drag;
    if (drag && drag.id === event.pointerId) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 6) drag.moved = true;
      if (drag.moved) {
        const { real: cy, imaginary: sy } = unitRotation((event.clientX - drag.x) * .004);
        const { real: cx, imaginary: sx } = unitRotation((event.clientY - drag.y) * .004);
        this.globe.quaternion.premultiply(new THREE.Quaternion(0, sy, 0, cy)).premultiply(new THREE.Quaternion(sx, 0, 0, cx)).normalize();
        this.renderer.domElement.dataset['rotation'] = this.globe.quaternion.toArray().join(',');
      }
      drag.x = event.clientX; drag.y = event.clientY;
    }
    const algorithm = drag?.moved ? undefined : this.hit(event);
    this.renderer.domElement.style.cursor = drag?.moved ? 'grabbing' : algorithm ? 'grab' : 'default';
    if (this.hovered() !== (algorithm ?? null)) this.zone.run(() => {this.hovered.set(algorithm ?? null);this.hoveredChange.emit(algorithm ?? null);});
    this.applyGlow();
  };
  private onSceneScroll = (event: Event) => {
    if (this.lowEffects() || this.reducedMotion?.matches) return;
    const progress = (event as CustomEvent<unknown>).detail;
    if (typeof progress === 'number' && Number.isFinite(progress)) this.scrollProgress = Math.max(0, Math.min(1, progress));
  };
  private contextLost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(this.frame); if (this.renderer) this.renderer.domElement.style.display = 'none'; this.zone.run(() => { this.ready.set(false); this.failed.set(true); }); };

  ngOnDestroy() {
    this.destroyed = true;
    if (typeof window === 'undefined') return;
    cancelAnimationFrame(this.frame); cancelAnimationFrame(this.paintFrame); this.intersection?.disconnect(); this.resize?.disconnect();
    document.removeEventListener('visibilitychange', this.updateLoop);
    document.removeEventListener('hoiquy:scene-progress', this.onSceneScroll);
    this.ornaments.traverse(object => { if (object instanceof THREE.Line) { object.geometry.dispose(); (object.material as THREE.Material).dispose(); } }); this.reducedMotion?.removeEventListener('change', this.motionChanged);
    this.renderer?.domElement.removeEventListener('pointerdown', this.pointerDown); this.renderer?.domElement.removeEventListener('pointerup', this.pointerUp); this.renderer?.domElement.removeEventListener('pointercancel', this.pointerCancel); this.renderer?.domElement.removeEventListener('pointerleave', this.pointerLeave); this.renderer?.domElement.removeEventListener('pointermove', this.hover); this.renderer?.domElement.removeEventListener('webglcontextlost', this.contextLost);
    this.meshes.forEach(mesh => { mesh.geometry.dispose(); mesh.material.dispose(); });
    this.environment?.dispose(); this.renderer?.dispose(); this.renderer?.domElement.remove();
  }
}

/** Midpoint of a quarter sphere, generated via the project's unit-complex rotation. */
export function sectorCenter(algorithm:Algorithm):THREE.Vector3 {
  const turn=unitRotation((SECTORS.indexOf(algorithm)+.5)*Math.PI/2);
  return new THREE.Vector3(-turn.real,0,turn.imaginary).multiplyScalar(1.58);
}
