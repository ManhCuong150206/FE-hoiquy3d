import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthSession } from '../../state/auth-session';
import { WelcomePanel } from './welcome-panel';

describe('WelcomePanel demo entry', () => {
  async function setup() {
    TestBed.configureTestingModule({providers:[{provide:AuthSession,useValue:{authenticated:()=>false,enter:vi.fn().mockResolvedValue({userId:'test'})}}]});
    const fixture = TestBed.createComponent(WelcomePanel);
    await fixture.whenStable();
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    return { fixture, form, component: fixture.componentInstance };
  }
  it('does not continue with invalid email/password', async () => {
    const { fixture, form, component } = await setup();
    const emit = vi.spyOn(component.explore, 'emit');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(emit).not.toHaveBeenCalled();
  });
  it('clears credentials before continuing from a valid demo form', async () => {
    const { fixture, form, component } = await setup();
    const emit = vi.spyOn(component.explore, 'emit');
    (form.elements.namedItem('email') as HTMLInputElement).value = 'demo@example.com';
    (form.elements.namedItem('password') as HTMLInputElement).value = 'demo-password';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();expect(emit).toHaveBeenCalledOnce();
    expect((form.elements.namedItem('email') as HTMLInputElement).value).toBe('');
    expect((form.elements.namedItem('password') as HTMLInputElement).value).toBe('');
  });
  it('shows the registration name field only in registration mode', async () => {
    const { fixture, component } = await setup();
    expect(fixture.nativeElement.querySelector('#display-name')).toBeNull();
    component.toggleMode(); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#display-name')).not.toBeNull();
    component.toggleMode(); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#display-name')).toBeNull();
  });
  it('returns to login after registration without entering the lab', async () => {
    const { fixture, component } = await setup();
    component.toggleMode();await fixture.whenStable();
    const form=fixture.nativeElement.querySelector('form') as HTMLFormElement;
    (form.elements.namedItem('displayName') as HTMLInputElement).value='Linh';
    (form.elements.namedItem('email') as HTMLInputElement).value='linh@example.com';
    (form.elements.namedItem('password') as HTMLInputElement).value='password123';
    const emit=vi.spyOn(component.explore,'emit');
    form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await fixture.whenStable();
    expect(emit).not.toHaveBeenCalled();expect(component.registering()).toBe(false);expect(component.message()).toContain('Đăng ký thành công');
  });
});
