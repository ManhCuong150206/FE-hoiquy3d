import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultsPanel } from './results-panel';

describe('ResultsPanel', () => {
  let component: ResultsPanel;
  let fixture: ComponentFixture<ResultsPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultsPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('labels cross terms and marks only exact zero coefficients', () => {
    component.store.algorithm.set('polynomial');component.store.degree.set(2);
    component.store.trainX.set([[1,2]]);
    component.store.history.set([{iteration:1,w:[0,1e-9,2,3,4],b:0,trainLoss:0,testLoss:0}]);
    const c=component.coefficients();expect(c[3].name).toBe('x1 × x2');
    expect(c[0].zero).toBe(true);expect(c[1].zero).toBe(false);expect(c[4].width).toBe(100);
  });
  it('explains undefined R2 without changing the constant-target calculation', () => {
    component.store.trainX.set([[0],[1]]);
    component.store.trainY.set([5,5]);
    component.store.testX.set([[2],[3]]);
    component.store.testY.set([5,5]);
    component.store.history.set([{iteration:1,w:[0],b:5,trainLoss:0,testLoss:0}]);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(Number.isNaN(component.store.metrics()!.train.r2)).toBe(true);
    expect(text).toContain('Không xác định');
    expect(text).toContain('các giá trị Y bằng nhau');
    expect(text).not.toContain('NaN');
  });

});
