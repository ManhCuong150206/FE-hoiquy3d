import { TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { ExperimentsStore } from './experiments-store';
import { AuthSession } from './auth-session';
import { LabStore } from './lab-store';
import { experimentDb } from '../core/storage/experiment-db';
import { SavedExperiment } from '../core/models/experiment';

describe('scoped snapshot synchronization',()=>{
 let store:ExperimentsStore,lab:LabStore;
 let disk:Map<string,SavedExperiment>,scope:ReturnType<typeof signal<string>>;
 let posted:Record<string,unknown>[][],remote:Record<string,unknown>[],validAck:boolean;
 const settle=async()=>{TestBed.tick();await new Promise(resolve=>setTimeout(resolve,0));await new Promise(resolve=>setTimeout(resolve,0));};
 beforeEach(async()=>{
  disk=new Map();posted=[];remote=[];validAck=true;scope=signal('person-a');
  vi.spyOn(experimentDb,'all').mockImplementation(async()=>[...disk.values()]);
  vi.spyOn(experimentDb,'putMany').mockImplementation(async rows=>{for(const row of rows)disk.set(row.id,structuredClone(row));});
  vi.spyOn(experimentDb,'remove').mockImplementation(async id=>{disk.delete(id);});
  vi.stubGlobal('fetch',vi.fn(async(url: string,options?:RequestInit)=>{
    if(options?.method==='POST'){const rows=JSON.parse(String(options.body)).operations as Record<string,unknown>[];posted.push(rows);
      return new Response(JSON.stringify({success:validAck,results:validAck?rows.map(row=>({operationId:row['operationId'],idempotencyKey:row['idempotencyKey'],entityType:'experiment',entityClientId:row['entityClientId'],status:'applied',serverVersion:Number(row['clientVersion']??0)+1})):[]}),{status:200});}
    return new Response(JSON.stringify({changes:{experiments:remote}}),{status:200});
  }));
  const auth={scope,authenticated:computed(()=>scope()!=='guest'),user:computed(()=>({userId:scope(),isAnonymous:scope()==='guest'})),ensure:async()=>({userId:scope()}),api:(url:string,options?:RequestInit)=>fetch(url,options)};
  TestBed.configureTestingModule({providers:[{provide:AuthSession,useValue:auth}]});
  store=TestBed.inject(ExperimentsStore);lab=TestBed.inject(LabStore);await settle();
  lab.history.set([{iteration:2,w:[1,2],b:.5,trainLoss:.1,testLoss:.2}]);
 });
 afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
 it('marks synced only after an acknowledgement of the exact ID and mutation',async()=>{
  validAck=false;const saved=store.save('No ack')!;await settle();expect(store.list()[0].synced).toBe(false);expect(store.syncError()).toContain('chưa xác nhận');
  validAck=true;await store.sync();expect(store.list()[0].synced).toBe(true);expect(store.list()[0].serverVersion).toBe(1);
  expect(disk.get(saved.id)?.synced).toBe(true);
 });
 it('keeps offline deletion as a durable tombstone and sends it after reconnection',async()=>{
  const saved=store.save('Delete me')!;await settle();store.online.set(false);store.remove(saved.id);await settle();
  expect(store.list()).toHaveLength(0);expect(disk.get(saved.id)?.deletedAt).toBeTruthy();expect(disk.get(saved.id)?.synced).toBe(false);
  store.online.set(true);await store.sync();expect(posted.at(-1)?.[0]['action']).toBe('delete');expect(disk.get(saved.id)?.synced).toBe(true);
 });
 it('pulls saved server results and remote deletion without requiring a local change',async()=>{
  const saved=store.save('Pull me')!;await settle();remote=[{...saved,clientId:saved.id,algorithm:{type:'linear'},syncVersion:2,deletedAt:new Date().toISOString()}];
  await store.sync();expect(store.list()).toHaveLength(0);expect(disk.get(saved.id)?.deletedAt).toBeTruthy();
 });
 it('keeps different identities isolated locally and does not upload the previous account queue',async()=>{
  store.online.set(false);const saved=store.save('Private A')!;await settle();const before=posted.length;
  scope.set('person-b');await settle();expect(store.list()).toHaveLength(0);expect(disk.get(saved.id)?.scopeId).toBe('person-a');
  store.online.set(true);await store.sync();expect(posted.length).toBe(before);
 });
 it('saves the full processed CSV split so restoring does not depend on a file picker',async()=>{
  lab.loadDataset([[1,2],[2,3],[3,4],[4,5]],[3,5,7,9],'offline.csv');
  lab.history.set([{iteration:3,w:[1,2],b:0,trainLoss:.1,testLoss:.2}]);store.online.set(false);
  const saved=store.save('CSV')!;await settle();expect(saved.csvData?.trainX).toEqual(lab.trainX());expect(saved.csvData?.testY).toEqual(lab.testY());
  expect(disk.get(saved.id)?.csvData?.trainIndices).toEqual(lab.trainIndices());
 });

 it('does not read or write IndexedDB, save results, or contact the API as Guest',async()=>{
  scope.set('guest');await settle();vi.mocked(experimentDb.all).mockClear();vi.mocked(experimentDb.putMany).mockClear();vi.mocked(fetch).mockClear();
  expect(store.canSave()).toBe(false);expect(store.save('Guest result')).toBeNull();store.remove('unknown');await store.sync();await settle();
  expect(store.list()).toEqual([]);expect(experimentDb.all).not.toHaveBeenCalled();expect(experimentDb.putMany).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
 });
 it('does not adopt old anonymous records into a signed-in account',async()=>{
  store.online.set(false);const saved=store.save('Legacy')!;await settle();disk.set(saved.id,{...saved,scopeId:'offline-guest-unit'});
  scope.set('guest');await settle();scope.set('person-b');await settle();
  expect(store.list()).toEqual([]);expect(disk.get(saved.id)?.scopeId).toBe('offline-guest-unit');
 });
 it('does not upload an old queue when the session expires during ensure',async()=>{
  store.online.set(false);const saved=store.save('Pending A')!;await settle();
  vi.spyOn(TestBed.inject(AuthSession),'ensure').mockImplementation(async()=>{scope.set('guest');throw new Error('Expired');});
  const before=posted.length;store.online.set(true);await store.sync();await settle();
  expect(posted.length).toBe(before);expect(disk.get(saved.id)?.synced).toBe(false);expect(store.list()).toEqual([]);
 });
 it('retries a queued sync when a save arrives during the server pull',async()=>{
  const previousFetch=globalThis.fetch;let release:(response:Response)=>void=()=>{};let blocked=false;
  vi.stubGlobal('fetch',vi.fn((url:string,options?:RequestInit)=>{if(!blocked&&options?.method!=='POST'){blocked=true;return new Promise<Response>(resolve=>{release=resolve;});}return previousFetch(url,options);}));
  const running=store.sync();await settle();const saved=store.save('Saved during pull')!;
  release(new Response(JSON.stringify({changes:{experiments:[]}})));await running;await settle();
  expect(posted.some(batch=>batch.some(row=>row['entityClientId']===saved.id))).toBe(true);expect(store.list().find(e=>e.id===saved.id)?.synced).toBe(true);
 });
 it('round-trips snapshots using the fields supported by the backend schema',async()=>{
  const saved=store.save('Round trip')!;await settle();
  const payload=posted.at(-1)![0]['payload'] as Record<string,unknown>;
  expect(payload['algorithm']).toMatchObject({type:'linear',config:{snapshot:{w:saved.w,b:saved.b}}});
  remote=[{...payload,clientId:saved.id,ownerId:'person-a',syncVersion:2}];
  await store.sync();expect(store.list()[0].w).toEqual(saved.w);expect(store.list()[0].createdAt).toBe(saved.createdAt);
 });
 it('keeps rejected operations pending even when the HTTP batch response is 200',async()=>{
  store.online.set(false);const saved=store.save('Denied')!;await settle();
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({success:false,results:[{operationId:saved.mutationId,idempotencyKey:saved.mutationId,entityType:'experiment',entityClientId:saved.id,status:'error',error:'Không tìm thấy dữ liệu'}]}))));
  store.online.set(true);await store.sync();expect(store.list()[0].synced).toBe(false);expect(store.syncError()).toBe('Không tìm thấy dữ liệu');
 });
 it('does not replay a remembered conflict key as a successful duplicate after reload',async()=>{
  store.online.set(false);const saved=store.save('Conflict')!;await settle();
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({success:false,results:[{operationId:saved.mutationId,idempotencyKey:saved.mutationId,entityType:'experiment',entityClientId:saved.id,status:'conflict',serverVersion:2,conflict:{reason:'Phiên bản mới hơn',serverData:{...saved,clientId:saved.id,syncVersion:2}}}]}))));
  store.online.set(true);await store.sync();
  expect(store.conflict()?.id).toBe(saved.id);expect(disk.get(saved.id)?.synced).toBe(false);expect(disk.get(saved.id)?.mutationId).not.toBe(saved.mutationId);
 });
});
