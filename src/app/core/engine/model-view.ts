import { Algorithm } from '../models/experiment';
import { polynomialFeatures } from './polynomial';
import { predict } from './metrics';

/** The displayed x/z are x1/x2. Remaining features define an explicit slice. */
export function sliceRow(x1: number, x2: number, dimension: number, fixed: number[] = []) {
  return Array.from({ length: dimension }, (_, j) => j === 0 ? x1 : j === 1 ? x2 : fixed[j] ?? 0);
}
export function modelPredictions(rows: number[][], w: number[], b: number, algorithm: Algorithm, degree: number) {
  const features = algorithm === 'polynomial' ? polynomialFeatures(rows, degree) : rows;
  return predict(features, w, b);
}

/** Strict residual threshold, in the same units as y (not display coordinates). */
export function countStuck(yTrue: number[], yPred: number[], eps: number): number {
  if (yTrue.length !== yPred.length) throw new RangeError('True and predicted values must have equal length.');
  if (!Number.isFinite(eps) || eps <= 0) return 0;
  return yTrue.reduce((count, y, i) => count + Number(
    Number.isFinite(y) && Number.isFinite(yPred[i]) && Math.abs(y - yPred[i]) < eps,
  ), 0);
}
