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
  localStorage.clear();
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
  await store.sync();expect(store.list()).toHaveLength(0);expect(disk.has(saved.id)).toBe(false);
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
  vi.stubGlobal('fetch',vi.fn(async(_url, options)=>new Response(JSON.stringify(options?.method==='POST'?{success:false,results:[{operationId:saved.mutationId,idempotencyKey:saved.mutationId,entityType:'experiment',entityClientId:saved.id,status:'error',error:'Không tìm thấy dữ liệu'}]}:{changes:{experiments:[]}}))));
  store.online.set(true);await store.sync();expect(store.list()[0].synced).toBe(false);expect(store.syncError()).toBe('1 bản ghi chưa đồng bộ: Không tìm thấy dữ liệu');
 });
 it('does not replay a remembered conflict key as a successful duplicate after reload',async()=>{
  store.online.set(false);const saved=store.save('Conflict')!;await settle();
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({success:false,results:[{operationId:saved.mutationId,idempotencyKey:saved.mutationId,entityType:'experiment',entityClientId:saved.id,status:'conflict',serverVersion:2,conflict:{reason:'Phiên bản mới hơn',serverData:{...saved,clientId:saved.id,syncVersion:2}}}]}))));
  store.online.set(true);await store.sync();
  expect(store.conflict()?.id).toBe(saved.id);expect(disk.get(saved.id)?.synced).toBe(false);expect(disk.get(saved.id)?.mutationId).not.toBe(saved.mutationId);
 });

 const cursorKey = 'regression.syncCursor.person-a';
 const serverTime = '2026-11-08T10:00:00.000Z';
 const raw = (saved:SavedExperiment, version=2, mutation=saved.mutationId):Record<string,unknown> => ({
  clientId:saved.id, ownerId:saved.scopeId, name:saved.name, syncVersion:version,
  algorithm:{type:saved.algorithm,config:{snapshot:{...saved,lastMutationId:mutation}}}
 });
 const respond = (result:(op:Record<string,unknown>)=>Record<string,unknown>, time:unknown=serverTime) => {
  const mock=vi.fn(async(_url:string,options?:RequestInit)=>{
   if(options?.method==='POST'){
    const ops=JSON.parse(String(options.body)).operations as Record<string,unknown>[];posted.push(ops);
    return new Response(JSON.stringify({success:false,results:ops.map(op=>({...op,...result(op)}))}),{status:201});
   }
   return new Response(JSON.stringify({serverTime:time,changes:{experiments:remote}}));
  });vi.stubGlobal('fetch',mock);return mock;
 };
 it('uses a scope cursor with a 60-second overlap only after successful persistence',async()=>{
  store.online.set(false);store.save('Cursor');await settle();
  const mock=respond(()=>({status:'applied',serverVersion:1}));store.online.set(true);
  await store.sync();expect(localStorage.getItem(cursorKey)).toBe(serverTime);
  await store.sync();expect(mock.mock.calls.at(-1)?.[0]).toBe('/api/v1/sync/changes?since='+encodeURIComponent('2026-11-08T09:59:00.000Z'));
 });
 it.each(['invalid',''])('pulls everything for an invalid or missing cursor %s',async cursor=>{
  store.online.set(false);store.save('Cursor');await settle();localStorage.setItem(cursorKey,cursor);
  const mock=respond(()=>({status:'applied',serverVersion:1}));store.online.set(true);await store.sync();
  expect(mock.mock.calls.at(-1)?.[0]).toBe('/api/v1/sync/changes');
 });
 it('ignores a stale cursor when IndexedDB for the scope is empty',async()=>{
  localStorage.setItem(cursorKey,serverTime);const mock=respond(()=>({status:'applied'}));await store.sync();
  expect(mock.mock.calls[0][0]).toBe('/api/v1/sync/changes');
 });
 it.each([undefined,'invalid'])('does not advance the cursor with invalid serverTime %s',async time=>{
  const mock=respond(()=>({status:'applied'}),time===undefined?null:time);await store.sync();
  expect(mock).toHaveBeenCalled();expect(localStorage.getItem(cursorKey)).toBeNull();
 });
 it('does not advance the cursor when IndexedDB persistence fails',async()=>{
  respond(()=>({status:'applied'}));vi.mocked(experimentDb.putMany).mockRejectedValueOnce(new Error('Disk failed'));
  await store.sync();expect(localStorage.getItem(cursorKey)).toBeNull();expect(store.syncError()).toBe('Disk failed');
 });
 it('does not advance the cursor when persisting the pulled records fails',async()=>{
  store.online.set(false);const saved=store.save('Remote')!;await settle();
  remote=[raw({...saved,id:'remote-only'})];respond(()=>({status:'applied',serverVersion:1}));
  const write=vi.mocked(experimentDb.putMany);
  write.mockImplementation(async rows=>{if(rows.some(e=>e.id==='remote-only'))throw new Error('Merge failed');for(const e of rows)disk.set(e.id,structuredClone(e));});
  store.online.set(true);await store.sync();expect(localStorage.getItem(cursorKey)).toBeNull();
 });
 it('continues later batches and pulls after per-record errors, retrying only on a later sync',async()=>{
  store.online.set(false);const bad=store.save('Bad')!;
  for(let i=0;i<51;i++)store.save('Good '+i);await settle();
  const mock=respond(op=>op['entityClientId']===bad.id?{status:'error',error:'Dữ liệu sai'}:{status:'applied',serverVersion:1});
  store.online.set(true);await store.sync();
  expect(posted.map(batch=>batch.length)).toEqual([50,2]);expect(mock.mock.calls.at(-1)?.[0]).toBe('/api/v1/sync/changes');
  expect(store.pendingCount()).toBe(1);expect(disk.get(bad.id)?.synced).toBe(false);expect(store.syncError()).toBe('1 bản ghi chưa đồng bộ: Dữ liệu sai');
  await settle();expect(posted).toHaveLength(2);await store.sync();expect(posted).toHaveLength(3);
 });
 it.each([undefined,99])('verifies duplicate via snapshot lastMutationId independently of response version %s',async version=>{
  store.online.set(false);const saved=store.save('Duplicate')!;await settle();remote=[raw(saved,4)];
  localStorage.setItem(cursorKey,serverTime);const mock=respond(()=>({status:'duplicate',serverVersion:version}));
  store.online.set(true);await store.sync();
  expect(mock.mock.calls.at(-1)?.[0]).toBe('/api/v1/sync/changes');expect(disk.get(saved.id)?.synced).toBe(true);expect(disk.get(saved.id)?.serverVersion).toBe(4);
 });
 it.each(['other',undefined])('does not acknowledge a duplicate for a different or missing server mutation %s',async mutation=>{
  store.online.set(false);const saved=store.save('Keep local')!;await settle();
  remote=mutation?[raw({...saved,name:'Server'},5,mutation)]:[];
  respond(()=>({status:'duplicate',serverVersion:99}));store.online.set(true);await store.sync();
  const current=disk.get(saved.id)!;expect(current.synced).toBe(false);expect(current.name).toBe('Keep local');expect(current.mutationId).not.toBe(saved.mutationId);
  expect(posted).toHaveLength(1);await settle();expect(posted).toHaveLength(1);
 });
 it('acknowledges duplicate deletion only after pulling a server tombstone',async()=>{
  store.online.set(false);const saved=store.save('Delete')!;store.remove(saved.id);await settle();
  remote=[{clientId:saved.id,ownerId:'person-a',syncVersion:3,deletedAt:serverTime}];respond(()=>({status:'duplicate'}));
  store.online.set(true);await store.sync();expect(disk.has(saved.id)).toBe(false);expect(store.pendingCount()).toBe(0);
 });
 it('keeps the duplicate mutation intact if the verification pull fails',async()=>{
  store.online.set(false);const saved=store.save('Duplicate')!;await settle();
  const mock=respond(()=>({status:'duplicate'}));const normal=mock.getMockImplementation()!;
  mock.mockImplementation((url,options)=>options?.method==='POST'?normal(url,options):Promise.reject(new TypeError('Offline')));
  store.online.set(true);await store.sync();expect(disk.get(saved.id)?.mutationId).toBe(saved.mutationId);expect(disk.get(saved.id)?.synced).toBe(false);
 });
 it('ignores unknown tombstones and preserves pending local records against remote deletion',async()=>{
  store.online.set(false);const saved=store.save('Pending')!;await settle();
  remote=[{clientId:'unknown',syncVersion:2,deletedAt:serverTime},{clientId:saved.id,syncVersion:2,deletedAt:serverTime}];
  respond(()=>({status:'error',error:'Không tìm thấy dữ liệu'}));store.online.set(true);await store.sync();
  expect(disk.has('unknown')).toBe(false);expect(disk.get(saved.id)?.synced).toBe(false);expect(store.list()[0].name).toBe('Pending');
 });
 it('deduplicates pulls by id/version and never overwrites pending data',async()=>{
  store.online.set(false);const saved=store.save('Local')!;await settle();
  remote=[raw({...saved,name:'Remote'},8),raw({...saved,id:'new',name:'Newest'},4),raw({...saved,id:'new',name:'Older'},2)];
  respond(()=>({status:'error',error:'Rejected'}));store.online.set(true);await store.sync();
  expect(disk.get(saved.id)?.name).toBe('Local');expect(disk.get('new')?.name).toBe('Newest');
 });
 it('preserves all synthetic kinds and mutation identity inside the snapshot round trip',async()=>{
  store.online.set(false);const saved=store.save('Synthetic')!;await settle();
  for(const kind of ['linear','curved','correlated','sparse'] as const){
   const synthetic={kind,version:1 as const,sampleCount:50,featureCount:2,noise:1,seed:42,trainRatio:.8};
   remote.push(raw({...saved,id:kind,synthetic}));
  }
  respond(()=>({status:'applied',serverVersion:1}));store.online.set(true);await store.sync();
  const payload=posted[0][0]['payload'] as {algorithm:{config:{snapshot:Record<string,unknown>}}};
  expect(payload.algorithm.config.snapshot['lastMutationId']).toBe(saved.mutationId);
  expect(payload.algorithm.config.snapshot['mutationId']).toBeUndefined();
  for(const kind of ['linear','curved','correlated','sparse']){expect(disk.get(kind)?.synthetic?.kind).toBe(kind);expect(disk.get(kind)?.mutationId).toBe(saved.mutationId);}
 });
 it('keeps a copy even when the user chooses server for an unreadable conflict',async()=>{
  store.online.set(false);const saved=store.save('Important')!;await settle();
  respond(()=>({status:'conflict',conflict:{reason:'Conflict',serverData:{unexpected:true}}}));store.online.set(true);await store.sync();
  expect(store.conflict()?.invalidServer).toBe(true);store.online.set(false);await store.resolveConflict(false);
  expect(store.conflict()).toBeNull();const copy=store.list()[0];expect(copy.id).not.toBe(saved.id);expect(copy.w).toEqual(saved.w);
  expect(copy.synced).toBe(false);expect(copy.serverVersion).toBe(0);expect(disk.get(copy.id)).toEqual(copy);expect(store.syncError()).toContain('bản sao');
 });
 it('retains the original on disk if persisting a conflict copy fails',async()=>{
  store.online.set(false);const saved=store.save('Important')!;await settle();
  respond(()=>({status:'conflict',conflict:{reason:'Conflict',serverData:{unexpected:true}}}));store.online.set(true);await store.sync();
  store.online.set(false);vi.mocked(experimentDb.putMany).mockRejectedValueOnce(new Error('Disk failed'));await store.resolveConflict(false);
  expect(disk.has(saved.id)).toBe(true);expect(store.list()[0].id).toBe(saved.id);expect(store.conflict()).not.toBeNull();
 });
 it('commits a pending local write even if the account changes before the write runs',async()=>{
  store.online.set(false);const saved=store.save('Do not lose')!;scope.set('guest');await settle();
  expect(disk.get(saved.id)?.scopeId).toBe('person-a');expect(disk.get(saved.id)?.synced).toBe(false);
 });
 it.each([400,401,403,500])('preserves the queue on HTTP %s',async status=>{
  store.online.set(false);const saved=store.save('Pending')!;await settle();
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({message:'Failure'}),{status})));
  store.online.set(true);await store.sync();expect(disk.get(saved.id)?.synced).toBe(false);expect(disk.get(saved.id)?.mutationId).toBe(saved.mutationId);
  expect(localStorage.getItem(cursorKey)).toBeNull();
 });
 it('does not acknowledge a newer deletion with the response to an older save',async()=>{
  store.online.set(false);const saved=store.save('Race')!;await settle();
  let finish!:(response:Response)=>void;
  const mock=respond(()=>({status:'error',error:'Try later'}));const normal=mock.getMockImplementation()!;let blocked=false;
  mock.mockImplementation((url,options)=>{
   if(options?.method==='POST'&&!blocked){blocked=true;return new Promise(resolve=>{finish=resolve;});}
   return normal(url,options);
  });
  store.online.set(true);const running=store.sync();await settle();store.remove(saved.id);await settle();
  const deleted=disk.get(saved.id)!;
  finish(new Response(JSON.stringify({success:true,results:[{operationId:saved.mutationId,idempotencyKey:saved.mutationId,entityType:'experiment',entityClientId:saved.id,status:'applied',serverVersion:1}]})));
  await running;await settle();expect(disk.get(saved.id)?.mutationId).toBe(deleted.mutationId);expect(disk.get(saved.id)?.synced).toBe(false);
  expect(disk.get(saved.id)?.deletedAt).toBeTruthy();
 });
 it('keeps local data and the cursor unchanged on a batch network failure',async()=>{
  store.online.set(false);const saved=store.save('Offline')!;await settle();localStorage.setItem(cursorKey,serverTime);
  vi.stubGlobal('fetch',vi.fn(async()=>{throw new TypeError('Failed to fetch');}));store.online.set(true);await store.sync();
  expect(disk.get(saved.id)?.synced).toBe(false);expect(localStorage.getItem(cursorKey)).toBe(serverTime);
 });
});

describe('offline reload with the real auth session and mocked IndexedDB',()=>{
 let disk:Map<string,SavedExperiment>,auth:AuthSession,store:ExperimentsStore,lab:LabStore;
 const settle=async()=>{TestBed.tick();await new Promise(resolve=>setTimeout(resolve,0));await new Promise(resolve=>setTimeout(resolve,0));};
 const user={_id:'offline-owner',displayName:'Linh',email:'linh@example.com',role:'user',status:'active'};
 beforeEach(async()=>{
  localStorage.clear();disk=new Map();
  vi.spyOn(experimentDb,'all').mockImplementation(async()=>[...disk.values()]);
  vi.spyOn(experimentDb,'putMany').mockImplementation(async rows=>{for(const row of rows)disk.set(row.id,structuredClone(row));});
  vi.spyOn(experimentDb,'remove').mockImplementation(async id=>{disk.delete(id);});
  vi.spyOn(navigator,'onLine','get').mockReturnValue(true);
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(user))));
  auth=TestBed.inject(AuthSession);await auth.enter({email:user.email,password:'password123'},false);
  vi.spyOn(navigator,'onLine','get').mockReturnValue(false);
  store=TestBed.inject(ExperimentsStore);lab=TestBed.inject(LabStore);await settle();
  lab.history.set([{iteration:2,w:[1,2],b:.5,trainLoss:.1,testLoss:.2}]);
 });
 afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
 it('reloads only the cached owner records, permits offline saves/deletes, and retains them on reconnect 401',async()=>{
  const first=store.save('Before reload')!;await settle();disk.set('foreign',{...first,id:'foreign',scopeId:'another-user'});
  TestBed.resetTestingModule();auth=TestBed.inject(AuthSession);await auth.restore();
  store=TestBed.inject(ExperimentsStore);lab=TestBed.inject(LabStore);await settle();
  expect(store.list().map(e=>e.id)).toEqual([first.id]);expect(auth.scope()).toBe(user._id);
  lab.history.set([{iteration:3,w:[2,3],b:1,trainLoss:.1,testLoss:.2}]);
  const second=store.save('After reload')!;store.remove(first.id);await settle();
  expect(store.pendingCount()).toBe(2);expect(disk.get(second.id)?.synced).toBe(false);expect(disk.get(first.id)?.deletedAt).toBeTruthy();
  vi.spyOn(navigator,'onLine','get').mockReturnValue(true);
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({message:'Expired'}),{status:401})));
  store.online.set(true);await store.sync();await settle();
  expect(auth.user()).toBeNull();expect(localStorage.getItem('regression.lastIdentity')).toBeNull();
  expect(disk.get(second.id)?.synced).toBe(false);expect(disk.get(first.id)?.deletedAt).toBeTruthy();expect(disk.has('foreign')).toBe(true);
  expect(vi.mocked(fetch).mock.calls.map(call=>call[0])).toEqual(['/api/v1/auth/me']);
 });
 it('verifies auth/me before syncing the offline queue and keeps IndexedDB after logout',async()=>{
  const saved=store.save('Offline save')!;await settle();vi.spyOn(navigator,'onLine','get').mockReturnValue(true);
  vi.stubGlobal('fetch',vi.fn(async(url,options)=>{
   if(String(url).endsWith('/auth/me'))return new Response(JSON.stringify(user));
   if(String(url).endsWith('/sync/batch')){
    const operations=JSON.parse(String(options?.body)).operations;
    return new Response(JSON.stringify({success:true,results:operations.map((op:Record<string,unknown>)=>({...op,status:'applied',serverVersion:1}))}));
   }
   if(String(url).endsWith('/auth/logout'))return new Response(JSON.stringify({success:true}));
   return new Response(JSON.stringify({serverTime:'2026-11-08T10:00:00.000Z',changes:{experiments:[]}}));
  }));
  store.online.set(true);await store.sync();expect(disk.get(saved.id)?.synced).toBe(true);
  expect(vi.mocked(fetch).mock.calls.map(call=>call[0])).toEqual(['/api/v1/auth/me','/api/v1/sync/batch','/api/v1/sync/changes']);
  await auth.logout();await settle();expect(localStorage.getItem('regression.lastIdentity')).toBeNull();expect(disk.has(saved.id)).toBe(true);
 });
});
