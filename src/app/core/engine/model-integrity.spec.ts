import { buildDataset, parseCsv } from './csv';
import { modelVisibility } from './model-view';
import { makeSyntheticData } from './synthetic';
import { polynomialTermNames } from './polynomial';

describe('model integrity regressions', () => {
  it('fits imputation and scaling on train even if only test values change', () => {
    const table = parseCsv('x,z,y\n' + Array.from({length:40}, (_, i) => `${i},${2*i},${3*i+1}`).join('\n'));
    const options = {xCols:[0,1],yCol:2,missing:'mean' as const,standardize:true,trainRatio:.7,splitSeed:123};
    const initial = buildDataset(table, options);
    const trainMissing = initial.split!.trainIndices[0]; table.rows[trainMissing][0]='';
    const a = buildDataset(table, options);
    const changed = structuredClone(table);
    for (const i of a.split!.testIndices) changed.rows[i]=['1000000','-2000000','3000000'];
    const c = buildDataset(changed, options);
    expect(c.split).toEqual(a.split);
    expect(c.provenance!.stats).toEqual(a.provenance!.stats);
    expect(c.provenance!.fillValues).toEqual(a.provenance!.fillValues);
    for (const i of a.split!.trainIndices) { expect(c.X[i]).toEqual(a.X[i]); expect(c.y[i]).toBe(a.y[i]); }
    const index = a.split!.testIndices[0], stat=c.provenance!.stats[0];
    expect(c.X[index][0]).toBeCloseTo((1000000-stat.mean)/stat.sd);
    expect(c.provenance!.rows[index].original[0]).toBe('1000000');
  });
  it('rejects empty partitions and handles constant train columns without NaN', () => {
    const t=parseCsv('x,y\n'+Array.from({length:12},(_,i)=>`5,${i}`).join('\n'));
    expect(buildDataset(t,{xCols:[0],yCol:1,missing:'drop',standardize:true,trainRatio:1}).error).toBeTruthy();
    const r=buildDataset(t,{xCols:[0],yCol:1,missing:'drop',standardize:true});
    expect(r.X.every(row=>row[0]===0)).toBe(true);expect(r.provenance!.stats[0].sd).toBe(1);
  });
  it('has one visibility policy for 1D/2D, zero epsilon, phases and invalid extrapolation', () => {
    expect(modelVisibility(1,false,5,0,false)).toEqual({plane:false,line:true,bands:false});
    expect(modelVisibility(2,false,0,.2,false)).toEqual({plane:true,line:false,bands:true});
    for (const dimension of [1,2,5]) {
      expect(modelVisibility(dimension,true,0,.2,false)).toEqual({plane:false,line:false,bands:false});
      expect(modelVisibility(dimension,false,5,.2,true)).toEqual({plane:false,line:false,bands:false});
    }
  });
  for (const kind of ['linear','curved','correlated','sparse'] as const) {
    it(`${kind}: regenerates exactly from the same seed`, () => {
      const a=makeSyntheticData(100,3,0,42,kind),b=makeSyntheticData(100,3,0,42,kind);
      expect(a).toEqual(b);expect(a.X).not.toEqual(makeSyntheticData(100,3,0,43,kind).X);
      expect(a.y.every(Number.isFinite)).toBe(true);
    });
  }
  it('demonstrates nonlinear curvature, correlated inputs and exactly irrelevant sparse features', () => {
    const curve=makeSyntheticData(100,2,0,42,'curved');
    curve.X.forEach(([x,z],i)=>expect(curve.y[i]).toBe(.4+.35*x+.6*x*x-.3*z*z+.25*x*z));
    const sparse=makeSyntheticData(100,4,0,42,'sparse');
    sparse.X.forEach((row,i)=>expect(sparse.y[i]).toBe(.4+1.5*row[0]));
    const c=makeSyntheticData(1000,2,0,42,'correlated');
    expect(c.X.reduce((s,r)=>s+(r[1]-.98*r[0])**2,0)/1000).toBeLessThan(.01);
    expect(polynomialTermNames(2,2)).toEqual(['x1','x2','x1^2','x1 × x2','x2^2']);
  });
});
