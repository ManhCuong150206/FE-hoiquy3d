import { describe, it, expect } from 'vitest';
import { experimentPayload, readExperiment } from './experiment-payload';
import { SavedExperiment } from './experiment';
const saved = {
 id: 'stable', name: 'Tên đã lưu', createdAt: 1234, algorithm: 'polynomial', degree: 2,
 learningRate: .01, maxIterations: 100, iterations: 10, dataSource: 'synthetic',
 sampleCount: 100, featureCount: 2, noise: 8, seed: 42, trainRatio: .8,
 synthetic: {kind:'linear',version:1,sampleCount:100,featureCount:2,noise:8,seed:42,trainRatio:.8},
 csvName: null, w: [1,2], b: 0, train: {mse:1,rmse:1,mae:1,r2:.5}, test: {mse:1,rmse:1,mae:1,r2:.5},
 synced:false,scopeId:'owner',mutationId:'mutation',serverVersion:0,
} as SavedExperiment;
it('sends synthetic settings once and preserves name, time and results', () => {
 const body=experimentPayload(saved);
 expect(body).toMatchObject({id:'stable',name:saved.name,clientCreatedAt:1234,synthetic:saved.synthetic,degree:2,status:'completed',w:saved.w});
 for(const key of ['csvName','csvData','noise','seed','trainRatio','sampleCount','featureCount','lambda','createdAt','synced','scopeId','mutationId','serverVersion']) expect(body).not.toHaveProperty(key);
});
it('sends CSV data without synthetic settings or unrelated algorithm parameters', () => {
 const csvData={trainX:[[1,2]],trainY:[1],testX:[[3,4]],testY:[2],trainIndices:[0]};
 const body=experimentPayload({...saved,dataSource:'csv',algorithm:'ridge',lambda:.1,csvName:'test.csv',csvData});
 expect(body).toMatchObject({csvName:'test.csv',csvData,lambda:.1,sampleCount:100,featureCount:2});
 for(const key of ['synthetic','noise','degree'])expect(body).not.toHaveProperty(key);
});
it('reads both compact server data and old local snapshots', () => {
 expect(readExperiment(saved)).toMatchObject(saved);
 const compact={...experimentPayload(saved),clientId:saved.id,algorithm:{type:'polynomial',config:{degree:2}}};
 expect(readExperiment(compact as unknown as SavedExperiment)).toMatchObject({id:saved.id,name:saved.name,createdAt:1234,algorithm:'polynomial',degree:2,sampleCount:100,featureCount:2,noise:8,csvName:null,w:saved.w});
 const legacy={...saved,synthetic:undefined};
 expect(experimentPayload(legacy)).toHaveProperty('synthetic.kind','linear');
});
