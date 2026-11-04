import { signal } from '@angular/core';
import { vi } from 'vitest';
import { AuthSession } from './state/auth-session';
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
    expect(compiled.querySelector('h1')?.textContent).toContain('Hệ thống thực nghiệm và trực quan hóa quá trình học của mô hình hồi quy');
  });
});

describe('App algorithm navigation', () => {
  async function setup(iteration = 0) {
    const algorithm = signal<Algorithm>('linear');
    const count = signal(iteration);
    const pause = vi.fn();
    const setAlgorithm = vi.fn((value: Algorithm) => { algorithm.set(value); count.set(0); });
    TestBed.configureTestingModule({ imports: [App], providers: [{ provide: LabStore, useValue: { algorithm, iteration: count, setAlgorithm, pause, setMode:vi.fn(), resetSession:vi.fn(()=>count.set(0)) } }] });
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
  it('revokes the session and logs out by pausing and clearing private model data before welcome', async () => {
    const { app, pause, setAlgorithm } = await setup(12);
    vi.spyOn(TestBed.inject(AuthSession),'logout').mockResolvedValue();
    await app.logout(); expect(pause).toHaveBeenCalledOnce();
    expect(app.navigate).toHaveBeenCalledWith('welcome', true);
    expect(app.lab.iteration()).toBe(0); expect(setAlgorithm).not.toHaveBeenCalled();
  });
  it('can clean up server-rendered views without browser animation APIs', async () => {
    const { fixture } = await setup();
    vi.stubGlobal('cancelAnimationFrame', undefined);
    try { expect(() => fixture.destroy()).not.toThrow(); }
    finally { vi.unstubAllGlobals(); }
  });

  it('ignores another algorithm selection while the transition is busy', async () => {
    const {app,setAlgorithm}=await setup(12);app.pageBusy.set(true);
    app.chooseAlgorithm('ridge');expect(app.pending()).toBeNull();expect(setAlgorithm).not.toHaveBeenCalled();
  });

});


describe('page execution modes', () => {
  it('uses normal execution on page 3 and teaching on page 4 without resetting the model', async () => {
    TestBed.configureTestingModule({imports:[App]});
    TestBed.overrideComponent(App,{set:{template:'<p>Navigation</p>',imports:[]}});
    const fixture=TestBed.createComponent(App), app=fixture.componentInstance, lab=app.lab;
    await fixture.whenStable();
    app.opened.set(true);app.activeScreen.set('lab');lab.iteration.set(12);
    const x=lab.trainX(), reset=vi.spyOn(lab,'reset');
    app.navigate('learning');expect(lab.mode()).toBe('learn');expect(lab.auto()).toBe(false);
    app.navigate('lab');expect(lab.mode()).toBe('normal');expect(lab.auto()).toBe(false);
    expect(lab.iteration()).toBe(12);expect(lab.trainX()).toBe(x);expect(reset).not.toHaveBeenCalled();
    app.navigate('learning');expect(lab.mode()).toBe('learn');
    app.navigate('algorithms');expect(lab.mode()).toBe('normal');
  });
});
