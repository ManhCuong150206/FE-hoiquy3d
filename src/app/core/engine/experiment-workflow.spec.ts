import { describe, it, expect, vi } from 'vitest';
import { learningSplit, compareTrials, Trial } from './experiment-workflow';
import { buildDataset, parseCsv } from './csv';
import { TrainingSession } from './training-session';

describe('controlled machine learning experiments', () => {
  it('partitions every row once and preserves partitions across repeats', () => {
    const X = Array.from({ length: 100 }, (_, i) => [i]), y = X.map(r => r[0]);
    const split = learningSplit(X, y, .8, 43);
    expect([split.train.X.length, split.validation.X.length, split.test.X.length]).toEqual([64, 16, 20]);
    const indices = [split.train, split.validation, split.test].flatMap(s => s.indices);
    expect(new Set(indices).size).toBe(100);
    expect([...indices].sort((a,b) => a-b)).toEqual(X.map((_, i) => i));
    expect(learningSplit(X, y, .8, 43)).toEqual(split);
  });
  it('learns imputation and scaling only from train, even with held-out outliers', () => {
    const rows = Array.from({ length: 50 }, (_, i) => [i, i * 2 + 1]);
    const indices = learningSplit(rows.map(r => [r[0]]), rows.map(r => r[1]), .8, 43);
    const render = () => parseCsv('x,y\n' + rows.map(r => r.join(',')).join('\n'));
    const options = { xCols: [0], yCol: 1, missing: 'mean' as const, standardize: true, validation: true };
    const before = buildDataset(render(), options);
    for (const i of [...indices.validation.indices, ...indices.test.indices]) rows[i] = [1e9, 2e9];
    const after = buildDataset(render(), options);
    expect(after.provenance!.stats).toEqual(before.provenance!.stats);
    expect(after.provenance!.fillValues).toEqual(before.provenance!.fillValues);
    expect(after.split).toEqual(before.split);
    for (const i of before.split!.trainIndices) expect(after.X[i]).toEqual(before.X[i]);
  });
  it('measures computation without counting time spent reading a prepared phase', () => {
    let clock = 0;
    const spy = vi.spyOn(performance, 'now').mockImplementation(() => clock++);
    try {
      const engine = new TrainingSession({ Xtr: [[1],[2]], ytr: [2,4], Xte: [[3]], yte: [6], algorithm: 'linear', degree: 1, lambda: 0, lr: .01, maxIter: 1, tol: 1e-6 });
      const snapshot = engine.prepare()!;
      const measured = engine.computeMs;
      clock += 10000;
      expect(engine.current.iteration).toBe(0);
      engine.commit(snapshot.after.iteration);
      expect(engine.computeMs).toBe(measured);
      expect(measured).toBeGreaterThan(0);
      expect(engine.stopReason).toBe('max-iterations');
    } finally { spy.mockRestore(); }
  });
  it('refuses to compare quality across different datasets', () => {
    const metrics = { mse: 1, rmse: 1, mae: 1, r2: 0 };
    const row: Trial = { id: 1, dataset: 1, algorithm: 'linear', learningRate: .01, maxIterations: 100,
      degree: 2, lambda: 0, iterations: 100, computeMs: 10, setupMs: 1, reason: 'max', mode: 'normal',
      hypothesis: 'baseline', conclusion: '', train: metrics, validation: metrics, testExposed: false };
    expect(compareTrials({ ...row, id: 2, dataset: 2 }, row)).toContain('Khác dữ liệu');
    expect(compareTrials({ ...row, id: 2, mode: 'learn' }, row)).toContain('Khác chế độ');
  });
});
