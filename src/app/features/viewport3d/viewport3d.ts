import {
  Component, ElementRef, NgZone, OnDestroy,
  afterNextRender, effect, inject, signal, viewChild, computed,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LabStore } from '../../state/lab-store';
import { countStuck, modelPredictions, sliceRow } from '../../core/engine/model-view';
import { Algorithm } from '../../core/models/experiment';

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
  private bands: THREE.Mesh[] = [];
  private modelLine?: THREE.Line;
  private pointMeshes: THREE.InstancedMesh[] = [];
  private pointData: unknown[] = [];
  private observer?: ResizeObserver;
  private raf = 0;
  private trueMarker?: THREE.Mesh;
  private predictedMarker?: THREE.Mesh;
  private residualLine?: THREE.Line;
  private pointerStart = { x: 0, y: 0 };
  webglError = signal(false);
  modelClipped = signal(false);
  pointSize = signal(1);
  stuck = computed(() => {
    const s = this.store.latest(), eps = this.store.stickThreshold();
    const predictRows = (rows: number[][]) => s
      ? modelPredictions(rows, s.w, s.b, this.store.algorithm(), this.store.degree())
      : rows.map(() => NaN);
    // Full rows, including x3+, for BOTH train and test; never the displayed slice.
    const trainPred = predictRows(this.store.trainX()), testPred = predictRows(this.store.testX());
    return { trainPred, testPred, train: countStuck(this.store.trainY(), trainPred, eps),
      test: countStuck(this.store.testY(), testPred, eps) };
  });
  sliceCaption = computed(() => {
    const n = this.store.dataFeatures();
    if (n <= 2) return n === 1 ? 'Một đặc trưng: đường hồi quy theo x₁; trục sâu z không mang dữ liệu (điểm giữ z = 0).' : 'Trục ngang x₁, chiều sâu x₂, chiều cao y.';
    const fixed = this.store.mode() === 'learn' ? this.store.selectedX() : [];
    return `Lát cắt: ${Array.from({ length: n - 2 }, (_, j) => `x${j + 3} = ${(fixed[j + 2] ?? 0).toFixed(4)}`).join('; ')}. Số điểm dính tính trên mô hình đầy đủ; bề mặt chỉ là lát cắt. Các điểm khác là hình chiếu, không nhất thiết nằm trên lát cắt.`;
  });

  constructor() {
    // Chỉ chạy trên trình duyệt (an toàn với SSR)
    afterNextRender(() => this.init());

    // Only data changes rebuild meshes. Committed models/settings update instances, never the RAF loop.
    effect(() => {
      const ready = this.ready();
      const trX = this.store.trainX(); const trY = this.store.trainY();
      const teX = this.store.testX(); const teY = this.store.testY();
      const scale = this.store.dataScale();
      const stuck = this.stuck(), eps = this.store.stickThreshold(), size = this.pointSize();
      if (!ready) return;
      const data = [trX, trY, teX, teY, scale];
      if (data.some((value, i) => value !== this.pointData[i])) {
        this.rebuildPoints(trX, trY, teX, teY, scale);
        this.pointData = data;
      }
      this.updatePoints(this.pointMeshes[0], trX, trY, stuck.trainPred, 0x10b981, scale, eps, size);
      this.updatePoints(this.pointMeshes[1], teX, teY, stuck.testPred, 0xf43f5e, scale, eps, size);
    });


    // Mỗi bước huấn luyện → cập nhật bề mặt mô hình
    effect(() => {
      const ready = this.ready();
      const s = this.store.latest();
      const scale = this.store.dataScale();
      const algorithm = this.store.algorithm();
      const degree = this.store.degree();
      const featureCount = this.store.dataFeatures();
      const fixed = this.store.mode() === 'learn' ? this.store.selectedX() : [];
      const eps = this.store.stickThreshold();

      if (!ready) return;

      this.updatePlane(
        s?.w ?? [],
        s?.b ?? 0,
        scale,
        algorithm,
        degree,
        featureCount,
        fixed,
        eps
      );
    });

    effect(() => {
      const ready = this.ready(), learn = this.store.mode() === 'learn';
      const row = this.store.selectedX(), y = this.store.selectedY(), prediction = this.store.selectedPrediction();
      const scale = this.store.dataScale(), phase = this.store.phase(), snapshot = this.store.snapshot();
      const size = this.pointSize();
      if (!ready || !this.trueMarker || !this.predictedMarker || !this.residualLine) return;
      const visible = learn && row.length > 0;
      this.trueMarker.visible = visible;
      this.predictedMarker.visible = this.residualLine.visible = visible && !!snapshot && phase >= 2 && Number.isFinite(prediction);
      const x = row[0] * scale, z = (row[1] ?? 0) * scale;
      this.trueMarker.position.set(x, y * scale, z);
      this.trueMarker.scale.setScalar(1.4 * size);
      this.predictedMarker.position.set(x, prediction * scale, z);
      const points = this.residualLine.geometry.attributes['position'] as THREE.BufferAttribute;
      points.setXYZ(0, x, y * scale, z); points.setXYZ(1, x, prediction * scale, z);
      points.needsUpdate = true;
      this.residualLine.geometry.computeBoundingSphere();
    });

  }

  private init() {
    const el = this.host().nativeElement;
    this.zone.runOutsideAngular(() => {
      try { this.renderer = new THREE.WebGLRenderer({ antialias: true }); }
      catch { this.webglError.set(true); return; }
      this.renderer.setSize(el.clientWidth, el.clientHeight);
      el.appendChild(this.renderer.domElement);

      this.scene.background = new THREE.Color(0x0b0f1a);
      this.camera = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.1, 200);
      this.camera.position.set(8, 6, 8);
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);

      this.scene.add(new THREE.GridHelper(10, 10, 0x475569, 0x273244), new THREE.AxesHelper(5));
      const light = new THREE.DirectionalLight(0xffffff, 2);
      light.position.set(4, 8, 6);
      this.scene.add(new THREE.AmbientLight(0xffffff, 1.4), light);

      const geo = new THREE.PlaneGeometry(10, 10, 40, 40);
      geo.rotateX(-Math.PI / 2); // trục Y của Three.js là chiều "lên"
      this.plane = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ color: 0x0877bd, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }),
      );
      this.scene.add(this.plane);
      this.bands = [-1, 1].map(() => new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({
        color: 0xfacc15, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false,
      })));
      this.modelLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 41 }, () => new THREE.Vector3())), new THREE.LineBasicMaterial({ color: 0x38bdf8 }));
      this.scene.add(...this.bands, this.modelLine);
      this.trueMarker = new THREE.Mesh(new THREE.SphereGeometry(.18, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, depthTest: false, depthWrite: false, transparent: true }));
      this.predictedMarker = new THREE.Mesh(new THREE.BoxGeometry(.17, .17, .17), new THREE.MeshBasicMaterial({ color: 0x67e8f9, depthTest: false, depthWrite: false, transparent: true }));
      this.residualLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false, transparent: true }));
      for (const marker of [this.trueMarker, this.predictedMarker, this.residualLine]) marker.renderOrder = 10;
      this.scene.add(this.trueMarker, this.predictedMarker, this.residualLine);
      this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
      this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);

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
    this.ready.set(!!this.renderer); // kích hoạt 2 effect ở trên
  }

  // x1 → trục X, x2 → trục Z, y → trục Y
  private makePoints(X: number[][], y: number[], color: number, scale: number) {
    const mesh = new THREE.InstancedMesh(
      // Scene-space radius: equivalent to .14 / dataScale in source units, also legible for raw CSV.
      new THREE.SphereGeometry(0.14, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0.05 }),
      X.length,
    );
    const m = new THREE.Matrix4();
    X.forEach((row, i) => {
      m.setPosition(row[0] * scale, y[i] * scale, (row[1] ?? 0) * scale);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, new THREE.Color(color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }

  private updatePoints(mesh: THREE.InstancedMesh, X: number[][], y: number[], predictions: number[],
    color: number, scale: number, eps: number, size: number) {
    const matrix = new THREE.Matrix4(), bright = new THREE.Color(color), dim = bright.clone().multiplyScalar(.6);
    X.forEach((row, i) => {
      const stuck = Number.isFinite(eps) && Math.abs(y[i] - predictions[i]) < eps;
      const radius = size * (stuck ? 1.4 : 1);
      matrix.makeScale(radius, radius, radius);
      // Scaling changes only the sphere's radius, never the sample position.
      matrix.setPosition(row[0] * scale, y[i] * scale, (row[1] ?? 0) * scale);
      mesh.setMatrixAt(i, matrix);
      mesh.setColorAt(i, stuck ? bright : dim);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere(); // Raycasting must include newly enlarged instances.
  }

  private rebuildPoints(trX: number[][], trY: number[], teX: number[][], teY: number[], scale: number) {
    for (const m of this.pointMeshes) {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
      m.dispose();
    }
    this.pointMeshes = [
      this.makePoints(trX, trY, 0x10b981, scale), // train: xanh lá
      this.makePoints(teX, teY, 0xf43f5e, scale), // test: đỏ hồng
    ];
    this.scene.add(...this.pointMeshes);
  }


  // Cập nhật bề mặt hồi quy trong hệ tọa độ Three.js:
  // X = x1, Z = x2, Y = giá trị dự đoán
  private updatePlane(
    w: number[],
    b: number,
    scale: number,
    algorithm: Algorithm,
    degree: number,
    featureCount: number,
    fixed: number[],
    eps: number
  ) {
    if (!this.plane || scale <= 0) return;

    const geometry = this.plane.geometry as THREE.PlaneGeometry;
    const pos = geometry.attributes['position'] as THREE.BufferAttribute;
    const uv = geometry.attributes['uv'] as THREE.BufferAttribute;
    // Keep a fixed thin strip for 1D; derive z from UV so repeated updates never shrink it again.
    for (let i = 0; i < pos.count; i++) pos.setZ(i, (.5 - uv.getY(i)) * (featureCount === 1 ? 1 : 10));

    const rows = Array.from({ length: pos.count }, (_, i) => sliceRow(pos.getX(i) / scale, pos.getZ(i) / scale, featureCount, fixed));
    const heights = w.length ? modelPredictions(rows, w, b, algorithm, degree).map(v => v * scale) : rows.map(() => 0);
    // A finite model can overflow when extrapolated outside the data domain.
    const offset = eps * scale;
    const invalid = heights.some(v => !Number.isFinite(v) || !Number.isFinite(offset) || Math.abs(v) + offset > 1e30);
    this.modelClipped.set(invalid);
    this.plane.visible = !invalid && featureCount >= 2;
    if (this.modelLine) this.modelLine.visible = !invalid && featureCount === 1;
    this.bands.forEach(band => band.visible = !invalid && eps > 0);
    if (invalid) return;
    heights.forEach((v, i) => pos.setY(i, v));

    pos.needsUpdate = true;

    // Cập nhật pháp tuyến cho hình học sau khi thay đổi đỉnh
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    this.bands.forEach((band, i) => {
      const bandPos = band.geometry.attributes['position'] as THREE.BufferAttribute;
      bandPos.copy(pos); bandPos.needsUpdate = true;
      band.position.y = (i === 0 ? -1 : 1) * offset;
      band.geometry.computeBoundingSphere();
    });
    if (this.modelLine) {
      const linePos = this.modelLine.geometry.attributes['position'] as THREE.BufferAttribute;
      // The central row samples the actual model: straight for Linear/Ridge/Lasso, curved for Polynomial.
      for (let i = 0; i < linePos.count; i++) linePos.setXYZ(i, pos.getX(20 * 41 + i), heights[20 * 41 + i], 0);
      linePos.needsUpdate = true;
      this.modelLine.geometry.computeBoundingSphere();
    }
  }

  setEpsilon(event: Event) { this.store.stickEpsilon.set(+(event.target as HTMLInputElement).value / 100); }
  setPointSize(event: Event) { this.pointSize.set(+(event.target as HTMLInputElement).value); }

  private onPointerDown = (event: PointerEvent) => { this.pointerStart = { x: event.clientX, y: event.clientY }; };
  private onPointerUp = (event: PointerEvent) => {
    if (this.store.mode() !== 'learn' || !this.camera || !this.renderer || !this.pointMeshes[0] ||
      Math.hypot(event.clientX - this.pointerStart.x, event.clientY - this.pointerStart.y) > 5) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(pointer, this.camera);
    const hit = ray.intersectObject(this.pointMeshes[0])[0];
    if (hit?.instanceId !== undefined) this.store.selectSample(hit.instanceId);
  };


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
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.scene.traverse(object => {
      if (object instanceof THREE.Light || object instanceof THREE.InstancedMesh) object.dispose();
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material)) mesh.material.forEach(material => material.dispose());
      else mesh.material?.dispose();
    });
    this.scene.clear();
    this.renderer.dispose();
  }
}
