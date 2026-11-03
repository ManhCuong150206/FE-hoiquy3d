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
});
