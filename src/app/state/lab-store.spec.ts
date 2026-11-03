import { TestBed } from '@angular/core/testing';
import { SavedExperiment } from '../core/models/experiment';
import { LabStore } from './lab-store';

describe('LabStore', () => {
  let service: LabStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LabStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('ignores hidden-feature magnitude when fitting the displayed coordinates', () => {
    service.trainX.set([[1,2,1e12]]);service.testX.set([[2,3,-1e12]]);
    service.trainY.set([4]);service.testY.set([2]);expect(service.dataScale()).toBe(1);
  });
  it('preserves prepared CSV partitions and source mapping without a second shuffle', () => {
    service.loadDataset([[1],[2],[3]],[4,5,6],'test.csv',undefined,{trainIndices:[2,0],testIndices:[1]});
    expect(service.trainX()).toEqual([[3],[1]]);expect(service.testY()).toEqual([5]);expect(service.trainIndices()).toEqual([2,0]);
  });
  it('restores synthetic profiles and falls back to the legacy linear generator', () => {
    const saved: SavedExperiment={id:'t',name:'t',createdAt:0,algorithm:'ridge',learningRate:.01,maxIterations:100,
      dataSource:'synthetic',csvName:null,sampleCount:50,featureCount:3,noise:8,seed:42,trainRatio:.8,
      iterations:0,w:[],b:0,train:{mse:0,rmse:0,mae:0,r2:0},test:{mse:0,rmse:0,mae:0,r2:0},synced:false,
      synthetic:{kind:'curved',version:1,sampleCount:50,featureCount:3,noise:8,seed:42,trainRatio:.8}};
    service.applyConfig(saved); const x=structuredClone(service.trainX()),y=[...service.trainY()];
    service.setAlgorithm('lasso');expect(service.trainX()).toEqual(x);
    service.applyConfig(saved);expect(service.trainY()).toEqual(y);expect(service.syntheticKind()).toBe('curved');
    service.applyConfig({...saved,synthetic:undefined});expect(service.syntheticKind()).toBe('linear');
    const old=service.trainX();
    const future=JSON.parse(JSON.stringify({...saved,synthetic:{...saved.synthetic,version:2}})) as SavedExperiment;
    expect(()=>service.applyConfig(future)).toThrow('Phiên bản');expect(service.trainX()).toBe(old);
  });

  it('clears CSV/provenance and model at the session boundary',()=>{
    service.loadDataset([[1,2],[2,3],[3,4]],[3,5,7],'private.csv');service.history.set([{iteration:3,w:[1,2],b:0,trainLoss:1,testLoss:1}]);
    service.resetSession();expect(service.dataSource()).toBe('synthetic');expect(service.csvName()).toBeNull();expect(service.provenance()).toBeNull();expect(service.history()).toEqual([]);
  });
});
