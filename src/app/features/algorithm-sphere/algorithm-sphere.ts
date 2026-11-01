import { CONTINENTS, PLANET_RADIUS, PLANET_SEED, continentCenter, continentGeometry } from './planet-geometry';
import { FrameBudget, recordRender } from '../../presentation/frame-budget';
import { Component, ElementRef, NgZone, OnDestroy, afterNextRender, effect, inject, input, output, signal, viewChild } from '@angular/core';
import * as THREE from 'three';
import { Algorithm } from '../../core/models/experiment';
import { rotatePair, unitRotation } from '../../core/engine/complex-rotation';

const SECTORS=CONTINENTS;

@Component({
  selector: 'app-algorithm-sphere',
  template: `<div class="sphere-host" #host role="img" [attr.aria-label]="intro() ? 'Hành tinh thuật toán. Kéo để xoay và khám phá. Đăng nhập hoặc tiếp tục với tư cách khách để chọn thuật toán.' : 'Hành tinh đại dương xanh đen và bốn lục địa: Linear gold, Polynomial beige, Ridge xanh biển, Lasso bạc. Kéo để xoay, rê để phát sáng. Chọn thuật toán bằng các thẻ bên dưới. Các nút bên dưới hỗ trợ bàn phím.'">
    @if (!ready()) { <div class="fallback-orb" aria-hidden="true"><svg viewBox="0 0 200 200"><g fill="none" stroke="#75b4db" stroke-opacity=".3" stroke-width=".6"><ellipse cx="100" cy="100" rx="40" ry="91"/><ellipse cx="100" cy="100" rx="88" ry="28"/><path d="M10 100H190M100 8V192"/></g><path fill="var(--color-linear)" fill-opacity=".45" stroke="var(--color-linear)" d="M30 58L42 33 57 28 68 35 78 31 88 46 79 54 85 64 69 71 67 91 57 111 46 97 45 84 34 88 24 71Z"/><path fill="var(--color-polynomial)" fill-opacity=".45" stroke="var(--color-polynomial)" d="M113 34L130 22 148 28 159 22 176 39 181 58 168 64 174 80 160 94 151 87 144 108 133 99 130 79 114 89 103 74 112 59 100 50Z"/></svg></div> }
    @if (failed()) { <p class="fallback-note">{{ intro() ? 'Đăng nhập hoặc chọn Guest để tiếp tục.' : 'Chọn một thuật toán bên dưới để tiếp tục.' }}</p> }
    <span class="orb-caption" aria-hidden="true">{{ intro() ? 'Kéo xoay để khám phá hành tinh' : hovered() ? hovered() + ' · Chọn thẻ bên dưới' : 'Kéo xoay · Rê để phát sáng · Chọn bằng thẻ' }}</span>
    </div>`,
  styles: [`:host{display:block;height:100%}.sphere-host{position:relative;height:100%;width:100%;display:grid;place-items:center}.sphere-host canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none}.fallback-orb{width:65%;max-width:300px;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 35% 25%,#0b2337,#020b15 65%,#010711);box-shadow:inset -35px -40px 60px #000b,inset 18px 20px 40px #fff4,0 0 70px color-mix(in srgb,var(--algorithm-accent) 12%,transparent)}.fallback-orb svg{width:100%;height:100%;filter:drop-shadow(0 0 3px #d7e0ee33)}.orb-caption{position:absolute;bottom:22px;font-size:8px;letter-spacing:.22em;color:var(--muted);pointer-events:none}.fallback-note{position:absolute;bottom:40px;font-size:10px;color:var(--muted);text-align:center}`],
})
export class AlgorithmSphere implements OnDestroy {
  readonly intro = input(false);
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
  private readonly camera = new THREE.PerspectiveCamera(36, 1, 0.015, 40);
  private readonly meshes: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>[] = [];
  private ocean?:THREE.Mesh<THREE.SphereGeometry,THREE.MeshPhysicalMaterial>;
  private cinema?:{element:HTMLDivElement;rect:DOMRect;progress:number};
  private pulse:[number,number]=[1,0];
  private locked?:Algorithm;
  private landmarkFrame=0;
  readonly hovered = signal<Algorithm | null>(null);
  private readonly globe = new THREE.Group();
  private drag?: { id: number; x: number; y: number; startX: number; startY: number; moved: boolean };
  private readonly ornaments = new THREE.Group();
  private scrollProgress = .5;
  private pointerOffset = { x: 0, y: 0 };
  private ornamentSpin: [number, number] = [1, 0];
  private readonly raycaster = new THREE.Raycaster();
  private renderer?: THREE.WebGLRenderer;
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
      this.updateGlow();
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
      this.host().nativeElement.parentElement?.addEventListener('hoiquy:planet-docked',this.docked);
      document.addEventListener('visibilitychange', this.updateLoop);window.addEventListener('resize',this.cinemaResize);
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
        this.renderer.toneMappingExposure = 1.05;
        const hemisphere = new THREE.HemisphereLight(0xaacfe2, 0x030813, 1.25);
        const key = new THREE.DirectionalLight(0xcde6ff, 1.7); key.position.set(-3, 4, 5);
        const rim = new THREE.DirectionalLight(0x54a4da, 1.6); rim.position.set(4, 0, -3);
        this.scene.add(hemisphere, key, rim);
        const group=this.globe;
        const palette=getComputedStyle(document.documentElement);
        this.ocean=new THREE.Mesh(new THREE.SphereGeometry(PLANET_RADIUS,64,48),new THREE.MeshPhysicalMaterial({color:0x021222,emissive:0x03192b,emissiveIntensity:.32,metalness:.08,roughness:.94,clearcoat:0}));
        group.add(this.ocean);
        let islandCount=0;
        SECTORS.forEach(sector=>{
          const color=new THREE.Color(palette.getPropertyValue(`--color-${sector}`).trim());
          const geometry=continentGeometry(sector);islandCount+=geometry.islandCount;
          const material=new THREE.MeshPhysicalMaterial({color,vertexColors:true,roughness:.93,metalness:0,clearcoat:0,emissive:color,emissiveIntensity:.24});
          const mesh=new THREE.Mesh(geometry.land,material);mesh.userData['algorithm']=sector;this.meshes.push(mesh);group.add(mesh);
          const coast=new THREE.LineSegments(geometry.coast,new THREE.LineBasicMaterial({color,transparent:true,opacity:.95,toneMapped:false}));group.add(coast);
          const relief=new THREE.Mesh(geometry.land,new THREE.MeshBasicMaterial({color,wireframe:true,transparent:true,opacity:.1,depthWrite:false}));group.add(relief);
        });
        this.scene.add(group);
        const silver=new THREE.Color(0x75b4db),ringStep=unitRotation(Math.PI*2/180);
        // Latitude/longitude lines follow the globe; orbits remain light and sparse.
        const grid:number[]=[];
        const surface=(lon:number,lat:number)=>{const a=unitRotation(lon),b=unitRotation(lat);return new THREE.Vector3(a.imaginary*b.real,b.imaginary,a.real*b.real).multiplyScalar(PLANET_RADIUS+.004);};
        for(let lat=-60;lat<=60;lat+=30)for(let j=0;j<120;j++){const a=surface(j/120*Math.PI*2,lat*Math.PI/180),b=surface((j+1)/120*Math.PI*2,lat*Math.PI/180);grid.push(...a.toArray(),...b.toArray());}
        for(let lon=0;lon<360;lon+=30)for(let j=0;j<60;j++){const a=surface(lon*Math.PI/180,-Math.PI/2+j/60*Math.PI),b=surface(lon*Math.PI/180,-Math.PI/2+(j+1)/60*Math.PI);grid.push(...a.toArray(),...b.toArray());}
        const gridGeometry=new THREE.BufferGeometry();gridGeometry.setAttribute('position',new THREE.Float32BufferAttribute(grid,3));group.add(new THREE.LineSegments(gridGeometry,new THREE.LineBasicMaterial({color:0x46758b,transparent:true,opacity:.19,depthWrite:false})));
        for(let index=0;index<3;index++){
          let pair:[number,number]=[1.96+index*.14,0];const vertices:THREE.Vector3[]=[];
          for(let i=0;i<180;i++){vertices.push(new THREE.Vector3(pair[0],pair[1],0));pair=rotatePair(...pair,ringStep);}
          const ring=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(vertices),new THREE.LineBasicMaterial({color:silver,transparent:true,opacity:.35-index*.06,depthWrite:false}));
          ring.rotation.set(1.05+index*.22,.22+index*.4,index*.28);this.ornaments.add(ring);
        }
        const nodes=new THREE.InstancedMesh(new THREE.SphereGeometry(.018,8,6),new THREE.MeshBasicMaterial({color:0xa2e2ff,toneMapped:false}),6),matrix=new THREE.Matrix4(),links:number[]=[];
        for(let i=0;i<6;i++){
          const anchor=continentCenter(SECTORS[i%4]).normalize(),turn=unitRotation(i*.9);const point=anchor.clone().multiplyScalar(2.02+i*.025).add(new THREE.Vector3(turn.real*.1,.1,turn.imaginary*.1));
          matrix.makeTranslation(point.x,point.y,point.z);nodes.setMatrixAt(i,matrix);links.push(...anchor.multiplyScalar(1.7).toArray(),...point.toArray());
        }
        group.add(nodes);const linkGeometry=new THREE.BufferGeometry();linkGeometry.setAttribute('position',new THREE.Float32BufferAttribute(links,3));group.add(new THREE.LineSegments(linkGeometry,new THREE.LineBasicMaterial({color:silver,transparent:true,opacity:.23,depthWrite:false})));
        const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.72,48,32),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,vertexShader:`varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=-p.xyz;gl_Position=projectionMatrix*p;}`,fragmentShader:`varying vec3 n;varying vec3 v;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(v))),2.8);gl_FragColor=vec4(.12,.49,.72,rim*.22);}`}));group.add(atmosphere);
        this.scene.add(this.ornaments);
        host.appendChild(this.renderer.domElement);this.renderer.domElement.dataset['planet']='continents';this.renderer.domElement.dataset['continentCount']='4';this.renderer.domElement.dataset['islandCount']=String(islandCount);this.renderer.domElement.dataset['atlasSeed']=String(PLANET_SEED);
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
    this.locked=algorithm;
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
    this.renderer.domElement.dataset['anchorAlgorithm']=this.raycaster.intersectObjects([...this.meshes,...(this.ocean?[this.ocean]:[])])[0]?.object.userData['algorithm']??'';
    this.renderer.domElement.dataset['anchorX']=String(x);this.renderer.domElement.dataset['anchorY']=String(y);
    return {x,y};
  }
  restoreJourney(){
    if(!this.journey)return;
    this.globe.quaternion.copy(this.journey.from);this.camera.position.copy(this.journey.camera);this.camera.zoom=1;this.camera.updateProjectionMatrix();this.journey=undefined;this.draw();
  }

  private readonly docked=()=>{this.resizeScene();this.updateLoop();};
  dockAt(slot:HTMLElement){
    const element=this.host().nativeElement.parentElement;
    if(!element||element.closest('.planet-transfer-stage')||element.parentElement===slot)return;
    slot.appendChild(element);this.resizeScene();this.updateLoop();
  }
  beginCinema(returning=false){
    if(!this.renderer||!this.journey)return false;
    if(this.cinema){this.cinema.element.style.opacity='1';return true;}
    const canvas=this.renderer.domElement,rect=canvas.getBoundingClientRect();
    const element=document.createElement('div');element.className='planet-cinema';element.setAttribute('aria-hidden','true');element.dataset['algorithm']=this.journey.algorithm;
    element.addEventListener('hoiquy:close-cinema',()=>this.endCinema(),{once:true});
    this.cinema={element,rect,progress:returning?1:0};document.body.appendChild(element);element.appendChild(canvas);this.resizeScene();this.draw();return true;
  }
  refreshCinemaFrame(){if(this.cinema){this.cinema.rect=this.host().nativeElement.getBoundingClientRect();this.resizeScene();}}
  setCinema(progress:number){if(this.cinema){this.cinema.progress=progress;this.draw();}}
  endCinema(){
    if(!this.cinema)return;
    const element=this.cinema.element;this.cinema=undefined;
    if(this.renderer){this.host().nativeElement.appendChild(this.renderer.domElement);this.camera.clearViewOffset();this.camera.zoom=1;}
    element.remove();this.resizeScene();
  }
  private resizeScene() {
    if (!this.renderer) return;
    const width=this.cinema?innerWidth:this.host().nativeElement.clientWidth,height=this.cinema?innerHeight:this.host().nativeElement.clientHeight;
    if(this.cinema){this.cinema.element.style.width=width+'px';this.cinema.element.style.height=height+'px';}
    // A fullscreen transition should not allocate a 4K framebuffer on high-DPI screens.
    const resolution=this.cinema?Math.min(1,1600/Math.max(width,1),1000/Math.max(height,1)):1;
    this.renderer.setPixelRatio(this.cinema||this.lowEffects()?1:Math.min(window.devicePixelRatio,1.75));
    this.renderer.setSize(Math.max(1,Math.round(width*resolution)),Math.max(1,Math.round(height*resolution)));
    this.camera.aspect = Math.max(1, width) / Math.max(1, height); this.camera.updateProjectionMatrix(); this.draw();
  }

  private draw() {
    if (!this.renderer || this.destroyed || (!this.visible&&!this.cinema) || document.hidden) return;
    const started = performance.now(); const delta = this.budget.take(started);
    if (delta === null) {
      if (!this.frame && !this.paintFrame) this.paintFrame = requestAnimationFrame(() => { this.paintFrame = 0; this.draw(); });
      return;
    }
    if(!this.reducedMotion?.matches&&!this.lowEffects())this.pulse=rotatePair(...this.pulse,unitRotation(delta*Math.PI*2/1000));
    this.updateGlow();
    this.ornamentSpin = rotatePair(...this.ornamentSpin, unitRotation(.002 * delta / (1000 / 60)));
    const targetZoom = 1;
    if (!this.journey && Math.abs(targetZoom - this.camera.zoom) > .0001) { this.camera.zoom += (targetZoom - this.camera.zoom) * 0.15; this.camera.updateProjectionMatrix(); }
    if(!this.journey)this.scene.position.y = (this.scrollProgress - .5) * .45;
    this.ornaments.quaternion.set(0, this.ornamentSpin[1], 0, this.ornamentSpin[0]).normalize();
    if(this.journey){
      const j=this.journey;
      this.globe.quaternion.slerpQuaternions(j.from,j.to,j.alignment);
      this.camera.zoom=1;this.camera.updateProjectionMatrix();
      this.camera.position.copy(j.camera).lerp(j.focus.clone().addScaledVector(j.normal,.10),j.zoom);
      this.camera.lookAt(j.focus.clone().multiplyScalar(j.zoom));
    }else{this.camera.position.set(this.orbit[0] + this.pointerOffset.x, 0.5 + this.pointerOffset.y, this.orbit[1]); this.camera.lookAt(0,0,0);}
    if(this.cinema){
      const {rect,progress,element}=this.cinema,w=innerWidth,h=innerHeight;
      this.camera.zoom=(rect.height/Math.max(h,1))*(1-progress)+progress;
      this.camera.setViewOffset(w,h,(w/2-rect.left-rect.width/2)*(1-progress),(h/2-rect.top-rect.height/2)*(1-progress),w,h);
      element.style.backgroundColor=`rgba(2,4,11,${progress})`;
      this.renderer.domElement.dataset['cinemaProgress']=progress.toFixed(3);
    }
    const arrival=this.journey?Math.max(0,(this.journey.zoom-.78)/.22):0;
    this.renderer.toneMappingExposure=1.05+arrival*.65;
    if(this.cinema)this.cinema.element.style.setProperty('--arrival-glow',String(arrival*.2));
    this.camera.updateProjectionMatrix();
    this.renderer.domElement.dataset['pulsePhase']=this.pulse[0].toFixed(3);
    this.renderer.domElement.dataset['lockedContinent']=this.locked??'';
    this.renderer.domElement.dataset['continentGlow']=JSON.stringify(this.meshes.map(mesh=>({id:mesh.userData['algorithm'],intensity:mesh.material.emissiveIntensity})));
    this.renderer.domElement.dataset['cameraDistance']=this.journey?this.camera.position.distanceTo(this.journey.focus).toFixed(3):this.camera.position.length().toFixed(3);
    if(this.landmarkFrame++%10===0){
      this.scene.updateMatrixWorld(true);this.camera.updateMatrixWorld(true);this.renderer.domElement.dataset['landmarks']=JSON.stringify(SECTORS.map(id=>{const p=this.globe.localToWorld(continentCenter(id)).project(this.camera);return {id,u:(p.x+1)/2,v:(1-p.y)/2,front:this.globe.localToWorld(continentCenter(id)).sub(this.camera.position).dot(this.globe.localToWorld(continentCenter(id)).normalize())<0};}));
    }
    this.renderer.render(this.scene, this.camera); recordRender(this.renderer.domElement, started);
  }

  private readonly cinemaResize=()=>{if(this.cinema)this.resizeScene();};
  private motionChanged = () => { this.updateLoop(); this.draw(); };
  private updateLoop = () => {
    cancelAnimationFrame(this.frame); this.frame = 0; this.previous = 0; this.budget.reset();
    if (!this.renderer || this.failed() || (!this.visible&&!this.cinema) || document.hidden || this.destroyed || this.reducedMotion?.matches || this.lowEffects()) return;
    this.zone.runOutsideAngular(() => { this.frame = requestAnimationFrame(this.animate); });
  };
  private animate = (now: number) => {
    if (this.destroyed || (!this.visible&&!this.cinema) || document.hidden) return;
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
    return this.raycaster.intersectObjects([...this.meshes,...(this.ocean?[this.ocean]:[])])[0]?.object.userData['algorithm'] as Algorithm | undefined;
  }
  private pointerDown = (event: PointerEvent) => {
    if (this.journey || event.button !== 0 || !this.renderer) return;
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
  private updateGlow(){
    const selected=this.journey?.algorithm??this.locked;
    this.meshes.forEach(mesh=>{const id=mesh.userData['algorithm'];mesh.material.emissiveIntensity=id===selected? .55 : (id===this.hovered()||(this.attention()&&id===this.active()))? .6:(this.reducedMotion?.matches||this.lowEffects()? .24:.22+.12*this.pulse[0]);});
  }
  private applyGlow() {
    const hovered = this.hovered();
    this.updateGlow();
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
    this.endCinema();this.destroyed = true;
    if (typeof window === 'undefined') return;
    cancelAnimationFrame(this.frame); cancelAnimationFrame(this.paintFrame); this.intersection?.disconnect(); this.resize?.disconnect();
    this.host().nativeElement.parentElement?.removeEventListener('hoiquy:planet-docked',this.docked);
    document.removeEventListener('visibilitychange', this.updateLoop);window.removeEventListener('resize',this.cinemaResize);
    document.removeEventListener('hoiquy:scene-progress', this.onSceneScroll);
    this.reducedMotion?.removeEventListener('change', this.motionChanged);
    this.renderer?.domElement.removeEventListener('pointerdown', this.pointerDown); this.renderer?.domElement.removeEventListener('pointerup', this.pointerUp); this.renderer?.domElement.removeEventListener('pointercancel', this.pointerCancel); this.renderer?.domElement.removeEventListener('pointerleave', this.pointerLeave); this.renderer?.domElement.removeEventListener('pointermove', this.hover); this.renderer?.domElement.removeEventListener('webglcontextlost', this.contextLost);
    const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
    new THREE.Group().add(this.globe,this.ornaments).traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Line){if(object instanceof THREE.InstancedMesh)object.dispose();geometries.add(object.geometry);const material=object.material;if(Array.isArray(material))material.forEach(m=>materials.add(m));else materials.add(material);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
    this.renderer?.dispose(); this.renderer?.domElement.remove();
  }
}

/** Stable landing point on the selected continent, shared with terrain geometry. */
export function sectorCenter(algorithm:Algorithm):THREE.Vector3{return continentCenter(algorithm);}
