import { DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AlgorithmPicker } from './algorithm-picker';
import { AuthSession } from '../../state/auth-session';

describe('AlgorithmPicker', () => {
  beforeEach(() => TestBed.configureTestingModule({ deferBlockBehavior: DeferBlockBehavior.Manual }));
  it('updates the account controls when signing in and returning to Guest', async () => {
    const fixture = TestBed.createComponent(AlgorithmPicker);
    const auth = TestBed.inject(AuthSession);
    const login = vi.spyOn(fixture.componentInstance.loginRequested, 'emit');
    const logout = vi.spyOn(fixture.componentInstance.back, 'emit');
    await fixture.whenStable();
    const controls = () => fixture.nativeElement.querySelector('.account-actions') as HTMLElement;
    expect(controls().textContent).toContain('Đăng nhập');
    controls().querySelector<HTMLButtonElement>('button:not(.theme-toggle)')!.click();
    expect(login).toHaveBeenCalledOnce();
    auth.user.set({ userId: 'person-a', displayName: 'Minh Anh', isAnonymous: false });
    await fixture.whenStable();
    expect(controls().textContent).toContain('Xin chào, Minh Anh');
    expect(controls().querySelector<HTMLButtonElement>('button:not(.theme-toggle)')!.textContent).toBe('Đăng xuất');
    controls().querySelector<HTMLButtonElement>('button:not(.theme-toggle)')!.click();
    expect(logout).toHaveBeenCalledOnce();
    auth.guest();await fixture.whenStable();
    expect(controls().textContent).toContain('Đăng nhập');
    expect(controls().querySelector('.account-greeting')).toBeNull();
  });
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
