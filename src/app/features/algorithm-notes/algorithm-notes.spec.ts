import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlgorithmNotes } from './algorithm-notes';

describe('AlgorithmNotes', () => {
  let component: AlgorithmNotes;
  let fixture: ComponentFixture<AlgorithmNotes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlgorithmNotes],
    }).compileComponents();

    fixture = TestBed.createComponent(AlgorithmNotes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('explains the actual multivariate polynomial basis', () => {
    component.store.algorithm.set('polynomial');component.store.trainX.set([[1,2]]);component.store.degree.set(2);
    expect(component.note().model).toContain('x1 × x2');expect(component.note().model).toContain('x2^2');
  });
});
