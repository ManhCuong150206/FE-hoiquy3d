import { countStuck, modelPredictions, sliceRow } from './model-view';

describe('countStuck', () => {
  it('uses the strict absolute residual threshold, including negative y', () => {
    expect(countStuck([1, -2, 3, 4], [1, -2.25, 3.5, 5], .5)).toBe(2);
    expect(countStuck([1, 2], [1, 2], 0)).toBe(0);
    expect(countStuck([], [], .3)).toBe(0);
  });
  it('does not count invalid values or invalid thresholds', () => {
    expect(countStuck([0, NaN, Infinity, 1], [NaN, 0, Infinity, 1], .3)).toBe(1);
    for (const eps of [-1, NaN, Infinity]) expect(countStuck([1], [1], eps)).toBe(0);
    expect(() => countStuck([1, 2], [1], .3)).toThrow(RangeError);
  });
  it('gives the same count when raw y and epsilon are rescaled together', () => {
    const y = [10, 20, 30], p = [11, 18, 34];
    expect(countStuck(y, p, 3)).toBe(2);
    expect(countStuck(y.map(v => v * 1000), p.map(v => v * 1000), 3000)).toBe(2);
  });
  for (const algorithm of ['linear', 'ridge', 'lasso', 'polynomial'] as const) {
    it(`${algorithm}: counts full-dimensional predictions, not the visible slice`, () => {
      const rows = [[1, 2, 3], [-1, 0, 4]];
      const w = algorithm === 'polynomial' ? [0, 0, 2, 0, 0, 0, 0, 0, 1] : [0, 0, 2];
      const y = algorithm === 'polynomial' ? [16, 25] : [7, 9];
      const predictions = modelPredictions(rows, w, 1, algorithm, 2);
      expect(countStuck(y, predictions, .1)).toBe(2);
      const sliced = rows.map(row => sliceRow(row[0], row[1], 3));
      expect(countStuck(y, modelPredictions(sliced, w, 1, algorithm, 2), .1)).toBe(0);
      expect(rows).toEqual([[1, 2, 3], [-1, 0, 4]]);
    });
  }
});
