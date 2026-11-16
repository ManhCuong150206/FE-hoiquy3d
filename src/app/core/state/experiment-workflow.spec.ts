import { TestBed } from '@angular/core/testing';
import { LabStore } from './lab-store';

describe('experiment snapshots and held-out test boundary', () => {
  let lab: LabStore;
  beforeEach(() => { TestBed.configureTestingModule({}); lab = TestBed.inject(LabStore); });
  it('keeps validation unchanged when tuning hyperparameters and snapshots the old configuration', () => {
    const X = lab.validationX(), train = lab.trainX();
    lab.history.set([{ iteration: 3, w: [.1,.2], b: 0, trainLoss: 1, testLoss: 1 }]); lab.iteration.set(3); lab.status.set('paused');
    const first = lab.recordTrial()!;
    lab.setLearningRate(.03);
    expect(lab.trainX()).toBe(train); expect(lab.validationX()).toBe(X);
    expect(first.learningRate).toBe(.01); expect(lab.trials()[0].learningRate).toBe(.01);
    expect(lab.finalTest()).toBeNull();
  });
  it('reveals test only on explicit evaluation and retains disclosure after another run', () => {
    lab.history.set([{ iteration: 1, w: [.1,.2], b: 0, trainLoss: 1, testLoss: 1 }]); lab.iteration.set(1); lab.status.set('paused');
    expect(lab.finalTest()).toBeNull();
    lab.evaluateFinalTest(); expect(lab.finalTest()!.mse).toBeGreaterThanOrEqual(0);
    expect(lab.testWasOpened()).toBe(true); expect(lab.trials()[0].testExposed).toBe(true);
    lab.setLambda(.2); expect(lab.finalTest()).toBeNull(); expect(lab.testWasOpened()).toBe(true);
    lab.generateData(); expect(lab.testWasOpened()).toBe(true);
    lab.seed.set(7); lab.generateData(); expect(lab.testWasOpened()).toBe(false);
  });
  it('clears the learning journal on logout or account switch', () => {
    lab.history.set([{ iteration: 1, w: [.1,.2], b: 0, trainLoss: 1, testLoss: 1 }]); lab.iteration.set(1);
    lab.recordTrial(); expect(lab.trials()).toHaveLength(1);
    lab.resetSession(); expect(lab.trials()).toEqual([]); expect(lab.baselineId()).toBeNull();
  });
});
