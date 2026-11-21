import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Viewport3d } from './viewport3d';
import * as THREE from 'three';

describe('Viewport3d', () => {
  let component: Viewport3d;
  let fixture: ComponentFixture<Viewport3d>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Viewport3d],
    }).compileComponents();

    fixture = TestBed.createComponent(Viewport3d);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('camera interaction', () => {
    let view: any;
    let canvas: HTMLCanvasElement;
    const drag = (dx: number, dy: number, button = 0) => {
      const event = (type: string, x: number, y: number) => canvas.dispatchEvent(new PointerEvent(type, {
        bubbles: true, pointerId: 1, pointerType: 'mouse', isPrimary: true, button, buttons: type === 'pointerup' ? 0 : button === 2 ? 2 : 1,
        clientX: x, clientY: y,
      }));
      event('pointerdown', 200, 200);
      event('pointermove', 200 + dx, 200 + dy);
      event('pointerup', 200 + dx, 200 + dy);
    };

    beforeEach(() => {
      view = component as any;
      canvas = document.createElement('canvas');
      document.body.appendChild(canvas);
      Object.defineProperties(canvas, { clientWidth: { value: 600 }, clientHeight: { value: 420 } });
      canvas.setPointerCapture = () => {};
      canvas.releasePointerCapture = () => {};
      view.camera = new THREE.PerspectiveCamera(50, 600 / 420, .1, 200);
      view.camera.position.set(8, 6, 8);
      view.initControls(canvas);
    });

    afterEach(() => { view.controls.dispose(); canvas.remove(); });

    it.each(['default', 'front', 'side', 'top'] as const)('keeps horizontal drag direction and orbit radius from %s', preset => {
      component.view(preset);
      const before = view.controls.getAzimuthalAngle();
      const radius = view.camera.position.length();
      drag(30, 0);
      expect(view.controls.getAzimuthalAngle()).toBeLessThan(before);
      expect(view.camera.position.length()).toBeCloseTo(radius, 10);
    });

    it.each(['default', 'front', 'side'] as const)('keeps vertical drag direction from %s without rolling', preset => {
      component.view(preset);
      const before = view.controls.getPolarAngle();
      drag(0, 30);
      expect(view.controls.getPolarAngle()).toBeLessThan(before);
      expect(view.camera.up.toArray()).toEqual([0, 1, 0]);
      expect(view.camera.position.toArray().every(Number.isFinite)).toBe(true);
    });

    it('settles gradually after release and resets without residual drift', () => {
      drag(30, 20);
      let previous = view.camera.position.clone();
      const distances: number[] = [];
      for (let i = 0; i < 100; i++) {
        view.controls.update();
        distances.push(view.camera.position.distanceTo(previous));
        previous.copy(view.camera.position);
      }
      expect(distances[0]).toBeGreaterThan(0);
      expect(distances[1]).toBeLessThan(distances[0]);
      expect(distances[99]).toBeLessThan(.00001);
      drag(30, 20);
      component.view('default');
      for (let i = 0; i < 30; i++) view.controls.update();
      expect(view.camera.position.distanceTo(new THREE.Vector3(8, 6, 8))).toBeLessThan(1e-10);
    });

    it('preserves pan and wheel zoom', () => {
      const before = view.camera.position.clone();
      drag(30, 20, 2);
      expect(view.controls.target.length()).toBeGreaterThan(0);
      expect(view.camera.position.distanceTo(before)).toBeGreaterThan(0);
      const radius = view.controls.getDistance();
      canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true }));
      expect(view.controls.getDistance()).toBeLessThan(radius);
    });

    it('does not interpret a drag returning to its origin as a sample click', () => {
      view.onPointerDown({ button: 0, isPrimary: true, pointerId: 1, clientX: 20, clientY: 20 });
      view.onPointerMove({ pointerId: 1, clientX: 60, clientY: 20 });
      view.onPointerMove({ pointerId: 1, clientX: 20, clientY: 20 });
      expect(view.pointerStart.dragged).toBe(true);
      view.onPointerCancel();
      expect(view.pointerStart).toBeUndefined();
    });
  });

  it('scales epsilon by train-y standard deviation only, including raw CSV units', () => {
    component.store.trainY.set([1000, 2000, 3000]);
    component.store.testY.set([1e9]);
    expect(component.store.stickEpsilon()).toBe(.3);
    expect(component.store.stickThreshold()).toBeCloseTo(Math.sqrt(2e6 / 3) * .3, 10);
    component.store.trainY.set([7, 7]);
    expect(component.store.stickThreshold()).toBe(0);
  });

  it('counts full train/test predictions and does not change counts in phases A–E or on sample selection', () => {
    const store = component.store;
    store.trainX.set([[1, 2, 3], [1, 2, 4]]); store.trainY.set([7, 9]);
    store.testX.set([[1, 2, 5]]); store.testY.set([11]);
    store.validationX.set([]); store.validationY.set([]);
    store.history.set([{ iteration: 1, w: [0, 0, 2], b: 1, trainLoss: 0, testLoss: 0 }]);
    const state = component.stuck();
    expect(state.train).toBe(2); expect(state.test).toBe(1);
    store.selectedSample.set(1); store.phase.set(4);
    expect(component.stuck()).toBe(state);
    store.history.set([{ iteration: 2, w: [0, 0, 0], b: 0, trainLoss: 1, testLoss: 1 }]);
    expect(component.stuck().train).toBe(0); expect(component.stuck().test).toBe(0);
  });

  it('changes instance size/color without moving data or replacing the mesh', () => {
    const view = component as any;
    const X = [[1, 2, 3], [4, 5, 6]], y = [4, 7];
    const mesh = view.makePoints(X, y, 0x10b981, 2) as THREE.InstancedMesh;
    const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3();
    for (const size of [1, 2, .6]) {
      view.updatePoints(mesh, X, y, [4, 2], 0x10b981, 2, .1, size);
      [1.4, 1].forEach((multiplier, i) => {
        mesh.getMatrixAt(i, matrix);
        matrix.decompose(position, new THREE.Quaternion(), scale);
        expect(position.toArray()).toEqual([X[i][0] * 2, y[i] * 2, X[i][1] * 2]);
        expect(scale.x).toBeCloseTo(size * multiplier, 6);
        const color = new THREE.Color(); mesh.getColorAt(i, color);
        expect(color.g).toBeCloseTo(new THREE.Color(0x10b981).g * (i ? .6 : 1), 6);
      });
    }
    expect(X).toEqual([[1, 2, 3], [4, 5, 6]]); expect(y).toEqual([4, 7]);
    mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); mesh.dispose();
  });

  it('switches between a 1D line/thin bands and a 2D surface with exact scaled epsilon offsets', () => {
    const view = component as any;
    const geometry = new THREE.PlaneGeometry(10, 10, 40, 40); geometry.rotateX(-Math.PI / 2);
    view.plane = new THREE.Mesh(geometry);
    view.bands = [new THREE.Mesh(geometry.clone()), new THREE.Mesh(geometry.clone())];
    view.modelLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 41 }, () => new THREE.Vector3())));
    for (let i = 0; i < 2; i++) {
      view.updatePlane([2], 1, 2, 'linear', 2, 1, [], .5);
      expect(view.plane.visible).toBe(false); expect(view.modelLine.visible).toBe(true);
      view.bands.forEach((band: THREE.Mesh, j: number) => {
        expect(band.position.y).toBe(j ? 1 : -1);
        expect(band.geometry.attributes['position'].getZ(0)).toBeCloseTo(-.5);
      });
      const line = view.modelLine.geometry.attributes.position;
      expect(line.getY(20)).toBe(2); expect(line.getY(0)).toBe(2 * line.getX(0) + 2);
    }
    view.updatePlane([2, 3], 1, 2, 'linear', 2, 2, [], .5);
    expect(view.plane.visible).toBe(true); expect(view.modelLine.visible).toBe(false);
    expect(geometry.attributes['position'].getZ(0)).toBe(-5);
    view.updatePlane([2, 3], 1, 2, 'linear', 2, 2, [], 0);
    expect(view.bands.every((band: THREE.Mesh) => !band.visible)).toBe(true);
    for (const object of [view.plane, ...view.bands, view.modelLine]) { object.geometry.dispose(); object.material.dispose(); }
  });
  it('draws one vertical error segment per point in both visible datasets', () => {
    const view = component as any;
    const lines = new THREE.LineSegments(new THREE.BufferGeometry());
    view.residualSegments = lines;
    const train = Array.from({ length: 20 }, (_, index) => [index, index + 1]);
    const group = { rows: train, actual: train.map(() => 2), predicted: train.map(() => 1) };
    const validation = { rows: [[25, -3]], actual: [2], predicted: [4] };
    view.updateResidualSegments(2, [group, validation]);
    expect(lines.geometry.drawRange.count).toBe(42);
    const position = lines.geometry.getAttribute('position');
    expect([position.getX(40), position.getY(40), position.getZ(40)]).toEqual([50, 4, -6]);
    expect([position.getX(41), position.getY(41), position.getZ(41)]).toEqual([50, 8, -6]);
    expect(lines.geometry.getAttribute('lineDistance').getX(41)).toBe(4);
    view.updateResidualSegments(2, [group, { ...validation, predicted: [5] }]);
    expect(lines.geometry.getAttribute('position')).toBe(position);
    expect(position.getY(41)).toBe(10);
    lines.geometry.dispose();
    (lines.material as THREE.Material).dispose();
  });

  it('shows the real prediction trace and surface together in both views', () => {
    const view = component as any;
    fixture.componentRef.setInput('lesson', true);
    const geometry = new THREE.PlaneGeometry(10, 10, 40, 40); geometry.rotateX(-Math.PI / 2);
    view.plane = new THREE.Mesh(geometry);
    view.lessonTrace = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 81 }, () => new THREE.Vector3())));
    view.updatePlane([2, 3, 4], 1, 2, 'linear', 1, 3, [1, 2, 3], .1);
    const positions = view.lessonTrace.geometry.attributes.position;
    expect(view.lessonTrace.visible).toBe(true);
    for (const i of [0, 40, 80]) {
      expect(positions.getZ(i)).toBe(4);
      // y_display = (2*x1 + 3*x2 + 4*x3 + b) * scale.
      expect(positions.getY(i)).toBeCloseTo(2 * positions.getX(i) + 38, 5);
    }
    view.updatePlane([2, 3, 4], 1, 2, 'linear', 1, 3, [1, -1, 2], .1);
    expect(positions.getZ(40)).toBe(-2);
    expect(positions.getY(40)).toBe(12);
    fixture.componentRef.setInput('lesson', false);
    view.updatePlane([2, 3, 4], 1, 2, 'linear', 1, 3, [1, 2, 3], .1);
    expect(view.plane.visible).toBe(true);
    expect(view.lessonTrace.visible).toBe(true);
    expect(positions.getZ(40)).toBe(4);
    expect(positions.getY(40)).toBe(38);
    for (const object of [view.plane, view.lessonTrace]) { object.geometry.dispose(); object.material.dispose(); }
  });

  it('reviews snapshot before/proposed/after without mutating committed model', () => {
    const store=component.store;
    const before={iteration:0,w:[1,2],b:0,trainLoss:1,testLoss:1};
    const after={iteration:1,w:[2,3],b:1,trainLoss:.5,testLoss:.6};
    store.history.set([after]);store.phase.set(5);
    store.snapshot.set({before,after,algorithm:'linear',degree:1,lambda:0,lr:.01,trainCount:2,gradient:[1,1],biasGradient:1,penaltyBefore:0,penaltyAfter:0,done:false});
    fixture.componentRef.setInput('lesson',true);
    fixture.componentRef.setInput('reviewPhase',1);
    expect(component.shownModel()).toBe(before);
    fixture.componentRef.setInput('reviewPhase', 2);
    expect(component.visualModel()).toEqual({ w: [1.45, 2.45], b: .45 });
    expect(component.shownModel()).toBe(before);
    fixture.componentRef.setInput('reviewPhase', 3);
    expect(component.visualModel()).toEqual({ w: [1.85, 2.85], b: .85 });
    expect(component.shownModel()).toBe(before);
    fixture.componentRef.setInput('reviewPhase',4);
    expect(component.shownModel()).toBe(after);
    expect(component.lessonCaption()).toContain('chưa áp dụng');
    store.phase.set(1);expect(component.shownModel()).toBe(before);store.phase.set(5);
    fixture.componentRef.setInput('reviewPhase',5);
    expect(component.shownModel()).toBe(after);
    expect(store.latest()).toBe(after);expect(store.iteration()).toBe(0);
  });

});
