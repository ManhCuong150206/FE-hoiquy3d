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
  it('reviews snapshot before/proposed/after without mutating committed model', () => {
    const store=component.store;
    const before={iteration:0,w:[1,2],b:0,trainLoss:1,testLoss:1};
    const after={iteration:1,w:[2,3],b:1,trainLoss:.5,testLoss:.6};
    store.history.set([after]);store.phase.set(5);
    store.snapshot.set({before,after,algorithm:'linear',degree:1,lambda:0,lr:.01,trainCount:2,gradient:[1,1],biasGradient:1,penaltyBefore:0,penaltyAfter:0,done:false});
    fixture.componentRef.setInput('lesson',true);
    fixture.componentRef.setInput('reviewPhase',1);
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
