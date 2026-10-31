import { signal } from '@angular/core';
import { vi } from 'vitest';
import { LabStore } from './state/lab-store';
import { Algorithm } from './core/models/experiment';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Hồi quy 3D');
  });
});

describe('App algorithm navigation', () => {
  async function setup(iteration = 0) {
    const algorithm = signal<Algorithm>('linear');
    const count = signal(iteration);
    const pause = vi.fn();
    const setAlgorithm = vi.fn((value: Algorithm) => { algorithm.set(value); count.set(0); });
    TestBed.configureTestingModule({ imports: [App], providers: [{ provide: LabStore, useValue: { algorithm, iteration: count, setAlgorithm, pause } }] });
    TestBed.overrideComponent(App, { set: { template: '<h1>Navigation test</h1>', imports: [] } });
    const fixture = TestBed.createComponent(App); await fixture.whenStable();
    vi.spyOn(fixture.componentInstance, 'navigate').mockImplementation(() => {});
    return { fixture, app: fixture.componentInstance, algorithm, setAlgorithm, pause };
  }
  it.each<Algorithm>(['linear', 'polynomial', 'ridge', 'lasso'])('opens the existing lab with %s', async (algorithm) => {
    const { fixture, app } = await setup();
    app.chooseAlgorithm(algorithm); await fixture.whenStable();
    expect(app.lab.algorithm()).toBe(algorithm); expect(app.opened()).toBe(true);
    expect(app.preview()).toBe(algorithm); expect(app.navigate).toHaveBeenCalledWith('lab', true);
  });
  it('does not reset a running experiment when reselecting the same algorithm', async () => {
    const { app, setAlgorithm } = await setup(12);
    app.chooseAlgorithm('linear'); expect(setAlgorithm).not.toHaveBeenCalled();
    expect(app.pending()).toBeNull();
  });
  it('requires confirmation before replacing a trained algorithm and can cancel', async () => {
    const { app, setAlgorithm } = await setup(12);
    app.chooseAlgorithm('ridge'); expect(app.pending()).toBe('ridge'); expect(setAlgorithm).not.toHaveBeenCalled();
    app.cancelChange(); expect(app.pending()).toBeNull(); expect(app.lab.algorithm()).toBe('linear');
  });
  it('applies a confirmed selection through the existing store', async () => {
    const { app, fixture, setAlgorithm } = await setup(12);
    app.chooseAlgorithm('lasso'); app.confirmChange(); await fixture.whenStable();
    expect(setAlgorithm).toHaveBeenCalledExactlyOnceWith('lasso'); expect(app.pending()).toBeNull();
  });
  it('logs out of the demo by pausing and returning to welcome without resetting model', async () => {
    const { app, pause, setAlgorithm } = await setup(12);
    app.logout(); expect(pause).toHaveBeenCalledOnce();
    expect(app.navigate).toHaveBeenCalledWith('welcome', true);
    expect(app.lab.iteration()).toBe(12); expect(setAlgorithm).not.toHaveBeenCalled();
  });
  it('can clean up server-rendered views without browser animation APIs', async () => {
    const { fixture } = await setup();
    vi.stubGlobal('cancelAnimationFrame', undefined);
    try { expect(() => fixture.destroy()).not.toThrow(); }
    finally { vi.unstubAllGlobals(); }
  });

});
