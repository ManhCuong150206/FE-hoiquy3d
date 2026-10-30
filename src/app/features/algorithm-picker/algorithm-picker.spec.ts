import { DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AlgorithmPicker } from './algorithm-picker';

describe('AlgorithmPicker', () => {
  beforeEach(() => TestBed.configureTestingModule({ deferBlockBehavior: DeferBlockBehavior.Manual }));
  it('reflects external algorithm selection without emitting a change', async () => {
    const fixture = TestBed.createComponent(AlgorithmPicker);
    const emit = vi.spyOn(fixture.componentInstance.selected, 'emit');
    fixture.componentRef.setInput('active', 'ridge'); await fixture.whenStable();
    expect(fixture.componentInstance.highlighted()).toBe('ridge');
    expect(fixture.nativeElement.querySelector('button[data-algorithm="ridge"]').classList.contains('highlighted')).toBe(true);
    expect(emit).not.toHaveBeenCalled();
  });
  it.each(['linear','polynomial','ridge','lasso'])('emits exactly %s when its accessible card is selected', async (algorithm) => {
    const fixture = TestBed.createComponent(AlgorithmPicker); await fixture.whenStable();
    const emit = vi.spyOn(fixture.componentInstance.selected, 'emit');
    (fixture.nativeElement.querySelector(`button[data-algorithm="${algorithm}"]`) as HTMLButtonElement).click();
    expect(emit).toHaveBeenCalledExactlyOnceWith(algorithm);
  });
  it('uses hover/focus only for preview and exposes the departure animation state', async () => {
    const fixture = TestBed.createComponent(AlgorithmPicker); await fixture.whenStable();
    const emit = vi.spyOn(fixture.componentInstance.selected, 'emit');
    fixture.nativeElement.querySelector('button[data-algorithm="lasso"]').dispatchEvent(new Event('focus'));
    await fixture.whenStable(); expect(fixture.componentInstance.highlighted()).toBe('lasso');
    expect(emit).not.toHaveBeenCalled();
    fixture.componentRef.setInput('departing',true); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.sphere-container').classList.contains('departing')).toBe(true);
  });
});
