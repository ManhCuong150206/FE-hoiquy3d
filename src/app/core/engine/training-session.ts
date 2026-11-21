import { Algorithm } from '../models/experiment';
import { GradientTrace, LearningPreview, LearningSnapshot, Step } from '../models/training-step';
import { gdStep } from './linear';
import { lassoStep } from './lasso';
import { mse, predict } from './metrics';
import { polynomialFeatures } from './polynomial';

export interface TrainingConfig {
  Xtr: number[][]; ytr: number[]; Xte: number[][]; yte: number[];
  algorithm: Algorithm; degree: number; lambda: number;
  initial?:Step;
  lr: number; maxIter: number; tol: number;
}
export function penalty(w: number[], algorithm: Algorithm, lambda: number) {
  return algorithm === 'ridge' ? lambda * w.reduce((s, v) => s + v * v, 0)
    : algorithm === 'lasso' ? lambda * w.reduce((s, v) => s + Math.abs(v), 0) : 0;
}
/** One candidate at a time. Preparing never mutates the committed model. */
export class TrainingSession {
  computeMs = 0;
  setupMs = 0;
  stopReason: 'max-iterations' | 'converged' | null = null;
  current: Step;
  pending: LearningSnapshot | null = null;
  done = false;
  private prev = Infinity;
  private objective(step: Step) { return step.trainLoss + penalty(step.w,this.config.algorithm,this.config.lambda); }
  private Xtr: number[][];
  private Xte: number[][];
  constructor(readonly config: TrainingConfig) {
    const started = performance.now();
    const c = config;
    this.Xtr = c.algorithm === 'polynomial' ? polynomialFeatures(c.Xtr, c.degree) : c.Xtr;
    this.Xte = c.algorithm === 'polynomial' ? polynomialFeatures(c.Xte, c.degree) : c.Xte;
    if (!this.Xtr.length || !this.Xte.length || !this.Xtr[0].length ||
        !Number.isFinite(c.lr) || c.lr <= 0) throw new Error('Dữ liệu train/test hoặc tốc độ học không hợp lệ.');
    const initial=c.initial;
    if(initial && (initial.w.length!==this.Xtr[0].length||!Number.isInteger(initial.iteration)||initial.iteration<0||![...initial.w,initial.b].every(Number.isFinite)))throw new Error('Trọng số đã lưu không khớp dữ liệu.');
    this.current = initial ? this.evaluate([...initial.w],initial.b,initial.iteration) : this.evaluate(new Array(this.Xtr[0].length).fill(0),0,0);
    this.done=this.current.iteration>=c.maxIter;
    if(initial)this.prev=this.objective(this.current);
    this.setupMs = performance.now() - started;
    if (this.done) this.stopReason = 'max-iterations';
  }
  private evaluate(w: number[], b: number, iteration: number): Step {
    return { w, b, iteration, trainLoss: mse(this.config.ytr, predict(this.Xtr, w, b)),
      testLoss: mse(this.config.yte, predict(this.Xte, w, b)) };
  }
  private calculate(trace?: (g: GradientTrace) => void) {
    const started = performance.now();
    try {
      return this.calculateFrom(this.current, trace);
    } finally { this.computeMs += Math.max(0, performance.now() - started); }
  }
  private calculateFrom(old: Step, trace?: (g: GradientTrace) => void) {
    const c = this.config;
    const next = c.algorithm === 'lasso'
      ? lassoStep(this.Xtr, c.ytr, old.w, old.b, c.lr, c.lambda, trace)
      : gdStep(this.Xtr, c.ytr, old.w, old.b, c.lr, c.algorithm === 'ridge' ? c.lambda : 0, trace);
    const after = this.evaluate(next.w, next.b, old.iteration + 1);
    if (![after.trainLoss, after.testLoss, after.b, ...after.w].every(Number.isFinite)) {
      throw new Error('Loss phân kỳ (NaN hoặc vô hạn). Mô hình hữu hạn cuối được giữ lại. Hãy giảm learning rate rồi Reset.');
    }
    return after;
  }
  preview(snapshot: LearningSnapshot): LearningPreview {
    let model = snapshot.after;
    let residual = model;
    const deadline = performance.now() + 40;
    const firstIteration = snapshot.before.iteration;
    const lastIteration = Math.min(firstIteration + 42, this.config.maxIter);
    if (!snapshot.done) {
      while (model.iteration < lastIteration && performance.now() < deadline) {
        try {
          const next = this.calculateFrom(model);
          const converged = Math.abs(this.objective(next) - this.objective(model)) < this.config.tol;
          model = next;
          if (model.iteration <= firstIteration + 22) residual = model;
          if (converged) break;
        } catch {
          // A divergent preview must leave the pending lesson update intact.
          break;
        }
      }
    }
    return {
      residual: { w: residual.w, b: residual.b },
      loss: { w: model.w, b: model.b },
    };
  }
  private isDone(after: Step) {
    this.stopReason = after.iteration >= this.config.maxIter ? 'max-iterations'
      : Math.abs(this.prev - this.objective(after)) < this.config.tol ? 'converged' : null;
    return this.stopReason !== null;
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
    this.current = p.after; this.prev = this.objective(p.after); this.done = p.done; this.pending = null;
    return this.current;
  }
  discard() { this.pending = null; }
  step() {
    if (this.done || this.pending) return null;
    const after = this.calculate();
    this.done = this.isDone(after); this.current = after; this.prev = this.objective(after);
    return after;
  }
}
