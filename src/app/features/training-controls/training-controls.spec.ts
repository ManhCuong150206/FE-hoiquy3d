import { vi } from 'vitest';
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
  it('requests navigation back without changing algorithm or resetting training', async () => {
    const emit = vi.spyOn(component.changeAlgorithm, 'emit');
    const reset = vi.spyOn(component.store, 'reset');
    const algorithm = component.store.algorithm();
    (fixture.nativeElement.querySelector('.algorithm-back') as HTMLButtonElement).click();
    expect(emit).toHaveBeenCalledOnce();
    expect(component.store.algorithm()).toBe(algorithm); expect(reset).not.toHaveBeenCalled();
  });

});
