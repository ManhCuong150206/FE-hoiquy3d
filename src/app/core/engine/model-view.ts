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
