import {
  Component, ElementRef, NgZone, OnDestroy,
  afterNextRender, effect, inject, signal, viewChild,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LabStore } from '../../state/lab-store';

@Component({
  selector: 'app-viewport3d',
  templateUrl: './viewport3d.html',
  styleUrl: './viewport3d.css',
})
export class Viewport3d implements OnDestroy {
  private host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private zone = inject(NgZone);
  store = inject(LabStore);

  private ready = signal(false);
  private renderer?: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private plane?: THREE.Mesh;
  private pointMeshes: THREE.InstancedMesh[] = [];
  private observer?: ResizeObserver;
  private raf = 0;

  constructor() {
    // Chỉ chạy trên trình duyệt (an toàn với SSR)
    afterNextRender(() => this.init());

    // Khi dữ liệu đổi → dựng lại các điểm
    effect(() => {
      const ready = this.ready();
      const trX = this.store.trainX(); const trY = this.store.trainY();
      const teX = this.store.testX(); const teY = this.store.testY();
      const scale = this.store.dataScale();
      if (!ready) return;
      this.rebuildPoints(trX, trY, teX, teY, scale);
    });

    // Mỗi bước huấn luyện → cập nhật mặt phẳng
    effect(() => {
      const ready = this.ready();
      const s = this.store.latest();
      const scale = this.store.dataScale();
      if (!ready) return;
      this.updatePlane(s?.w ?? [0, 0], s?.b ?? 0, scale);
    });
  }

  private init() {
    const el = this.host().nativeElement;
    this.zone.runOutsideAngular(() => {
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(el.clientWidth, el.clientHeight);
      el.appendChild(this.renderer.domElement);

      this.scene.background = new THREE.Color(0xffffff);
      this.camera = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.1, 200);
      this.camera.position.set(8, 6, 8);
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);

      this.scene.add(new THREE.GridHelper(10, 10, 0x999999, 0xdddddd), new THREE.AxesHelper(5));

      const geo = new THREE.PlaneGeometry(10, 10, 10, 10);
      geo.rotateX(-Math.PI / 2); // trục Y của Three.js là chiều "lên"
      this.plane = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ color: 0x0877bd, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
      );
      this.scene.add(this.plane);

      this.observer = new ResizeObserver(() => {
        if (!this.renderer || !this.camera) return;
        this.renderer.setSize(el.clientWidth, el.clientHeight);
        this.camera.aspect = el.clientWidth / el.clientHeight;
        this.camera.updateProjectionMatrix();
      });
      this.observer.observe(el);

      const loop = () => {
        this.raf = requestAnimationFrame(loop);
        this.controls!.update();
        this.renderer!.render(this.scene, this.camera!);
      };
      loop();
    });
    this.ready.set(true); // kích hoạt 2 effect ở trên
  }

  // x1 → trục X, x2 → trục Z, y → trục Y
  private makePoints(X: number[][], y: number[], color: number, scale: number) {
    const mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshBasicMaterial({ color }),
      X.length,
    );
    const m = new THREE.Matrix4();
    X.forEach((row, i) => {
      m.setPosition(row[0] * scale, y[i] * scale, (row[1] ?? 0) * scale);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }

  private rebuildPoints(trX: number[][], trY: number[], teX: number[][], teY: number[], scale: number) {
    for (const m of this.pointMeshes) {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    this.pointMeshes = [
      this.makePoints(trX, trY, 0x0877bd, scale), // train: xanh
      this.makePoints(teX, teY, 0xf59322, scale), // test: cam
    ];
    this.scene.add(...this.pointMeshes);
  }

  // mặt phẳng ŷ = b + w1·x1 + w2·x2 (quy đổi về tọa độ hiển thị)
  private updatePlane(w: number[], b: number, scale: number) {
    if (!this.plane) return;
    const pos = (this.plane.geometry as THREE.PlaneGeometry).attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / scale;
      const z = pos.getZ(i) / scale;
      pos.setY(i, scale * (b + (w[0] ?? 0) * x + (w[1] ?? 0) * z));
    }
    pos.needsUpdate = true;
  }

  view(name: 'default' | 'top' | 'front' | 'side') {
    const p = { default: [8, 6, 8], top: [0, 14, 0.01], front: [0, 3, 14], side: [14, 3, 0] }[name];
    this.camera?.position.set(p[0], p[1], p[2]);
    this.camera?.lookAt(0, 0, 0);
    this.controls?.target.set(0, 0, 0);
    this.controls?.update();
  }

  ngOnDestroy() {
    // Trên server chưa khởi tạo gì nên không có gì để dọn
    if (!this.renderer) return;

    cancelAnimationFrame(this.raf);
    this.observer?.disconnect();
    this.controls?.dispose();
    this.renderer.dispose();
  }
}