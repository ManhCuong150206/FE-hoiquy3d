import { Algorithm } from '../models/experiment';
import { GradientTrace, LearningSnapshot, Step } from '../models/training-step';
import { gdStep } from './linear';
import { lassoStep } from './lasso';
import { mse, predict } from './metrics';
import { polynomialFeatures } from './polynomial';

export interface TrainingConfig {
  Xtr: number[][]; ytr: number[]; Xte: number[][]; yte: number[];
  algorithm: Algorithm; degree: number; lambda: number;
  lr: number; maxIter: number; tol: number;
}
export function penalty(w: number[], algorithm: Algorithm, lambda: number) {
  return algorithm === 'ridge' ? lambda * w.reduce((s, v) => s + v * v, 0)
    : algorithm === 'lasso' ? lambda * w.reduce((s, v) => s + Math.abs(v), 0) : 0;
}
/** One candidate at a time. Preparing never mutates the committed model. */
export class TrainingSession {
  current: Step;
  pending: LearningSnapshot | null = null;
  done = false;
  private prev = Infinity;
  private Xtr: number[][];
  private Xte: number[][];
  constructor(readonly config: TrainingConfig) {
    const c = config;
    this.Xtr = c.algorithm === 'polynomial' ? polynomialFeatures(c.Xtr, c.degree) : c.Xtr;
    this.Xte = c.algorithm === 'polynomial' ? polynomialFeatures(c.Xte, c.degree) : c.Xte;
    if (!this.Xtr.length || !this.Xte.length || !this.Xtr[0].length ||
        !Number.isFinite(c.lr) || c.lr <= 0) throw new Error('Dữ liệu train/test hoặc tốc độ học không hợp lệ.');
    this.current = this.evaluate(new Array(this.Xtr[0].length).fill(0), 0, 0);
  }
  private evaluate(w: number[], b: number, iteration: number): Step {
    return { w, b, iteration, trainLoss: mse(this.config.ytr, predict(this.Xtr, w, b)),
      testLoss: mse(this.config.yte, predict(this.Xte, w, b)) };
  }
  private calculate(trace?: (g: GradientTrace) => void) {
    const c = this.config, old = this.current;
    const next = c.algorithm === 'lasso'
      ? lassoStep(this.Xtr, c.ytr, old.w, old.b, c.lr, c.lambda, trace)
      : gdStep(this.Xtr, c.ytr, old.w, old.b, c.lr, c.algorithm === 'ridge' ? c.lambda : 0, trace);
    const after = this.evaluate(next.w, next.b, old.iteration + 1);
    if (![after.trainLoss, after.testLoss, after.b, ...after.w].every(Number.isFinite)) {
      throw new Error('Loss phân kỳ (NaN hoặc vô hạn). Mô hình hữu hạn cuối được giữ lại. Hãy giảm learning rate rồi Reset.');
    }
    return after;
  }
  private isDone(after: Step) {
    return after.iteration >= this.config.maxIter || Math.abs(this.prev - after.trainLoss) < this.config.tol;
  }
  prepare() {
    if (this.pending || this.done) return this.pending;
    let trace: GradientTrace = { gradient: [], biasGradient: 0 };
    const after = this.calculate(g => trace = g), c = this.config;
    this.pending = { ...trace, before: this.current, after, algorithm: c.algorithm, degree: c.degree,
      lr: c.lr, lambda: c.lambda, trainCount: this.Xtr.length,
      penaltyBefore: penalty(this.current.w, c.algorithm, c.lambda),
      penaltyAfter: penalty(after.w, c.algorithm, c.lambda), done: this.isDone(after) };
    return this.pending;
  }
  commit(iteration: number) {
    if (!this.pending || this.pending.after.iteration !== iteration) return null;
    const p = this.pending;
    this.current = p.after; this.prev = p.after.trainLoss; this.done = p.done; this.pending = null;
    return this.current;
  }
  discard() { this.pending = null; }
  step() {
    if (this.done || this.pending) return null;
    const after = this.calculate();
    this.done = this.isDone(after); this.current = after; this.prev = after.trainLoss;
    return after;
  }
}
