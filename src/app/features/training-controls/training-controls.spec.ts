import { Algorithm } from '../../core/models/experiment';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrainingControls } from './training-controls';

describe('TrainingControls', () => {
  let component: TrainingControls;
  let fixture: ComponentFixture<TrainingControls>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainingControls],
    }).compileComponents();

    fixture = TestBed.createComponent(TrainingControls);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it.each<Algorithm>(['linear','polynomial','ridge','lasso'])('shows only the selected %s algorithm', async (algorithm) => {
    component.store.algorithm.set(algorithm); await fixture.whenStable();
    const output = fixture.nativeElement.querySelector('#selected-algorithm') as HTMLOutputElement;
    expect(output.getAttribute('data-value')).toBe(algorithm);
    expect(output.textContent).toContain(component.labels[algorithm]);
    expect(fixture.nativeElement.querySelector('select[aria-label="Thuật toán"]')).toBeNull();
  });
  it('has no duplicate algorithm navigation inside the toolbar', () => {
    expect(fixture.nativeElement.querySelector('.algorithm-back')).toBeNull();
  });

});
