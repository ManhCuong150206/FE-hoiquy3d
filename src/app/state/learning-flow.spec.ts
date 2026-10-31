import { TestBed } from '@angular/core/testing';
import { LabStore } from './lab-store';
import { TrainingSession } from '../core/engine/training-session';

/** Queued transport with real engine: exercise stale replies and the F acknowledgement. */
class QueuedWorker {
  static last: QueuedWorker;
  onmessage?: (event: { data: any }) => void;
  onerror?: () => void;
  queue: any[] = [];
  session?: TrainingSession;
  terminated = false;
  runId = 0;
  constructor() { QueuedWorker.last = this; }
  postMessage(data: any) { this.queue.push(data); }
  terminate() { this.terminated = true; }
  reply(data: any) { this.onmessage?.({ data: { ...data, runId: this.runId } }); }
  flush() {
    while (this.queue.length && !this.terminated) {
      const data = this.queue.shift();
      if (data.type === 'init') { this.runId = data.runId; this.session = new TrainingSession(data); this.report(); }
      else if (data.runId !== this.runId) continue;
      else if (data.type === 'pause') this.reply({ type: 'paused', requestId: data.requestId });
      else if (data.type === 'prepare') this.reply({ type: 'prepared', snapshot: this.session!.prepare() });
      else if (data.type === 'commit') { if (this.session!.commit(data.iteration)) this.report(); }
      else if (data.type === 'discard') this.session!.discard();
      else if (data.type === 'step' || data.type === 'play') { this.session!.step(); this.report(); }
    }
  }
  report() { this.reply({ type: 'step', ...this.session!.current, done: this.session!.done }); }
}

describe('six-phase learning flow', () => {
  let lab: LabStore;
  beforeEach(() => {
    vi.useFakeTimers(); vi.stubGlobal('Worker', QueuedWorker);
    TestBed.configureTestingModule({}); lab = TestBed.inject(LabStore); QueuedWorker.last.flush();
    lab.setMode('learn'); QueuedWorker.last.flush();
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.useRealTimers(); vi.unstubAllGlobals(); });
  const flush = () => QueuedWorker.last.flush();
  it('A–E keep the old model, F commits once after acknowledgement', () => {
    const old = lab.latest(); lab.nextPhase(); flush();
    for (let phase = 0; phase < 5; phase++) {
      expect(lab.phase()).toBe(phase); expect(lab.latest()).toBe(old); lab.nextPhase();
    }
    expect(lab.phase()).toBe(4); expect(lab.busy()).toBe(true);
    lab.nextPhase(); // repeated button press while committing is ignored
    flush(); expect(lab.phase()).toBe(5); expect(lab.iteration()).toBe(1);
    expect(lab.history()).toHaveLength(2);
    lab.nextPhase(); flush(); expect(lab.phase()).toBe(0); expect(lab.iteration()).toBe(1);
  });
  it('defaults to one second, pauses, resumes and adjusts demonstration duration', () => {
    expect(lab.phaseSeconds()).toBe(1); lab.play(); flush();
    vi.advanceTimersByTime(999); expect(lab.phase()).toBe(0);
    vi.advanceTimersByTime(1); expect(lab.phase()).toBe(1);
    lab.pause(); vi.advanceTimersByTime(5000); expect(lab.phase()).toBe(1);
    lab.setPhaseSeconds(.5); lab.play(); vi.advanceTimersByTime(500); expect(lab.phase()).toBe(2);
    lab.toggleExpanded(); vi.advanceTimersByTime(5000); expect(lab.phase()).toBe(2); expect(lab.auto()).toBe(false);
  });
  it('manual advance pauses autoplay and sample selection never changes training', () => {
    lab.play(); flush(); const snapshot = lab.snapshot();
    lab.selectSample(4); expect(lab.snapshot()).toBe(snapshot); expect(lab.selectedX()).toBe(lab.trainX()[4]);
    lab.nextPhase(); expect(lab.auto()).toBe(false); vi.advanceTimersByTime(2000); expect(lab.phase()).toBe(1);
  });
  it('reset rejects pending replies from the old run', () => {
    lab.nextPhase(); flush(); const stale = lab.snapshot(); const worker = QueuedWorker.last;
    lab.reset(); worker.reply({ type: 'prepared', snapshot: stale });
    expect(lab.snapshot()).toBeNull(); flush(); expect(lab.iteration()).toBe(0); expect(lab.phase()).toBe(0);
  });
  it('stop cancels a pending request and can restart', () => {
    lab.nextPhase(); const worker = QueuedWorker.last; lab.stop();
    worker.reply({ type: 'prepared', snapshot: worker.session!.prepare() });
    expect(lab.snapshot()).toBeNull(); expect(lab.busy()).toBe(false);
    lab.nextPhase(); flush(); expect(lab.snapshot()).not.toBeNull(); expect(lab.phase()).toBe(0);
  });
  it('mode changes discard an uncommitted step and wait for pause', () => {
    lab.nextPhase(); flush(); lab.setMode('normal'); lab.play();
    expect(lab.switching()).toBe(true); expect(lab.iteration()).toBe(0);
    flush(); expect(lab.snapshot()).toBeNull(); expect(lab.switching()).toBe(false);
    lab.step(); flush(); expect(lab.iteration()).toBe(1);
    lab.setMode('learn'); flush(); lab.nextPhase(); flush(); expect(lab.snapshot()?.before.iteration).toBe(1);
  });
  it('configuration change invalidates snapshot and retains teaching mode', () => {
    lab.nextPhase(); flush(); lab.setAlgorithm('lasso'); flush();
    expect(lab.snapshot()).toBeNull(); expect(lab.mode()).toBe('learn'); expect(lab.iteration()).toBe(0);
    lab.nextPhase(); flush(); expect(lab.snapshot()?.intermediate).toBeDefined();
  });
  it('automatically stops at final F and does not apply another iteration', () => {
    lab.setMaxIterations(1); flush(); lab.play(); flush();
    for (let i = 0; i < 5; i++) { vi.advanceTimersByTime(1000); flush(); }
    expect(lab.phase()).toBe(5); expect(lab.status()).toBe('done'); expect(lab.auto()).toBe(false);
    vi.advanceTimersByTime(10000); flush(); expect(lab.iteration()).toBe(1);
  });
  it('runs exactly one iteration and remains at F until another explicit request', () => {
    lab.playIteration(); flush();
    expect(lab.phase()).toBe(0);
    for(let i=0;i<5;i++){vi.advanceTimersByTime(1000);flush();}
    expect(lab.phase()).toBe(5);expect(lab.iteration()).toBe(1);expect(lab.auto()).toBe(false);
    vi.advanceTimersByTime(20000);flush();expect(lab.iteration()).toBe(1);
    lab.playIteration();flush();expect(lab.phase()).toBe(0);
    for(let i=0;i<5;i++){vi.advanceTimersByTime(1000);flush();}
    expect(lab.iteration()).toBe(2);expect(lab.auto()).toBe(false);
  });
  it('pauses and resumes one-iteration presentation without applying duplicate updates', () => {
    lab.playIteration();flush();vi.advanceTimersByTime(1000);flush();
    lab.pausePresentation();vi.advanceTimersByTime(5000);flush();expect(lab.phase()).toBe(1);
    lab.playIteration();
    for(let i=0;i<4;i++){vi.advanceTimersByTime(1000);flush();}
    expect(lab.iteration()).toBe(1);expect(lab.auto()).toBe(false);
  });

});
