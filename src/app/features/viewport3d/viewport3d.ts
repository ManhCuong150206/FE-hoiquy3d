import { FrameBudget, recordRender } from '../../presentation/frame-budget';
import {
  Component, ElementRef, NgZone, OnDestroy,
  afterNextRender, effect, inject, signal, viewChild, computed, input, untracked,
} from '@angular/core';
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LabStore } from '../../state/lab-store';
import { countStuck, modelPredictions, modelVisibility, sliceRow } from '../../core/engine/model-view';
import { Algorithm } from '../../core/models/experiment';

@Component({
  selector: 'app-viewport3d',
  templateUrl: './viewport3d.html',
  styleUrl: './viewport3d.css',
})
export class Viewport3d implements OnDestroy {
  readonly active = input(true);
  readonly lesson = input(false);
  readonly reviewPhase = input<number | null>(null);
  readonly shownPhase = computed(() => this.lesson() ? Math.min(this.reviewPhase() ?? this.store.phase(), this.store.snapshot() ? this.store.phase() : 0) : this.store.phase());
  readonly shownModel = computed(() => {
    const snapshot=this.store.snapshot();
    return this.lesson() && snapshot ? (this.shownPhase() >= 4 ? snapshot.after : snapshot.before) : this.store.latest();
  });
  readonly lessonPreviewProgress = computed(() => {
    if (!this.lesson() || !this.store.snapshot()) return 0;
    const phase = this.shownPhase();
    return phase === 2 ? .45 : phase === 3 ? .85 : phase >= 4 ? 1 : 0;
  });
  readonly visualModel = computed(() => {
    const model = this.shownModel();
    const progress = this.lessonPreviewProgress();
    const snapshot = this.store.snapshot();
    if (!snapshot || progress === 0 || progress === 1) return model;

    if (snapshot.preview) {
      return this.shownPhase() === 2 ? snapshot.preview.residual : snapshot.preview.loss;
    }

    // Use the single pending update until the worker sends the multi-iteration preview.
    const { before, after } = snapshot;
    return {
      w: before.w.map((weight, i) => weight + (after.w[i] - weight) * progress),
      b: before.b + (after.b - before.b) * progress,
    };
  });

  readonly displayedSample = computed(() => this.store.selectedSample());
  readonly displayedRow = computed(() => this.store.trainX()[this.displayedSample()]);
  readonly displayedY = computed(() => this.store.trainY()[this.displayedSample()] ?? 0);
  readonly shownPrediction = computed(() => {
    const model = this.visualModel();
    const row = this.displayedRow();
    return model && row ? modelPredictions([row], model.w, model.b, this.store.algorithm(), this.store.degree())[0] : NaN;
  });
  readonly beforePrediction = computed(() => {
    const snapshot = this.store.snapshot(), row = this.displayedRow();
    return snapshot && row ? modelPredictions([row], snapshot.before.w, snapshot.before.b,
      this.store.algorithm(), this.store.degree())[0] : NaN;
  });
  readonly residualComparison = computed(() => {
    if (!this.lesson() || this.shownPhase() < 4 || !this.displayedRow() || this.modelClipped()) return null;
    const before = this.beforePrediction(), after = this.shownPrediction(), actual = this.displayedY();
    return Number.isFinite(before) && Number.isFinite(after)
      ? { before: Math.abs(before - actual), after: Math.abs(after - actual) } : null;
  });
  readonly lessonCaption = computed(() => [
    'A · Đầu vào: xem bề mặt trước khi bắt đầu vòng học này.',
    'B · Dự đoán: khối vuông biểu diễn ŷ trước cập nhật.',
    'C · Sai số: xem bề mặt bắt đầu dịch chuyển; các đoạn nối thay đổi theo đường dự đoán.',
    'D · Loss: bề mặt tiếp tục biến đổi; MSE dùng toàn bộ Train.',
    'E · Hệ số: bề mặt quay về kết quả của một lần cập nhật, chưa áp dụng cho tới chặng F.',
    'F · Đánh giá: bề mặt sau cập nhật của iteration đang xem.',
  ][this.shownPhase()]);
  private readonly mounted = signal(false);
  private initialized = false;
  private readonly budget = new FrameBudget();
  readonly idPrefix = input('viewport');
  readonly lowQuality = input(false);
  readonly evaluationX = computed(() => this.store.hasValidation() ? this.store.validationX() : this.store.testX());
  readonly evaluationY = computed(() => this.store.hasValidation() ? this.store.validationY() : this.store.testY());
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
  private lessonTrace?: THREE.Line;
  private traceGlow?: Line2;
  private pointMeshes: THREE.InstancedMesh[] = [];
  private pointData: unknown[] = [];
  private observer?: ResizeObserver;
  private trainColor = 0;
  private testColor = 0;
  private raf = 0;
  private visibilityObserver?: IntersectionObserver;
  private sceneVisible = true;
  private renderLoop?: FrameRequestCallback;
  private syncRendering = () => {
    if (typeof window === 'undefined') return;
    cancelAnimationFrame(this.raf);
    this.budget.reset();
    if (this.active() && this.sceneVisible && !document.hidden && this.renderLoop) {
      this.zone.runOutsideAngular(() => { this.raf = requestAnimationFrame(this.renderLoop!); });
    }
  };
  private trueMarker?: THREE.Mesh;
  private predictedMarker?: THREE.Mesh;
  private residualLine?: THREE.Line;
  private residualSegments?: THREE.LineSegments;
  private surfaceTarget?: { heights: number[]; trace: number[]; offset: number };
  private residualTargets = new Float32Array(0);
  private residualsMoving = false;
  private markerTarget?: number;
  private projection: unknown[] = [];

  readonly showResiduals = computed(() => this.lesson()
    ? !!this.store.snapshot() && this.shownPhase() >= 1
    : this.store.runResidualsVisible());

  private reducedMotionQuery?: MediaQueryList;

  private smoothMotion() {
    if (this.lowQuality() || typeof matchMedia !== 'function') return false;
    this.reducedMotionQuery ??= matchMedia('(prefers-reduced-motion: reduce)');
    return !this.reducedMotionQuery.matches;
  }
  private animatePredictionChanges() {
    const model = this.shownModel();
    return !!model && (model.iteration > 0 || (this.lesson() && !!this.store.snapshot())) && this.smoothMotion();
  }

  private pointerStart?: { pointerId: number; x: number; y: number; dragged: boolean };
  webglError = signal(false);
  modelClipped = signal(false);
  pointSize = signal(1);
  stuck = computed(() => {
    if (!this.active()) return { trainPred: [] as number[], testPred: [] as number[], train: 0, test: 0 };
    const s = this.visualModel(), eps = this.store.stickThreshold();
    const predictRows = (rows: number[][]) => s
      ? modelPredictions(rows, s.w, s.b, this.store.algorithm(), this.store.degree())
      : rows.map(() => NaN);
    // Full rows, including x3+, for BOTH train and test; never the displayed slice.
    const trainPred = predictRows(this.store.trainX()), testPred = predictRows(this.evaluationX());
    return { trainPred, testPred, train: countStuck(this.store.trainY(), trainPred, eps),
      test: countStuck(this.evaluationY(), testPred, eps) };
  });
  sliceCaption = computed(() => {
    const n = this.store.dataFeatures();
    if (n <= 2) return n === 1 ? 'Một đặc trưng: đường hồi quy theo x₁; trục sâu z không mang dữ liệu (điểm giữ z = 0).' : 'Trục ngang x₁, chiều sâu x₂, chiều cao y.';
    const fixed = this.displayedRow() ?? [];
    return `Lát cắt: ${Array.from({ length: n - 2 }, (_, j) => `x${j + 3} = ${(fixed[j + 2] ?? 0).toFixed(4)}`).join('; ')}. Số điểm dính tính trên mô hình đầy đủ; bề mặt chỉ là lát cắt. Các điểm khác là hình chiếu, không nhất thiết nằm trên lát cắt.`;
  });

  constructor() {
    effect(() => {
      const low = this.lowQuality(), ready = this.ready();
      if (ready && this.renderer) this.renderer.setPixelRatio(low ? 1 : Math.min(window.devicePixelRatio, 1.5));
    });
    // Chỉ chạy trên trình duyệt (an toàn với SSR)
    afterNextRender(() => this.mounted.set(true));
    effect(() => {
      if (!this.mounted() || !this.active()) { this.syncRendering(); return; }
      if (!this.initialized) { this.initialized = true; untracked(() => this.init()); }
      this.syncRendering();
    });

    // Only data changes rebuild meshes. Committed models/settings update instances, never the RAF loop.
    effect(() => {
      if (!this.active()) return;
      const ready = this.ready();
      const trX = this.store.trainX(); const trY = this.store.trainY();
      const teX = this.evaluationX(); const teY = this.evaluationY();
      const scale = this.store.dataScale();
      const stuck = this.stuck(), eps = this.store.stickThreshold(), size = this.pointSize();
      if (!ready) return;
      const data = [trX, trY, teX, teY, scale];
      if (data.some((value, i) => value !== this.pointData[i])) {
        this.rebuildPoints(trX, trY, teX, teY, scale);
        this.pointData = data;
      }
      this.updatePoints(this.pointMeshes[0], trX, trY, stuck.trainPred, this.trainColor, scale, eps, size);
      this.updatePoints(this.pointMeshes[1], teX, teY, stuck.testPred, this.testColor, scale, eps, size);
    });

    effect(() => {
      if (!this.active() || !this.ready() || !this.residualSegments) return;
      const model = this.shownModel();
      const visible = this.showResiduals() && !this.modelClipped() && !!model;
      const animate = this.residualSegments.visible && this.animatePredictionChanges();
      this.residualSegments.visible = visible;
      if (!visible) {
        this.residualsMoving = false;
        return;
      }
      const { trainPred, testPred } = this.stuck();
      this.updateResidualSegments(this.store.dataScale(), [
        { rows: this.store.trainX(), actual: this.store.trainY(), predicted: trainPred },
        { rows: this.evaluationX(), actual: this.evaluationY(), predicted: testPred },
      ], animate);
    });


    effect(() => {
      if (!this.active() || !this.ready()) return;
      this.applyModelVisibility(this.store.dataFeatures(), this.store.stickThreshold());
    });

    // Mỗi bước huấn luyện → cập nhật bề mặt mô hình
    effect(() => {
      if (!this.active()) return;
      const ready = this.ready();
      const s = this.visualModel();
      const scale = this.store.dataScale();
      const algorithm = this.store.algorithm();
      const degree = this.store.degree();
      const featureCount = this.store.dataFeatures();
      const fixed = this.displayedRow() ?? [];
      const eps = this.store.stickThreshold();

      if (!ready) return;

      const context = [this.store.trainX(), fixed, scale, algorithm, degree, featureCount];
      const animate = this.animatePredictionChanges() &&
        context.every((value, index) => Object.is(value, this.projection[index]));
      this.projection = context;

      this.updatePlane(
        s?.w ?? [],
        s?.b ?? 0,
        scale,
        algorithm,
        degree,
        featureCount,
        fixed,
        eps,
        animate
      );
    });

    effect(() => {
      if (!this.active()) return;
      const ready = this.ready();
      const row = this.displayedRow(), y = this.displayedY(), prediction = this.shownPrediction();
      const scale = this.store.dataScale();
      const size = this.pointSize();
      if (!ready || !this.trueMarker || !this.predictedMarker || !this.residualLine) return;
      const visible = !!row && row.length > 0 && !this.modelClipped();
      const finite = Number.isFinite(prediction) && Math.abs(prediction * scale) <= 1e30;
      const x = (row?.[0] ?? 0) * scale, z = (row?.[1] ?? 0) * scale;
      const last = this.trueMarker.position;
      const animate = this.predictedMarker.visible && this.animatePredictionChanges()
        && last.x === x && last.y === y * scale && last.z === z;
      this.trueMarker.visible = visible;
      this.predictedMarker.visible = visible && finite;
      this.residualLine.visible = visible && finite && this.showResiduals();
      this.markerTarget = undefined;
      if (!visible) return;

      this.trueMarker.position.set(x, y * scale, z);
      this.trueMarker.scale.setScalar(1.4 * size);
      if (!finite) return;
      const points = this.residualLine.geometry.attributes['position'] as THREE.BufferAttribute;
      points.setXYZ(0, x, y * scale, z);
      if (animate) this.markerTarget = prediction * scale;
      else this.moveMarker(prediction * scale);
    });

  }

  private init() {
    const el = this.host().nativeElement;
    this.zone.runOutsideAngular(() => {
      try { this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
      catch { this.webglError.set(true); return; }
      const palette = getComputedStyle(el);
      this.trainColor = new THREE.Color(palette.getPropertyValue('--color-train').trim()).getHex();
      this.testColor = new THREE.Color(palette.getPropertyValue('--color-test').trim()).getHex();
      this.renderer.setPixelRatio(this.lowQuality() ? 1 : Math.min(window.devicePixelRatio, 1.5));
      this.renderer.setSize(el.clientWidth, el.clientHeight);
      el.appendChild(this.renderer.domElement);

      this.scene.background = null; this.renderer.setClearColor(0x000000, 0);
      this.camera = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.1, 200);
      this.camera.position.set(8, 6, 8);
      this.initControls(this.renderer.domElement);

      this.scene.add(new THREE.GridHelper(10, 10, 0x475569, 0x273244), new THREE.AxesHelper(5));
      const light = new THREE.DirectionalLight(0xffffff, 2);
      light.position.set(4, 8, 6);
      this.scene.add(new THREE.HemisphereLight(0xe5f5ff, 0x141328, 1.8), light);

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
        Array.from({ length: 41 }, () => new THREE.Vector3())), new THREE.LineBasicMaterial({ color: 0x67e8f9 }));
      this.scene.add(...this.bands, this.modelLine);
      // A precise x1 cross-section through the selected sample makes the changing fit legible.
      this.lessonTrace = new THREE.Line(new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 81 }, () => new THREE.Vector3())),
        new THREE.LineBasicMaterial({ color: 0x67e8f9, depthTest: false, transparent: true, opacity: .95 }));
      this.lessonTrace.renderOrder = 8;
      const glowGeometry = new LineGeometry().setPositions(new Float32Array(81 * 3));
      (glowGeometry.getAttribute('instanceStart') as THREE.InterleavedBufferAttribute).data
        .setUsage(THREE.DynamicDrawUsage);
      this.traceGlow = new Line2(glowGeometry, new LineMaterial({
        color: 0x37cfff, linewidth: 5, opacity: .32, transparent: true, depthTest: false, depthWrite: false,
      }));
      this.traceGlow.frustumCulled = false;
      this.traceGlow.renderOrder = 7;
      this.scene.add(this.lessonTrace, this.traceGlow);
      this.trueMarker = new THREE.Mesh(new THREE.SphereGeometry(.18, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, depthTest: false, depthWrite: false, transparent: true }));
      this.predictedMarker = new THREE.Mesh(new THREE.BoxGeometry(.17, .17, .17), new THREE.MeshBasicMaterial({ color: 0x67e8f9, depthTest: false, depthWrite: false, transparent: true }));
      this.residualLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false, transparent: true }));
      for (const marker of [this.trueMarker, this.predictedMarker, this.residualLine]) marker.renderOrder = 10;
      this.scene.add(this.trueMarker, this.predictedMarker, this.residualLine);
      this.residualSegments = new THREE.LineSegments(new THREE.BufferGeometry(),
        new THREE.LineDashedMaterial({ color: 0xff91c6, dashSize: .11, gapSize: .075,
          transparent: true, opacity: .46, depthWrite: false }));
      this.residualSegments.visible = false;
      this.scene.add(this.residualSegments);
      this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
      this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
      this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
      this.renderer.domElement.addEventListener('pointercancel', this.onPointerCancel);
      this.renderer.domElement.addEventListener('lostpointercapture', this.onPointerCancel);

      this.observer = new ResizeObserver(() => {
        if (!this.renderer || !this.camera || !this.active() || !el.clientWidth || !el.clientHeight) return;
        this.renderer.setSize(el.clientWidth, el.clientHeight);
        this.camera.aspect = el.clientWidth / el.clientHeight;
        this.camera.updateProjectionMatrix();
      });
      this.observer.observe(el);

      this.renderLoop = timestamp => {
        const started = performance.now();
        const delta = this.budget.take(timestamp);
        if (delta !== null) {
          this.animateModel(delta);
          // Keep the same settling time when a frame is delayed.
          this.controls!.dampingFactor = 1 - Math.pow(1 - .14, delta / (1000 / 60));
          this.controls!.update();
          this.renderer!.render(this.scene, this.camera!); recordRender(this.renderer!.domElement, started);
        }
        this.raf = requestAnimationFrame(this.renderLoop!);
      };
      if (typeof IntersectionObserver !== 'undefined') {
        this.visibilityObserver = new IntersectionObserver(entries => {
          this.sceneVisible = entries.some(entry => entry.isIntersecting);
          this.syncRendering();
        });
        this.visibilityObserver.observe(el);
      }
      document.addEventListener('visibilitychange', this.syncRendering);
      this.syncRendering();
    });
    this.ready.set(!!this.renderer); // kích hoạt 2 effect ở trên
  }

  private initControls(canvas: HTMLCanvasElement) {
    this.controls = new OrbitControls(this.camera!, canvas);
    // Orbit around camera.up, so dragging keeps the same direction from every view.
    this.controls.enableDamping = true;
    this.controls.dampingFactor = .14;
    this.controls.rotateSpeed = .55;
    this.controls.update();
  }

  // x1 → trục X, x2 → trục Z, y → trục Y
  private makePoints(X: number[][], y: number[], color: number, scale: number) {
    const mesh = new THREE.InstancedMesh(
      // Scene-space radius: equivalent to .14 / dataScale in source units, also legible for raw CSV.
      new THREE.SphereGeometry(0.14, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.08, emissive: new THREE.Color(color), emissiveIntensity: .45 }),
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

  private updateResidualSegments(scale: number,
    groups: readonly { rows: number[][]; actual: number[]; predicted: number[] }[], animate = false) {
    const lines = this.residualSegments;
    if (!lines) return;
    const vertexCount = groups.reduce((total, group) => total + group.rows.length * 2, 0);
    let geometry = lines.geometry;
    const oldVertexCount = geometry.drawRange.count;
    let position = geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!position || position.count !== vertexCount) {
      animate = false;
      geometry.dispose();
      geometry = new THREE.BufferGeometry();
      lines.geometry = geometry;
      position = new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3).setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute('position', position);
      geometry.setAttribute('lineDistance',
        new THREE.BufferAttribute(new Float32Array(vertexCount), 1).setUsage(THREE.DynamicDrawUsage));
    }
    const distance = geometry.getAttribute('lineDistance') as THREE.BufferAttribute;
    if (this.residualTargets.length !== vertexCount / 2) this.residualTargets = new Float32Array(vertexCount / 2);
    this.residualsMoving = false;
    let vertex = 0;
    for (const { rows, actual, predicted } of groups) {
      rows.forEach((row, index) => {
        const x = row[0] * scale, z = (row[1] ?? 0) * scale;
        const y = actual[index] * scale, prediction = predicted[index] * scale;
        if (!(Math.max(Math.abs(x), Math.abs(y), Math.abs(z), Math.abs(prediction)) <= 1e30)) return;
        const samePoint = animate && vertex < oldVertexCount
          && position.getX(vertex) === Math.fround(x)
          && position.getY(vertex) === Math.fround(y)
          && position.getZ(vertex) === Math.fround(z);
        this.residualTargets[vertex / 2] = prediction;
        position.setXYZ(vertex, x, y, z);
        distance.setX(vertex++, 0);
        if (samePoint) this.residualsMoving ||= position.getY(vertex) !== Math.fround(prediction);
        else {
          position.setXYZ(vertex, x, prediction, z);
          distance.setX(vertex, Math.abs(prediction - y));
        }
        vertex++;
      });
    }
    geometry.setDrawRange(0, vertex);
    position.needsUpdate = true;
    distance.needsUpdate = true;
    // Unused capacity may contain old points, so skip geometry bounds for this single batch.
    lines.frustumCulled = false;
  }

  private rebuildPoints(trX: number[][], trY: number[], teX: number[][], teY: number[], scale: number) {
    for (const m of this.pointMeshes) {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
      m.dispose();
    }
    this.pointMeshes = [
      this.makePoints(trX, trY, this.trainColor, scale), // train: đỏ neon, lấy từ bảng màu chung
      this.makePoints(teX, teY, this.testColor, scale), // test: vàng neon, lấy từ bảng màu chung
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
    eps: number,
    animate = false
  ) {
    if (!this.plane || scale <= 0) return;

    const geometry = this.plane.geometry as THREE.PlaneGeometry;
    const pos = geometry.attributes['position'] as THREE.BufferAttribute;
    const uv = geometry.attributes['uv'] as THREE.BufferAttribute;
    // Keep a fixed thin strip for 1D; derive z from UV so repeated updates never shrink it again.
    for (let i = 0; i < pos.count; i++) pos.setZ(i, (.5 - uv.getY(i)) * (featureCount === 1 ? 1 : 10));

    const rows = Array.from({ length: pos.count }, (_, i) => sliceRow(pos.getX(i) / scale, pos.getZ(i) / scale, featureCount, fixed));
    const heights = w.length ? modelPredictions(rows, w, b, algorithm, degree).map(v => v * scale) : rows.map(() => 0);
    const trace = this.lessonTrace?.geometry.attributes['position'] as THREE.BufferAttribute | undefined;
    const traceRows = Array.from({ length: trace?.count ?? 0 }, (_, i) =>
      sliceRow((-5 + 10 * i / ((trace?.count ?? 2) - 1)) / scale, fixed[1] ?? 0, featureCount, fixed));
    const traceHeights = w.length ? modelPredictions(traceRows, w, b, algorithm, degree).map(v => v * scale) : traceRows.map(() => 0);
    // The line varies x1; x2 and all remaining inputs stay at the selected sample's values.
    if (trace) for (let i = 0; i < trace.count; i++) trace.setXYZ(i, -5 + 10 * i / (trace.count - 1), trace.getY(i), (fixed[1] ?? 0) * scale);
    // A finite model can overflow when extrapolated outside the data domain.
    const offset = eps * scale;
    const invalid = [...heights, ...traceHeights].some(v => !Number.isFinite(v) || !Number.isFinite(offset) || Math.abs(v) + offset > 1e30);
    this.modelClipped.set(invalid);
    this.applyModelVisibility(featureCount, eps);
    this.surfaceTarget = undefined;
    if (invalid) return;
    if (animate) this.surfaceTarget = { heights, trace: traceHeights, offset };
    else {
      this.applyHeights(heights, offset);
      this.applyTrace(traceHeights);
    }
  }

  private moveMarker(height: number) {
    if (!this.predictedMarker || !this.residualLine || !this.trueMarker) return;
    const { x, z } = this.trueMarker.position;
    this.predictedMarker.position.set(x, height, z);
    const positions = this.residualLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    positions.setXYZ(1, x, height, z);
    positions.needsUpdate = true;
    this.residualLine.geometry.computeBoundingSphere();
  }

  private animateModel(delta: number) {
    if (!this.surfaceTarget && !this.residualsMoving && this.markerTarget === undefined) return;
    const phase = this.shownPhase();
    const smoothingMs = this.lesson() && phase >= 2 && phase <= 4 ? 190 : 85;
    const blend = this.smoothMotion() ? 1 - Math.exp(-delta / smoothingMs) : 1;
    let moving = false;
    const approach = (from: number, to: number) => {
      const next = from + (to - from) * blend;
      if (Math.abs(to - next) <= Math.max(.001, Math.abs(to) * 1e-6)) return to;
      moving = true;
      return next;
    };
    const target = this.surfaceTarget;
    if (target && this.plane) {
      const surface = this.plane.geometry.getAttribute('position');
      const trace = this.lessonTrace?.geometry.getAttribute('position');
      this.applyHeights(target.heights.map((y, i) => approach(surface.getY(i), y)), target.offset);
      this.applyTrace(target.trace.map((y, i) => approach(trace?.getY(i) ?? y, y)));
      if (!moving) this.surfaceTarget = undefined;
    }
    if (this.residualsMoving && this.residualSegments?.visible) {
      moving = false;
      const geometry = this.residualSegments.geometry;
      const position = geometry.getAttribute('position') as THREE.BufferAttribute;
      const distance = geometry.getAttribute('lineDistance') as THREE.BufferAttribute;
      for (let i = 1; i < geometry.drawRange.count; i += 2) {
        const height = approach(position.getY(i), this.residualTargets[(i - 1) / 2]);
        position.setY(i, height);
        distance.setX(i, Math.abs(height - position.getY(i - 1)));
      }
      position.needsUpdate = true;
      distance.needsUpdate = true;
      this.residualsMoving = moving;
    }
    if (this.markerTarget !== undefined && this.predictedMarker) {
      moving = false;
      this.moveMarker(approach(this.predictedMarker.position.y, this.markerTarget));
      if (!moving) this.markerTarget = undefined;
    }
  }

  private applyTrace(heights: number[]) {
    if (!this.lessonTrace) return;
    const positions = this.lessonTrace.geometry.attributes['position'] as THREE.BufferAttribute;
    heights.forEach((height, i) => positions.setY(i, height));
    positions.needsUpdate = true;
    this.lessonTrace.geometry.computeBoundingSphere();
    if (this.traceGlow) {
      const start = this.traceGlow.geometry.getAttribute('instanceStart') as THREE.InterleavedBufferAttribute;
      const end = this.traceGlow.geometry.getAttribute('instanceEnd') as THREE.InterleavedBufferAttribute;
      for (let i = 0; i < heights.length - 1; i++) {
        start.setXYZ(i, positions.getX(i), heights[i], positions.getZ(i));
        end.setXYZ(i, positions.getX(i + 1), heights[i + 1], positions.getZ(i + 1));
      }
      start.data.needsUpdate = true;
    }
  }

  private applyHeights(heights: number[], offset: number) {
    if (!this.plane) return;
    const geometry = this.plane.geometry as THREE.PlaneGeometry;
    const pos = geometry.attributes['position'] as THREE.BufferAttribute;
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

  private applyModelVisibility(features: number, eps: number) {
    const visible = modelVisibility(features, this.lesson(), this.shownPhase(), eps, this.modelClipped());
    if (this.plane) this.plane.visible = visible.plane;
    if (this.modelLine) this.modelLine.visible = visible.line;
    if (this.lessonTrace) this.lessonTrace.visible = visible.plane;
    if (this.traceGlow) this.traceGlow.visible = visible.plane || visible.line;
    this.bands.forEach(band => band.visible = visible.bands);
  }

  setEpsilon(event: Event) { this.store.stickEpsilon.set(+(event.target as HTMLInputElement).value / 100); }
  setPointSize(event: Event) { this.pointSize.set(+(event.target as HTMLInputElement).value); }

  private onPointerDown = (event: PointerEvent) => {
    if (this.pointerStart) { this.pointerStart.dragged = true; return; }
    if (event.button !== 0 || !event.isPrimary || event.ctrlKey || event.metaKey || event.shiftKey) return;
    this.pointerStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, dragged: false };
  };
  private onPointerMove = (event: PointerEvent) => {
    const start = this.pointerStart;
    if (start?.pointerId === event.pointerId && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) start.dragged = true;
  };
  private onPointerCancel = () => { this.pointerStart = undefined; };
  private onPointerUp = (event: PointerEvent) => {
    const start = this.pointerStart;
    if (start?.pointerId !== event.pointerId) return;
    this.pointerStart = undefined;
    if (!this.camera || !this.renderer || !this.pointMeshes[0] ||
      start.dragged || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(pointer, this.camera);
    const hit = ray.intersectObject(this.pointMeshes[0])[0];
    if (hit?.instanceId !== undefined) this.store.selectSample(hit.instanceId);
  };

  view(name: 'default' | 'top' | 'front' | 'side') {
    const p = { default: [8, 6, 8], top: [0, 14, 0.01], front: [0, 3, 14], side: [14, 3, 0] }[name];
    // Drain pending orbit/pan inertia before placing a preset, preventing drift after reset.
    if (this.controls) { this.controls.enableDamping = false; this.controls.update(); }
    this.camera?.position.set(p[0], p[1], p[2]);
    this.camera?.lookAt(0, 0, 0);
    this.controls?.target.set(0, 0, 0);
    this.controls?.update();
    if (this.controls) this.controls.enableDamping = true;
  }

  ngOnDestroy() {
    // Trên server chưa khởi tạo gì nên không có gì để dọn
    if (!this.renderer) return;

    cancelAnimationFrame(this.raf);
    this.observer?.disconnect();
    this.visibilityObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.syncRendering);
    this.controls?.dispose();
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.removeEventListener('pointercancel', this.onPointerCancel);
    this.renderer.domElement.removeEventListener('lostpointercapture', this.onPointerCancel);
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
