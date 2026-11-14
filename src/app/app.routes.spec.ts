import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routes } from './app.routes';
import { AccountApi } from './features/account/account-api';

@Component({ template: 'Account route' })
class AccountRouteStub {}

describe('home and account routing', () => {
  afterEach(() => vi.unstubAllGlobals());
  async function setup(allowed: boolean) {
    TestBed.configureTestingModule({ providers: [provideRouter(routes.map(route => route.path === 'account'
      ? { ...route, loadComponent: () => Promise.resolve(AccountRouteStub) } : route))] });
    const api = TestBed.inject(AccountApi);
    const load = vi.spyOn(api, 'load');
    if (allowed) load.mockResolvedValue();
    else load.mockRejectedValue(new Error('Vui lòng đăng nhập để tiếp tục.'));
    const harness = await RouterTestingHarness.create();
    return { harness, router: TestBed.inject(Router), load };
  }
  it('opens the existing home without an account request', async () => {
    const { harness, router, load } = await setup(false);
    await harness.navigateByUrl('/');
    expect(router.url).toBe('/'); expect(load).not.toHaveBeenCalled();
    expect(harness.routeNativeElement).toBeNull();
  });
  it('opens account and returns to the home without another outlet component', async () => {
    const { harness, router } = await setup(true);
    await harness.navigateByUrl('/account', AccountRouteStub);
    expect(router.url).toBe('/account');
    await harness.navigateByUrl('/');
    expect(router.url).toBe('/'); expect(harness.routeNativeElement).toBeNull();
  });
  it('redirects an unauthenticated account visit to the existing home', async () => {
    const { harness, router } = await setup(false);
    await harness.navigateByUrl('/account');
    expect(router.url).toBe('/'); expect(harness.routeNativeElement).toBeNull();
  });
});
