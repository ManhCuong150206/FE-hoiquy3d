import { buildDataset, parseCsv } from './csv';
import { trainTestSplit } from './synthetic';
import { modelPredictions, sliceRow } from './model-view';
import { polynomialFeatures, polynomialPowers } from './polynomial';

describe('learning data and 3D coordinates', () => {
  it('keeps original/filled/standardized values aligned after filtering and shuffling', () => {
    const t = parseCsv('a,b,y\n' + Array.from({ length: 20 }, (_, i) => `${i === 2 ? '' : i},${2*i},${i === 3 ? '' : 3*i+1}`).join('\n'));
    const result = buildDataset(t, { xCols: [0, 1], yCol: 2, missing: 'mean', standardize: true });
    expect(result.used).toBe(19); expect(result.filledCells).toBe(1);
    const split = trainTestSplit(result.X, result.y, .8, 43), p = result.provenance!;
    for (const [i, originalIndex] of split.train.indices.entries()) {
      const r = p.rows[originalIndex];
      [...split.train.X[i], split.train.y[i]].forEach((v, j) => {
        expect(v).toBe((r.filled[j] - p.stats[j].mean) / p.stats[j].sd);
      });
      expect(r.original[1]).toBe(t.rows[r.sourceRow - 2][1]);
    }
    expect(p.rows.find(r => r.sourceRow === 4)?.original[0]).toBe('');
    const dropped = buildDataset(t, { xCols: [0], yCol: 2, missing: 'drop', standardize: false });
    expect(dropped.used).toBe(18);
    expect(dropped.provenance!.rows.some(r => r.sourceRow === 4 || r.sourceRow === 5)).toBe(false);
  });
  it('uses the same polynomial term order for names and values', () => {
    expect(polynomialPowers(2, 2)).toEqual([[1,0],[0,1],[2,0],[1,1],[0,2]]);
    expect(polynomialFeatures([[2,3]], 2)[0]).toEqual([2,3,4,6,9]);
  });
  for (const algorithm of ['linear', 'polynomial', 'ridge', 'lasso'] as const) {
    it(`${algorithm}: selected prediction lies on the selected slice with 3 features`, () => {
      const row = [1.2, -.8, 2.5];
      const w = new Array(algorithm === 'polynomial' ? 9 : 3).fill(.25);
      const point = modelPredictions([row], w, .4, algorithm, 2)[0];
      const slice = modelPredictions([sliceRow(row[0], row[1], 3, row)], w, .4, algorithm, 2)[0];
      expect(slice).toBe(point);
      expect(sliceRow(1, 2, 1)).toEqual([1]);
      expect(sliceRow(1, 2, 3)).toEqual([1,2,0]);
      const scale = .7, y = 4;
      expect((point*scale-y*scale)/scale).toBeCloseTo(point-y, 12);
    });
  }
});
