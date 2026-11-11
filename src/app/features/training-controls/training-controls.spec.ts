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
    fixture.componentRef.setInput('view', 'settings');
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


describe('normal page controls',()=>{
 it('has no teaching mode selector and always labels a full iteration as Step',async()=>{
  TestBed.configureTestingModule({imports:[TrainingControls]});
  const fixture=TestBed.createComponent(TrainingControls);
  fixture.componentInstance.store.mode.set('learn');await fixture.whenStable();
  const host=fixture.nativeElement as HTMLElement;
  expect(host.querySelector('select#learning-mode')).toBeNull();
  expect(host.querySelector('#learning-mode')?.textContent).toBe('Chạy bình thường');
  expect(host.textContent).not.toContain('Tiếp pha');
  expect(host.textContent).toContain('Nhịp chạy iteration');
 });
});
