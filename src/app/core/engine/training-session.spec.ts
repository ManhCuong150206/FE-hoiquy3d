import { TrainingConfig, TrainingSession, penalty } from './training-session';
import { gdStep } from './linear';
import { lassoStep } from './lasso';
import { polynomialFeatures } from './polynomial';
import { makeLinearData, trainTestSplit } from './synthetic';
import { predict, mse } from './metrics';

const data = makeLinearData(500, 2, .16, 42);
const split = trainTestSplit(data.X, data.y, .8, 43);
const config: TrainingConfig = { Xtr: split.train.X, ytr: split.train.y, Xte: split.test.X, yte: split.test.y,
  algorithm: 'linear', degree: 2, lambda: .1, lr: .01, maxIter: 100, tol: 1e-6 };

describe('real training snapshots', () => {
  for (const algorithm of ['linear', 'polynomial', 'ridge', 'lasso'] as const) {
    it(`${algorithm}: prepared and ordinary steps exactly match engine arithmetic`, () => {
      const c = { ...config, algorithm };
      const normal = new TrainingSession(c), teaching = new TrainingSession(c);
      const X = algorithm === 'polynomial' ? polynomialFeatures(c.Xtr, c.degree) : c.Xtr;
      for (let i = 0; i < 100 && !normal.done; i++) {
        const old = structuredClone(teaching.current);
        const p = teaching.prepare()!;
        expect(teaching.current).toEqual(old);
        expect(teaching.prepare()).toBe(p);
        const expected = algorithm === 'lasso' ? lassoStep(X, c.ytr, old.w, old.b, c.lr, c.lambda)
          : gdStep(X, c.ytr, old.w, old.b, c.lr, algorithm === 'ridge' ? c.lambda : 0);
        expect(p.after.w).toEqual(expected.w);
        expect(p.after.b).toBe(expected.b);
        expect(p.before.trainLoss).toBe(mse(c.ytr, predict(X, old.w, old.b)));
        expect(p.penaltyAfter).toBe(penalty(expected.w, algorithm, c.lambda));
        expect(teaching.commit(p.after.iteration + 1)).toBeNull();
        teaching.commit(p.after.iteration);
        expect(teaching.commit(p.after.iteration)).toBeNull();
        normal.step();
        expect(teaching.current).toEqual(normal.current);
        expect(teaching.done).toBe(normal.done);
        p.gradient.forEach((g, j) => {
          const u = old.w[j] - c.lr * g;
          const next = algorithm === 'lasso' ? Math.sign(u) * Math.max(Math.abs(u) - c.lr * c.lambda, 0) : u;
          expect(p.after.w[j]).toBeCloseTo(next, 13);
        });
      }
    });
  }
  it('reproduces the inspected iteration 1 → 2 and does not train on test labels', () => {
    const a = new TrainingSession(config), b = new TrainingSession({ ...config, yte: config.yte.map(v => v + 100) });
    a.step(); a.step(); b.step(); b.step();
    expect(a.current.trainLoss).toBeCloseTo(.6906967266103442, 14);
    expect(a.current.w).toEqual(b.current.w);
    expect(a.current.b).toBe(b.current.b);
    expect(a.current.testLoss).not.toBe(b.current.testLoss);
  });
  it('discard and divergence preserve the committed model', () => {
    const a = new TrainingSession(config), old = a.current;
    a.prepare(); a.discard(); expect(a.commit(1)).toBeNull(); expect(a.current).toBe(old);
    const bad = new TrainingSession({ ...config, lr: Number.MAX_VALUE });
    expect(() => bad.prepare()).toThrow(); expect(bad.current.iteration).toBe(0);
  });
  it('reports increasing loss honestly', () => {
    const a = new TrainingSession({ ...config, lr: 10 });
    const p = a.prepare()!;
    expect(p.after.trainLoss).toBeGreaterThan(p.before.trainLoss);
  });
});
